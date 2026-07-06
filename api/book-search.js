// 네이버 도서 검색 API 프록시. 클라이언트 시크릿을 노출하지 않기 위해 서버리스에서 대신 호출한다.
// GET /api/book-search?query=검색어&display=10&start=1&sort=sim

// HTML 엔티티를 원문자로 되돌린다(bookmark.js 의 decodeEntities 와 동일 스타일).
function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// <b> 등 태그 제거(bookmark.js 의 stripHtmlTags 와 동일 스타일).
function stripHtmlTags(value) {
  return String(value || "").replace(/<[^>]+>/g, "");
}

// 태그 제거 + 엔티티 복원 + 공백 정리. 네이버가 검색어를 <b> 로 감싸 주므로 반드시 정제한다.
export function sanitizeText(value) {
  return decodeEntities(stripHtmlTags(value)).trim();
}

// 네이버 응답 item 을 에디터 카드가 쓰는 필드로 매핑한다.
export function mapBookItem(item) {
  return {
    title: sanitizeText(item?.title),
    link: String(item?.link || ""),
    image: String(item?.image || ""),
    // 저자 구분자 "|" → ", " 로 사람이 읽기 좋게 정리.
    author: sanitizeText(item?.author).replace(/\s*\|\s*/g, ", "),
    publisher: sanitizeText(item?.publisher),
    pubdate: String(item?.pubdate || ""),
    isbn: String(item?.isbn || ""),
    description: sanitizeText(item?.description),
    price: String(item?.discount || ""),
  };
}

// 정수 파라미터를 안전 범위로 clamp 한다.
function clampInt(raw, fallback, min, max) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export default async function handler(request, response) {
  try {
    const rawQuery = request.query?.query;
    if (typeof rawQuery !== "string" || rawQuery.trim() === "") {
      response.status(400).json({ error: "query is required" });
      return;
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      response.status(500).json({ error: "naver credentials not configured" });
      return;
    }

    const display = clampInt(request.query?.display, 10, 1, 20);
    const start = clampInt(request.query?.start, 1, 1, 1000);
    const sort = request.query?.sort === "date" ? "date" : "sim";

    const apiUrl = new URL("https://openapi.naver.com/v1/search/book.json");
    apiUrl.searchParams.set("query", rawQuery.trim());
    apiUrl.searchParams.set("display", String(display));
    apiUrl.searchParams.set("start", String(start));
    apiUrl.searchParams.set("sort", sort);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let upstream;
    try {
      upstream = await fetch(apiUrl.href, {
        signal: controller.signal,
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!upstream.ok) {
      response.status(502).json({ error: "naver search failed" });
      return;
    }

    const data = await upstream.json();
    const items = Array.isArray(data?.items) ? data.items.map(mapBookItem) : [];

    response
      .setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400")
      .status(200)
      .json({ items, total: Number(data?.total) || items.length });
  } catch {
    response.status(500).json({ error: "book search failed" });
  }
}
