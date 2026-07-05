import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";

export interface CognitoStackProps extends cdk.StackProps {
  /** 리소스 이름 접두사. dev 환경은 "dev-", live 환경은 "" */
  envPrefix: string;
  cognitoDomainPrefix: string;
  webCallbackUrls: string[];
  webLogoutUrls: string[];
  /** 실제 배포된 Members DynamoDB 테이블 이름. */
  membersTableName?: string;
  workspacesTableName?: string;
  workspaceAccessTableName?: string;
}

export class CognitoStack extends cdk.Stack {
  // 다른 스택에서 cross-stack reference 로 참조하기 위한 공개 getter.
  public readonly userPoolId: string;
  public readonly userPoolArn: string;
  public readonly webClientId: string;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const membersTableName = props.membersTableName ?? `${props.envPrefix}minyoung-members`;
    const workspacesTableName = props.workspacesTableName ?? `${props.envPrefix}minyoung-workspaces`;
    const workspaceAccessTableName =
      props.workspaceAccessTableName ?? `${props.envPrefix}minyoung-workspace-access`;

    // 가입 가능 이메일은 Lambda 코드의 고정 allowlist 로 검증한다.
    const preSignUpFn = new lambdaNode.NodejsFunction(this, "PreSignUpFn", {
      entry: path.join(__dirname, "..", "lambda", "pre-sign-up", "index.ts"),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler",
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      logRetention: logs.RetentionDays.ONE_MONTH,
      bundling: {
        minify: true,
        target: "node20",
        sourceMap: false,
        externalModules: ["@aws-sdk/*"],
      },
    });

    // Cognito 가입 완료 후 Member/개인 Workspace/Access 레코드를 멱등 생성한다.
    const postConfirmationFn = new lambdaNode.NodejsFunction(this, "PostConfirmationFn", {
      entry: path.join(__dirname, "..", "lambda", "post-confirmation", "index.ts"),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler",
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        MEMBERS_TABLE_NAME: membersTableName,
        WORKSPACES_TABLE_NAME: workspacesTableName,
        WORKSPACE_ACCESS_TABLE_NAME: workspaceAccessTableName,
      },
      bundling: {
        minify: true,
        target: "node20",
        sourceMap: false,
        externalModules: ["@aws-sdk/*"],
      },
    });

    postConfirmationFn.role!.attachInlinePolicy(
      new iam.Policy(this, "PostConfirmationDdbPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: ["dynamodb:Query", "dynamodb:UpdateItem"],
            resources: [
              `arn:aws:dynamodb:${this.region}:${this.account}:table/${membersTableName}`,
              `arn:aws:dynamodb:${this.region}:${this.account}:table/${membersTableName}/index/byEmail`,
            ],
          }),
          new iam.PolicyStatement({
            actions: ["dynamodb:PutItem"],
            resources: [
              `arn:aws:dynamodb:${this.region}:${this.account}:table/${workspacesTableName}`,
              `arn:aws:dynamodb:${this.region}:${this.account}:table/${workspaceAccessTableName}`,
            ],
          }),
        ],
      }),
    );

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `${props.envPrefix}minyoung-users`,
      selfSignUpEnabled: true, // Hosted UI 이메일 가입을 열고 PreSignUp Lambda로 allowlist 외 가입을 차단한다.
      signInAliases: { email: true },
      autoVerify: { email: true },
      mfa: cognito.Mfa.OFF,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // 사용자 데이터 보존
      lambdaTriggers: {
        preSignUp: preSignUpFn,
        postConfirmation: postConfirmationFn,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: false, mutable: true },
        familyName: { required: false, mutable: true },
      },
    });

    const supportedIdps = [cognito.UserPoolClientIdentityProvider.COGNITO];

    const oAuthFlows: cognito.OAuthFlows = {
      authorizationCodeGrant: true,
      implicitCodeGrant: false,
      clientCredentials: false,
    };
    const oAuthScopes = [
      cognito.OAuthScope.OPENID,
      cognito.OAuthScope.EMAIL,
      cognito.OAuthScope.PROFILE,
    ];

    const webClient = userPool.addClient("WebClient", {
      userPoolClientName: `${props.envPrefix}minyoung-web`,
      generateSecret: false,
      authFlows: { userSrp: true },
      oAuth: {
        flows: oAuthFlows,
        scopes: oAuthScopes,
        callbackUrls: props.webCallbackUrls,
        logoutUrls: props.webLogoutUrls,
      },
      supportedIdentityProviders: supportedIdps,
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    const domain = userPool.addDomain("HostedUiDomain", {
      cognitoDomain: { domainPrefix: props.cognitoDomainPrefix },
    });

    new cdk.CfnOutput(this, "Region", { value: this.region });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "WebClientId", { value: webClient.userPoolClientId });
    new cdk.CfnOutput(this, "HostedUiDomain", {
      value: `${domain.domainName}.auth.${this.region}.amazoncognito.com`,
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolArn = userPool.userPoolArn;
    this.webClientId = webClient.userPoolClientId;
  }
}
