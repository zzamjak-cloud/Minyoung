import { useEffect } from "react";

type PageCopyToWorkspaceDialogProps = {
  pageId: string | null;
  onClose: () => void;
};

export function PageCopyToWorkspaceDialog({
  pageId,
  onClose,
}: PageCopyToWorkspaceDialogProps) {
  useEffect(() => {
    if (pageId) onClose();
  }, [onClose, pageId]);

  return null;
}
