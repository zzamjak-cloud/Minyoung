import { gqlOptional } from "./graphqlRequest";
import {
  GET_WORKSPACE,
  LIST_MY_WORKSPACES,
  UPDATE_WORKSPACE,
} from "./queries/workspace";
import type { WorkspaceAccessSummary, WorkspaceSummary } from "../../store/workspaceStore";

export type WorkspaceAccessInput = {
  subjectType: "TEAM" | "MEMBER" | "EVERYONE";
  subjectId?: string;
  level: "EDIT" | "VIEW";
};

export type WorkspaceOptions = {
  jobFunctions: string[];
  jobTitles: string[];
  jobCategories?: string[];
  jobDetails?: string[];
};

type WorkspaceResponse = Omit<WorkspaceSummary, "type" | "myEffectiveLevel"> & {
  type?: "PERSONAL" | "SHARED" | "personal" | "shared";
  myEffectiveLevel?: "EDIT" | "VIEW" | "edit" | "view";
  access?: WorkspaceAccessInput[];
  options?: WorkspaceOptions;
};

export type WorkspaceDetail = Omit<WorkspaceSummary, "access"> & {
  access: WorkspaceAccessInput[];
  options?: WorkspaceOptions;
};

function normalizeAccessEntry(entry: WorkspaceAccessInput): WorkspaceAccessSummary {
  return {
    subjectType:
      entry.subjectType === "MEMBER"
        ? "member"
        : entry.subjectType === "TEAM"
          ? "team"
          : "everyone",
    subjectId: entry.subjectId ?? null,
    level: entry.level === "EDIT" ? "edit" : "view",
  };
}

function normalizeWorkspace(ws: WorkspaceResponse): WorkspaceSummary & { options?: WorkspaceOptions } {
  const type = ws.type ?? "PERSONAL";
  const level = ws.myEffectiveLevel ?? "EDIT";
  return {
    ...ws,
    type: type === "PERSONAL" ? "personal" : type === "SHARED" ? "shared" : type,
    myEffectiveLevel:
      level === "EDIT"
        ? "edit"
        : level === "VIEW"
          ? "view"
          : level,
    access: (ws.access ?? []).map(normalizeAccessEntry),
  };
}

export async function listMyWorkspacesApi(): Promise<(WorkspaceSummary & { options?: WorkspaceOptions })[]> {
  const list = await gqlOptional<WorkspaceResponse[]>(
    LIST_MY_WORKSPACES,
    undefined,
    "listMyWorkspaces",
  );
  return (list ?? []).map(normalizeWorkspace);
}

export async function getWorkspaceApi(workspaceId: string): Promise<WorkspaceDetail> {
  const ws = await gqlOptional<WorkspaceResponse>(
    GET_WORKSPACE,
    { workspaceId },
    "getWorkspace",
  );
  if (!ws) throw new Error("getWorkspace 응답이 비어 있습니다.");
  return {
    ...normalizeWorkspace(ws),
    access: ws.access ?? [],
  };
}

export async function createWorkspaceApi(input: {
  name: string;
  access: WorkspaceAccessInput[];
}): Promise<WorkspaceSummary> {
  void input;
  throw new Error("개인용 앱에서는 워크스페이스를 추가로 생성하지 않습니다.");
}

export async function updateWorkspaceApi(input: {
  workspaceId: string;
  name?: string;
  options?: { jobFunctions?: string[]; jobTitles?: string[] };
}): Promise<WorkspaceSummary & { options?: WorkspaceOptions }> {
  const ws = await gqlOptional<WorkspaceResponse>(
    UPDATE_WORKSPACE,
    { input },
    "updateWorkspace",
  );
  if (!ws) throw new Error("updateWorkspace 응답이 비어 있습니다.");
  return normalizeWorkspace(ws);
}

export async function updateWorkspaceOptionsApi(
  workspaceId: string,
  options: { jobFunctions?: string[]; jobTitles?: string[] },
): Promise<void> {
  await updateWorkspaceApi({ workspaceId, options });
}

export async function setWorkspaceAccessApi(input: {
  workspaceId: string;
  entries: WorkspaceAccessInput[];
}): Promise<WorkspaceSummary> {
  void input;
  throw new Error("개인용 앱에서는 워크스페이스 권한을 변경하지 않습니다.");
}

export async function deleteWorkspaceApi(workspaceId: string): Promise<boolean> {
  void workspaceId;
  return false;
}

export async function archiveWorkspaceApi(workspaceId: string): Promise<WorkspaceSummary | null> {
  void workspaceId;
  return null;
}

export async function restoreWorkspaceApi(workspaceId: string): Promise<WorkspaceSummary | null> {
  void workspaceId;
  return null;
}
