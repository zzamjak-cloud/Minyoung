import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  badRequest,
  requireWorkspaceAccess,
  type Member,
} from "../_auth";
import type { Tables } from "../member";
import { type Connection } from "./_shared";

export async function listDatabaseRows(args: {
  doc: DynamoDBDocumentClient;
  tables: Tables;
  caller: Member;
  databaseId: string;
  workspaceId: string;
  limit?: number;
  nextToken?: string;
}): Promise<Connection<Record<string, unknown>>> {
  if (!args.tables.Pages) badRequest("Pages table 미설정");
  await requireWorkspaceAccess({
    doc: args.doc,
    memberTeamsTableName: args.tables.MemberTeams,
    workspaceAccessTableName: args.tables.WorkspaceAccess,
    caller: args.caller,
    workspaceId: args.workspaceId,
    required: "view",
  });
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);

  const r = await args.doc.send(
    new QueryCommand({
      TableName: args.tables.Pages,
      IndexName: "byDatabaseAndOrder",
      KeyConditionExpression: "databaseId = :d",
      FilterExpression: "workspaceId = :w AND (attribute_not_exists(deletedAt) OR attribute_type(deletedAt, :nullType) OR deletedAt = :empty)",
      ExpressionAttributeValues: {
        ":d": args.databaseId,
        ":w": args.workspaceId,
        ":empty": "",
        ":nullType": "NULL",
      },
      ScanIndexForward: true,
      Limit: limit,
      ExclusiveStartKey: args.nextToken ? JSON.parse(args.nextToken) : undefined,
    }),
  );
  return {
    items: (r.Items ?? []) as Record<string, unknown>[],
    nextToken: r.LastEvaluatedKey ? JSON.stringify(r.LastEvaluatedKey) : null,
  };
}

/**
 * order 를 byDatabaseAndOrder GSI sort key(STRING, non-null)에 적합하게 보정한다.
 * 유효한 숫자 문자열이면 그대로 두고, 아니면 createdAt→updatedAt epoch ms 문자열로 채운다.
 */
export function normalizePageOrderField(input: Record<string, unknown>): void {
  const order = input.order;
  if (typeof order === "string" && order !== "" && !Number.isNaN(Number(order))) {
    return;
  }
  for (const key of ["createdAt", "updatedAt"]) {
    const v = input[key];
    if (typeof v === "string" && v) {
      const ms = Date.parse(v);
      if (!Number.isNaN(ms)) {
        input.order = String(ms);
        return;
      }
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      input.order = String(v);
      return;
    }
  }
  input.order = "0";
}
