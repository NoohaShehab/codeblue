import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  Check,
  ShieldAlert,
  Users,
} from "lucide-react";
import { T, useI18n } from "@/lib/i18n";
import { erForecast, icuForecast, insights, type Range } from "@/lib/ops-data";
import {
  KpiCard,
  PageHeader,
  RangeSelector,
  SectionTitle,
} from "@/components/command-shell";
import {
  ForecastChart,
  InsightRow,
  Metric,
  card,
} from "@/components/command-page-shared";

function DetailPage({ type }: { type: "er" | "icu" }) {
  const isEr = type === "er";
  const [range, setRange] = useState<Range>("12h");
  const { t } = useI18n();
  const forecast = isEr ? erForecast : icuForecast;
  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow={isEr ? "detail.emergencyEyebrow" : "detail.icuEyebrow"}
        title={isEr ? "detail.emergencyTitle" : "detail.icuTitle"}
        description={isEr ? "detail.erDescription" : "detail.icuDescription"}
        action={
          <RangeSelector value={range} onChange={(v) => setRange(v as Range)} />
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isEr ? (
          <>
            <KpiCard
              label="detail.currentArrivals"
              value="78"
              sub="detail.arrivalsSub"
              tone="red"
            />
            <KpiCard
              label="detail.patientsWaiting"
              value="26"
              sub="detail.waitingSub"
              tone="amber"
            />
            <KpiCard
              label="detail.medianWait"
              value="42m"
              sub="detail.waitSub"
              tone="red"
            />
            <KpiCard
              label="detail.boarding"
              value="12"
              sub="detail.boardingSub"
              tone="amber"
            />
          </>
        ) : (
          <>
            <KpiCard
              label="detail.staffedBeds"
              value="36"
              sub="detail.staffedSub"
              tone="slate"
            />
            <KpiCard
              label="detail.occupancy"
              value="92.4%"
              sub="detail.occupancySub"
              tone="amber"
            />
            <KpiCard
              label="detail.availableNow"
              value="3"
              sub="detail.availableSub"
              tone="red"
            />
            <KpiCard
              label="detail.riskWindow"
              value="12h"
              sub="detail.riskSub"
              tone="amber"
            />
          </>
        )}
      </div>
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
              <i className="h-2 w-2 rounded-full bg-[#2a3e47]" />{" "}
              <T id="common.current" />
            </span>
            <span className="flex items-center gap-1">
              <i
                className={`h-2 w-2 rounded-full ${isEr ? "bg-[#2d9791]" : "bg-[#c88443]"}`}
              />{" "}
              <T id="common.forecast" />
            </span>
            <span className="ms-auto">{t("detail.confidenceRange")}</span>
          </div>
        </div>
        <div className={`${card} p-5`}>
          <SectionTitle title="detail.shiftSignal" meta="detail.shiftMeta" />
          <div
            className={`rounded-xl p-4 ${isEr ? "bg-[#fff7f4]" : "bg-[#fffbf2]"}`}
          >
            <div
              className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isEr ? "text-[#bc614e]" : "text-[#a17735]"}`}
            >
              <ShieldAlert className="h-4 w-4" />{" "}
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
                  ["detail.arrivalsPerHour", "14", "+8%"],
                  ["detail.patientsWaitingValue", "26", "+5"],
                  ["detail.boardingMedianValue", "3h 18m", "+22m"],
                ]
              : [
                  ["detail.occupiedStaffedValue", "33 / 36", "+2"],
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
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className={`${card} p-5`}>
          <SectionTitle
            title={isEr ? "detail.patientFlow" : "detail.criticalFlow"}
            meta="detail.flowMeta"
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(isEr
              ? [
                  ["detail.arrivals", "78", Users],
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
            ).map(([label, val, Icon]) => (
              <div
                className="rounded-lg bg-[#f3f6f1] p-3"
                key={label as string}
              >
                <Icon className="h-4 w-4 text-[#609992]" />
                <div className="mt-3 mono text-xl font-bold text-[#315158]">
                  {val as string}
                </div>
                <div className="mt-1 text-[10px] text-[#80908d]">
                  <T id={label as string} />
                </div>
              </div>
            ))}
          </div>
        </div>
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
