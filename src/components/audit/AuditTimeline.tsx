import { AuditEntry } from "./AuditEntry";
import type { AuditLogEntry } from "@/lib/mock-data";

interface AuditTimelineProps {
  entries: AuditLogEntry[];
}

function groupByDate(entries: AuditLogEntry[]): Record<string, AuditLogEntry[]> {
  const groups: Record<string, AuditLogEntry[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const entry of entries) {
    const d = new Date(entry.timestamp).toDateString();
    let label: string;
    if (d === today) label = "Today";
    else if (d === yesterday) label = "Yesterday";
    else
      label = new Date(entry.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    if (!groups[label]) groups[label] = [];
    groups[label]!.push(entry);
  }
  return groups;
}

export function AuditTimeline({ entries }: AuditTimelineProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const groups = groupByDate(sorted);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([label, items]) => (
        <div key={label}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {label}
            </h3>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div>
            {items.map((entry) => (
              <AuditEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
