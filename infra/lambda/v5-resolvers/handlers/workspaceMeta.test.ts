import { describe, expect, it, vi } from "vitest";
import { getWorkspaceMeta } from "./workspaceMeta";
import type { Member, Tables } from "./member";

const tables: Tables = {
  Members: "Members",
  Teams: "Teams",
  MemberTeams: "MemberTeams",
  Workspaces: "Workspaces",
  WorkspaceAccess: "WorkspaceAccess",
  Organizations: "Organizations",
  MemberOrganizations: "MemberOrganizations",
};

const caller: Member = {
  memberId: "m1",
  email: "m1@example.com",
  name: "M1",
  jobRole: "Dev",
  workspaceRole: "member",
  status: "active",
  personalWorkspaceId: "personal-m1",
  cognitoSub: "sub-m1",
  createdAt: "2026-01-01T00:00:00Z",
};

function mockDoc(...returns: unknown[]) {
  const send = vi.fn();
  for (const value of returns) send.mockResolvedValueOnce(value);
  return { send } as unknown as import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient;
}

describe("getWorkspaceMeta", () => {
  it("멤버/팀/조직 메타를 한 번에 조합하고 멤버 GetItem 반복을 하지 않는다", async () => {
    const doc = mockDoc(
      {
        Items: [
          caller,
          { ...caller, memberId: "m2", name: "M2", status: "active" },
          { ...caller, memberId: "m3", name: "Removed", status: "removed" },
        ],
      },
      { Items: [{ teamId: "t1", name: "Team", leaderMemberIds: ["m1"], createdAt: "now" }] },
      { Items: [{ organizationId: "o1", name: "Org", leaderMemberIds: ["m2"], createdAt: "now" }] },
      { Items: [{ memberId: "m1", teamId: "t1" }, { memberId: "m3", teamId: "t1" }] },
      { Items: [{ memberId: "m2", organizationId: "o1" }] },
    );

    const result = await getWorkspaceMeta({
      doc,
      tables,
      caller,
      workspaceId: "ws-1",
    });

    expect(result.members).toHaveLength(3);
    expect(result.teams).toHaveLength(1);
    expect(result.teams[0].members.map((member) => member.memberId)).toEqual(["m1"]);
    expect(result.organizations[0].members.map((member) => member.memberId)).toEqual(["m2"]);
    expect(doc.send).toHaveBeenCalledTimes(5);
  });
});
