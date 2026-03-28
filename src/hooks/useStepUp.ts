import { useState, useCallback } from "react";

interface StepUpState {
  isOpen: boolean;
  isVerifying: boolean;
  isVerified: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  verify: (code: string) => Promise<boolean>;
  reset: () => void;
}

export function useStepUp(): StepUpState {
  const [isOpen, setIsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setError(null);
    setIsVerified(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  const verify = useCallback(async (code: string): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 1000));

    if (code === "000000" || code.length < 6) {
      setError("Invalid verification code. Please try again.");
      setIsVerifying(false);
      return false;
    }

    setIsVerified(true);
    setIsVerifying(false);
    setIsOpen(false);
    return true;
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setIsVerifying(false);
    setIsVerified(false);
    setError(null);
  }, []);

  return { isOpen, isVerifying, isVerified, error, open, close, verify, reset };
}
