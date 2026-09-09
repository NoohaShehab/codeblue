import { useEffect, useState } from "react";
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
  const [icuData, setIcuData] = useState<any[]>(icuForecast);
  const [icuPeak, setIcuPeak] = useState(0);
  const [icuCurrent, setIcuCurrent] = useState(0);
  const [icuBuffer, setIcuBuffer] = useState(0);
  const [icuOccupiedBeds, setIcuOccupiedBeds] = useState(0);
  const [totalIcuBeds, setTotalIcuBeds] = useState(0);
  const [erData, setErData] = useState<any[]>(erForecast);
  const [erPeak, setErPeak] = useState(0);
  const [erCurrent, setErCurrent] = useState(0);
  const [erPeakTime, setErPeakTime] = useState("");
  const [erLower, setErLower] = useState(0);
  const [erUpper, setErUpper] = useState(0);

  useEffect(() => {
    fetch("http://127.0.0.1:8001/api/icu-forecast?hours=24")
      .then((res) => res.json())
      .then((data) => {
        console.log("ICU API DATA:", data);

        setIcuData(
          data.forecast.map((item: any) => ({
            timestamp: item.timestamp,
            forecast: item.forecast_occupancy,
            lowerBound: item.lower_bound,
            upperBound: item.upper_bound,
            actual: null,
          })),
        );
        setIcuPeak(data.peak_occupancy);
        setIcuCurrent(data.current_occupancy);
        setIcuBuffer(
          Math.min(...data.forecast.map((item: any) => item.buffer_beds)),
        );
        setIcuOccupiedBeds(data.current_occupied_beds);
        setTotalIcuBeds(data.total_icu_beds);
      })
      .catch((error) => {
        console.error("Failed to load ICU forecast:", error);
      });
  }, []);

  useEffect(() => {
    fetch("http://127.0.0.1:8001/api/forecast?hours=24")
      .then((res) => res.json())
      .then((data) => {
        console.log("ER API DATA:", data);

        setErData(
          data.forecast.map((item: any) => ({
            timestamp: item.time,
            forecast: item.predicted_arrivals,
            lowerBound: item.lower_bound,
            upperBound: item.upper_bound,
            actual: null,
          })),
        );

        setErPeak(data.peak_arrivals);
        setErCurrent(data.current_arrivals);
        setErPeakTime(data.peak_time);

        const peakPoint = data.forecast.find(
          (item: any) => item.time === data.peak_time
        );

        if (peakPoint) {
          setErLower(peakPoint.lower_bound);
          setErUpper(peakPoint.upper_bound);
        }
      })
      .catch((error) => {
        console.error("Failed to load ER forecast:", error);
      });
  }, []);
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
            data={erData}
            label="emergency-demand"
            yDomain={[0, 100]}
          />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[#e4e9e3] pt-4">
            <Metric
              label="forecast.now"
              value={String(erCurrent)}
              sub="forecast.arrivalsIndex"
            />

            <Metric
              label="forecast.peak"
              value={String(erPeak)}
              sub={`forecast.forecastAt ${new Date(
                erPeakTime,
              ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}`}
              trend={1}
            />

            <Metric
              label="forecast.range"
              value={`${erLower}–${erUpper}`}
              sub="forecast.predictedRange"
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
            data={icuData}
            label="icu-occupancy"
            color="#c88443"
            yDomain={[75, 100]}
          />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[#e4e9e3] pt-4">
            <Metric
              label="forecast.now"
              value={`${icuCurrent.toFixed(1)}%`}
              sub={`${icuOccupiedBeds} / ${totalIcuBeds} occupied`}
            />
            <Metric
              label="forecast.peak"
              value={`${icuPeak.toFixed(1)}%`}
              sub="forecast.forecastOvernight"
              trend={1}
            />
            <Metric
              label="forecast.buffer"
              value={icuBuffer.toFixed(1)}
              sub="common.beds"
            />
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
