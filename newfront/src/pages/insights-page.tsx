import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { T } from "@/lib/i18n";
import {
  getInsights,
  type Insight,
  type InsightSeverity,
} from "@/api/insights";
import { PageHeader, StatusPill } from "@/components/command-shell";
import { InsightCount, card } from "@/components/command-page-shared";

function LiveInsightRow({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`${card} overflow-hidden`}
      data-testid={`insight-${insight.id}`}
    >
      <button
        className="flex w-full items-start gap-3 p-4 text-start hover:bg-[#f7f7f2]"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-insight-${insight.id}`}
      >
        <div
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${insight.severity === "critical" ? "bg-[#d76655]" : insight.severity === "watch" ? "bg-[#e3a13e]" : "bg-[#4cae9b]"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-[#2d444c]">
              {insight.title}
            </span>
            <StatusPill status={insight.severity} />
            <span className="text-[10px] text-[#8a9995]">
              {insight.department}
            </span>
          </div>
          <div className="text-xs leading-relaxed text-[#73817f]">
            {insight.description}
          </div>
        </div>
        {expanded ? (
          <ArrowDownRight className="mt-1 h-4 w-4 shrink-0 text-[#7a918e]" />
        ) : (
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#7a918e]" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-[#e3e8e2] bg-[#f7f8f4] px-4 pb-4 pt-3 ps-10">
          <div className="mb-4">
            <div className="mb-1 mono text-[9px] uppercase tracking-wider text-[#8b9a96]">
              WHY
            </div>
            <p className="leading-relaxed text-[#526a6b]">{insight.why}</p>
          </div>
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div>
              <div className="mb-1 mono text-[9px] uppercase tracking-wider text-[#8b9a96]">
                Evidence
              </div>
              <div className="space-y-2">
                {insight.evidence.map((item) => (
                  <div
                    className="flex items-center justify-between gap-3"
                    key={`${item.label}-${item.source}`}
                  >
                    <span className="text-[#526a6b]">{item.label}</span>
                    <span className="mono text-[#405e62]">
                      {String(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 mono text-[9px] uppercase tracking-wider text-[#8b9a96]">
                Source
              </div>
              <p className="leading-relaxed text-[#526a6b]">{insight.source}</p>
              {insight.as_of && (
                <p className="mt-2 leading-relaxed text-[#80908d]">
                  As of {insight.as_of}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Insights() {
  const [filter, setFilter] = useState<"all" | InsightSeverity>("all");
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getInsights>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getInsights()
      .then((response) => {
        if (active) setData(response);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load insights",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const insights = data?.insights ?? [];
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
          value={data?.summary.critical ?? 0}
          label="status.critical"
          tone="critical"
        />
        <InsightCount
          value={data?.summary.watch ?? 0}
          label="status.watch"
          tone="watch"
        />
        <InsightCount
          value={data?.summary.stable ?? 0}
          label="status.stable"
          tone="stable"
        />
      </div>
      {error && (
        <div className={`${card} p-5 text-sm text-[#b85d49]`}>{error}</div>
      )}
      {!data && !error && (
        <div className={`${card} p-5 text-sm text-[#697b79]`}>
          Loading insights...
        </div>
      )}
      {data && (
        <div className="space-y-3">
          {filtered.map((insight) => (
            <LiveInsightRow key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
