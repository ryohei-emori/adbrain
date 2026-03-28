import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";

interface RevokeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  providerName: string;
  pendingProposals?: number;
}

export function RevokeDialog({
  open,
  onClose,
  onConfirm,
  providerName,
  pendingProposals = 0,
}: RevokeDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl focus:outline-none">
          <Dialog.Close className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <Dialog.Title className="text-base font-semibold text-zinc-100">
                Disconnect {providerName}?
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">
                This will remove AdBrain's access.
              </Dialog.Description>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-800/50 p-4 mb-5 space-y-2 text-sm text-zinc-300">
            <p>This will:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>Remove AdBrain's access to your {providerName} campaigns, budgets, and bid data</li>
              <li>Stop the AI agent from generating optimization proposals for {providerName}</li>
              {pendingProposals > 0 && (
                <li>Delete {pendingProposals} pending proposal{pendingProposals > 1 ? "s" : ""} for {providerName}</li>
              )}
            </ul>
            <p className="text-xs text-zinc-500 pt-2">
              Your {providerName} account itself will not be affected. You can reconnect at any time.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
