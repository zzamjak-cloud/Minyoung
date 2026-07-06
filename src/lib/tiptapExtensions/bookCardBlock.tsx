import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { BookOpen, ExternalLink } from "lucide-react";
import { useLazyNodeViewActivation } from "./useLazyNodeViewActivation";

// 네이버 도서 검색 결과를 카드로 삽입하는 아톰 블록.
// 표지 이미지 + 제목/저자/출판사/출간일 + 네이버 상세 링크(북마크)를 담는다.
type BookCardBlockAttrs = {
  title: string;
  author: string;
  publisher: string;
  pubdate: string;
  isbn: string;
  image: string;
  link: string;
  description: string;
  price: string;
};

// 새 탭으로 네이버 도서 상세를 연다.
function openBookLink(link: string) {
  if (!link) return;
  const url = link.startsWith("http") ? link : `https://${link}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// YYYYMMDD 형태의 출간일을 YYYY.MM.DD 로 정리한다. 형식이 다르면 원본을 그대로 둔다.
function formatPubdate(pubdate: string): string {
  const digits = pubdate.replace(/[^0-9]/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return pubdate;
}

function BookCardBlockView({ node, selected }: NodeViewProps) {
  const attrs = node.attrs as BookCardBlockAttrs;
  const activation = useLazyNodeViewActivation<HTMLDivElement>({ selected });

  const metaParts = [
    attrs.author,
    attrs.publisher,
    formatPubdate(attrs.pubdate),
  ].filter(Boolean);

  return (
    <NodeViewWrapper
      as="div"
      ref={activation.ref}
      data-book-card=""
      className="qn-bookmark-shell my-1.5"
      onPointerDown={activation.activate}
      onFocusCapture={activation.activate}
    >
      <button
        type="button"
        contentEditable={false}
        onClick={() => openBookLink(attrs.link)}
        className={[
          "group flex w-full cursor-pointer overflow-hidden rounded-lg border bg-white text-left shadow-sm transition-colors",
          "hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70",
          selected ? "ring-2 ring-blue-400" : "border-zinc-200",
        ].join(" ")}
      >
        <span className="flex w-16 shrink-0 items-stretch overflow-hidden border-r border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 sm:w-20">
          {attrs.image && activation.active ? (
            <img
              src={attrs.image}
              alt=""
              loading="lazy"
              className="h-full min-h-[104px] w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid min-h-[104px] w-full place-items-center text-zinc-400">
              <BookOpen size={20} />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5">
          <span className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {attrs.title || "제목 없음"}
          </span>
          {metaParts.length > 0 ? (
            <span className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
              {metaParts.join(" · ")}
            </span>
          ) : null}
          {attrs.description ? (
            <span className="line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {attrs.description}
            </span>
          ) : null}
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            <BookOpen size={12} className="shrink-0" />
            <span className="truncate">네이버 도서</span>
            <ExternalLink
              size={11}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </span>
        </span>
      </button>
    </NodeViewWrapper>
  );
}

export const BookCardBlock = TiptapNode.create({
  name: "bookCard",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    // key = attr 이름, value = 직렬화할 data-* 속성명.
    const map: Record<string, string> = {
      title: "data-title",
      author: "data-author",
      publisher: "data-publisher",
      pubdate: "data-pubdate",
      isbn: "data-isbn",
      image: "data-image",
      link: "data-link",
      description: "data-description",
      price: "data-price",
    };
    const attrs: Record<string, unknown> = {};
    for (const [key, dataName] of Object.entries(map)) {
      attrs[key] = {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute(dataName) ?? "",
        renderHTML: (attributes: Record<string, unknown>) => {
          const value = attributes[key];
          if (!value) return {};
          return { [dataName]: String(value) };
        },
      };
    }
    return attrs;
  },

  parseHTML() {
    return [{ tag: "div[data-book-card]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-book-card": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookCardBlockView);
  },
});
