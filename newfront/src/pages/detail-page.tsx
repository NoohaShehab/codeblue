import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  Check,
  ShieldAlert,
  Users,
} from "lucide-react";

import { T, useI18n } from "@/lib/i18n";
import { insights, type Range } from "@/lib/ops-data";

import {
  getERForecast,
  getICUForecast,
  type ERForecastResponse,
  type ICUForecastResponse,
} from "@/api/forecast";

import { getERSummary, type ERSummaryResponse } from "@/api/er-summary";

import {
  KpiCard,
  PageHeader,
  RangeSelector,
  SectionTitle,
} from "@/components/command-shell";

import {
  ForecastChart,
  InsightRow,
  card,
} from "@/components/command-page-shared";

function getHoursFromRange(range: Range): number {
  switch (range) {
    case "12h":
      return 12;

    case "24h":
      return 24;

    case "48h":
      return 48;

    case "72h":
      return 72;

    default:
      return 12;
  }
}

function DetailPage({ type }: { type: "er" | "icu" }) {
  const isEr = type === "er";

  const [range, setRange] = useState<Range>("12h");

  const [erData, setErData] = useState<ERForecastResponse | null>(null);

  const [erSummary, setErSummary] = useState<ERSummaryResponse | null>(null);

  const [icuData, setIcuData] = useState<ICUForecastResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const { t } = useI18n();

  const hours = getHoursFromRange(range);

  /*
   * Load ER or ICU data.
   *
   * ER:
   *   /api/forecast
   *   /api/er-summary
   *
   * ICU:
   *   /api/icu-forecast
   */

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        if (isEr) {
          const [forecast, summary] = await Promise.all([
            getERForecast(hours),
            getERSummary(),
          ]);

          if (!active) return;

          setErData(forecast);
          setErSummary(summary);
        } else {
          const forecast = await getICUForecast(hours);

          if (!active) return;

          setIcuData(forecast);
        }
      } catch (requestError: unknown) {
        if (!active) return;

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load data",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [isEr, hours]);

  /*
   * Convert backend forecast data
   * to the format expected by ForecastChart.
   */

  const forecast = useMemo(() => {
    if (isEr) {
      if (!erData) return [];

      return erData.forecast.map((item) => ({
        time: item.time,
        actual: null,
        forecast: item.predicted_arrivals,
        lower: item.lower_bound,
        upper: item.upper_bound,
      }));
    }

    if (!icuData) return [];

    return icuData.forecast.map((item) => ({
      time: item.timestamp,
      actual: null,
      forecast: item.forecast_occupancy,
      lower: item.lower_bound,
      upper: item.upper_bound,
    }));
  }, [isEr, erData, icuData]);

  /*
   * ER values
   */

  const currentArrivals = erSummary?.current_arrivals ?? 0;

  const patientsWaiting = erSummary?.patients_waiting ?? 0;

  const waitingOver60 = erSummary?.waiting_over_60 ?? 0;

  const medianWait = erSummary?.median_wait_minutes ?? 0;

  const boarding = erSummary?.boarding ?? 0;

  const currentICUOccupancy = icuData?.current_occupancy ?? 0;

  /*
   * Calculate ER expected arrivals from forecast.
   *
   * The first forecast value is used as the expected
   * number for the comparison displayed in the UI.
   */

  const expectedArrivals = erData?.forecast?.[0]?.predicted_arrivals ?? 0;

  const arrivalsChange =
    expectedArrivals > 0
      ? Math.round(
          ((currentArrivals - expectedArrivals) / expectedArrivals) * 100,
        )
      : 0;

  /*
   * ICU values
   */

  const currentICUOccupied = icuData?.current_occupied_beds ?? 0;

  const totalICUBeds = icuData?.total_icu_beds ?? 0;

  const availableICUBeds =
    icuData?.available_beds ?? Math.max(totalICUBeds - currentICUOccupied, 0);

  /*
   * Loading state
   */

  if (loading) {
    return (
      <div className="animate-rise">
        <PageHeader
          eyebrow={isEr ? "detail.emergencyEyebrow" : "detail.icuEyebrow"}
          title={isEr ? "detail.emergencyTitle" : "detail.icuTitle"}
          description={isEr ? "detail.erDescription" : "detail.icuDescription"}
          action={
            <RangeSelector
              value={range}
              onChange={(v) => setRange(v as Range)}
            />
          }
        />

        <div className={`${card} mt-5 p-5 text-sm text-[#697b79]`}>
          Loading data...
        </div>
      </div>
    );
  }

  /*
   * Error state
   */

  if (error) {
    return (
      <div className="animate-rise">
        <PageHeader
          eyebrow={isEr ? "detail.emergencyEyebrow" : "detail.icuEyebrow"}
          title={isEr ? "detail.emergencyTitle" : "detail.icuTitle"}
          description={isEr ? "detail.erDescription" : "detail.icuDescription"}
          action={
            <RangeSelector
              value={range}
              onChange={(v) => setRange(v as Range)}
            />
          }
        />

        <div className={`${card} mt-5 p-5 text-sm text-red-600`}>{error}</div>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      {/* =====================================================
          HEADER
         ===================================================== */}

      <PageHeader
        eyebrow={isEr ? "detail.emergencyEyebrow" : "detail.icuEyebrow"}
        title={isEr ? "detail.emergencyTitle" : "detail.icuTitle"}
        description={isEr ? "detail.erDescription" : "detail.icuDescription"}
        action={
          <RangeSelector value={range} onChange={(v) => setRange(v as Range)} />
        }
      />

      {/* =====================================================
          KPI CARDS
         ===================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isEr ? (
          <>
            <KpiCard
              label="detail.currentArrivals"
              value={String(currentArrivals)}
              sub={
                expectedArrivals > 0
                  ? `${arrivalsChange >= 0 ? "+" : ""}${arrivalsChange}% vs expected`
                  : "detail.arrivalsSub"
              }
              tone="red"
            />

            <KpiCard
              label="detail.patientsWaiting"
              value={String(patientsWaiting)}
              sub={`${waitingOver60} waiting > 60 min`}
              tone="amber"
            />

            <KpiCard
              label="detail.medianWait"
              value={`${medianWait}m`}
              sub="Target < 35 min"
              tone="red"
            />

            <KpiCard
              label="detail.boarding"
              value={String(boarding)}
              sub="Admitted, no bed"
              tone="amber"
            />
          </>
        ) : (
          <>
            <KpiCard
              label="detail.staffedBeds"
              value={String(totalICUBeds)}
              sub={`${currentICUOccupied} currently occupied`}
              tone="slate"
            />

            <KpiCard
              label="detail.occupancy"
              value={`${currentICUOccupancy.toFixed(1)}%`}
              sub="Current ICU occupancy"
              tone="amber"
            />

            <KpiCard
              label="detail.availableNow"
              value={String(availableICUBeds)}
              sub={`${availableICUBeds} beds currently available`}
              tone="red"
            />

            <KpiCard
              label="detail.riskWindow"
              value={`${hours}h`}
              sub="Peak forecast window"
              tone="amber"
            />
          </>
        )}
      </div>

      {/* =====================================================
          FORECAST + SHIFT SIGNAL
         ===================================================== */}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className={`${card} p-5`}>
          <SectionTitle
            title={isEr ? "detail.demandTrend" : "detail.capacityForecast"}
            meta="common.actual"
          />

          <ForecastChart
            data={forecast}
            label={isEr ? "er-detail" : "icu-detail"}
            color={isEr ? "#2d9791" : "#c88443"}
            yDomain={isEr ? [35, 100] : [75, 100]}
          />

          <div className="mt-3 flex items-center gap-4 border-t border-[#e4e9e3] pt-3 text-[10px] text-[#84918e]">
            <span className="flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-[#2a3e47]" />
              <T id="common.current" />
            </span>

            <span className="flex items-center gap-1">
              <i
                className={`h-2 w-2 rounded-full ${
                  isEr ? "bg-[#2d9791]" : "bg-[#c88443]"
                }`}
              />

              <T id="common.forecast" />
            </span>

            <span className="ms-auto">{t("detail.confidenceRange")}</span>
          </div>
        </div>

        {/* ===================================================
            SHIFT SIGNAL
           =================================================== */}

        <div className={`${card} p-5`}>
          <SectionTitle title="detail.shiftSignal" meta="detail.shiftMeta" />

          <div
            className={`rounded-xl p-4 ${
              isEr ? "bg-[#fff7f4]" : "bg-[#fffbf2]"
            }`}
          >
            <div
              className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${
                isEr ? "text-[#bc614e]" : "text-[#a17735]"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />

              <T id={isEr ? "detail.needsAction" : "detail.protectBuffer"} />
            </div>

            <div className="mt-3 text-sm font-bold leading-relaxed text-[#3e5154]">
              <T id={isEr ? "detail.erSignal" : "detail.icuSignal"} />
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#778581]">
              <T id={isEr ? "detail.erFastestRelief" : "detail.icuConfirm"} />
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {(isEr
              ? [
                  [
                    "detail.arrivalsPerHour",
                    String(currentArrivals),
                    expectedArrivals > 0
                      ? `${arrivalsChange >= 0 ? "+" : ""}${arrivalsChange}%`
                      : "API",
                  ],

                  [
                    "detail.patientsWaitingValue",
                    String(patientsWaiting),
                    `${waitingOver60} >60m`,
                  ],

                  [
                    "detail.boardingMedianValue",
                    `${medianWait}m`,
                    `${boarding} boarding`,
                  ],
                ]
              : [
                  [
                    "detail.occupiedStaffedValue",
                    `${currentICUOccupied} / ${totalICUBeds}`,
                    "API",
                  ],

                  ["detail.transfersPending", "2", "stable"],

                  ["detail.expectedAdmissions", "1", "tonight"],
                ]
            ).map(([label, val, change]) => (
              <div
                className="flex items-center justify-between border-b border-[#e5ebe4] pb-3 last:border-0 last:pb-0"
                key={label}
              >
                <span className="text-xs text-[#71827f]">
                  <T id={label} />
                </span>

                <span className="text-end">
                  <strong className="mono block text-xs text-[#3e5b5f]">
                    {val}
                  </strong>

                  <span className="mono text-[9px] text-[#b36a4f]">
                    {change}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================
          PATIENT / CRITICAL FLOW
         ===================================================== */}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className={`${card} p-5`}>
          <SectionTitle
            title={isEr ? "detail.patientFlow" : "detail.criticalFlow"}
            meta="detail.flowMeta"
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(isEr
              ? [
                  ["detail.arrivals", String(currentArrivals), Users],

                  ["detail.triage", "71", Check],

                  ["detail.admitted", "18", BedDouble],

                  ["detail.transferred", "9", ArrowUpRight],
                ]
              : [
                  ["detail.arrivals", "4", Users],

                  ["detail.discharges", "3", Check],

                  ["detail.transfersIn", "2", ArrowUpRight],

                  ["detail.transfersOut", "1", ArrowDownRight],
                ]
            ).map(([label, val, Icon]) => {
              const IconComponent = Icon as typeof Users;

              return (
                <div
                  className="rounded-lg bg-[#f3f6f1] p-3"
                  key={label as string}
                >
                  <IconComponent className="h-4 w-4 text-[#609992]" />

                  <div className="mt-3 mono text-xl font-bold text-[#315158]">
                    {val as string}
                  </div>

                  <div className="mt-1 text-[10px] text-[#80908d]">
                    <T id={label as string} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===================================================
            RELATED INSIGHTS
           =================================================== */}

        <div className={`${card} p-5`}>
          <SectionTitle
            title="detail.relatedInsights"
            meta="detail.relatedMeta"
          />

          <div className="space-y-3">
            {insights
              .filter(
                (i) =>
                  i.area === (isEr ? "Emergency" : "ICU") ||
                  i.severity === "watch",
              )
              .slice(0, 2)
              .map((i) => (
                <InsightRow key={i.id} insight={i} compact />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ER() {
  return <DetailPage type="er" />;
}

export function ICU() {
  return <DetailPage type="icu" />;
}
