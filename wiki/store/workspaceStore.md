# workspaceStore

## 역할
개인 워크스페이스 1개와 현재 선택된 워크스페이스 ID를 관리하는 스토어.
기존 코드 호환을 위해 `workspaces` 배열과 전환 메서드는 유지하지만, 배열은 항상 0~1개만 담는다.

## 위치
`src/store/workspaceStore.ts`

## State 타입

| 필드 | 타입 | 설명 |
|------|------|------|
| `currentWorkspaceId` | `string \| null` | 현재 선택된 워크스페이스 ID |
| `workspace` | `WorkspaceSummary \| null` | 유일한 개인 워크스페이스 요약 |
| `workspaces` | `WorkspaceSummary[]` | 호환용 파생 목록. `workspace` 1개 또는 빈 배열 |

**`WorkspaceSummary`** 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| `workspaceId` | `string` | 워크스페이스 고유 ID |
| `name` | `string` | 워크스페이스 이름 |
| `type` | `WorkspaceType?` | 기본 `"personal"` |
| `ownerMemberId` | `string?` | 구형 소비처 호환 필드 |
| `myEffectiveLevel` | `WorkspaceAccessLevel?` | 기본 `"edit"` |

## 액션 목록

| 액션명 | 파라미터 | 설명 |
|--------|---------|------|
| `setWorkspace` | `workspace \| null` | 개인 워크스페이스 1개 반영 |
| `setCurrentWorkspaceId` | `workspaceId \| null` | 호환용 현재 ID 설정 |
| `setWorkspaces` | `workspaces` | 여러 항목이 와도 현재 ID 일치 항목 또는 첫 항목 1개만 보관. 빈 배열이면 기존 유지 |
| `upsertWorkspace` | `workspace` | 개인 워크스페이스 1개를 교체 |
| `removeWorkspace` | `workspaceId` | 현재 개인 워크스페이스와 같으면 상태를 비움 |
| `clear` | 없음 | 전체 초기화 |

## Persist

- localStorage 키: `minyoung.workspace.session.v1`
- storage: `sessionStorage` (탭 단위 격리 — `tabWorkspaceStorage`)
- 저장 필드: `currentWorkspaceId`, `workspace`, `workspaces`
- version: 없음 (단순 구조)

## 의존 관계

- `pageStore` — 워크스페이스 전환 시 pages 캐시 무효화 기준

## 사용처 (주요 컴포넌트)

- `src/Bootstrap.tsx` — 로그인 후 워크스페이스 목록 페치 및 `setWorkspaces` 호출
- `src/store/pageStore/helpers.ts` — `getCurrentWorkspaceId()` 에서 참조
