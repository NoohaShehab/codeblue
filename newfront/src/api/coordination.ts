import { getERForecast, getICUForecast, type ERForecastResponse, type ICUForecastResponse } from "@/api/forecast";
import type { RecommendationContext, SimulationScenario } from "@/api/ai";
import {
  getERBottlenecks,
  getERMetrics,
  type ERBottleneckResponse,
  type ERMetricsResponse,
} from "@/api/er-operations";

export type CoordinationContext = {
  bottlenecks: ERBottleneckResponse;
  metrics: ERMetricsResponse;
  forecast: ERForecastResponse | null;
  icuForecast: ICUForecastResponse | null;
  forecastError: string | null;
  icuForecastError: string | null;
};

export async function getCoordinationOperationalContext(): Promise<{
  bottlenecks: ERBottleneckResponse;
  metrics: ERMetricsResponse;
}> {
  const [bottlenecks, metrics] = await Promise.all([
    getERBottlenecks(),
    getERMetrics(),
  ]);
  return { bottlenecks, metrics };
}

export async function getCoordinationForecast(): Promise<{
  er: ERForecastResponse | null;
  icu: ICUForecastResponse | null;
  erError: string | null;
  icuError: string | null;
}> {
  const [erResult, icuResult] = await Promise.allSettled([
    getERForecast(24),
    getICUForecast(24),
  ]);
  return {
    er: erResult.status === "fulfilled" ? erResult.value : null,
    icu: icuResult.status === "fulfilled" ? icuResult.value : null,
    erError: erResult.status === "rejected" ? String(erResult.reason) : null,
    icuError: icuResult.status === "rejected" ? String(icuResult.reason) : null,
  };
}

export function buildRecommendationQuery(context: CoordinationContext): string {
  const bottleneck = context.bottlenecks.bottlenecks[0] ?? null;
  const forecast = context.forecast;
  const forecastContext = forecast
    ? {
        available: true,
        current_arrivals: forecast.current_arrivals,
        peak_arrivals: forecast.peak_arrivals,
        peak_time: forecast.peak_time,
        forecast_window_hours: 24,
      }
    : {
        available: false,
        reason: context.forecastError ?? "Forecast unavailable",
      };

  return [
    "Generate an operational recommendation from the verified hospital data below.",
    "Do not perform clinical triage, diagnose patients, or change nurse-entered priority.",
    "Return a concise operational decision with action, reason, expected impact, owner, status, and evidence.",
    "Current ER bottleneck:",
    JSON.stringify(bottleneck),
    "Current ER metrics:",
    JSON.stringify(context.metrics),
    "Forecast context:",
    JSON.stringify(forecastContext),
  ].join("\n");
}

export function buildRecommendationContext(context: CoordinationContext): RecommendationContext {
  return {
    bottlenecks: context.bottlenecks,
    metrics: context.metrics,
    forecast: context.forecast,
    forecast_error: context.forecastError,
    icu_forecast: context.icuForecast,
    icu_forecast_error: context.icuForecastError,
  };
}

export function buildSimulationScenario(
  bottleneck: CoordinationContext["bottlenecks"]["bottlenecks"][number],
  forecast: ERForecastResponse | null,
  actionId?: string,
): SimulationScenario | null {
  if (actionId === "protect_icu_capacity" || bottleneck.bottleneck_type === "ICU_CAPACITY") {
    return {
      er_arrivals_change: 0,
      icu_beds_unavailable: 0,
      additional_icu_admissions: bottleneck.affected_patient_count,
      delayed_discharges: 0,
      action_id: "protect_icu_capacity",
    };
  }

  if (actionId === "reduce_er_boarding" || bottleneck.bottleneck_type === "TRANSFER_CAPACITY") {
    return {
      er_arrivals_change: 0,
      icu_beds_unavailable: 0,
      additional_icu_admissions: 0,
      delayed_discharges: 0,
      action_id: "reduce_er_boarding",
    };
  }

  if (actionId === "coordinated_discharge_huddle" || bottleneck.bottleneck_type === "DISPOSITION") {
    return {
      er_arrivals_change: 0,
      icu_beds_unavailable: 0,
      additional_icu_admissions: 0,
      delayed_discharges: bottleneck.affected_patient_count,
      action_id: "coordinated_discharge_huddle",
    };
  }

  if (actionId === "increase_triage_capacity" || bottleneck.bottleneck_type === "TRIAGE_CAPACITY") {
    return {
      er_arrivals_change: 0,
      icu_beds_unavailable: 0,
      additional_icu_admissions: 0,
      delayed_discharges: 0,
      action_id: "increase_triage_capacity",
    };
  }

  if (actionId === "increase_physician_capacity" && forecast && forecast.current_arrivals > 0) {
    return {
      er_arrivals_change: Math.max(
        0,
        Math.round(((forecast.peak_arrivals - forecast.current_arrivals) / forecast.current_arrivals) * 100),
      ),
      icu_beds_unavailable: 0,
      additional_icu_admissions: 0,
      delayed_discharges: 0,
      action_id: "increase_physician_capacity",
    };
  }

  return null;
}
