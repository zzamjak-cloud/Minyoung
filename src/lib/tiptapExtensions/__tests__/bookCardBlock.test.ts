import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { BookCardBlock } from "../bookCardBlock";
import { mapBookItem, sanitizeText } from "../../../../api/book-search.js";

function createEditor(content?: string): Editor {
  return new Editor({
    extensions: [StarterKit, BookCardBlock],
    content: content ?? "<p></p>",
  });
}

describe("book-search 정제 유틸", () => {
  it("<b> 태그와 HTML 엔티티를 제거한다", () => {
    expect(sanitizeText("<b>클린</b> &amp; 코드")).toBe("클린 & 코드");
  });

  it("네이버 item 을 카드 필드로 매핑하고 저자 구분자를 정리한다", () => {
    const mapped = mapBookItem({
      title: "<b>토비</b>의 스프링",
      link: "https://book.naver.com/1",
      image: "https://image/1.jpg",
      author: "이일민|김철수",
      publisher: "출판사",
      pubdate: "20120101",
      isbn: "9791111",
      description: "설명 &lt;태그&gt;",
      discount: "30000",
    });
    expect(mapped.title).toBe("토비의 스프링");
    expect(mapped.author).toBe("이일민, 김철수");
    expect(mapped.description).toBe("설명 <태그>");
    expect(mapped.price).toBe("30000");
  });
});

describe("bookCard 노드 라운드트립", () => {
  it("삽입한 attrs 가 HTML 직렬화 후 재파싱에서 보존된다", () => {
    const editor = createEditor();
    try {
      editor.commands.insertContent({
        type: "bookCard",
        attrs: {
          title: "테스트 도서",
          author: "홍길동",
          publisher: "출판사",
          pubdate: "20200101",
          isbn: "9788900",
          image: "https://image/cover.jpg",
          link: "https://book.naver.com/x",
          description: "요약",
          price: "15000",
        },
      });
      const html = editor.getHTML();
      expect(html).toContain("data-book-card");

      const reparsed = createEditor(html);
      try {
        const node = reparsed.getJSON().content?.find(
          (n) => n.type === "bookCard",
        );
        expect(node?.attrs?.title).toBe("테스트 도서");
        expect(node?.attrs?.author).toBe("홍길동");
        expect(node?.attrs?.link).toBe("https://book.naver.com/x");
        expect(node?.attrs?.isbn).toBe("9788900");
      } finally {
        reparsed.destroy();
      }
    } finally {
      editor.destroy();
    }
  });
});
