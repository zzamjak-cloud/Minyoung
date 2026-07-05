import { describe, expect, it } from "vitest";
import {
  buildMinyoungPageUrl,
  parseMinyoungLink,
} from "../minyoungLinks";

describe("minyoungLinks blockId 파라미터", () => {
  it("build→parse 라운드트립으로 blockId 가 보존된다", () => {
    const url = buildMinyoungPageUrl({ pageId: "p1", blockId: "hid-1" });
    const parsed = parseMinyoungLink(url);
    expect(parsed?.pageId).toBe("p1");
    expect(parsed?.blockId).toBe("hid-1");
  });

  it("blockId 가 없으면 URL 에 blockId 쿼리를 넣지 않는다", () => {
    const url = buildMinyoungPageUrl({ pageId: "p2" });
    expect(url.includes("blockId=")).toBe(false);
    const parsed = parseMinyoungLink(url);
    expect(parsed?.blockId).toBeNull();
  });

  it("minyoung://page/ 형식도 blockId 파라미터를 파싱한다", () => {
    const parsed = parseMinyoungLink(
      "minyoung://page/pageX?blockId=" + encodeURIComponent("uuid-123"),
    );
    expect(parsed?.pageId).toBe("pageX");
    expect(parsed?.blockId).toBe("uuid-123");
  });

  it("build→parse 라운드트립으로 workspaceId(ws) 가 보존된다", () => {
    const url = buildMinyoungPageUrl({ pageId: "p1", workspaceId: "ws-origin" });
    expect(url.includes("ws=ws-origin")).toBe(true);
    expect(parseMinyoungLink(url)?.workspaceId).toBe("ws-origin");
  });
});
