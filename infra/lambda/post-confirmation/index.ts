import type { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from "aws-lambda";
import { createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type Tables = {
  members: string;
  workspaces: string;
  workspaceAccess: string;
};

function stableSuffix(email: string): string {
  return createHash("sha256").update(email).digest("hex").slice(0, 24);
}

function displayNameFromAttributes(
  email: string,
  attrs: Record<string, string | undefined>,
): string {
  const directName = attrs.name?.trim();
  if (directName) return directName;
  const parts = [attrs.given_name, attrs.family_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (parts.length > 0) return parts.join(" ");
  return email.split("@")[0] || "사용자";
}

async function putIfMissing(
  command: PutCommand,
  send: typeof docClient.send,
): Promise<void> {
  try {
    await send(command);
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name !== "ConditionalCheckFailedException") throw error;
  }
}

export async function ensurePersonalAccount(
  email: string,
  cognitoSub: string,
  tables: Tables,
  send: typeof docClient.send,
  attrs: Record<string, string | undefined> = {},
): Promise<{ memberId: string; workspaceId: string }> {
  const lower = email.trim().toLowerCase();
  if (!lower) throw new Error("PostConfirmation: email is required");
  if (!cognitoSub) throw new Error("PostConfirmation: cognitoSub is required");
  const now = new Date().toISOString();
  const suffix = stableSuffix(lower);
  const fallbackMemberId = `member-${suffix}`;
  const fallbackWorkspaceId = `workspace-${suffix}`;

  const result = await send(
    new QueryCommand({
      TableName: tables.members,
      IndexName: "byEmail",
      KeyConditionExpression: "email = :e",
      ExpressionAttributeValues: { ":e": lower },
      Limit: 1,
    }),
  );
  const existing = result.Items?.[0] ?? {};
  const memberId =
    typeof existing.memberId === "string" ? existing.memberId : fallbackMemberId;
  const workspaceId =
    typeof existing.personalWorkspaceId === "string"
      ? existing.personalWorkspaceId
      : fallbackWorkspaceId;
  const displayName = displayNameFromAttributes(lower, attrs);

  await send(
    new UpdateCommand({
      TableName: tables.members,
      Key: { memberId },
      UpdateExpression: [
        "SET email = :email",
        "cognitoSub = :sub",
        "#name = if_not_exists(#name, :name)",
        "jobRole = if_not_exists(jobRole, :jobRole)",
        "workspaceRole = if_not_exists(workspaceRole, :role)",
        "#status = :status",
        "personalWorkspaceId = if_not_exists(personalWorkspaceId, :workspaceId)",
        "rowCount = if_not_exists(rowCount, :rowCount)",
        "createdAt = if_not_exists(createdAt, :now)",
      ].join(", "),
      ExpressionAttributeNames: {
        "#name": "name",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":email": lower,
        ":sub": cognitoSub,
        ":name": displayName,
        ":jobRole": "User",
        ":role": "member",
        ":status": "active",
        ":workspaceId": workspaceId,
        ":rowCount": 1,
        ":now": now,
      },
    }),
  );

  await putIfMissing(
    new PutCommand({
      TableName: tables.workspaces,
      Item: {
        workspaceId,
        name: `${displayName}의 개인 워크스페이스`,
        type: "personal",
        ownerMemberId: memberId,
        createdAt: now,
      },
      ConditionExpression: "attribute_not_exists(workspaceId)",
    }),
    send,
  );

  await putIfMissing(
    new PutCommand({
      TableName: tables.workspaceAccess,
      Item: {
        workspaceId,
        subjectKey: `member#${memberId}`,
        subjectType: "member",
        subjectId: memberId,
        level: "edit",
      },
      ConditionExpression: "attribute_not_exists(workspaceId) AND attribute_not_exists(subjectKey)",
    }),
    send,
  );

  return { memberId, workspaceId };
}

export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent,
) => {
  const tables = {
    members: process.env.MEMBERS_TABLE_NAME!,
    workspaces: process.env.WORKSPACES_TABLE_NAME!,
    workspaceAccess: process.env.WORKSPACE_ACCESS_TABLE_NAME!,
  };
  const email = event.request.userAttributes?.email;
  const sub = event.request.userAttributes?.sub;
  if (email && sub) {
    await ensurePersonalAccount(
      email,
      sub,
      tables,
      docClient.send.bind(docClient),
      event.request.userAttributes ?? {},
    );
  }
  return event;
};
