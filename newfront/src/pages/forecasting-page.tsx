import { useState } from "react";
import { Check, ShieldAlert, Siren } from "lucide-react";
import { T } from "@/lib/i18n";
import { erForecast, icuForecast, type Range } from "@/lib/ops-data";
import {
  KpiCard,
  PageHeader,
  RangeSelector,
  SectionTitle,
} from "@/components/command-shell";
import {
  ForecastChart,
  ForecastSignal,
  Legend,
  Metric,
  card,
} from "@/components/command-page-shared";

export function Forecasting() {
  const [range, setRange] = useState<Range>("12h");
  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="forecast.eyebrow"
        title="forecast.title"
        description="forecast.description"
        action={
          <RangeSelector value={range} onChange={(v) => setRange(v as Range)} />
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className={`${card} p-5`}>
          <SectionTitle
            title="forecast.emergencyDemand"
            meta="forecast.observedForecast"
            action={<Legend />}
          />
          <ForecastChart
            data={erForecast}
            label="emergency-demand"
            yDomain={[35, 100]}
          />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[#e4e9e3] pt-4">
            <Metric
              label="forecast.now"
              value="78"
              sub="forecast.arrivalsIndex"
            />
            <Metric
              label="forecast.peak"
              value="87"
              sub="forecast.forecastAt"
              trend={1}
            />
            <Metric
              label="forecast.confidence"
              value="82%"
              sub="forecast.withinRange"
            />
          </div>
        </div>
        <div className={`${card} p-5`}>
          <SectionTitle
            title="forecast.icuOccupancy"
            meta="forecast.staffedBedForecast"
            action={
              <span className="text-[10px] font-bold text-[#bd7346]">
                <T id="forecast.tightBuffer" />
              </span>
            }
          />
          <ForecastChart
            data={icuForecast}
            label="icu-occupancy"
            color="#c88443"
            yDomain={[75, 100]}
          />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[#e4e9e3] pt-4">
            <Metric
              label="forecast.now"
              value="92%"
              sub="forecast.occupiedOf"
            />
            <Metric
              label="forecast.peak"
              value="94%"
              sub="forecast.forecastOvernight"
              trend={1}
            />
            <Metric label="forecast.buffer" value="3" sub="common.beds" />
          </div>
        </div>
      </div>
      <div className={`${card} mt-5 p-5`}>
        <SectionTitle
          title="forecast.signalReadout"
          meta="forecast.signalMeta"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <ForecastSignal
            tone="critical"
            icon={<Siren className="h-4 w-4" />}
            title="forecast.erRises"
            text="forecast.erRisesText"
          />
          <ForecastSignal
            tone="watch"
            icon={<ShieldAlert className="h-4 w-4" />}
            title="forecast.icuNarrow"
            text="forecast.icuNarrowText"
          />
          <ForecastSignal
            tone="stable"
            icon={<Check className="h-4 w-4" />}
            title="forecast.actionable"
            text="forecast.actionableText"
          />
        </div>
      </div>
    </div>
  );
}
