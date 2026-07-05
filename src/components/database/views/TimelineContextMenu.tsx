// 타임라인 카드 우클릭 색상 컨텍스트 메뉴 (포털로 띄움).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";

// 카드 색상 프리셋
export const COLOR_PRESETS = [
  // 빨강 계열
  "#FF5733", "#E74C3C", "#C0392B", "#FF6B6B", "#e64c4c",
  // 주황/노랑 계열
  "#F39C12", "#E67E22", "#F1C40F", "#F9A825",
  // 초록 계열
  "#27AE60", "#2ECC71", "#1ABC9C", "#00897B",
  // 파랑 계열
  "#3498DB", "#2563eb", "#33C1FF", "#2980B9", "#5C6BC0",
  // 보라/핑크 계열
  "#8E44AD", "#9B59B6", "#AB47BC", "#E91E63",
  // 중성 계열
  "#607D8B", "#795548", "#455A64", "#78909C",
] as const;

export const DEFAULT_CARD_COLOR = "#3498DB";

// 다른 곳에서 컨텍스트 메뉴가 열리면 기존 메뉴를 닫기 위한 브로드캐스트 이벤트.
export const TIMELINE_CONTEXT_MENU_OPEN_EVENT = "minyoung:timeline-context-menu-open";

export function announceTimelineContextMenuOpen() {
  window.dispatchEvent(new Event(TIMELINE_CONTEXT_MENU_OPEN_EVENT));
}

type Props = {
  x: number;
  y: number;
  currentColor: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
};

function normalizeColorForCompare(color: string): string {
  return color.trim().toLowerCase();
}

function uniqueColorOptions(colors: string[]): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const color of colors) {
    const key = normalizeColorForCompare(color);
    if (!/^#[0-9a-f]{6}$/.test(key) || seen.has(key)) continue;
    seen.add(key);
    options.push(color);
  }
  return options;
}

export function TimelineContextMenu({ x, y, currentColor, onColorChange, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [customColor, setCustomColor] = useState(currentColor);
  const [adjustedPos, setAdjustedPos] = useState({ left: x, top: y });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (menuRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        return;
      }
      onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleAnotherContextMenuOpen = () => onClose();

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener(TIMELINE_CONTEXT_MENU_OPEN_EVENT, handleAnotherContextMenuOpen);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener(TIMELINE_CONTEXT_MENU_OPEN_EVENT, handleAnotherContextMenuOpen);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const margin = 8;
    let left = x;
    let top = y;

    if (top + rect.height > window.innerHeight - margin) {
      top = y - rect.height;
    }
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin;
    }
    setAdjustedPos({
      left: Math.max(margin, left),
      top: Math.max(margin, top),
    });
  }, [x, y]);

  const normalizedCurrentColor = normalizeColorForCompare(currentColor);
  const colorOptions = uniqueColorOptions([DEFAULT_CARD_COLOR, ...COLOR_PRESETS, currentColor]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-3 z-[720]"
      style={{ left: adjustedPos.left, top: adjustedPos.top }}
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
        <Palette size={14} className="text-zinc-500" />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">색상 변경</span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {colorOptions.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              onColorChange(color);
              onClose();
            }}
            className={`w-7 h-7 rounded-md border-2 transition-transform hover:scale-110 ${
              normalizedCurrentColor === normalizeColorForCompare(color)
                ? "border-white ring-2 ring-blue-500"
                : "border-transparent hover:border-zinc-400"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <input
          type="color"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-600 bg-transparent cursor-pointer p-0"
        />
        <input
          type="text"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          className="flex-1 px-2 py-1 text-sm font-mono border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={() => {
            if (!/^#[0-9A-Fa-f]{6}$/.test(customColor)) return;
            onColorChange(customColor);
            onClose();
          }}
          className="px-2 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
        >
          적용
        </button>
      </div>
    </div>
  );
}
