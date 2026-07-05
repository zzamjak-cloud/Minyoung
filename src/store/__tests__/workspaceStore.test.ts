import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore, type WorkspaceSummary } from "../workspaceStore";

function ws(partial: Partial<WorkspaceSummary> & { workspaceId: string; name: string }): WorkspaceSummary {
  return {
    workspaceId: partial.workspaceId,
    name: partial.name,
    type: partial.type ?? "shared",
    ownerMemberId: partial.ownerMemberId ?? "owner-1",
    myEffectiveLevel: partial.myEffectiveLevel ?? "edit",
    createdAt: partial.createdAt,
  };
}

describe("workspaceStore", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useWorkspaceStore.setState({
      currentWorkspaceId: null,
      workspace: null,
      workspaces: [],
    });
  });

  it("현재 활성 워크스페이스 ID를 저장하고 변경한다", () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId("ws-1");
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe("ws-1");
    useWorkspaceStore.getState().setCurrentWorkspaceId("ws-2");
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe("ws-2");
  });

  it("setWorkspaces는 단일 개인 워크스페이스만 보관하고 current가 없으면 첫 항목 선택", () => {
    useWorkspaceStore.getState().setWorkspaces([
      ws({ workspaceId: "ws-1", name: "A" }),
      ws({ workspaceId: "ws-2", name: "B" }),
    ]);
    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspace?.workspaceId).toBe("ws-1");
    expect(state.currentWorkspaceId).toBe("ws-1");
  });

  it("setWorkspaces는 기존 currentWorkspaceId가 목록에 있으면 유지", () => {
    useWorkspaceStore.setState({
      currentWorkspaceId: "ws-2",
      workspace: null,
      workspaces: [],
    });
    useWorkspaceStore.getState().setWorkspaces([
      ws({ workspaceId: "ws-1", name: "A" }),
      ws({ workspaceId: "ws-2", name: "B" }),
    ]);
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe("ws-2");
    expect(useWorkspaceStore.getState().workspaces.map((item) => item.workspaceId)).toEqual(["ws-2"]);
  });

  it("current가 비어 있으면 첫 개인 워크스페이스를 선택한다", () => {
    useWorkspaceStore.getState().setWorkspaces([
      ws({ workspaceId: "ws-1", name: "A" }),
      ws({ workspaceId: "ws-2", name: "B" }),
    ]);

    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe("ws-1");
  });

  it("setWorkspaces([])는 목록·선택을 바꾸지 않는다", () => {
    const list = [ws({ workspaceId: "ws-1", name: "A" })];
    useWorkspaceStore.setState({
      currentWorkspaceId: "ws-1",
      workspace: list[0],
      workspaces: list,
    });
    useWorkspaceStore.getState().setWorkspaces([]);
    const s = useWorkspaceStore.getState();
    expect(s.currentWorkspaceId).toBe("ws-1");
    expect(s.workspaces).toEqual(list);
  });

  it("upsertWorkspace는 단일 개인 워크스페이스를 교체한다", () => {
    useWorkspaceStore.getState().setWorkspaces([ws({ workspaceId: "ws-1", name: "A" })]);
    useWorkspaceStore.getState().upsertWorkspace(
      ws({ workspaceId: "ws-1", name: "A-Updated", myEffectiveLevel: "view" }),
    );
    expect(useWorkspaceStore.getState().workspaces.find((item) => item.workspaceId === "ws-1")?.name).toBe("A-Updated");

    useWorkspaceStore.getState().upsertWorkspace(ws({ workspaceId: "ws-2", name: "B" }));
    expect(useWorkspaceStore.getState().workspaces.map((item) => item.workspaceId)).toEqual(["ws-2"]);
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe("ws-2");
  });

  it("removeWorkspace는 현재 개인 워크스페이스 제거 시 선택을 비운다", () => {
    useWorkspaceStore.getState().setWorkspaces([
      ws({ workspaceId: "ws-1", name: "A" }),
      ws({ workspaceId: "ws-2", name: "B" }),
    ]);
    useWorkspaceStore.getState().setCurrentWorkspaceId("ws-1");
    useWorkspaceStore.getState().removeWorkspace("ws-1");

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.workspace).toBeNull();
    expect(state.currentWorkspaceId).toBeNull();
  });
});
