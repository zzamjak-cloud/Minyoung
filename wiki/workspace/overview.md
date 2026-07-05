# 워크스페이스

## 파일

| 파일 | 역할 |
|------|------|
| `src/store/workspaceStore.ts` | 개인 워크스페이스 1개와 현재 ID 보관 |
| `src/store/memberStore.ts` | 본인 프로필과 멘션 호환 캐시 |
| `src/store/organizationStore.ts` / `src/store/teamStore.ts` | DB 옵션 호환용 빈 로컬 스토어 |
| `src/lib/sync/workspaceApi.ts` | 내 개인 워크스페이스 조회·이름 변경 |

## 워크스페이스 구조
```
Personal Workspace (사용자당 1개)
└── Pages, Databases
```

## 멤버 역할
Minyoung 2-5 이후 멤버/팀/조직/권한 UI는 제거 대상이다.
`memberStore` 는 본인 1명을 권위 데이터로 보고, 기존 멘션·표시 소비처 호환을 위해 `members` 캐시만 유지한다.
`workspaceAccessCacheStore` 와 워크스페이스 권한 변경 subscription 은 사용하지 않는다.

## 개인 워크스페이스 축소 계약

- `workspaceStore.workspaces` 는 호환용 배열이며 항상 개인 워크스페이스 1개 또는 빈 배열이다.
- `setWorkspaces` 는 서버 응답이 여러 개여도 현재 ID와 일치하는 항목 또는 첫 항목 1개만 보관한다.
- 워크스페이스 생성/삭제/권한 변경 UI는 제거한다. 남은 API export 는 기존 import 안정성을 위한 방어용 no-op/throw 경로다.
- AppSync subscription 은 page/database 채널만 유지한다.

## 생성 저장 실패처럼 보이는 경우

증상: 신규 워크스페이스 생성 모달에서 제목과 권한을 입력한 뒤 저장하면 빨간 오류가 뜨지만,
창을 닫고 새로고침하면 워크스페이스가 실제로 생성되어 있다.

원인 후보: AppSync mutation 이 DynamoDB write 는 완료했지만 GraphQL 응답 직렬화에서 실패한 상태다.
`Workspace` 스키마의 non-null 필드(`options` 등)를 `createWorkspace` resolver 반환값이 빠뜨리면
클라이언트는 저장 실패로 처리하고 즉시 `workspaceStore` 에 반영하지 못한다.

회귀 방지:
- `infra/lambda/v5-resolvers/handlers/workspace.ts` 의 `createWorkspace` 반환값은 `Workspace!`의 모든 non-null 필드를 채운다.
- resolver 수정 뒤에는 dev backend 배포(`cd infra && npm run deploy:dev`)까지 완료해야 개발 빌드에 반영된다.
- 프론트 보강은 `src/components/settings/AdminWorkspacesTab.tsx` 에서 생성 mutation 실패 후 `listMyWorkspacesApi` 재조회로
  저장 전 없던 같은 이름의 새 shared 워크스페이스가 확인될 때만 성공 복구한다.

회귀 테스트:
- `infra/lambda/v5-resolvers/handlers/workspace.test.ts`
- `src/components/settings/__tests__/AdminWorkspacesTab.test.tsx`

## 전환
사용자 조작으로 워크스페이스를 전환하지 않는다. 로그인 부트스트랩에서 개인 워크스페이스 ID를 확정하고,
이후 기존 `workspaceId` 파티션 키·페이지/DB 캐시 키는 그대로 사용한다.

## 진입 랜딩 (보던 페이지 복원 + 유령 위험 탭만 무력화)

워크스페이스 진입(전환·새로고침·강제 새로고침) 시 **활성 탭이 안전한 일반 페이지면 그대로 복원**하고,
유령 페이지를 만드는 탭(DB 탭/풀페이지 DB 홈)만 첫 인덱스로 대체한다. 비활성 탭은 워크스페이스 스냅샷에서 보존된다.

- `applyWorkspaceLanding(workspaceId, { forceFirstRoot: true })` (`src/lib/sync/workspaceLanding.ts`)
  - 활성 탭이 `isRestorableLandingPage`(현재 `workspaceId` 소속·DB 탭 아님·풀페이지 DB 홈 아님·보호 DB 블록 아님)면 그대로 유지 → 사용자가 보던 위치 복원.
  - 그 외(DB 탭/풀페이지 DB 홈/무효)면 `lastVisitedPageIdByWorkspaceId`(안전 시) 또는 `getFirstRootSidebarPageId` 로 대체.
  - 일반 워크스페이스에서는 LC 보호 DB(작업·마일스톤·피처) 페이지/블록을 후보에서 제외한다.
- Bootstrap 의 모든 데이터 적용 경로에서 `landingForceFirstRoot: true` 로 호출.
- 앱 최초 마운트에서는 URL 의 `?page=` 를 복원하지 않는다. landing 결과가 권위이며 stale `?page=...` 는 landing 후 active page URL 로 교정한다.

**유령 방지 불변식(끄지 말 것)**: 풀페이지 DB 탭/홈을 활성 탭으로 복원하면 `ensureFullPagePageForDatabase`
가 메타 상태에서 홈을 재생성해 ghost(중복 풀페이지 홈)가 생긴다. **"활성 탭은 DB 탭/풀페이지 홈이 아니어야
한다"** 는 불변식만 지키면 안전한 일반 페이지 복원은 허용된다(과거엔 항상 첫 인덱스로 리셋 → 사용자 요청으로 완화).
새로고침 레이스 보강으로 `uiStore.workspaceBootstrapping` 구간에는 자동 홈 생성을 막는다.
상세: [ghost-page-prevention.md](../pages/ghost-page-prevention.md)

**회귀 테스트**:
- `src/__tests__/sync/workspaceLanding.test.ts`
- `src/__tests__/sync/workspaceSwitch.test.ts`
- `src/store/pageStore/__tests__/selectors.test.ts`
