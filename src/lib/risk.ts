import type { ComponentType } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  type LucideProps,
} from "lucide-react";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface RiskMeta {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  Icon: ComponentType<LucideProps>;
}

const RISK_MAP: Record<RiskLevel, RiskMeta> = {
  LOW: {
    label: "Low Risk",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    textColor: "text-green-400",
    Icon: ShieldCheck,
  },
  MEDIUM: {
    label: "Medium Risk",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    Icon: ShieldAlert,
  },
  HIGH: {
    label: "High Risk",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    textColor: "text-red-400",
    Icon: ShieldOff,
  },
};

export function getRiskMeta(level: RiskLevel): RiskMeta {
  return RISK_MAP[level];
}
