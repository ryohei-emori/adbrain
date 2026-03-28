import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const isActive = i === currentStep;
        const isComplete = i < currentStep;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isComplete && "bg-brand-primary text-white",
                  isActive && "bg-brand-primary text-white ring-4 ring-brand-primary/20",
                  !isComplete && !isActive && "bg-zinc-800 text-zinc-500",
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  isActive ? "text-zinc-100" : "text-zinc-500",
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-16 sm:w-24 mx-2 rounded-full transition-colors",
                  i < currentStep ? "bg-brand-primary" : "bg-zinc-800",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
