import { describe, it, expect } from "vitest";
import {
  encodeImageRef,
  decodeImageRef,
  isImageRef,
} from "../../lib/sync/imageScheme";

describe("encodeImageRef", () => {
  it("formats imageId as minyoung-image://", () => {
    expect(encodeImageRef("abc-123")).toBe("minyoung-image://abc-123");
  });
});

describe("decodeImageRef", () => {
  it("extracts id from valid scheme", () => {
    expect(decodeImageRef("minyoung-image://abc-123")).toBe("abc-123");
  });
  it("returns null for non-scheme", () => {
    expect(decodeImageRef("https://example.com/x.png")).toBeNull();
    expect(decodeImageRef("data:image/png;base64,iVBOR")).toBeNull();
    expect(decodeImageRef("")).toBeNull();
  });
});

describe("isImageRef", () => {
  it("matches scheme", () => {
    expect(isImageRef("minyoung-image://abc")).toBe(true);
    expect(isImageRef("https://x")).toBe(false);
  });
});
