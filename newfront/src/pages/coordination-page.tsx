import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BrainCircuit,
  Check,
  Clock3,
  Gauge,
  Play,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { T } from "@/lib/i18n";
import { PageHeader, SectionTitle } from "@/components/command-shell";
import { card } from "@/components/command-page-shared";
import { askAI, simulateAI, type RecommendationDecision, type SimulationResponse } from "@/api/ai";
import {
  buildRecommendationContext,
  buildSimulationScenario,
  getCoordinationForecast,
  getCoordinationOperationalContext,
  type CoordinationContext,
} from "@/api/coordination";
import type { ERBottleneck, ERMetricsResponse } from "@/api/er-operations";
import type { ERForecastResponse } from "@/api/forecast";

export function Coordination() {
  const [showReasoning, setShowReasoning] = useState(true);
  const [decision, setDecision] = useState<RecommendationDecision | null>(null);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [operationalError, setOperationalError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ERMetricsResponse | null>(null);
  const [bottleneck, setBottleneck] = useState<ERBottleneck | null>(null);
  const [forecast, setForecast] = useState<ERForecastResponse | null>(null);
  const [icuForecast, setIcuForecast] = useState<CoordinationContext["icuForecast"]>(null);
  const [icuForecastError, setIcuForecastError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCoordinationOperationalContext()
      .then((context) => {
        if (!active) return;
        setMetrics(context.metrics);
        setBottleneck(context.bottlenecks.bottlenecks[0] ?? null);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setOperationalError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load ER operational context.",
          );
        }
      })
      .finally(() => {
        if (active) setOperationalLoading(false);
      });

    getCoordinationForecast()
      .then((response) => {
        if (active) {
          setForecast(response.er);
          setIcuForecast(response.icu);
          setForecastError(response.erError);
          setIcuForecastError(response.icuError);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setForecastError(
            requestError instanceof Error
              ? requestError.message
              : "ER forecast unavailable.",
          );
        }
      })
      .finally(() => {
        if (active) setForecastLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (operationalLoading || !metrics || !bottleneck) return;
    let active = true;
    const context: CoordinationContext = {
      bottlenecks: {
        as_of: null,
        bottlenecks: [bottleneck],
      },
      metrics,
      forecast,
      forecastError,
      icuForecast,
      icuForecastError,
    };
    setRecommendationLoading(true);
    setError(null);
    askAI("Generate the operational decision from the supplied structured bottleneck context.", buildRecommendationContext(context))
      .then((response) => {
        if (!active) return;
        setDecision(response.decision);
        setAcknowledged(false);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "The recommendation service is unavailable.",
          );
        }
      })
      .finally(() => {
        if (active) setRecommendationLoading(false);
      });

    return () => {
      active = false;
    };
  }, [operationalLoading, metrics, bottleneck, forecast, forecastError, icuForecast, icuForecastError]);

  const loading = operationalLoading || recommendationLoading;
  const simulationScenario = bottleneck
    ? buildSimulationScenario(bottleneck, forecast, decision?.action_id)
    : null;
  const simulationUnsupported = Boolean(decision && bottleneck && !simulationScenario);
  const simulationHref = simulationScenario
    ? `/simulation?${new URLSearchParams({
        erArrivalDelta: String(simulationScenario.er_arrivals_change),
        icuBedReduction: String(simulationScenario.icu_beds_unavailable),
        icuAdmissionDelta: String(simulationScenario.additional_icu_admissions),
        delayedDischarges: String(simulationScenario.delayed_discharges),
        ...(simulationScenario.action_id
          ? { actionId: simulationScenario.action_id }
          : {}),
      }).toString()}`
    : null;
  const runSimulation = async () => {
    if (!simulationScenario || simulationLoading) return;
    setSimulationLoading(true);
    setSimulationError(null);
    try {
      setSimulation(await simulateAI(simulationScenario));
    } catch (requestError: unknown) {
      setSimulationError(
        requestError instanceof Error
          ? requestError.message
          : "The simulation service is unavailable.",
      );
    } finally {
      setSimulationLoading(false);
    }
  };
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
              {operationalLoading
                ? "Loading current ER operational context..."
                : recommendationLoading
                  ? "Generating a recommendation from the detected bottleneck..."
                  : decision?.summary ?? operationalError ?? error ?? "No operational brief available."}
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
                  {simulationUnsupported && (
                    <p className="mt-2 text-[10px] text-[#a95848]">
                      This recommendation is not representable by the current what-if model.
                    </p>
                  )}
                  {simulationHref && (
                    <Link
                      href={simulationHref}
                      className="ms-2 mt-4 inline-flex items-center gap-2 rounded-lg border border-[#bcded3] bg-white px-4 py-2.5 text-xs font-bold text-[#277b76] hover:bg-[#eef8f3]"
                    >
                      <Play className="h-3.5 w-3.5" /> Test in simulation
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={!simulationScenario || simulationLoading}
                    onClick={runSimulation}
                    className="ms-2 mt-4 inline-flex items-center gap-2 rounded-lg border border-[#bcded3] bg-white px-4 py-2.5 text-xs font-bold text-[#277b76] hover:bg-[#eef8f3] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    {simulationLoading ? "Running what-if..." : "Test recommendation impact"}
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
                  {!loading && !(decision?.recommendations ?? []).length && (
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
        <div className="space-y-5">
          <div className={`${card} p-5`}>
            <SectionTitle title="Current bottleneck" meta="Detected by ER operations bottleneck engine" />
            {operationalLoading ? (
              <p className="text-sm text-[#84928e]">Loading bottleneck data...</p>
            ) : bottleneck ? (
              <div className="rounded-lg border border-[#efd0c8] bg-[#fff7f4] p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm capitalize text-[#3b4549]">{bottleneck.bottleneck_type.replaceAll("_", " ")}</strong>
                  <span className="mono rounded-full bg-[#f8e1db] px-2 py-1 text-[10px] font-bold text-[#b84e3f]">{bottleneck.severity}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#7f7772]">{bottleneck.explanation}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#efdcd5] pt-3">
                  <div className="flex items-center gap-2 text-xs text-[#607572]"><Users className="h-3.5 w-3.5" />{bottleneck.affected_patient_count} affected patients</div>
                  <div className="flex items-center gap-2 text-xs text-[#607572]"><Clock3 className="h-3.5 w-3.5" />{bottleneck.average_wait_minutes}m average wait</div>
                </div>
              </div>
            ) : <p className="text-sm text-[#84928e]">No active bottleneck was returned.</p>}
          </div>
          <div className={`${card} p-5`}>
            <SectionTitle title="Operational evidence" meta="Current ER state supporting the recommendation" />
            {metrics ? <div className="grid grid-cols-2 gap-4"><div className="flex items-center gap-2 text-xs text-[#607572]"><Users className="h-3.5 w-3.5 text-[#4aa99b]" />{metrics.total_active_patients} active patients</div><div className="flex items-center gap-2 text-xs text-[#607572]"><Clock3 className="h-3.5 w-3.5 text-[#c88443]" />{metrics.average_wait_minutes}m average wait</div><div className="flex items-center gap-2 text-xs text-[#607572]"><Gauge className="h-3.5 w-3.5 text-[#4aa99b]" />{metrics.patients_in_treatment} in treatment</div><div className="flex items-center gap-2 text-xs text-[#607572]"><ArrowUpRight className="h-3.5 w-3.5 text-[#d76655]" />{metrics.patients_waiting_for_icu} waiting for ICU</div></div> : <p className="text-sm text-[#84928e]">Operational evidence unavailable.</p>}
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className={`${card} p-5`}>
          <SectionTitle title="Forecast context" meta="Current state plus predicted ER demand" />
          {forecastLoading ? <p className="text-sm text-[#84928e]">Loading ER forecast...</p> : forecastError ? <p className="text-sm text-[#a95848]">{forecastError}</p> : forecast ? <div className="grid grid-cols-3 gap-4"><div><div className="mono text-xl font-bold text-[#315158]">{forecast.current_arrivals}</div><div className="text-[10px] text-[#84928e]">Current arrivals</div></div><div><div className="mono text-xl font-bold text-[#315158]">{forecast.peak_arrivals}</div><div className="text-[10px] text-[#84928e]">Peak arrivals</div></div><div><div className="mono text-xl font-bold text-[#315158]">{new Date(forecast.peak_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div><div className="text-[10px] text-[#84928e]">Peak time</div></div></div> : <p className="text-sm text-[#84928e]">Forecast unavailable.</p>}
        </div>
        <div className={`${card} p-5`}>
          <SectionTitle title="Decision support" meta="Test the recommended action using the existing What-if simulation" />
          <p className="text-sm leading-relaxed text-[#5e7671]">The recommendation is based on the detected bottleneck and current ER evidence. The test uses only the affected-patient count or forecast delta when the existing simulation contract supports that bottleneck.</p>
          {simulationError ? <p className="mt-3 text-xs text-[#a95848]">{simulationError}</p> : null}
          {simulation ? <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[#f3f6f1] p-3 text-xs text-[#526a6b]"><div>ER pressure: <strong>{simulation.scenario_metrics.er_pressure}</strong></div><div>ICU occupancy: <strong>{simulation.scenario_metrics.icu_occupancy_percent}%</strong></div><div>Available beds: <strong>{simulation.scenario_metrics.available_beds}</strong></div><div>Wait index: <strong>{simulation.changes.wait_time_index}</strong></div></div> : null}
          <Link href="/simulation" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#277b76] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e6966]"><Play className="h-3.5 w-3.5" /> Open What-if Simulation</Link>
        </div>
      </div>
    </div>
  );
}
