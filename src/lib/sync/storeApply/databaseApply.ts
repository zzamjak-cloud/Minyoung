// 원격 Database 엔티티를 database 스토어에 LWW 적용하는 reducer.
// storeApply.ts 에서 분리(behavior-preserving).
import type { GqlDatabase } from "../graphql/operations";
import { useDatabaseStore } from "../../../store/databaseStore";
import type { CellValue, DatabaseBundle, DatabasePanelState, DatabaseTemplate } from "../../../types/database";
import { repairDbHistoryBaselineIfNeeded } from "../../../store/historyStore";
import {
  createLocalDeleteGuardChecker,
  shouldIgnoreRemoteAfterLocalDelete,
} from "../localDeleteGuards";
import {
  tryParseSerializedColumns,
  tryParseSerializedPanelState,
  tryParseSerializedPresets,
} from "../../database/schema/normalizeDatabase";
import {
  isoToMs,
  isRemoteNewer,
  stringArrayEqual,
  mergeRowPageOrderWithDerived,
} from "./helpers";
import { shouldApplyRemoteSnapshot, resolveNextCacheWorkspaceId } from "./applyShared";
import {
  collectRowPageIdsForDatabase,
  collectRowPageIdsForDatabases,
} from "./rowOrder";

function parseRemoteDatabaseSchema(
  db: GqlDatabase,
): (Pick<DatabaseBundle, "columns" | "presets" | "panelState"> & {
  templates?: DatabaseTemplate[];
}) | null {
  const columns = tryParseSerializedColumns(db.columns);
  const presets = tryParseSerializedPresets(db.presets);
  const panelState = tryParseSerializedPanelState(db.panelState);
  const templates = parseRemoteDatabaseTemplates(db.templates);
  if (!columns || !presets) {
    console.warn("[sync] storeApply: invalid database schema ignored", {
      databaseId: db.id,
      columnsOk: Boolean(columns),
      presetsOk: Boolean(presets),
      rawColumns: db.columns,
      rawPresets: db.presets,
    });
    return null;
  }
  if (db.panelState != null && !panelState) {
    console.warn("[sync] storeApply: invalid database panelState ignored", {
      databaseId: db.id,
    });
  }
  return {
    columns,
    presets,
    ...(panelState ? { panelState } : {}),
    ...(templates !== undefined ? { templates } : {}),
  };
}

function parseRemoteDatabaseTemplates(raw: unknown): DatabaseTemplate[] | undefined {
  if (raw == null || raw === "") return undefined;
  let parsed: unknown = raw;
  for (let depth = 0; depth < 2 && typeof parsed === "string"; depth += 1) {
    if (parsed === "") return undefined;
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(parsed)) {
    return undefined;
  }
  const templates: DatabaseTemplate[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.title !== "string") continue;
    const cells =
      record.cells && typeof record.cells === "object" && !Array.isArray(record.cells)
        ? (record.cells as Record<string, CellValue>)
        : {};
    templates.push({
      id: record.id,
      title: record.title,
      cells,
      ...(typeof record.pageId === "string" ? { pageId: record.pageId } : {}),
    });
  }
  return templates;
}

function resolvePanelStateWithLocalFallback(
  localPanelState: DatabasePanelState | undefined,
  remotePanelState: DatabasePanelState | undefined,
): DatabasePanelState | undefined {
  // 서버가 빈 panelState({})로 잘못 덮인 경우(과거 회귀로 탭 유실), local 에 탭이 있으면 보존한다.
  const remoteHasPresets = (remotePanelState?.filterPresets?.length ?? 0) > 0;
  const localHasPresets = (localPanelState?.filterPresets?.length ?? 0) > 0;
  return remoteHasPresets || !localHasPresets ? (remotePanelState ?? localPanelState) : localPanelState;
}

