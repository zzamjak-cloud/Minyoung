// 원격(GraphQL) 변경을 로컬 zustand 스토어에 LWW 로 적용한다.
// - GraphQL 쪽은 ISO 문자열, 로컬 스토어는 epoch ms(number) — 경계에서 변환.
// - tombstone(deletedAt != null) 이면 로컬에서 제거.
// - 로컬이 더 신선하면 무시(LWW).

import { usePageStore } from "../../store/pageStore";
import { useDatabaseStore } from "../../store/databaseStore";

// 공유 가드·캐시 워크스페이스 해석 sink 에서 re-export.
export { shouldApplyRemoteSnapshot } from "./storeApply/applyShared";
// page 도메인 reducer re-export.
export {
  applyRemotePageToStoreCrossWorkspaceAware,
  applyRemotePageToStore,
  applyRemotePagesToStore,
  applyRemotePageMetasToStore,
  pruneServerMissingPageFromCache,
} from "./storeApply/pageApply";
// database 도메인 reducer re-export.
export {
  applyRemoteDatabaseToStore,
  applyRemoteDatabasesToStore,
} from "./storeApply/databaseApply";

/**
 * 페이지 좀비 정리(prune). 전체 페이지 목록(`remotePageIds`)이 권위 있을 때만 호출해야 한다.
 * (메타 페이지네이션 등 부분 목록으로 호출하면 멀쩡한 페이지를 지운다.)
 */
export function reconcileWorkspacePagesFullSnapshot(args: {
  workspaceId: string;
  remotePageIds: Set<string>;
  pendingUpsertPageIds: Set<string>;
}): { removedPageIds: string[] } {
  const { workspaceId, remotePageIds, pendingUpsertPageIds } = args;
  const removedPageIds: string[] = [];
  if (!workspaceId) return { removedPageIds };

  usePageStore.setState((s) => {
    if (s.cacheWorkspaceId && s.cacheWorkspaceId !== workspaceId) return s;
    let nextPages = s.pages;
    let nextActive = s.activePageId;
    let changed = false;
    const ensureCopy = () => {
      if (nextPages === s.pages) nextPages = { ...s.pages };
    };

    for (const [pageId, page] of Object.entries(s.pages)) {
      if (!page) continue;
      const pageWs = page.workspaceId;
      // 페이지가 다른 워크스페이스 또는 미지정이면 건드리지 않음.
      if (pageWs && pageWs !== workspaceId) continue;
      if (remotePageIds.has(pageId)) continue;
      if (pendingUpsertPageIds.has(pageId)) continue;
      // 서버에도 없고 outbox 에도 없음 → 좀비. 제거.
      ensureCopy();
      delete nextPages[pageId];
      if (nextActive === pageId) nextActive = null;
      removedPageIds.push(pageId);
      changed = true;
    }
    if (!changed) return s;
    return { ...s, pages: nextPages, activePageId: nextActive };
  });

  if (removedPageIds.length > 0) {
    console.info("[sync] reconcile pruned orphan pages", {
      workspaceId,
      pages: removedPageIds.length,
    });
  }
  return { removedPageIds };
}

/**
 * 데이터베이스 좀비 정리(prune). DB 목록은 워크스페이스당 소수라 delta 동기화에서도
 * 항상 전체 조회가 가능하므로, 전체 DB 목록(`remoteDatabaseIds`)을 받으면 페이지와 달리
 * 증분 경로에서도 안전하게 prune 할 수 있다.
 *
 * 규칙:
 * 1) `remoteDatabaseIds` 에 있으면 서버에 살아있음 → 보존.
 * 2) `pendingUpsertDatabaseIds` (outbox 업로드 대기) → 보존.
 * 3) 다른 워크스페이스 DB → 보존.
 * 4) 위에 모두 해당 없으면 서버에서 사라진 좀비 → 로컬 DB 번들 + 템플릿만 제거.
 *
 * 주의: 그 DB 의 **행 페이지는 건드리지 않는다**. 행 페이지 meta 는 멘션·페이지링크가 아이콘/이동을
 * 해석하는 근거이고 `listPageMetas` 로 정상 로드되므로, 여기서 지우면 멀쩡한 멘션이 깨진다
 * (행 페이지가 서버에 살아있어도 delta 로는 복구되지 않음). 진짜 좀비 행 페이지(서버에도 없음)는
 * 전체 스냅샷의 `reconcileWorkspacePagesFullSnapshot` 가 안전하게 정리한다.
 */
export function reconcileWorkspaceDatabasesFullSnapshot(args: {
  workspaceId: string;
  remoteDatabaseIds: Set<string>;
  pendingUpsertDatabaseIds: Set<string>;
}): { removedDatabaseIds: string[] } {
  const { workspaceId, remoteDatabaseIds, pendingUpsertDatabaseIds } = args;
  const removedDatabaseIds: string[] = [];
  if (!workspaceId) return { removedDatabaseIds };

  useDatabaseStore.setState((s) => {
    if (s.cacheWorkspaceId && s.cacheWorkspaceId !== workspaceId) return s;
    let next = s.databases;
    let nextTemplates = s.dbTemplates;
    let changed = false;
    const ensureCopy = () => {
      if (next === s.databases) next = { ...s.databases };
    };
    const ensureTemplatesCopy = () => {
      if (nextTemplates === s.dbTemplates) nextTemplates = { ...s.dbTemplates };
    };

    for (const [dbId, bundle] of Object.entries(s.databases)) {
      if (!bundle) continue;
      const bundleWs = bundle.meta.workspaceId;
      if (bundleWs && bundleWs !== workspaceId) continue;
      if (remoteDatabaseIds.has(dbId)) continue;
      if (pendingUpsertDatabaseIds.has(dbId)) continue;
      ensureCopy();
      delete next[dbId];
      if (nextTemplates[dbId]) {
        ensureTemplatesCopy();
        delete nextTemplates[dbId];
      }
      removedDatabaseIds.push(dbId);
      changed = true;
    }
    if (!changed) return s;
    return { ...s, databases: next, dbTemplates: nextTemplates };
  });

  if (removedDatabaseIds.length > 0) {
    console.info("[sync] reconcile pruned orphan databases", {
      workspaceId,
      databases: removedDatabaseIds.length,
    });
  }
  return { removedDatabaseIds };
}

