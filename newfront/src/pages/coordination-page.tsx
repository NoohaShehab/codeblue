import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BrainCircuit,
  Check,
  Play,
  Users,
} from "lucide-react";
import { T } from "@/lib/i18n";
import { PageHeader, SectionTitle } from "@/components/command-shell";
import { card } from "@/components/command-page-shared";
import { askAI, type RecommendationDecision } from "@/api/ai";

export function Coordination() {
  const [showReasoning, setShowReasoning] = useState(true);
  const [decision, setDecision] = useState<RecommendationDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await askAI(
        "What should we do about the current ICU and ER pressure?",
      );
      setDecision(response.decision);
      setAcknowledged(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The recommendation service is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecommendations();
  }, []);
  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="coord.eyebrow"
        title="coord.title"
        description="coord.description"
        action={
          <button
            className="flex items-center gap-2 rounded-lg border border-[#c9ddd7] bg-[#eef8f3] px-3 py-2 text-xs font-bold text-[#367b71] hover:bg-[#e2f2eb]"
            onClick={() => setShowReasoning(!showReasoning)}
            data-testid="button-toggle-reasoning"
          >
            <BrainCircuit className="h-4 w-4" />{" "}
            <T
              id={
                showReasoning ? "common.hideReasoning" : "common.showReasoning"
              }
            />
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-[#dce6df] bg-[#eaf5f0] p-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#4c8f84]">
              <span className="pulse-dot h-2 w-2 rounded-full bg-[#4cae9b]" />
              <T id="coord.brief" />
            </div>
            <p className="mt-4 max-w-3xl text-lg font-semibold leading-relaxed tracking-[-.02em] text-[#2b4d50]">
              {loading ? "Loading current operational recommendations..." : decision?.summary ?? error}
            </p>
          </div>
          <div className="p-6">
            <SectionTitle
              title="coord.recommended"
              meta="coord.recommendedMeta"
            />
            <div className="rounded-xl border-2 border-[#a8d5c8] bg-[#f3fbf7] p-5">
              <div className="flex gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#277b76] text-white">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#285853]">
                    {decision?.action ?? "No recommendation available"}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5e7671]">
                    {decision?.reason ?? "The recommendation service has not returned a decision yet."}
                  </p>
                  <button
                    type="button"
                    disabled={!decision || acknowledged}
                    onClick={() => setAcknowledged(true)}
                    className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold shadow-sm transition-all ${
                      acknowledged
                        ? "cursor-default border border-[#9ed2c4] bg-[#e4f5ee] text-[#277b76]"
                        : "bg-[#277b76] text-white hover:-translate-y-0.5 hover:bg-[#1e6966] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    }`}
                    aria-pressed={acknowledged}
                    data-testid="button-activate-flex-pod"
                  >
                    {acknowledged ? <Check className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    {acknowledged
                      ? decision?.status === "requires_approval"
                        ? "Approval requested"
                        : "Acknowledged"
                      : decision?.status === "requires_approval"
                        ? "Request approval"
                        : "Acknowledge and assign owners"}
                  </button>
                </div>
              </div>
            </div>
            {showReasoning && (
              <div className="mt-6">
                <SectionTitle title="coord.why" meta="coord.whyMeta" />
                <div className="space-y-2">
                  {(decision?.recommendations ?? []).map((recommendation, i) => (
                    <div
                      className="flex items-center gap-3 rounded-lg border border-[#e2e8e2] bg-[#fafbf7] p-3 text-xs text-[#566c6c]"
                      key={recommendation.action_id}
                    >
                      <span className="mono grid h-6 w-6 place-items-center rounded-full bg-[#e4f1ec] text-[10px] font-bold text-[#3c897d]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span><strong>{recommendation.action}</strong> | {recommendation.expected_impact}</span>
                    </div>
                  ))}
                  {!loading && !decision?.recommendations.length && (
                    <p className="text-xs text-[#b85d49]">{error ?? "No recommendations returned."}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-5">
          <div className={`${card} p-5`}>
            <SectionTitle
              title="coord.prioritySequence"
              meta="coord.priorityMeta"
            />
            <div className="space-y-3">
              {(decision?.recommendations ?? []).map((recommendation, i) => (
                  <div className="flex items-center gap-3" key={recommendation.action_id}>
                    <div className="mono text-[11px] font-bold text-[#78a19b]">
                      0{i + 1}
                    </div>
                    <div className="h-px w-4 bg-[#b3d2c9]" />
                    <div className="text-xs font-semibold text-[#486267]">
                      {recommendation.action}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className={`${card} p-5`}>
            <SectionTitle title="coord.ownerHandoffs" meta="coord.ownerMeta" />
            <div className="space-y-2">
              {(decision?.recommendations ?? []).map((recommendation) => (
                <div
                  className="flex items-center justify-between rounded-lg bg-[#f3f6f1] px-3 py-2.5"
                  key={recommendation.action_id}
                >
                  <span className="flex items-center gap-2 text-xs text-[#596e6d]">
                    <Users className="h-3.5 w-3.5 text-[#69938e]" />
                    {recommendation.owner}
                  </span>
                  <span className="mono text-[10px] text-[#8b9995]">
                    {recommendation.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
