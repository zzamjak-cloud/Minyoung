import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { markdownToDoc } from "./markdownToDoc";

/** 클립보드 마크다운을 페이지 문서 블록으로 삽입한다. */
export async function pasteMarkdownAsDocContent(editor: Editor): Promise<boolean> {
  let text = "";
  try {
    text = (await navigator.clipboard.readText()).trim();
  } catch {
    return false;
  }
  if (!text) return false;

  const doc = markdownToDoc(text);
  const blocks = (doc.content ?? []).filter(Boolean) as JSONContent[];
  if (blocks.length === 0) return false;

  editor.chain().focus().insertContent(blocks).run();
  return true;
}
