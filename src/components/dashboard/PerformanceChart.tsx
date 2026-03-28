import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { generatePerformanceData } from "@/lib/mock-data";

export function PerformanceChart() {
  const data = useMemo(() => generatePerformanceData(), []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Performance Comparison
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">ROAS — Last 30 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-primary" />
            Google Ads
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Meta Ads
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
              domain={[1, 5]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Legend content={() => null} />
            <Line
              type="monotone"
              dataKey="google"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#2563eb" }}
              name="Google Ads"
            />
            <Line
              type="monotone"
              dataKey="meta"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#7c3aed" }}
              name="Meta Ads"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
