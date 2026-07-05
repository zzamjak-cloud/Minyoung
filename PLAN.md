# Minyoung — 개인화 노트 구현 계획

기준 문서: `1.0.0.md` / 원본 참조 프로젝트: React 19 + Tiptap 3 + Zustand + AWS CDK 기반 노트 앱

## 0. 핵심 결정 사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 시작 방식 | **원본 참조 프로젝트 기반 감량** (신규 작성 아님) | 에디터+DB 뷰가 코드의 핵심 가치(약 13.6만 LOC). 워크스페이스 결합(254파일)은 추출보다 "단일 고정값 축소"가 훨씬 저렴 |
| 동기화 | **AppSync LWW 동기화(계층 A)만 유지, Yjs 실시간 협업(계층 B) 전면 제거** | 단일 사용자라 공동편집 CRDT 불필요. 단, PC웹+모바일PWA 멀티디바이스이므로 LWW + outbox 오프라인 큐는 유지 (이미 구현돼 있어 추가 비용 없음) |
| 워크스페이스 | 완전 삭제 대신 **고정 상수 1개로 축소** (`PERSONAL_WORKSPACE_ID`) | 스토어 키·GraphQL 파티션·구독 채널에 workspaceId가 박혀 있음. 스키마를 건드리지 않고 UI/전환 로직만 제거 |
| 인증 | Cognito Hosted UI 유지 + **pre-sign-up Lambda 이메일 allowlist 2개 고정** | `zzamjak@gmail.com`(개발), `keanux@naver.com`(실사용). 셀프 가입 차단 |
| 인프라 | 동일 AWS 계정, **완전 별도 CDK 앱** (스택 접두사 `Minyoung*`, 별도 DynamoDB/Cognito/S3) | 1.0.0.md 요구사항: 기존과 동일 방식, 별도 프로젝트 |
| 배포 | 웹: Vercel / 모바일: PWA (vite-plugin-pwa 기존 설정 재활용) | 네이티브 앱 제외 |
| 저장소 | `zzamjak-cloud/Minyoung` 신규 생성 | 저장소명 `Minyoung` 확정 |

## 1단계 — 저장소·프로젝트 부트스트랩

1. 원본 참조 프로젝트를 로컬 복제 → `/Users/woody/Desktop/AI/Minyoung/app` (또는 루트)로 이식, git 히스토리 초기화
2. `zzamjak-cloud`에 `Minyong` private 레포 생성, 원격 연결
3. 프로젝트명 변경: `package.json` name, `index.html` 타이틀, PWA manifest(앱명/아이콘/테마색), Tauri 관련 스크립트 제거
4. 빌드/테스트 통과 확인 (`npm run build`, `vitest`) — 감량 전 베이스라인 확보

## 2단계 — 기능 제거 (난이도 낮은 순서로 진행)

각 항목 제거 후 빌드+기존 테스트 통과를 게이트로 삼는다.

### 2-1. Tauri (난이도: 낮음 — adapter 패턴으로 격리됨)
- 삭제: `src-tauri/`, `@tauri-apps/*` 의존성 전부
- `src/lib/storage/`, `src/lib/sync/outbox/` — adapter를 web 구현 단일화 (`adapter.tauri.ts` 삭제)
- `src/lib/auth/{deepLink,openAuthWindow,storageScope}.ts` 데스크톱 분기 제거, `useAutoUpdate.ts` 삭제
- 결합 지점 약 16개 파일

### 2-2. 실시간 협업 Yjs 계층 (난이도: 낮음 — feature flag 기본 OFF)
- 삭제: `src/lib/collab/` 전체, `src/components/collab/`, `src/components/comments/`(블록 코멘트 포함 코멘트 기능 전체)
- 코멘트 데이터 모델 제거: `src/types/blockComment.ts`, `Page.blockComments` 필드, GraphQL comment 타입·리졸버·구독 채널
- 스토어 삭제: `collabConnectionStore`, `collabPresenceStore`
- 의존성 제거: `yjs`, `y-prosemirror`, `y-protocols`, `y-indexeddb`
- 인프라: `realtime-collab-stack.ts`, `infra/lambda/realtime/` 새 CDK 앱에 포함하지 않음
- env 제거: `VITE_COLLAB_*`

### 2-3. LC 스케줄러 (난이도: 중 — sync/store에 훅이 박혀 있음)
- 삭제: `src/components/scheduler/`(19+), `src/lib/scheduler/`, `scheduler*Store.ts` 9개
- `src/lib/sync/storeApply.ts`의 `reconcileLCSchedulerRemoteSnapshot` 및 관련 분기 제거
- GraphQL 스키마에서 `Schedule/Project/Holiday/Mm*` 타입·리졸버 제외
- Lambda `template-automation`(EventBridge Scheduler) 제외
- 참조 약 152개 파일 — grep 기반으로 일괄 정리 후 타입체크로 잔여 확인

### 2-4. 설정 팝업 슬림화 (난이도: 낮음)
- `src/components/settings/` 14개 → **1개 화면으로 축소**: 프로필(이메일/이름) + 다크모드 + 로그아웃만
- Admin 탭(Members/Teams/Workspaces/Organizations/Assets) 및 NotionImportTab 삭제
- `settingsStore.ts`는 darkMode 등 개인 설정만 남기고 슬림화

