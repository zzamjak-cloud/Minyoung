/** 에디터 컬럼 너비 클래스 계산 — Editor/DatabaseRowPage/DatabaseRowPeek 공용 */
export function getEditorColumnClass(opts: {
  fullWidth: boolean;
  /** 모바일(<768)에서는 항상 전폭 + 좌우 패딩 */
  isMobile?: boolean;
}): string {
  // 모바일: 고정폭은 좁은 화면을 깨뜨린다 → 전폭 + 패딩.
  if (opts.isMobile) return "max-w-none px-4";
  if (opts.fullWidth) return "max-w-none px-4";
  return "max-w-[784px]";
}
