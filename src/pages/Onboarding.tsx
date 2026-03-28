import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, UserCheck, BarChart3, Bot, Check } from "lucide-react";
import { WizardStepper } from "@/components/onboarding/WizardStepper";
import { ScopeVisualizer } from "@/components/connections/ScopeVisualizer";
import { useAuth } from "@/hooks/useAuth";
import { useConnections } from "@/hooks/useConnections";
import { useToast } from "@/components/shared/Toast";
import { cn } from "@/lib/cn";

const STEPS = ["Welcome", "Connect", "Review"];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const { connections, connect } = useConnections();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [connecting, setConnecting] = useState<string | null>(null);

  const connectedProviders = connections
    .filter((c) => c.status === "connected" && c.provider !== "tiktok-ads")
    .map((c) => c.provider);

  const handleConnect = async (provider: "google-ads" | "meta-ads" | "tiktok-ads") => {
    setConnecting(provider);
    await connect(provider);
    setConnecting(null);
  };

  const handleFinish = () => {
    toast("success", "Setup complete!", "Your AI agent is ready to optimize.");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-dvh bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center">
              <Bot className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-semibold">AdBrain</span>
          </div>
        </div>

        <WizardStepper steps={STEPS} currentStep={step} />

        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          {step === 0 && (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
              </h2>
              <p className="text-sm text-zinc-400 mb-8">
                Let's connect your ad accounts so our AI agent can start optimizing your campaigns.
              </p>
              <div className="space-y-4 text-left">
                {[
                  {
                    icon: Shield,
                    text: "Your tokens are stored securely in Auth0 Token Vault — they never reach our servers.",
                  },
                  {
                    icon: UserCheck,
                    text: "You approve every change before it happens. High-risk actions require MFA verification.",
                  },
                  {
                    icon: BarChart3,
                    text: "Start getting cross-platform insights in minutes, not days.",
                  },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-brand-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Connect Your Ad Accounts</h2>
              <p className="text-sm text-zinc-500 mb-6">
                Connect at least one account to continue.
              </p>

              <div className="space-y-4">
                {([
                  { provider: "google-ads" as const, name: "Google Ads", color: "bg-blue-600" },
                  { provider: "meta-ads" as const, name: "Meta Ads", color: "bg-indigo-600" },
                ]).map(({ provider, name, color }) => {
                  const isConnected = connectedProviders.includes(provider);
                  return (
                    <div
                      key={provider}
                      className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold", color)}>
                            {name[0]}
                          </div>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        {isConnected && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <Check className="h-3.5 w-3.5" /> Connected
                          </span>
                        )}
                      </div>
                      <ScopeVisualizer provider={provider} />
                      {!isConnected && (
                        <button
                          onClick={() => handleConnect(provider)}
                          disabled={connecting === provider}
                          className="mt-3 w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {connecting === provider ? "Connecting..." : `Connect with ${name.split(" ")[0]}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Review Your Permissions</h2>
              <p className="text-sm text-zinc-500 mb-6">
                Confirm the permissions granted to AdBrain.
              </p>

              <div className="space-y-4 mb-6">
                {connectedProviders.map((provider) => {
                  const conn = connections.find((c) => c.provider === provider);
                  return (
                    <div key={provider} className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium">{conn?.displayName}</span>
                      </div>
                      <ScopeVisualizer provider={provider} />
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-zinc-500 text-center">
                You can change these permissions anytime from Settings → Connected Accounts.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && connectedProviders.length === 0}
                className="rounded-lg bg-brand-primary px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 0 ? "Let's Go →" : "Next →"}
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="rounded-lg bg-brand-primary px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Start Optimizing →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
