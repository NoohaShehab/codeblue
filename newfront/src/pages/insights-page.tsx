import { useState } from "react";
import { T } from "@/lib/i18n";
import { insights, type Severity } from "@/lib/ops-data";
import { PageHeader } from "@/components/command-shell";
import { InsightCount, InsightRow } from "@/components/command-page-shared";

export function Insights() {
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const filtered =
    filter === "all" ? insights : insights.filter((i) => i.severity === filter);
  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="insights.eyebrow"
        title="insights.title"
        description="insights.description"
        action={
          <div className="flex gap-1 rounded-lg border border-[#d6e0da] bg-[#fbfaf7] p-1">
            {(["all", "critical", "watch", "stable"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-[10px] font-bold capitalize ${filter === f ? "bg-[#d9eee8] text-[#27756e]" : "text-[#80908e] hover:bg-[#eef1ec]"}`}
                data-testid={`button-filter-${f}`}
              >
                <T id={f === "all" ? "insights.all" : `status.${f}`} />
              </button>
            ))}
          </div>
        }
      />
      <div className="mb-5 grid grid-cols-3 gap-3 md:max-w-[520px]">
        <InsightCount
          value={insights.filter((i) => i.severity === "critical").length}
          label="status.critical"
          tone="critical"
        />
        <InsightCount
          value={insights.filter((i) => i.severity === "watch").length}
          label="status.watch"
          tone="watch"
        />
        <InsightCount
          value={insights.filter((i) => i.severity === "stable").length}
          label="status.stable"
          tone="stable"
        />
      </div>
      <div className="space-y-3">
        {filtered.map((insight) => (
          <InsightRow key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
