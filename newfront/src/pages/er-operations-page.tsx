import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowUpRight, Clock3, Users } from "lucide-react";
import { Link } from "wouter";
import { getERForecast, type ERForecastResponse } from "@/api/forecast";
import {
  getERBottlenecks,
  getERMetrics,
  getERQueue,
  type ERBottleneck,
  type ERMetricsResponse,
  type ERQueueItem,
} from "@/api/er-operations";
import { PageHeader, SectionTitle } from "@/components/command-shell";
import { ForecastChart, Metric, card } from "@/components/command-page-shared";
import type { ForecastPoint } from "@/lib/ops-data";

const statusLabels: Record<string, string> = {
  ARRIVED: "Arrived",
  REGISTERED: "Registered",
  TRIAGED: "Triaged",
  WAITING_FOR_ASSESSMENT: "Waiting for assessment",
  IN_ASSESSMENT: "In assessment",
  IN_TREATMENT: "In treatment",
  WAITING_FOR_DISPOSITION: "Waiting for disposition",
  WAITING_FOR_ICU: "Waiting for ICU",
  OBSERVATION: "Observation",
  ADMITTED: "Admitted",
};

function formatStatus(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

function formatBottleneck(type: string) {
  return type.replaceAll("_", " ");
}

function toForecastPoints(data: ERForecastResponse | null): ForecastPoint[] {
  return data?.forecast.map((item) => ({
    timestamp: item.time,
    actual: null,
    forecast: item.predicted_arrivals,
    lowerBound: item.lower_bound,
    upperBound: item.upper_bound,
  })) ?? [];
}

function FlowBar({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total > 0 ? Math.max(6, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[#607572]">
        <span>{label}</span>
        <strong className="mono text-[#315158]">{value}</strong>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-[#e5ebe5]">
        <div className="h-full rounded-full bg-[#4aa99b]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function BottleneckCard({ bottleneck }: { bottleneck: ERBottleneck | undefined }) {
  if (!bottleneck) {
    return (
      <div className={`${card} border-[#d3e8e0] bg-[#f4fbf8] p-5`}>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#398271]">
          <Activity className="h-4 w-4" /> No active bottleneck
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#526a6b]">
          Current ER flow is below the deterministic accumulation thresholds.
        </p>
      </div>
    );
  }

  return (
    <div className={`${card} border-[#efd0c8] bg-[#fff7f4] p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#b85d49]">
          <AlertTriangle className="h-4 w-4" /> MAIN BOTTLENECK · LAST 24H
        </div>
        <span className="mono rounded-full bg-[#f8e1db] px-2 py-1 text-[10px] font-bold text-[#b84e3f]">
          {bottleneck.severity}
        </span>
      </div>
      <h2 className="mt-3 text-lg font-bold capitalize text-[#3b4549]">{formatBottleneck(bottleneck.bottleneck_type)}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric label="PENDING TRANSFERS" value={`${bottleneck.affected_patient_count}`} sub="common.patients" />
        <Metric label="erOps.averageWait" value={`${bottleneck.average_wait_minutes}m`} sub="erOps.operational" />
      </div>
      <p className="mt-4 border-t border-[#efdcd5] pt-3 text-xs leading-relaxed text-[#7f7772]">{bottleneck.explanation}</p>
    </div>
  );
}

export function EROperations() {
  const [queue, setQueue] = useState<ERQueueItem[]>([]);
  const [metrics, setMetrics] = useState<ERMetricsResponse | null>(null);
  const [bottlenecks, setBottlenecks] = useState<ERBottleneck[]>([]);
  const [forecast, setForecast] = useState<ERForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getERQueue(), getERMetrics(), getERBottlenecks()])
      .then(([queueResponse, metricsResponse, bottleneckResponse]) => {
        if (!active) return;
        setQueue(queueResponse.patients);
        setMetrics(metricsResponse);
        setBottlenecks(bottleneckResponse.bottlenecks);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load ER operations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getERForecast(24)
      .then((response) => {
        if (active) setForecast(response);
      })
      .catch((requestError: unknown) => {
        if (active) setForecastError(requestError instanceof Error ? requestError.message : "ER forecast unavailable.");
      })
      .finally(() => {
        if (active) setForecastLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const flow = metrics?.flow ?? {};
  const total = metrics?.total_active_patients ?? 0;
  const forecastPoints = toForecastPoints(forecast);

  if (loading) {
    return <div className={`${card} animate-rise p-6 text-sm text-[#697b79]`}>Loading ER operations...</div>;
  }

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="ER operations / patient flow"
        title="See where Emergency is accumulating."
        description="A real-time operational view of the emergency encounter journey. Nurse-entered triage remains informational; this page measures flow, waiting, and capacity only."
        action={<Link href="/er" className="inline-flex items-center gap-1 text-xs font-bold text-[#378d87]">Open ER detail <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
      />
      {error ? <div className="mb-4 rounded-lg border border-[#efd0c8] bg-[#fff7f4] p-3 text-xs text-[#a95848]">{error}</div> : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className={`${card} p-4`}><Users className="h-4 w-4 text-[#4aa99b]" /><div className="mt-3 mono text-2xl font-bold text-[#315158]">{metrics?.total_active_patients ?? 0}</div><div className="mt-1 text-[10px] text-[#80908d]">Active patients</div></div>
        <div className={`${card} p-4`}><Clock3 className="h-4 w-4 text-[#c88443]" /><div className="mt-3 mono text-2xl font-bold text-[#315158]">{metrics?.patients_waiting_for_assessment ?? 0}</div><div className="mt-1 text-[10px] text-[#80908d]">Waiting for assessment</div></div>
        <div className={`${card} p-4`}><Activity className="h-4 w-4 text-[#4aa99b]" /><div className="mt-3 mono text-2xl font-bold text-[#315158]">{metrics?.patients_in_assessment ?? 0}</div><div className="mt-1 text-[10px] text-[#80908d]">In assessment</div></div>
        <div className={`${card} p-4`}><Activity className="h-4 w-4 text-[#c88443]" /><div className="mt-3 mono text-2xl font-bold text-[#315158]">{metrics?.patients_in_treatment ?? 0}</div><div className="mt-1 text-[10px] text-[#80908d]">In treatment</div></div>
        <div className={`${card} p-4`}><AlertTriangle className="h-4 w-4 text-[#d76655]" /><div className="mt-3 mono text-2xl font-bold text-[#315158]">{metrics?.patients_waiting_for_icu ?? 0}</div><div className="mt-1 text-[10px] text-[#80908d]">Waiting for ICU</div></div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className={`${card} p-5`}>
          <SectionTitle title="Patient flow" meta="Current active encounters by operational stage" />
          <div className="space-y-4">
            <FlowBar label="Arrival" value={flow.ARRIVED ?? 0} total={total} />
            <FlowBar label="Registration" value={flow.REGISTERED ?? 0} total={total} />
            <FlowBar label="Triage" value={flow.TRIAGED ?? 0} total={total} />
            <FlowBar label="Waiting" value={flow.WAITING_FOR_ASSESSMENT ?? 0} total={total} />
            <FlowBar label="Assessment" value={flow.IN_ASSESSMENT ?? 0} total={total} />
            <FlowBar label="Treatment" value={flow.IN_TREATMENT ?? 0} total={total} />
            <FlowBar label="Disposition" value={flow.WAITING_FOR_DISPOSITION ?? 0} total={total} />
          </div>
        </section>
        <BottleneckCard bottleneck={bottlenecks[0]} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <section className={`${card} p-5`}>
          <SectionTitle title="Waiting time" meta="Operational duration, not clinical priority" />
          <div className="grid grid-cols-2 gap-4">
            <Metric label="erOps.averageWait" value={`${metrics?.average_wait_minutes ?? 0}m`} sub="erOps.activeQueue" />
            <Metric label="erOps.longestWait" value={`${metrics?.longest_wait_minutes ?? 0}m`} sub={metrics?.longest_waiting_patient_id ? `Patient ${metrics.longest_waiting_patient_id}` : "erOps.noPatient"} />
            <Metric label="erOps.waitingPatients" value={`${metrics?.patients_waiting_for_assessment ?? 0}`} sub="common.patients" />
            <Metric label="erOps.asOf" value={metrics?.as_of ? new Date(metrics.as_of).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"} sub="erOps.syntheticClock" />
          </div>
        </section>
        <section className={`${card} p-5`}>
          <SectionTitle title="Forecasted ER demand" meta="Existing arrival forecast / next 24 hours" />
          {forecastLoading ? <p className="py-12 text-sm text-[#84928e]">Loading ER forecast...</p> : forecastError ? <p className="py-12 text-sm text-[#a95848]">{forecastError}</p> : forecastPoints.length > 0 ? <ForecastChart data={forecastPoints} label="er-operations-forecast" yDomain={[0, Math.max(10, ...forecastPoints.map((point) => point.upperBound))]} /> : <p className="py-12 text-sm text-[#84928e]">Forecast unavailable.</p>}
          {forecast ? <p className="mt-2 text-[10px] text-[#84928e]">Peak: {forecast.peak_arrivals} expected arrivals at {new Date(forecast.peak_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p> : null}
        </section>
      </div>

      <section className={`${card} mt-5 overflow-hidden`}>
        <div className="p-5"><SectionTitle title="Patient queue" meta="Ordered by arrival time; nurse-entered triage is shown for context only" /></div>
        {queue.length === 0 ? <div className="border-t border-[#e2e8e1] p-5 text-sm text-[#84928e]">No active emergency encounters are present. Run the synthetic ER demo seed to populate local development data.</div> : <div className="overflow-x-auto border-t border-[#e2e8e1]"><table className="w-full min-w-[760px] text-start text-xs"><thead className="bg-[#f5f6f1] text-[10px] uppercase tracking-[.08em] text-[#84928e]"><tr><th className="px-5 py-3 text-start">Patient</th><th className="px-3 py-3 text-start">Current stage</th><th className="px-3 py-3 text-start">Triage</th><th className="px-3 py-3 text-start">Waiting</th><th className="px-5 py-3 text-end">Status</th></tr></thead><tbody className="divide-y divide-[#e7ebe5]">{queue.map((patient) => <tr key={patient.visit_id} className="hover:bg-[#f8f9f5]"><td className="px-5 py-3.5 font-semibold text-[#334b52]">{patient.patient_label}</td><td className="px-3 py-3.5 text-[#526a6d]">{formatStatus(patient.current_status)}</td><td className="px-3 py-3.5 text-[#526a6d]">{patient.triage_level ?? "-"}{patient.triage_priority ? ` · ${patient.triage_priority}` : ""}</td><td className="px-3 py-3.5 mono text-[#526a6d]">{patient.waiting_minutes}m</td><td className="px-5 py-3.5 text-end"><span className="rounded-full bg-[#dcefe9] px-2 py-1 text-[10px] font-bold uppercase text-[#287969]">{formatStatus(patient.current_status)}</span></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
