import { describe, it, expect } from "vitest";
import { isEmailAllowed } from "./index";

describe("PreSignUp Lambda", () => {
  it("고정 allowlist 이메일은 허용", () => {
    expect(isEmailAllowed("zzamjak@gmail.com")).toBe(true);
    expect(isEmailAllowed("KEANUX@NAVER.COM")).toBe(true);
  });

  it("allowlist 밖 이메일과 누락 값은 거부", () => {
    expect(isEmailAllowed("alice@example.com")).toBe(false);
    expect(isEmailAllowed("")).toBe(false);
  });
});
