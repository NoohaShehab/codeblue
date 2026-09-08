import { useState } from "react";
import {
  ArrowUpRight,
  BrainCircuit,
  Play,
  Users,
} from "lucide-react";
import { T } from "@/lib/i18n";
import { PageHeader, SectionTitle } from "@/components/command-shell";
import { card } from "@/components/command-page-shared";

export function Coordination() {
  const [showReasoning, setShowReasoning] = useState(true);
  const reasoning = ["coord.reason1", "coord.reason2", "coord.reason3"];
  const ownerTeams = [
    "coord.medicineCharge",
    "coord.pharmacy",
    "coord.caseManagement",
    "coord.bedPlacement",
  ];
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
              <T id="coord.situation" />
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
                    <T id="coord.flexPod" />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5e7671]">
                    <T id="coord.flexPodText" />
                  </p>
                  <button
                    className="mt-4 rounded-lg bg-[#277b76] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1e6966]"
                    data-testid="button-activate-flex-pod"
                  >
                    <T id="coord.acknowledge" />{" "}
                    <ArrowUpRight className="ms-1 inline h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {showReasoning && (
              <div className="mt-6">
                <SectionTitle title="coord.why" meta="coord.whyMeta" />
                <div className="space-y-2">
                  {reasoning.map((r, i) => (
                    <div
                      className="flex items-center gap-3 rounded-lg border border-[#e2e8e2] bg-[#fafbf7] p-3 text-xs text-[#566c6c]"
                      key={r}
                    >
                      <span className="mono grid h-6 w-6 place-items-center rounded-full bg-[#e4f1ec] text-[10px] font-bold text-[#3c897d]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <T id={r} />
                    </div>
                  ))}
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
              {["coord.priority1", "coord.priority2", "coord.priority3"].map(
                (p, i) => (
                  <div className="flex items-center gap-3" key={p}>
                    <div className="mono text-[11px] font-bold text-[#78a19b]">
                      0{i + 1}
                    </div>
                    <div className="h-px w-4 bg-[#b3d2c9]" />
                    <div className="text-xs font-semibold text-[#486267]">
                      <T id={p} />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
          <div className={`${card} p-5`}>
            <SectionTitle title="coord.ownerHandoffs" meta="coord.ownerMeta" />
            <div className="space-y-2">
              {ownerTeams.map((team, i) => (
                <div
                  className="flex items-center justify-between rounded-lg bg-[#f3f6f1] px-3 py-2.5"
                  key={team}
                >
                  <span className="flex items-center gap-2 text-xs text-[#596e6d]">
                    <Users className="h-3.5 w-3.5 text-[#69938e]" />
                    <T id={team} />
                  </span>
                  <span className="mono text-[10px] text-[#8b9995]">
                    <T id={i < 2 ? "coord.ready" : "coord.standBy"} />
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
