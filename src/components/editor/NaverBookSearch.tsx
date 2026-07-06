// 네이버 도서 검색 모달. 검색어를 입력하면 /api/book-search 로 조회하고,
// 결과 도서를 선택하면 bookCard 블록을 에디터에 삽입한다. (/네이버 도서 검색)

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BookOpen, Loader2, Search, X } from "lucide-react";
import { insertBlockSmart } from "../../lib/editor/insertBlockSmart";

type Props = {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
};

// /api/book-search 응답 item 형태.
type BookItem = {
  title: string;
  link: string;
  image: string;
  author: string;
  publisher: string;
  pubdate: string;
  isbn: string;
  description: string;
  price: string;
};

// YYYYMMDD → YYYY.MM.DD (형식이 다르면 원본 유지).
function formatPubdate(pubdate: string): string {
  const digits = pubdate.replace(/[^0-9]/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return pubdate;
}

export function NaverBookSearch({ open, onClose, editor }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // 모달을 닫을 때 상태를 초기화해 다음 열림에서 이전 결과가 남지 않도록 한다.
  useEffect(() => {
    if (open) return;
    setQuery("");
    setItems([]);
    setError(null);
    setSearched(false);
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/book-search?query=${encodeURIComponent(q)}`);
      if (!res.ok) {
        throw new Error("검색에 실패했습니다.");
      }
      const data = (await res.json()) as { items?: BookItem[] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색에 실패했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const pick = (book: BookItem) => {
    if (!editor) return;
    insertBlockSmart(editor, {
      type: "bookCard",
      attrs: {
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        pubdate: book.pubdate,
        isbn: book.isbn,
        image: book.image,
        link: book.link,
        description: book.description,
        price: book.price,
      },
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[540] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-[640px] max-w-[95vw] flex-col rounded-lg bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            네이버 도서 검색
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>
        <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="도서 제목·저자·ISBN 입력"
                className="h-8 w-full rounded border border-zinc-200 bg-white pl-7 pr-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={!query.trim() || loading}
              className="h-8 shrink-0 rounded bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              검색
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-zinc-500">
              <Loader2 className="animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
              {searched ? "검색 결과가 없습니다." : "검색어를 입력하세요."}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {items.map((book) => (
                <BookRow
                  key={book.isbn || book.link || book.title}
                  book={book}
                  onPick={() => pick(book)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookRow({ book, onPick }: { book: BookItem; onPick: () => void }) {
  const metaParts = [
    book.author,
    book.publisher,
    formatPubdate(book.pubdate),
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex gap-3 rounded border border-transparent p-2 text-left hover:border-blue-400 hover:bg-blue-50/40 dark:hover:border-blue-500/70 dark:hover:bg-blue-950/30"
      title={book.title}
    >
      <div className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
        {book.image ? (
          <img
            src={book.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <BookOpen size={16} className="text-zinc-400" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {book.title || "제목 없음"}
        </div>
        {metaParts.length > 0 ? (
          <div className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
            {metaParts.join(" · ")}
          </div>
        ) : null}
      </div>
    </button>
  );
}
