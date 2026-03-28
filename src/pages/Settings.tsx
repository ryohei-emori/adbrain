import { useAuth } from "@/hooks/useAuth";
import { LLMUsageCard } from "@/components/dashboard/LLMUsageCard";
import { MOCK_LLM_USAGE } from "@/lib/mock-data";
import { User, Mail, Shield } from "lucide-react";

export function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Account settings and LLM usage
        </p>
      </div>

      <LLMUsageCard usage={MOCK_LLM_USAGE} />

      {/* Account Info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-sm font-semibold text-zinc-100 mb-4">Account</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Name</p>
              <p className="text-sm text-zinc-200">{user?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
              <Mail className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Email</p>
              <p className="text-sm text-zinc-200">{user?.email ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
              <Shield className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Auth Provider</p>
              <p className="text-sm text-zinc-200">Auth0 (Google OAuth)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-zinc-500 mb-4">
          These actions are irreversible. Proceed with caution.
        </p>
        <button className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}
