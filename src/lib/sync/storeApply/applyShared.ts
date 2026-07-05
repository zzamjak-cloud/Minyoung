// 워크스페이스 가드·캐시 워크스페이스 해석 sink. page·database reducer 가 공유한다.
import { useWorkspaceStore } from "../../../store/workspaceStore";

/**
 * 구독 레이스·백엔드 오류로 다른 워크스페이스 스냅샷이 내려올 때 로컬 캐시가 오염되지 않게 한다.
 * 분리된 reducer 도 공유한다.
 */
export function shouldApplyRemoteSnapshot(remoteWorkspaceId: string | null | undefined): boolean {
  if (remoteWorkspaceId == null || remoteWorkspaceId === "") {
    console.warn("[sync] storeApply: workspaceId 없는 원격 항목은 적용하지 않음");
    return false;
  }
  const current = useWorkspaceStore.getState().currentWorkspaceId;
  if (!current) return true;
  if (current !== remoteWorkspaceId) {
    console.warn("[sync] storeApply: 현재 워크스페이스와 다른 원격 데이터 무시", {
      currentWorkspaceId: current,
      remoteWorkspaceId,
    });
    return false;
  }
  return true;
}

export function resolveNextCacheWorkspaceId(
  _current: string | null,
  remoteWorkspaceId: string,
): string | null {
  return remoteWorkspaceId;
}
