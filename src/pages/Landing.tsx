import { useNavigate } from "react-router-dom";
import {
  Shield,
  Bot,
  UserCheck,
  Link2,
  BarChart3,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "@/components/auth/LoginButton";

const FEATURES = [
  {
    icon: Shield,
    title: "Secure",
    description:
      "Tokens never leave Auth0 Token Vault. MFA required for high-risk actions. Your credentials stay protected at every layer.",
  },
  {
    icon: Bot,
    title: "Smart",
    description:
      "Cross-platform AI analysis across Google & Meta Ads. Get actionable proposals backed by data-driven reasoning.",
  },
  {
    icon: UserCheck,
    title: "You're in Control",
    description:
      "Approve or reject every change the agent proposes. Full audit trail of every action. Revoke access anytime.",
  },
] as const;

const STEPS = [
  {
    icon: Link2,
    num: "1",
    title: "Connect",
    description: "Link your ad accounts securely via Auth0",
  },
  {
    icon: BarChart3,
    num: "2",
    title: "Analyze",
    description: "AI reviews your campaigns and generates proposals",
  },
  {
    icon: CheckCircle,
    num: "3",
    title: "Approve",
    description: "Review & approve each change — high-risk needs MFA",
  },
] as const;

export function Landing() {
  const { isAuthenticated, loginWithRedirect } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      loginWithRedirect();
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 h-16 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center">
            <Bot className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">AdBrain</span>
        </div>
        {isAuthenticated ? (
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <LoginButton />
        )}
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 sm:py-28 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs text-zinc-400">
          <Shield className="h-3.5 w-3.5 text-brand-primary" />
          Powered by Auth0 Token Vault
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          AI-Powered Ad Optimization with{" "}
          <span className="text-brand-primary">Enterprise-Grade Security</span>
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-xl leading-relaxed">
          Your AI agent optimizes Google Ads & Meta campaigns while you stay in full control.
          Every action is authorized, auditable, and revocable.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand-primary/20 hover:bg-blue-700 transition-all hover:shadow-brand-primary/30"
          >
            Get Started with Google
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-8 py-16 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 mb-4">
                <f.icon className="h-5 w-5 text-brand-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 sm:px-8 py-16 border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 mb-4 text-brand-primary font-bold text-xl">
                  {s.num}
                </div>
                <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-400">{s.description}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden sm:block h-5 w-5 text-zinc-700 absolute translate-x-[140px] mt-7" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 px-4 sm:px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Shield className="h-4 w-4" />
            Powered by Auth0 Token Vault
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>&copy; {new Date().getFullYear()} AdBrain</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
