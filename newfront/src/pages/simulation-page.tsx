import { useState } from "react";
import { Layers3, Play, RefreshCw } from "lucide-react";
import { T, useI18n } from "@/lib/i18n";
import { defaultScenario, type SimulationScenario } from "@/lib/ops-data";
import { simulateAI, type SimulationResponse } from "@/api/ai";
import { PageHeader, SectionTitle } from "@/components/command-shell";
import {
  Outcome,
  SimSlider,
  SimulationOutcome,
  card,
} from "@/components/command-page-shared";

function readIncomingScenario() {
  const params = new URLSearchParams(window.location.search);
  const readNumber = (name: string, min: number, max: number) => {
    const value = Number(params.get(name));
    return Number.isFinite(value) && value >= min && value <= max
      ? value
      : null;
  };
  const erArrivalDelta = readNumber("erArrivalDelta", -30, 30);
  const icuBedReduction = readNumber("icuBedReduction", -6, 6);
  const icuAdmissionDelta = readNumber("icuAdmissionDelta", -6, 6);
  const delayedDischarges = readNumber("delayedDischarges", -6, 6);
  const hasScenario = [
    erArrivalDelta,
    icuBedReduction,
    icuAdmissionDelta,
    delayedDischarges,
  ].every((value) => value !== null);

  return {
    scenario: hasScenario
      ? {
          erArrivalDelta: erArrivalDelta as number,
          icuBedReduction: icuBedReduction as number,
          icuAdmissionDelta: icuAdmissionDelta as number,
          delayedDischarges: delayedDischarges as number,
        }
      : defaultScenario,
    actionId: hasScenario ? params.get("actionId") : null,
  };
}

export function Simulation() {
  const [incomingScenario] = useState(readIncomingScenario);
  const [scenario, setScenario] = useState<SimulationScenario>(
    incomingScenario.scenario,
  );
  const [actionId, setActionId] = useState<string | null>(
    incomingScenario.actionId,
  );
  const [fromRecommendation, setFromRecommendation] = useState(
    Boolean(incomingScenario.actionId),
  );
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof SimulationScenario, value: number) =>
    setScenario((s) => ({ ...s, [key]: value }));
  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(
        await simulateAI({
          er_arrivals_change: scenario.erArrivalDelta,
          icu_beds_unavailable: scenario.icuBedReduction,
          additional_icu_admissions: scenario.icuAdmissionDelta,
          delayed_discharges: scenario.delayedDischarges,
          action_id: actionId ?? undefined,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The simulation service is unavailable.",
      );
    } finally {
      setRunning(false);
    }
  };
  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="simulation.eyebrow"
        title="simulation.title"
        description="simulation.description"
        action={
          <button
            onClick={() => {
              setScenario(defaultScenario);
              setActionId(null);
              setFromRecommendation(false);
              window.history.replaceState({}, "", window.location.pathname);
              setResult(null);
              setError(null);
            }}
            className="flex items-center gap-2 rounded-lg border border-[#d6e1db] bg-[#fbfaf7] px-3 py-2 text-xs text-[#637977] hover:bg-[#eef2ed]"
            data-testid="button-reset-simulation"
          >
            <RefreshCw className="h-3.5 w-3.5" /> <T id="common.reset" />
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <div className={`${card} p-5`}>
          <SectionTitle
            title="simulation.conditions"
            meta="simulation.conditionsMeta"
          />
          {fromRecommendation && (
            <div className="mb-4 text-[10px] uppercase tracking-[.12em] text-[#84928e]">
              Prefilled from AI recommendation{actionId ? ` · ${actionId}` : ""}
            </div>
          )}
          <div className="space-y-7">
            <SimSlider
              label="simulation.erArrivals"
              value={scenario.erArrivalDelta}
              min={-30}
              max={30}
              step={5}
              unit="%"
              onChange={(v) => update("erArrivalDelta", v)}
            />

            <SimSlider
              label="simulation.icuUnavailable"
              value={scenario.icuBedReduction}
              min={-6}
              max={6}
              step={1}
              unit=" common.beds"
              onChange={(v) => update("icuBedReduction", v)}
            />

            <SimSlider
              label="simulation.additionalAdmissions"
              value={scenario.icuAdmissionDelta}
              min={-6}
              max={6}
              step={1}
              unit=" common.patients"
              onChange={(v) => update("icuAdmissionDelta", v)}
            />

            <SimSlider
              label="simulation.delayedDischarges"
              value={scenario.delayedDischarges}
              min={-6}
              max={6}
              step={1}
              unit=" common.patients"
              onChange={(v) => update("delayedDischarges", v)}
            />
          </div>
          <button
            onClick={run}
            disabled={running}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-[#267a75] py-3 text-xs font-bold text-white hover:bg-[#1c6763] disabled:cursor-wait disabled:opacity-70"
            data-testid="button-run-simulation"
          >
            {running ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />{" "}
                <T id="common.runningScenario" />
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> <T id="common.runSimulation" />
              </>
            )}
          </button>
          {error && <p className="mt-3 text-xs text-[#b85d49]">{error}</p>}
        </div>
        <div className={`${card} min-h-[430px] p-5`}>
          <SectionTitle
            title="simulation.outcome"
            meta={
              result ? "simulation.outcomeCompared" : "simulation.outcomeMeta"
            }
          />
          {result && (
            <div className="mb-3 text-[10px] uppercase tracking-[.12em] text-[#84928e]">
              {result.label === "ai_recommendation"
                ? "AI recommendation scenario"
                : "Manual what-if scenario"}
            </div>
          )}
          {result ? (
            <SimulationOutcome result={result} />
          ) : (
            <div className="grid h-[350px] place-items-center rounded-xl border border-dashed border-[#cfded6] bg-[#f7f9f5] text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e2f1eb] text-[#4b998e]">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-bold text-[#536d6c]">
                  <T id="simulation.noRun" />
                </div>
                <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-[#899692]">
                  <T id="simulation.noRunText" />
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
