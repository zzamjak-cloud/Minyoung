// 타임라인 카드 텍스트 표시 헬퍼 — 긴 카드가 좌측으로 스크롤될 때
// 내부 텍스트를 화면 안에 유지하기 위한 오프셋 계산.
export function getTimelineCardContentOffset({
  scrollLeft,
  cardLeft,
  cardWidth,
  minVisibleWidth = 36,
}: {
  scrollLeft: number;
  cardLeft: number;
  cardWidth: number;
  minVisibleWidth?: number;
}): number {
  const clampedVisibleWidth = Math.max(24, Math.min(minVisibleWidth, cardWidth));
  if (cardWidth <= clampedVisibleWidth) return 0;
  const rawOffset = Math.max(0, scrollLeft - cardLeft);
  return Math.min(rawOffset, cardWidth - clampedVisibleWidth);
}
