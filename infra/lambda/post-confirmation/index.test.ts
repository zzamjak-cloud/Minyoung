import { describe, it, expect, vi, beforeEach } from "vitest";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ensurePersonalAccount } from "./index";

type SendFn = typeof DynamoDBDocumentClient.prototype.send;
const tables = {
  members: "minyoung-members",
  workspaces: "minyoung-workspaces",
  workspaceAccess: "minyoung-workspace-access",
};

describe("PostConfirmation Lambda", () => {
  beforeEach(() => {
    process.env.MEMBERS_TABLE_NAME = tables.members;
    process.env.WORKSPACES_TABLE_NAME = tables.workspaces;
    process.env.WORKSPACE_ACCESS_TABLE_NAME = tables.workspaceAccess;
  });

  it("기존 Member 발견 시 cognitoSub 와 개인 워크스페이스를 보강한다", async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({
        Items: [{ memberId: "m1", email: "alice@example.com", personalWorkspaceId: "ws-1" }],
      })
      .mockResolvedValue({}) as unknown as SendFn;
    await ensurePersonalAccount("alice@example.com", "sub-123", tables, send);
    expect(send).toHaveBeenCalledTimes(4);
  });

  it("Member 가 없으면 allowlist 가입자를 멱등 생성한다", async () => {
    const send = vi.fn().mockResolvedValueOnce({ Items: [] }) as unknown as SendFn;
    await ensurePersonalAccount("new@example.com", "sub", tables, send, {
      given_name: "New",
      family_name: "User",
    });
    expect(send).toHaveBeenCalledTimes(4);
    const updateArg = (send as unknown as ReturnType<typeof vi.fn>).mock.calls[1]?.[0];
    expect(updateArg.input.TableName).toBe(tables.members);
    expect(updateArg.input.ExpressionAttributeValues[":name"]).toBe("New User");
  });
});
