#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CognitoStack } from "../lib/cognito-stack";
import { MinyoungSyncStack } from "../lib/sync-stack";

const app = new cdk.App();

const deployEnv = (process.env.DEPLOY_ENV ?? "live") as "dev" | "live";
const isDev = deployEnv === "dev";
const envPrefix = isDev ? "dev-minyoung-" : "minyoung-";
const stackPrefix = isDev ? "DevMinyoung" : "Minyoung";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-2",
};

const cognitoDomainPrefix = isDev
  ? "minyoung-auth-dev"
  : ((app.node.tryGetContext("cognitoDomainPrefix") as string | undefined) ?? "minyoung-auth");

const webCallbackUrls: string[] = isDev
  ? ["http://localhost:5173/auth/callback"]
  : (app.node.tryGetContext("webCallbackUrls") as string[]);

const webLogoutUrls: string[] = isDev
  ? ["http://localhost:5173/auth/signout"]
  : (app.node.tryGetContext("webLogoutUrls") as string[]);

const tableName = (name: string) => `${envPrefix}${name}`;
const membersTableName = tableName("members-v1");
const workspacesTableName = tableName("workspaces-v1");
const workspaceAccessTableName = tableName("workspace-access-v1");

const cognitoStack = new CognitoStack(app, `${stackPrefix}CognitoStack`, {
  env,
  envPrefix,
  description: `Minyoung [${deployEnv}] 인증 스택 (User Pool + Google IdP + allowlist Lambda)`,
  cognitoDomainPrefix,
  webCallbackUrls,
  webLogoutUrls,
  googleSecretName:
    (app.node.tryGetContext("googleSecretName") as string | undefined) ??
    "minyoung/google-oauth",
  membersTableName,
  workspacesTableName,
  workspaceAccessTableName,
});

const imagesBucketName =
  (app.node.tryGetContext("imagesBucketName") as string | undefined) ??
  `${envPrefix}images-${env.account ?? "unknown"}-${env.region}`;

new MinyoungSyncStack(app, `${stackPrefix}SyncStack`, {
  env,
  envPrefix,
  description: `Minyoung [${deployEnv}] 동기화 스택 (AppSync + DDB + S3 + Lambda)`,
  userPoolId: cognitoStack.userPoolId,
  userPoolArn: cognitoStack.userPoolArn,
  imagesBucketName,
  membersTableName,
  teamsTableName: tableName("teams-v1"),
  memberTeamsTableName: tableName("member-teams-v1"),
  workspacesTableName,
  workspaceAccessTableName,
  organizationsTableName: tableName("organizations-v1"),
  memberOrganizationsTableName: tableName("member-organizations-v1"),
});