export function applyRemoteDatabaseToStore(
  d: GqlDatabase | null | undefined,
): void {
  if (!d) return;
  const db = d;
  if (!shouldApplyRemoteSnapshot(db.workspaceId)) return;
  if (
    !db.deletedAt &&
    shouldIgnoreRemoteAfterLocalDelete("database", db.id, db.workspaceId, db.updatedAt)
  ) {
    return;
  }

  const local = useDatabaseStore.getState().databases[db.id];

  if (db.deletedAt) {
    useDatabaseStore.setState((s) => {
      const bundle = s.databases[db.id];
      if (!bundle) return s;
      const rest = { ...s.databases };
      const nextTemplates = { ...s.dbTemplates };
      delete rest[db.id];
      delete nextTemplates[db.id];
      return { ...s, databases: rest, dbTemplates: nextTemplates, cacheWorkspaceId: db.workspaceId };
    });
    return;
  }

  const schema = parseRemoteDatabaseSchema(db);
  if (!schema) return;

  if (local && !isRemoteNewer(local.meta.updatedAt, db.updatedAt)) {
    useDatabaseStore.setState((s) =>
      s.cacheWorkspaceId === resolveNextCacheWorkspaceId(s.cacheWorkspaceId, db.workspaceId)
        ? s
        : { ...s, cacheWorkspaceId: resolveNextCacheWorkspaceId(s.cacheWorkspaceId, db.workspaceId) },
    );
    return;
  }

  const { columns, presets, panelState, templates } = schema;
  const derivedRowOrder = collectRowPageIdsForDatabase(db.id);
  const rowPageOrder = mergeRowPageOrderWithDerived(local?.rowPageOrder, derivedRowOrder);
  const resolvedPanelState = resolvePanelStateWithLocalFallback(local?.panelState, panelState);

  const bundle: DatabaseBundle = {
    meta: {
      id: db.id,
      workspaceId: db.workspaceId,
      title: db.title,
      createdAt: isoToMs(db.createdAt) || Date.now(),
      updatedAt: isoToMs(db.updatedAt) || Date.now(),
    },
    columns,
    presets,
    panelState: resolvedPanelState,
    rowPageOrder,
  };

  useDatabaseStore.setState((s) => ({
    ...s,
    databases: { ...s.databases, [db.id]: bundle },
    dbTemplates:
      templates !== undefined
        ? { ...s.dbTemplates, [db.id]: templates }
        : s.dbTemplates,
    cacheWorkspaceId: resolveNextCacheWorkspaceId(s.cacheWorkspaceId, db.workspaceId),
  }));
  repairDbHistoryBaselineIfNeeded(db.id, structuredClone(bundle));
}

