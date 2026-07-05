import { createPortal } from "react-dom";
import { Pencil, Plus, X } from "lucide-react";
import { useDatabaseStore } from "../../store/databaseStore";
import { usePageStore } from "../../store/pageStore";
import { useSettingsStore } from "../../store/settingsStore";
import type { DatabaseTemplate } from "../../types/database";
import { useAnchoredPopover } from "../../hooks/useAnchoredPopover";
import { useAddDatabaseRowAndOpen, useOpenDatabaseRow } from "./useOpenDatabaseRow";

type Props = {
  databaseId: string;
};

const TEMPLATE_POPOVER_WIDTH = 300;

/**
 * DB 템플릿 관리 버튼.
 * 템플릿 생성·적용·삭제를 같은 DB templates payload로 동기화한다.
 */
export function DatabaseTemplateButton({ databaseId }: Props) {
  const { buttonRef, popoverRef, open, coords, toggle, close } =
    useAnchoredPopover(TEMPLATE_POPOVER_WIDTH);

  const templates = useDatabaseStore((s) => s.dbTemplates[databaseId] ?? []);
  const addTemplate = useDatabaseStore((s) => s.addTemplate);
  const deleteTemplate = useDatabaseStore((s) => s.deleteTemplate);
  const applyTemplate = useDatabaseStore((s) => s.applyTemplate);
  const addRowAndOpen = useAddDatabaseRowAndOpen(databaseId);
  const openRow = useOpenDatabaseRow(databaseId);

  const pages = usePageStore((s) => s.pages);
  const setActivePage = usePageStore((s) => s.setActivePage);
  const setCurrentTabPage = useSettingsStore((s) => s.setCurrentTabPage);

  const navigateToPage = (pageId: string) => {
    close();
    setActivePage(pageId);
    setCurrentTabPage(pageId);
  };

  const handleAdd = () => {
    // 템플릿 페이지 생성 후 즉시 이동해서 편집한다.
    const pageId = addTemplate(databaseId);
    if (pageId) navigateToPage(pageId);
  };

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`'${title}'을 삭제하시겠습니까?`)) return;
    deleteTemplate(databaseId, id);
  };

  const handleApply = (id: string) => {
    close();
    const pageId = applyTemplate(databaseId, id);
    if (pageId) void openRow(pageId, { source: "database-template-apply-open" });
  };

  const handleAddEmptyRow = () => {
    close();
    addRowAndOpen(undefined, { source: "database-template-empty-row-open" });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => toggle()}
        title="템플릿"
        className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-500 px-2 text-xs font-medium text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
      >
        템플릿
        {templates.length > 0 && (
          <span className="rounded bg-blue-400 px-1 text-[10px] text-white dark:bg-blue-500">
            {templates.length}
          </span>
        )}
      </button>

      {open && coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: TEMPLATE_POPOVER_WIDTH,
            }}
            className="z-50 overflow-hidden rounded-md border border-zinc-200 bg-white text-base shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <TemplateListPanel
              templates={templates}
              pages={pages}
              onAddEmptyRow={handleAddEmptyRow}
              onAddTemplate={handleAdd}
              onApply={handleApply}
              onEditPage={navigateToPage}
              onDelete={handleDelete}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

function TemplateListPanel({
  templates,
  pages,
  onAddEmptyRow,
  onAddTemplate,
  onApply,
  onEditPage,
  onDelete,
}: {
  templates: DatabaseTemplate[];
  pages: ReturnType<typeof usePageStore.getState>["pages"];
  onAddEmptyRow: () => void;
  onAddTemplate: () => void;
  onApply: (templateId: string) => void;
  onEditPage: (pageId: string) => void;
  onDelete: (templateId: string, title: string) => void;
}) {
  return (
    <>
      <div className="border-b border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
        <button
          type="button"
          onClick={onAddEmptyRow}
          className="mb-1 flex w-full items-center gap-1.5 rounded px-1 py-1 text-base text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title="빈 페이지"
        >
          <Plus size={12} />
          빈 페이지
        </button>
        <button
          type="button"
          onClick={onAddTemplate}
          className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-base text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Plus size={12} />
          새 템플릿
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="px-3 py-3 text-center text-base text-zinc-400">
          템플릿이 없습니다
        </div>
      ) : (
        <ul className="max-h-72 overflow-y-auto py-1">
          {templates.map((template) => {
            const pageTitle = template.pageId
              ? (pages[template.pageId]?.title ?? template.title)
              : template.title;
            return (
              <li
                key={template.id}
                className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <button
                  type="button"
                  onClick={() => onApply(template.id)}
                  className="min-w-0 flex-1 truncate text-left text-base text-zinc-700 dark:text-zinc-300"
                  title={`'${pageTitle}' 템플릿으로 새 항목 추가`}
                >
                  {pageTitle}
                </button>
                {template.pageId && (
                  <button
                    type="button"
                    title="템플릿 페이지 편집"
                    onClick={() => onEditPage(template.pageId!)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <button
                  type="button"
                  title="템플릿 삭제"
                  onClick={() => onDelete(template.id, pageTitle)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <X size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