### 2-5. 워크스페이스·멀티유저 축소 (난이도: 높음 — 마지막에 수행)
- `PERSONAL_WORKSPACE_ID` 상수 도입(사용자당 1개, `post-confirmation`에서 자동 생성) — 저장 키(`workspaceId::databaseId`)·구독 채널 구조는 그대로 유지
- 삭제: `src/components/workspace/`(생성/편집/삭제/권한 UI), `workspaceStore` 전환 로직, 워크스페이스 셀렉터 UI
- 멤버/팀/조직: `memberStore`/`teamStore`/`organizationStore` 및 role(`OWNER/…`) 체계 → 단일 사용자 고정으로 축소. GraphQL의 `Member/Team/Organization/WorkspaceAccessEntry` 타입·리졸버 제외
- 원칙: **데이터 파티션 구조는 유지, UI와 전환·권한 로직만 제거** → 254파일 결합을 안전하게 우회

## 3단계 — 인증 (이메일 2개 고정)

1. 새 Cognito User Pool (별도 스택 `MinyoungCognitoStack`)
2. `pre-sign-up` Lambda: allowlist `["zzamjak@gmail.com", "keanux@naver.com"]` 외 가입 거부 (하드코딩 — 추후 추가 없음이 요구사항)
3. Hosted UI에서 셀프 사인업 UI는 열어두되 Lambda가 차단, 또는 사용자 2명을 콘솔에서 사전 생성하고 가입 자체를 막는 방식 중 후자 권장
4. 프론트 `src/lib/auth/config.ts` — 웹 클라이언트 단일화(데스크톱 클라이언트 ID 분기 제거)

## 4단계 — 동기화 (단순화된 멀티디바이스 동기화)

유지하는 것 (이미 구현됨, 수정 최소):
- `src/lib/sync/engine.ts` — LWW 동기화 엔진
- `src/lib/sync/subscribers.ts` — AppSync 구독 (PC↔모바일 간 변경 전파용으로 유지; 협업이 아니라 "다른 내 기기 반영" 용도)
- `src/lib/sync/outbox/` — 오프라인 큐 (PWA 오프라인 편집 → 재접속 시 반영)
- Dexie(IndexedDB) 로컬 캐시

제거/축소하는 것:
- comment/member/workspace 채널 구독 → page/database 채널만 유지
- `storeApply.ts`에서 스케줄러·멤버·워크스페이스 스냅샷 병합 로직 제거

단일 사용자 LWW 특성상 충돌은 "같은 문서를 두 기기에서 동시에 오프라인 편집"할 때만 발생 → 마지막 저장 승리로 수용 (요구사항의 "복잡한 동기화 불필요"에 부합).

## 5단계 — 인프라 (새 CDK 앱)

```
infra/
├── bin/minyoung.ts
└── lib/
    ├── cognito-stack.ts      # User Pool + pre-sign-up allowlist + post-confirmation
    ├── sync-stack.ts         # AppSync(GraphQL) + DynamoDB + 구독
    └── sync/schema.graphql   # 원본 스키마에서 Schedule/Member/Team/Org/협업 타입 제외한 축소판
```

- 유지 Lambda: `pre-sign-up`, `post-confirmation`, `image-presign`, `image-gc`, `trash-purge`
- 제외 Lambda: `template-automation`, `realtime/*`
- S3 이미지 버킷 신규 생성, 리전 `ap-northeast-2` 동일
- `cdk-outputs`로 `VITE_APPSYNC_ENDPOINT`, `VITE_COGNITO_*` 주입 (기존 방식 동일)

## 6단계 — PWA·모바일 대응

- `vite-plugin-pwa` 기존 설정 기반: manifest 갱신(이름/아이콘), 오프라인 셸 캐시
- 모바일 뷰포트 점검: 에디터 툴바·슬래시 메뉴·DB 뷰(table/kanban/gallery)의 터치 대응 확인 — 원본 참조 프로젝트가 데스크톱 위주였다면 이 부분이 실질 신규 작업
- iOS Safari 홈화면 추가 동작 확인 (실사용자 keanux 기기 기준)

## 7단계 — 검증·배포

1. 기존 테스트 중 제거 기능 테스트 삭제, 나머지 통과 (`vitest`)
2. 수동 시나리오: 로그인(2계정) → 문서 작성 → DB 뷰 편집 → PC/모바일 교차 편집 반영 → 오프라인 편집 후 복귀 동기화 → 이미지 업로드 → 휴지통
3. 허용 외 이메일 가입 시도 → 차단 확인
4. Vercel 프로젝트 신규 연결(`Minyong` 레포), env 설정, 배포
5. `cdk deploy` (dev → 이상 없으면 그대로 운영; 개인용이므로 스테이지 분리 불필요)

## 진행 순서 요약 및 예상 규모

```
1 부트스트랩 → 2-1 Tauri → 2-2 협업 → 2-3 스케줄러 → 2-4 설정 → 2-5 워크스페이스
→ 3 인증 → 5 인프라(3과 병행 가능) → 4 동기화 정리 → 6 PWA → 7 검증/배포
```

- 리스크 최대 지점: **2-5 워크스페이스 축소**(254파일 결합)와 **6 모바일 터치 UX**
- 감량 후 예상 코드 규모: 약 13.6만 → 8~9만 LOC 수준
