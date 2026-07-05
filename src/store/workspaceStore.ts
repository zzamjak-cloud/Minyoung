import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WorkspaceAccessLevel = "edit" | "view";
export type WorkspaceType = "personal" | "shared";
export type WorkspaceAccessSubjectType = "member" | "team" | "everyone";

export type WorkspaceAccessSummary = {
  subjectType: WorkspaceAccessSubjectType;
  subjectId?: string | null;
  level: WorkspaceAccessLevel;
};

// 단일 사용자 전용 — 사용자당 워크스페이스는 1개(개인 워크스페이스)로 고정된다.
// 기존 소비처 호환을 위해 workspaces 배열·전환 메서드는 남기되 0~1개만 저장한다.
export type WorkspaceSummary = {
  workspaceId: string;
  name: string;
  type?: WorkspaceType;
  ownerMemberId?: string;
  myEffectiveLevel?: WorkspaceAccessLevel;
  access?: WorkspaceAccessSummary[];
  createdAt?: string;
  removedAt?: string;
};

type WorkspaceStoreState = {
  currentWorkspaceId: string | null;
  /** 유일(개인) 워크스페이스 요약 — 이름 표시용 */
  workspace: WorkspaceSummary | null;
  /** 호환용 파생 목록 — 항상 workspace 1개 또는 빈 배열. */
  workspaces: WorkspaceSummary[];
};

type WorkspaceStoreActions = {
  /** 부트스트랩에서 결정된 내 워크스페이스를 반영한다(currentWorkspaceId 동기 설정). */
  setWorkspace: (workspace: WorkspaceSummary | null) => void;
  setCurrentWorkspaceId: (workspaceId: string | null) => void;
  setWorkspaces: (workspaces: WorkspaceSummary[]) => void;
  upsertWorkspace: (workspace: WorkspaceSummary) => void;
  removeWorkspace: (workspaceId: string) => void;
  clear: () => void;
};

export type WorkspaceStore = WorkspaceStoreState & WorkspaceStoreActions;

function normalizeWorkspace(workspace: WorkspaceSummary): WorkspaceSummary {
  return {
    type: "personal",
    myEffectiveLevel: "edit",
    access: [],
    ...workspace,
  };
}

function selectSingleWorkspace(
  workspaces: WorkspaceSummary[],
  currentWorkspaceId: string | null,
): WorkspaceSummary | null {
  if (workspaces.length === 0) return null;
  const current =
    currentWorkspaceId
      ? workspaces.find((workspace) => workspace.workspaceId === currentWorkspaceId)
      : null;
  return normalizeWorkspace(current ?? workspaces[0]!);
}

const tabWorkspaceStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(key);
  },
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      workspace: null,
      workspaces: [],

      setWorkspace: (workspace) =>
        set(() => {
          const normalized = workspace ? normalizeWorkspace(workspace) : null;
          return {
            workspace: normalized,
            workspaces: normalized ? [normalized] : [],
            currentWorkspaceId: normalized?.workspaceId ?? null,
          };
        }),

      setCurrentWorkspaceId: (workspaceId) =>
        set((state) => {
          const workspace =
            workspaceId && state.workspace?.workspaceId === workspaceId
              ? state.workspace
              : null;
          return {
            currentWorkspaceId: workspaceId,
            workspace,
            workspaces: workspace ? [workspace] : state.workspaces,
          };
        }),

      setWorkspaces: (workspaces) =>
        set((state) => {
          if (workspaces.length === 0 && state.workspace) {
            return state;
          }
          const workspace = selectSingleWorkspace(
            workspaces,
            state.currentWorkspaceId,
          );
          return {
            workspace,
            workspaces: workspace ? [workspace] : [],
            currentWorkspaceId: workspace?.workspaceId ?? null,
          };
        }),

      upsertWorkspace: (workspace) =>
        set(() => {
          const normalized = normalizeWorkspace(workspace);
          return {
            workspace: normalized,
            workspaces: [normalized],
            currentWorkspaceId: normalized.workspaceId,
          };
        }),

      removeWorkspace: (workspaceId) =>
        set((state) => {
          if (state.workspace?.workspaceId !== workspaceId) return state;
          return { workspace: null, workspaces: [], currentWorkspaceId: null };
        }),

      clear: () => set({ currentWorkspaceId: null, workspace: null, workspaces: [] }),
    }),
    {
      name: "minyoung.workspace.session.v1",
      storage: createJSONStorage(() => tabWorkspaceStorage),
      // 새로고침 시 첫 페인트 캐시 복원에 currentWorkspaceId 가 필요하다.
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
        workspace: state.workspace,
        workspaces: state.workspaces,
      }),
    },
  ),
);
