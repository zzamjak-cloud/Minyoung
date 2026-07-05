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

export type WorkspaceSummary = {
  workspaceId: string;
  name: string;
  type: WorkspaceType;
  ownerMemberId: string;
  myEffectiveLevel: WorkspaceAccessLevel;
  access?: WorkspaceAccessSummary[];
  createdAt?: string;
  removedAt?: string;
};

type WorkspaceStoreState = {
  currentWorkspaceId: string | null;
  workspaces: WorkspaceSummary[];
};

type WorkspaceStoreActions = {
  setCurrentWorkspaceId: (workspaceId: string | null) => void;
  setWorkspaces: (workspaces: WorkspaceSummary[]) => void;
  upsertWorkspace: (workspace: WorkspaceSummary) => void;
  removeWorkspace: (workspaceId: string) => void;
  clear: () => void;
};

export type WorkspaceStore = WorkspaceStoreState & WorkspaceStoreActions;

function defaultWorkspaceId(workspaces: WorkspaceSummary[]): string | null {
  return workspaces[0]?.workspaceId ?? null;
}

const LAST_WORKSPACE_ID_KEY = "quicknote.workspace.lastVisited.v1";

function readLastWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_WORKSPACE_ID_KEY);
}

function writeLastWorkspaceId(workspaceId: string | null): void {
  if (typeof window === "undefined" || !workspaceId) return;
  window.localStorage.setItem(LAST_WORKSPACE_ID_KEY, workspaceId);
}

function fallbackWorkspaceId(workspaces: WorkspaceSummary[]): string | null {
  const lastWorkspaceId = readLastWorkspaceId();
  if (lastWorkspaceId && workspaces.some((workspace) => workspace.workspaceId === lastWorkspaceId)) {
    return lastWorkspaceId;
  }
  return defaultWorkspaceId(workspaces);
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
      workspaces: [],

      setCurrentWorkspaceId: (workspaceId) => {
        writeLastWorkspaceId(workspaceId);
        set({ currentWorkspaceId: workspaceId });
      },

      setWorkspaces: (workspaces) =>
        set((state) => {
          const nextWorkspaces = workspaces;
          // 빈 배열이면 기존 유지 — API 일시 실패·레이스로 선택 WS 가 첫 항목으로 덮이는 것 방지
          if (workspaces.length === 0 && state.workspaces.length > 0) {
            return state;
          }
          const currentExists =
            state.currentWorkspaceId !== null &&
            nextWorkspaces.some((w) => w.workspaceId === state.currentWorkspaceId);
          return {
            workspaces: nextWorkspaces,
            currentWorkspaceId:
              currentExists
                ? state.currentWorkspaceId
                : fallbackWorkspaceId(nextWorkspaces),
          };
        }),

      upsertWorkspace: (workspace) =>
        set((state) => {
          const nextWorkspace = workspace;
          const exists = state.workspaces.some((w) => w.workspaceId === nextWorkspace.workspaceId);
          const workspaces = exists
            ? state.workspaces.map((w) =>
                w.workspaceId === nextWorkspace.workspaceId ? nextWorkspace : w,
              )
            : [...state.workspaces, nextWorkspace];
          return {
            workspaces,
            currentWorkspaceId:
              state.currentWorkspaceId ?? fallbackWorkspaceId(workspaces),
          };
        }),

      removeWorkspace: (workspaceId) =>
        set((state) => {
          const workspaces = state.workspaces.filter((w) => w.workspaceId !== workspaceId);
          const currentWorkspaceId =
            state.currentWorkspaceId === workspaceId
              ? fallbackWorkspaceId(workspaces)
              : state.currentWorkspaceId;
          return { workspaces, currentWorkspaceId };
        }),

      clear: () => set({ currentWorkspaceId: null, workspaces: [] }),
    }),
    {
      name: "quicknote.workspace.session.v1",
      storage: createJSONStorage(() => tabWorkspaceStorage),
      partialize: (state) => ({ currentWorkspaceId: state.currentWorkspaceId }),
    },
  ),
);
