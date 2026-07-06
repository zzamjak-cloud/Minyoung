# 인증 & 권한

## 파일

| 파일 | 역할 |
|------|------|
| `src/components/auth/LoginScreen.tsx` | 로그인 화면 (Cognito Hosted UI 로 이동) |
| `src/components/auth/AuthGate.tsx` | 인증 게이트 (미로그인 시 LoginScreen 렌더, 부팅 시 `restoreSession`) |
| `src/components/auth/AuthCallback.tsx` | `/auth/callback` 라우트 — code→토큰 교환 후 `/` 로 이동 |
| `src/store/authStore.ts` | 로그인 상태, 토큰 생명주기 |
| `src/lib/auth/` | 인증 유틸 (`oidcClient`, `tokenStore`, `storageScope`) |

## 인증 흐름
1. 앱 진입 → `AuthGate` 가 `authStore.state` 확인 (`loading` 이면 `restoreSession`)
2. 미인증(`anonymous`) → `LoginScreen` 렌더
3. `LoginScreen` 에서 `signIn()` → Cognito Hosted UI (이메일/비밀번호)
4. 인증 후 `/auth/callback` → `AuthCallback` 이 `handleCallback`(code→토큰) → history `/` 로 교체 → `onDone`
5. `authenticated` → 앱 렌더

## 가입 허용 (allowlist)
- 개인용 앱이라 가입 가능 이메일을 코드에 고정한다. pre-sign-up Lambda `infra/lambda/pre-sign-up/index.ts` 의 `ALLOWED_EMAILS`(2개)만 통과하고, 그 외 이메일은 `UNAUTHORIZED_EMAIL` 로 가입 거부한다.

## 워크스페이스
- 단일 개인 워크스페이스만 사용한다. 최초 가입 확인 시 post-confirmation Lambda `infra/lambda/post-confirmation/index.ts` 가 members/workspaces/workspaceAccess 레코드를 멱등 생성한다(개인 계정 부트스트랩).
- 멤버별 역할·권한 fetch, 워크스페이스 전환/셀렉터는 없다.