export function applyRemoteDatabasesToStore(
  remoteDatabases: Array<GqlDatabase | null | undefined>,
): void {
  if (remoteDatabases.length === 0) return;
  const normalizedDatabases: GqlDatabase[] = [];
  const candidateDatabaseIds = new Set<string>();
  const shouldIgnoreLocalDelete = createLocalDeleteGuardChecker();

  for (const d of remoteDatabases) {
    if (!d) continue;
    if (!shouldApplyRemoteSnapshot(d.workspaceId)) continue;
    if (
      !d.deletedAt &&
      shouldIgnoreLocalDelete("database", d.id, d.workspaceId, d.updatedAt)
    ) {
      continue;
    }
    normalizedDatabases.push(d);
    if (!d.deletedAt) candidateDatabaseIds.add(d.id);
  }

  if (normalizedDatabases.length === 0) return;

  const derivedByDbId = collectRowPageIdsForDatabases(candidateDatabaseIds);
  const repairedBundles: DatabaseBundle[] = [];
  const databaseDebugRows: Array<Record<string, unknown>> = [];

  useDatabaseStore.setState((s) => {
    let databases = s.databases;
    let dbTemplates = s.dbTemplates;
    let nextCacheWorkspaceId = s.cacheWorkspaceId;
    let changed = false;

    const ensureDatabasesCopy = () => {
      if (databases === s.databases) databases = { ...s.databases };
    };
    const ensureTemplatesCopy = () => {
      if (dbTemplates === s.dbTemplates) dbTemplates = { ...s.dbTemplates };
    };

    for (const db of normalizedDatabases) {
      nextCacheWorkspaceId = resolveNextCacheWorkspaceId(nextCacheWorkspaceId, db.workspaceId);

      if (db.deletedAt) {
        if (!databases[db.id]) {
          databaseDebugRows.push({ databaseId: db.id, action: "delete-skip-missing-local" });
          continue;
        }
        ensureDatabasesCopy();
        ensureTemplatesCopy();
        delete databases[db.id];
        delete dbTemplates[db.id];
        databaseDebugRows.push({ databaseId: db.id, action: "delete" });
        changed = true;
        continue;
      }

      const schema = parseRemoteDatabaseSchema(db);
      if (!schema) {
        databaseDebugRows.push({ databaseId: db.id, action: "schema-invalid" });
        continue;
      }
      const local = databases[db.id];
      if (local && !isRemoteNewer(local.meta.updatedAt, db.updatedAt)) {
        const derived = derivedByDbId.get(db.id) ?? [];
        const rowPageOrder = mergeRowPageOrderWithDerived(local.rowPageOrder, derived);
        const nextPanelState = local.panelState;
        if (
          !stringArrayEqual(local.rowPageOrder, rowPageOrder) ||
          nextPanelState !== local.panelState
        ) {
          ensureDatabasesCopy();
          databases[db.id] = { ...local, panelState: nextPanelState, rowPageOrder };
          changed = true;
          databaseDebugRows.push({
            databaseId: db.id,
            workspaceId: db.workspaceId,
            action: "stale-repair",
            localUpdatedAt: local.meta.updatedAt,
            remoteUpdatedAt: db.updatedAt,
            localRowCount: local.rowPageOrder.length,
            derivedRowCount: derived.length,
            nextRowCount: rowPageOrder.length,
            panelStateChanged: nextPanelState !== local.panelState,
          });
        } else {
          databaseDebugRows.push({
            databaseId: db.id,
            workspaceId: db.workspaceId,
            action: "stale-skip",
            localUpdatedAt: local.meta.updatedAt,
            remoteUpdatedAt: db.updatedAt,
            localRowCount: local.rowPageOrder.length,
            derivedRowCount: derived.length,
          });
        }
        continue;
      }

      const { columns, presets, panelState, templates } = schema;
      const derivedRowOrder = derivedByDbId.get(db.id) ?? [];
      const rowPageOrder = mergeRowPageOrderWithDerived(local?.rowPageOrder, derivedRowOrder);
      // 단건 경로(applyRemoteDatabaseToStore)와 동일하게 panelState 를 반영해야 한다.
      const resolvedPanelState = resolvePanelStateWithLocalFallback(local?.panelState, panelState);
      const bundle: DatabaseBundle = {
        meta: {
          id: db.id,
          workspaceId: db.workspaceId,
          title: db.title,
          createdAt: isoToMs(db.createdAt) || Date.now(),
          updatedAt: isoToMs(db.updatedAt) || Date.now(),
        },
        columns,
        presets,
        panelState: resolvedPanelState,
        rowPageOrder,
      };

      ensureDatabasesCopy();
      databases[db.id] = bundle;
      if (templates !== undefined) {
        ensureTemplatesCopy();
        dbTemplates[db.id] = templates;
      }
      repairedBundles.push(bundle);
      databaseDebugRows.push({
        databaseId: db.id,
        workspaceId: db.workspaceId,
        action: local ? "upsert-newer" : "upsert-new-local",
        localUpdatedAt: local?.meta.updatedAt ?? null,
        remoteUpdatedAt: db.updatedAt,
        localRowCount: local?.rowPageOrder.length ?? null,
        derivedRowCount: derivedRowOrder.length,
        nextRowCount: rowPageOrder.length,
      });
      changed = true;
    }

    if (!changed && nextCacheWorkspaceId === s.cacheWorkspaceId) return s;
    return {
      ...s,
      databases,
      dbTemplates,
      cacheWorkspaceId: nextCacheWorkspaceId,
    };
  });

  for (const bundle of repairedBundles) {
    repairDbHistoryBaselineIfNeeded(bundle.meta.id, structuredClone(bundle));
  }
}
