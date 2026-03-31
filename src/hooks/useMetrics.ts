import { useState, useCallback, useEffect } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useSystemConfig } from "@/hooks/useSystemConfig";

export interface DashboardMetrics {
  spend: { value: string; change: string; trend: "up" | "down"; trendPositive: boolean };
  ctr: { value: string; change: string; trend: "up" | "down"; trendPositive: boolean };
  cpa: { value: string; change: string; trend: "up" | "down"; trendPositive: boolean };
  roas: { value: string; change: string; trend: "up" | "down"; trendPositive: boolean };
}

const MOCK_METRICS: DashboardMetrics = {
  spend: { value: "$4,702", change: "+12%", trend: "up", trendPositive: false },
  ctr: { value: "3.2%", change: "+0.4%", trend: "up", trendPositive: true },
  cpa: { value: "$12.40", change: "-$2.10", trend: "down", trendPositive: true },
  roas: { value: "4.2x", change: "+0.3x", trend: "up", trendPositive: true },
};

export function useMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(MOCK_METRICS);
  const [source, setSource] = useState<"mock" | "live">("mock");
  const [isLoading, setIsLoading] = useState(false);
  const authFetch = useAuthFetch();
  const { config } = useSystemConfig();

  const fetchLiveMetrics = useCallback(async () => {
    if (!config.proxyReady) {
      setMetrics(MOCK_METRICS);
      setSource("mock");
      return;
    }

    setIsLoading(true);
    try {
      const fetches: Promise<Response>[] = [];
      if (config.googleDeveloperToken) {
        fetches.push(authFetch("/api/proxy?action=google-ads&path=/customers"));
      }
      if (config.metaConfigured) {
        fetches.push(authFetch("/api/proxy?action=meta-ads&path=/me/adaccounts"));
      }
      const results = await Promise.allSettled(fetches);

      let hasLiveData = false;
      let totalSpend = 0;
      let totalClicks = 0;
      let totalImpressions = 0;
      let totalConversions = 0;
      let totalRevenue = 0;

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.ok) {
          try {
            const data = await result.value.json();
            const campaigns = data.campaigns ?? data.data ?? data.results ?? [];
            if (Array.isArray(campaigns) && campaigns.length > 0) {
              hasLiveData = true;
              for (const c of campaigns) {
                totalSpend += Number(c.spend ?? c.cost ?? 0);
                totalClicks += Number(c.clicks ?? 0);
                totalImpressions += Number(c.impressions ?? 0);
                totalConversions += Number(c.conversions ?? 0);
                totalRevenue += Number(c.conversion_value ?? c.revenue ?? 0);
              }
            }
          } catch {
            // parse failed, continue
          }
        }
      }

      if (hasLiveData && totalImpressions > 0) {
        const ctr = (totalClicks / totalImpressions) * 100;
        const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
        const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

        setMetrics({
          spend: {
            value: `$${totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
            change: "live",
            trend: "up",
            trendPositive: false,
          },
          ctr: {
            value: `${ctr.toFixed(1)}%`,
            change: "live",
            trend: "up",
            trendPositive: true,
          },
          cpa: {
            value: `$${cpa.toFixed(2)}`,
            change: "live",
            trend: "down",
            trendPositive: true,
          },
          roas: {
            value: `${roas.toFixed(1)}x`,
            change: "live",
            trend: "up",
            trendPositive: true,
          },
        });
        setSource("live");
      } else {
        setMetrics(MOCK_METRICS);
        setSource("mock");
      }
    } catch {
      setMetrics(MOCK_METRICS);
      setSource("mock");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, config.proxyReady, config.googleDeveloperToken, config.metaConfigured]);

  useEffect(() => {
    fetchLiveMetrics();
  }, [fetchLiveMetrics]);

  return { metrics, source, isLoading, refresh: fetchLiveMetrics };
}
