# Minyoung 인프라

CDK(TypeScript) 로 정의한 두 개의 스택:

- **`MinyoungCognitoStack`** — AWS Cognito + Google OAuth + 고정 allowlist Lambda
- **`MinyoungSyncStack`** — AppSync GraphQL API + DynamoDB + S3 + Lambda(이미지 PreSign · 야간 GC) + EventBridge cron

## 사전 준비

1. AWS CLI 설정 (`aws configure`).
2. Node.js 20+, npm.
3. CDK 부트스트랩이 안 된 계정/리전이면:
   ```bash
   npx cdk bootstrap aws://<account>/<region>
   ```
4. Google Cloud Console 에서 **OAuth 2.0 Client ID** 발급.
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI: `https://<cognitoDomainPrefix>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
   - 발급된 client id / secret 을 Secrets Manager 에 등록:
     ```bash
     aws secretsmanager create-secret \
       --name minyoung/google-oauth \
       --secret-string '{"clientId":"...","clientSecret":"..."}'
     ```

## 배포

```bash
cd infra
npm install
npm run diff
npm run deploy
```

배포 후 `cdk-outputs.json` 이 생성된다. 아래 값을 프론트엔드 `.env` 에 옮긴다.

| Output | 매핑할 env |
|---|---|
| `Region` | `VITE_COGNITO_REGION` |
| `UserPoolId` | `VITE_COGNITO_USER_POOL_ID` |
| `WebClientId` | `VITE_COGNITO_WEB_CLIENT_ID` |
| `HostedUiDomain` | `VITE_COGNITO_HOSTED_UI_DOMAIN` |

## 가입 allowlist

가입 가능 이메일은 `infra/lambda/pre-sign-up/index.ts` 에서
`zzamjak@gmail.com`, `keanux@naver.com` 두 개로 고정한다.
요구사항상 런타임 환경변수나 CDK context 로 확장하지 않는다.

이미 가입된 사용자를 제거하려면 Cognito에서 별도 삭제한다:

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id <UserPoolId> \
  --username <email>
```

## 테스트

```bash
npm test
```

Lambda 와 CDK/GraphQL 관련 단위 테스트를 포함한다.

## 동기화 스택 배포 (`MinyoungSyncStack`)

### 1. 리졸버 번들 빌드

AppSync JS 리졸버는 esbuild 로 사전 번들이 필요하다.

```bash
cd infra
npm install
npm run build:resolvers
```

산출물: `lib/sync/resolvers/dist/{upsert,softDelete,list,subscribe}.js`.

esbuild 출력 크기(예시):
- `list.js` 약 1.1kb
- `softDelete.js` 약 1.1kb
- `upsert.js` 약 1.0kb
- `subscribe.js` 약 0.5kb

### 2. 컨텍스트 변수 (선택)

이미지 버킷 이름은 기본적으로 `minyoung-images-{account}-{region}` 으로 구성된다.
다른 이름을 쓰려면 `imagesBucketName` 컨텍스트로 전달:

```bash
npx cdk deploy MinyoungSyncStack -c imagesBucketName=my-bucket
```

### 3. 배포

```bash
npx cdk deploy MinyoungSyncStack --outputs-file cdk-outputs.json
```

### 3-1. v5 마이그레이션 실행 (1회)

`MinyoungSyncStack` 출력값에 `V5MigrationFunctionName` 이 포함된다.

```bash
aws lambda invoke \
  --function-name <V5MigrationFunctionName> \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  migration-result.json
```

`migration-result.json`에는 `owners`, `migratedPages`, `migratedDatabases` 카운트가 기록된다.

### 4. 출력값을 `.env` 에 매핑

| Output | 매핑할 env |
|---|---|
| `AppSyncEndpoint` | `VITE_APPSYNC_ENDPOINT` |
| `ImagesBucketName` | `VITE_S3_BUCKET_NAME` |
| `Region` (Cognito 스택과 동일) | `VITE_S3_REGION` |

`AppSyncRealtimeEndpoint` 는 별도 출력하지 않는다 — Amplify GraphQL 클라이언트가
endpoint 의 `appsync-api` → `appsync-realtime-api` 변환을 자동 처리한다.

### 비용 추정 (100 활성 사용자/월)

AppSync 요청 ~$15 + DDB on-demand ~$5 + S3 ~$3 + Lambda ~$1 = **약 $25/월**.

## 정리

```bash
npm run destroy
```

User Pool / DDB 테이블 / S3 버킷은 모두 `removalPolicy: RETAIN` 이므로 콘솔에서 수동 삭제해야 완전히 제거된다.
