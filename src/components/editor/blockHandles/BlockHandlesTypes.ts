// BlockHandles 내부 타입 — 원시 타입만 참조(외부 의존 없음), 위치만 분리.

export type DownloadNotice = {
  kind: "loading" | "success" | "error";
  message: string;
} | null;
