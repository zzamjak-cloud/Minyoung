import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { badRequest, type Member } from "./_auth";
import type { Tables } from "./member";

export async function listMyNotifications(args: {
  doc: DynamoDBDocumentClient;
  tables: Tables;
  caller: Member;
}): Promise<Record<string, unknown>[]> {
  if (!args.tables.Notifications) return [];
  const r = await args.doc.send(
    new QueryCommand({
      TableName: args.tables.Notifications,
      KeyConditionExpression: "recipientMemberId = :m",
      ExpressionAttributeValues: { ":m": args.caller.memberId },
      ScanIndexForward: false, // 최신순
      Limit: 200,
    }),
  );
  return (r.Items ?? []) as Record<string, unknown>[];
}

export async function markNotificationRead(args: {
  doc: DynamoDBDocumentClient;
  tables: Tables;
  caller: Member;
  notificationId: string;
}): Promise<Record<string, unknown>> {
  if (!args.tables.Notifications) badRequest("Notifications table 미설정");
  const r = await args.doc.send(
    new UpdateCommand({
      TableName: args.tables.Notifications,
      Key: {
        recipientMemberId: args.caller.memberId,
        notificationId: args.notificationId,
      },
      UpdateExpression: "SET #r = :t",
      ExpressionAttributeNames: { "#r": "read" },
      ExpressionAttributeValues: { ":t": true },
      ReturnValues: "ALL_NEW",
    }),
  );
  return (r.Attributes ?? {
    recipientMemberId: args.caller.memberId,
    notificationId: args.notificationId,
    read: true,
  }) as Record<string, unknown>;
}

export async function deleteMyNotification(args: {
  doc: DynamoDBDocumentClient;
  tables: Tables;
  caller: Member;
  notificationId: string;
}): Promise<boolean> {
  if (!args.tables.Notifications) return false;
  await args.doc.send(
    new DeleteCommand({
      TableName: args.tables.Notifications,
      Key: {
        recipientMemberId: args.caller.memberId,
        notificationId: args.notificationId,
      },
    }),
  );
  return true;
}
