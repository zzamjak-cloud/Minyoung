# 네이버 도서 검색 (슬래시 명령)

슬래시 메뉴 "네이버 도서 검색" → 검색 모달 → 도서 선택 시 **도서 카드 블록**(표지 + 제목/저자/출판사/출간일 + 네이버 상세 링크)을 에디터에 삽입한다. 카드 자체가 네이버 도서 페이지로 이동하는 북마크 역할을 한다.

## 데이터 흐름

```
슬래시 "네이버 도서 검색"
  → menuEntries.ts: window.dispatchEvent("minyoung:open-naver-book-search")
  → Editor.tsx: editor.isFocused 가드 후 모달 open
  → NaverBookSearch.tsx: fetch /api/book-search?query=...
  → api/book-search.js: 네이버 도서 API 프록시(서버사이드)
  → 결과 선택 → insertBlockSmart(editor, { type:"bookCard", attrs })
```

## 왜 서버리스 프록시인가 (api/book-search.js)

- 브라우저에서 `openapi.naver.com` 직접 호출은 **CSP `connect-src`(self+AWS 만)** 에 차단된다.
- 네이버 **Client Secret** 은 프론트 번들에 노출되면 안 된다(`VITE_` 접두사 금지, 서버에서만 사용).
- 따라서 `api/bookmark.js` 와 동일하게 **동일 출처 `/api/*` 프록시**를 둔다. 브라우저는 self 만 호출.
- 표지 이미지는 외부 https URL이지만 CSP `img-src https:` 로 이미 허용됨 → `vercel.json` 수정 불필요.

## 환경변수 (필수)

| 변수 | 위치 | 용도 |
|------|------|------|
| `NAVER_CLIENT_ID` | Vercel 프로젝트 env / 로컬 `.env` | 네이버 검색 API 인증(지도 기능과 공유 가능) |
| `NAVER_CLIENT_SECRET` | 〃 | 〃 (서버 전용, 절대 프론트 노출 금지) |

- 네이버 개발자센터에서 "검색" API 애플리케이션 발급. 무료 25,000회/일.
- 로컬 실제 호출 테스트는 `vercel dev` 필요(`npm run dev`는 Vite만 띄워 `/api/*` 미동작).

## 도서 카드 노드 (bookCard)

- 정의: `src/lib/tiptapExtensions/bookCardBlock.tsx` — `bookmarkBlock.tsx` 를 템플릿으로 복제한 atom 노드.
- attrs: `title, author, publisher, pubdate, isbn, image, link, description, price`.
- 라운드트립: `parseHTML`/`renderHTML` 이 `data-*` 속성으로 대칭 보존. `pageToHtml.ts`/`pageToMarkdown.ts` 직렬화도 동일 속성 사용.
- 렌더: `ReactNodeViewRenderer` + `useLazyNodeViewActivation`(bookmark 와 동일 지연 활성화). 표지 `<img referrerPolicy="no-referrer">`.

## 건드리는 파일

| 파일 | 역할 |
|------|------|
| `api/book-search.js` | 네이버 도서 API 프록시(정제·타임아웃·캐시) |
| `src/lib/tiptapExtensions/bookCardBlock.tsx` | 도서 카드 노드 |
| `src/components/editor/NaverBookSearch.tsx` | 검색 모달 |
| `src/lib/tiptapExtensions/slashMenu/menuEntries.ts` | 슬래시 엔트리 |
| `src/components/editor/Editor.tsx` | 이벤트 리스너 + 모달 렌더 |
| `src/components/editor/useEditorExtensions.ts` | 노드 등록 |
| `src/lib/blocks/registry.ts` | `bookCard` defineBlock(group embed) |
| `src/lib/export/{pageToHtml,pageToMarkdown}.ts` | 직렬화 |
| `src/lib/tiptapExtensions/toggleContentEmpty.ts` | non-empty leaf 취급 |

## 회귀 방지

- **`editor.isFocused` 가드 필수**: 피크뷰+메인 에디터 동시 마운트 시 CustomEvent 이중 수신 → 카드 이중 삽입 방지. (이미지/동영상 피커와 동일 규칙)
- 네이버 응답 텍스트는 서버(`api/book-search.js`)에서 `<b>` 태그·HTML 엔티티 제거 후, 프론트에서는 JSX 텍스트로만 렌더(`dangerouslySetInnerHTML` 금지).
