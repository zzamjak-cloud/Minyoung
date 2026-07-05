import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMemberStore } from "../../store/memberStore";
import { useOrganizationStore } from "../../store/organizationStore";
import { useTeamStore } from "../../store/teamStore";
import { isWorkspaceMetaCacheFresh, refreshWorkspaceMeta } from "./workspaceMetaCache";

const WS = "ws-1";

const apiMocks = vi.hoisted(() => ({
  getWorkspaceMetaApi: vi.fn(),
}));

vi.mock("./workspaceMetaApi", () => ({
  getWorkspaceMetaApi: apiMocks.getWorkspaceMetaApi,
}));

describe("workspace metadata cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T00:00:00.000Z"));
    apiMocks.getWorkspaceMetaApi.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats empty but recently fetched metadata as fresh", async () => {
    const fetchedAt = Date.now();
    useMemberStore.setState({
      members: [],
      cacheWorkspaceId: WS,
      lastFetchedAt: fetchedAt,
    });
    useTeamStore.setState({
      teams: [],
      cacheWorkspaceId: WS,
      lastFetchedAt: fetchedAt,
    });
    useOrganizationStore.setState({
      organizations: [],
      cacheWorkspaceId: WS,
      lastFetchedAt: fetchedAt,
    });

    expect(isWorkspaceMetaCacheFresh(WS)).toBe(true);
    await expect(refreshWorkspaceMeta(WS)).resolves.toBe(false);
    expect(apiMocks.getWorkspaceMetaApi).not.toHaveBeenCalled();
  });
});
