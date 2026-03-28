import { useState, useRef, useEffect, useCallback } from "react";
import { ShieldCheck, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface StepUpDialogProps {
  open: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<boolean>;
  isVerifying: boolean;
  error: string | null;
}

export function StepUpDialog({
  open,
  onClose,
  onVerify,
  isVerifying,
  error,
}: StepUpDialogProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setDigits(["", "", "", "", "", ""]);
      requestAnimationFrame(() => {
        inputs.current[0]?.focus();
      });
    }
  }, [open]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const char = value.slice(-1);
      const next = [...digits];
      next[index] = char;
      setDigits(next);

      if (char && index < 5) {
        inputs.current[index + 1]?.focus();
      }

      if (next.every((d) => d !== "")) {
        onVerify(next.join(""));
      }
    },
    [digits, onVerify],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < text.length; i++) {
        next[i] = text[i]!;
      }
      setDigits(next);
      if (text.length === 6) {
        onVerify(text);
      } else {
        inputs.current[text.length]?.focus();
      }
    },
    [onVerify],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in fade-in-0 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
            style={{ position: "absolute", right: 16, top: 16 }}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10">
              <ShieldCheck className="h-7 w-7 text-brand-primary" />
            </div>

            <h2 className="text-lg font-semibold text-zinc-100">
              MFA Verification Required
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              This is a high-risk action. Enter the 6-digit code from your
              authenticator app.
            </p>

            <div className="mt-6 flex gap-2" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  disabled={isVerifying}
                  aria-label={`Digit ${i + 1}`}
                  className={cn(
                    "h-12 w-10 rounded-lg border bg-zinc-800 text-center text-lg font-mono font-medium text-zinc-100 outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary",
                    error ? "border-red-500" : "border-zinc-700",
                  )}
                />
              ))}
            </div>

            {isVerifying && (
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </div>
            )}

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            <p className="mt-6 text-xs text-zinc-500">
              For demo purposes, enter any 6-digit code (except 000000).
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
