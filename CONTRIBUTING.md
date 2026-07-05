# 기여 가이드

## 개발 환경

- **Node.js**: `package.json`의 `engines` 및 저장소 루트 `.nvmrc` 참고 (권장 **20 LTS**).
- 패키지 매니저: **npm** (`package-lock.json` 기준).

```bash
npm ci
npm run dev
```

## 검증 (PR 전)

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## 코드 스타일

- TypeScript **strict**, ESLint 규칙 준수.
- 사용자 대면 문자열은 프로젝트 기존 관행에 맞출 것 (한국어 UI 등).

## 보안

취약점은 `SECURITY.md` 절차로 비공개 신고해 주세요.

## 커밋

Conventional Commits 권장 (`feat:`, `fix:`, `chore:` …). 자동 릴리스/release-please는 아직 연결되어 있지 않을 수 있습니다.

## 데스크톱 릴리스/자동 업데이트

웹 배포 전 체크리스트:

- `CHANGELOG.md` 업데이트
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- Vercel 환경변수 확인
  - 필수: `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_HOSTED_UI_DOMAIN`, `VITE_COGNITO_WEB_CLIENT_ID`, `VITE_AUTH_REDIRECT_WEB`
  - 필수: `VITE_APPSYNC_ENDPOINT`, `VITE_S3_REGION`, `VITE_S3_BUCKET_NAME`

### E2E 검증 시나리오

1. Vercel Preview 배포를 연다.
2. allowlist 계정으로 로그인한다.
3. 페이지 작성, DB 편집, 이미지 업로드, 오프라인 복귀 동기화를 확인한다.
4. 앱 실행 후 업데이트 모달 노출 → 다운로드 진행률 → 재시작 적용까지 확인한다.
5. 재실행 후 앱 버전이 `X.Y.Z+1`로 변경됐는지 확인한다.
