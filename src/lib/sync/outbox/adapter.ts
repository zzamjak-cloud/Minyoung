import type { OutboxAdapter } from "./types";

// outbox 어댑터 동적 로더. Vite 가 별도 청크로 분리.

let resolved: OutboxAdapter | null = null;

export async function getOutboxAdapter(): Promise<OutboxAdapter> {
  if (resolved) return resolved;
  const { DexieOutboxAdapter } = await import("./adapter.web");
  resolved = new DexieOutboxAdapter();
  return resolved;
}
