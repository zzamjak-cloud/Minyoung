import { X } from "lucide-react";
import pkg from "../../../package.json";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { MyProfileSection } from "./MyProfileSection";

type Props = {
  open: boolean;
  onClose: () => void;
};

// 개인용 단일 화면 설정 모달 — 프로필 / 화면 설정(다크 모드) / 로그아웃
export function SettingsModal({ open, onClose }: Props) {
  const signOut = useAuthStore((s) => s.signOut);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const toggleDarkMode = useSettingsStore((s) => s.toggleDarkMode);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/45 p-0 md:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-zinc-200 bg-white shadow-xl md:h-[min(86vh,820px)] md:max-w-3xl md:rounded-xl dark:border-zinc-700 dark:bg-zinc-950"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 px-6 dark:border-zinc-800">
          <h2 id="settings-modal-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            설정
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            aria-label="설정 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {/* 내 프로필 */}
          <section aria-label="내 프로필">
            <h3 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">내 프로필</h3>
            <MyProfileSection />
          </section>

          {/* 화면 설정 */}
          <section aria-label="화면 설정">
            <h3 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">화면 설정</h3>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex w-full max-w-xs items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-pressed={darkMode}
            >
              <span>{darkMode ? "다크 모드" : "라이트 모드"}</span>
              <span
                className={[
                  "relative h-5 w-10 rounded-full transition",
                  darkMode ? "bg-zinc-700" : "bg-zinc-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                    darkMode ? "left-5" : "left-0.5",
                  ].join(" ")}
                />
              </span>
            </button>
          </section>

          {/* 계정 */}
          <section aria-label="계정">
            <h3 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">계정</h3>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              로그아웃
            </button>
          </section>
        </div>

        <p
          className="pointer-events-none absolute bottom-3 right-4 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500"
          aria-label={`앱 버전 ${pkg.version}`}
        >
          v{pkg.version}
        </p>
      </div>
    </div>
  );
}
