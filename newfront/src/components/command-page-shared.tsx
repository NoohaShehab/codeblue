import { useState } from "react";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import {
  departments,
  insights,
  type DepartmentStatus,
  type ForecastPoint,
} from "@/lib/ops-data";
import { T, useI18n } from "@/lib/i18n";
import { StatusPill } from "@/components/command-shell";

export const card =
  "rounded-xl border border-[#dce3dd] bg-[#fbfaf7] shadow-[0_2px_10px_rgba(35,60,60,.03)]";
export const departmentKeys: Record<string, string> = {
  Emergency: "department.Emergency",
  ICU: "department.ICU",
  Medicine: "department.Medicine",
  Surgery: "department.Surgery",
  Pediatrics: "department.Pediatrics",
  "Women's Health": "department.Women's Health",
};
export const insightKeys: Record<
  string,
  {
    title: string;
    summary: string;
    why: string;
    impact: string;
    action: string;
  }
> = {
  i1: {
    title: "insight.i1.title",
    summary: "insight.i1.summary",
    why: "insight.i1.why",
    impact: "insight.i1.impact",
    action: "insight.i1.action",
  },
  i2: {
    title: "insight.i2.title",
    summary: "insight.i2.summary",
    why: "insight.i2.why",
    impact: "insight.i2.impact",
    action: "insight.i2.action",
  },
  i3: {
    title: "insight.i3.title",
    summary: "insight.i3.summary",
    why: "insight.i3.why",
    impact: "insight.i3.impact",
    action: "insight.i3.action",
  },
  i4: {
    title: "insight.i4.title",
    summary: "insight.i4.summary",
    why: "insight.i4.why",
    impact: "insight.i4.impact",
    action: "insight.i4.action",
  },
};
export const areaKeys: Record<string, string> = {
  Emergency: "department.Emergency",
  ICU: "department.ICU",
  Medicine: "department.Medicine",
  Surgery: "department.Surgery",
};

export function Metric({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  trend?: number;
}) {
  return (
    <div className="border-s border-[#dce3dd] ps-4 first:border-0 first:ps-0">
      <div className="text-[10px] uppercase tracking-[.08em] text-[#81908d]">
        <T id={label} />
      </div>
      <div className="mt-1 mono text-[20px] font-bold text-[#263f47]">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-[#84918f]">
        {trend !== undefined &&
          (trend > 0 ? (
            <ArrowUpRight className="h-3 w-3 text-[#cf7254]" />
          ) : trend < 0 ? (
            <ArrowDownRight className="h-3 w-3 text-[#4aa390]" />
          ) : (
            <Minus className="h-3 w-3" />
          ))}
        <T id={sub} />
      </div>
    </div>
  );
}

export function ForecastChart({
  data,
  label,
  color = "#2d9791",
  yDomain = [35, 105] as [number, number],
}: {
  data: ForecastPoint[];
  label: string;
  color?: string;
  yDomain?: [number, number];
}) {
  const { t } = useI18n();
  return (
    <div className="h-[248px] w-full" dir="ltr" data-testid={`chart-${label}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 12, right: 10, left: -18, bottom: 2 }}
        >
          <CartesianGrid
            stroke="#e5e9e4"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: "#879592", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: "#879592", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              border: "1px solid #d6e1dc",
              borderRadius: 8,
              background: "#fbfaf7",
              fontSize: 11,
            }}
            labelStyle={{ color: "#55706e", fontWeight: 700 }}
          />
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill={color}
            fillOpacity={0.08}
          />
          <Area
            type="monotone"
            dataKey="lowerBound"
            stroke="none"
            fill="#f5f3ee"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name={t("common.forecast")}
            stroke={color}
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name={t("common.actual")}
            stroke="#2a3e47"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "#2a3e47", strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InsightRow({
  insight,
  compact = false,
}: {
  insight: (typeof insights)[number];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const copy = insightKeys[insight.id];
  return (
    <div
      className={`${card} overflow-hidden`}
      data-testid={`insight-${insight.id}`}
    >
      <button
        className="flex w-full items-start gap-3 p-4 text-start hover:bg-[#f7f7f2]"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-insight-${insight.id}`}
      >
        <div
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${insight.severity === "critical" ? "bg-[#d76655]" : insight.severity === "watch" ? "bg-[#e3a13e]" : "bg-[#4cae9b]"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-[#2d444c]">
              <T id={copy.title} />
            </span>
            <StatusPill status={insight.severity} />
            <span className="text-[10px] text-[#8a9995]">
              <T id={areaKeys[insight.area] ?? insight.area} />
            </span>
          </div>
          <div
            className={`${compact ? "line-clamp-1" : ""} text-xs leading-relaxed text-[#73817f]`}
          >
            <T id={copy.summary} />
          </div>
        </div>
        {expanded ? (
          <ArrowDownRight className="mt-1 h-4 w-4 shrink-0 text-[#7a918e]" />
        ) : (
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#7a918e]" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-[#e3e8e2] bg-[#f7f8f4] px-4 pb-4 pt-3 ps-10">
          <div className="grid gap-3 text-xs md:grid-cols-3">
            <div>
              <div className="mb-1 mono text-[9px] uppercase tracking-wider text-[#8b9a96]">
                <T id="insights.whyNow" />
              </div>
              <p className="leading-relaxed text-[#526a6b]">
                <T id={copy.why} />
              </p>
            </div>
            <div>
              <div className="mb-1 mono text-[9px] uppercase tracking-wider text-[#8b9a96]">
                <T id="insights.expectedImpact" />
              </div>
              <p className="leading-relaxed text-[#526a6b]">
                <T id={copy.impact} />
              </p>
            </div>
            <div>
              <div className="mb-1 mono text-[9px] uppercase tracking-wider text-[#8b9a96]">
                <T id="insights.recommendedAction" />
              </div>
              <p className="font-semibold leading-relaxed text-[#2a6762]">
                <T id={copy.action} />
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DepartmentTable({
  rows = departments,
}: {
  rows?: DepartmentStatus[];
}) {
  const { t } = useI18n();
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-start text-xs">
          <thead className="border-b border-[#e1e7e0] bg-[#f5f6f1] text-[10px] uppercase tracking-[.08em] text-[#84928e]">
            <tr>
              <th className="px-5 py-3 font-semibold">
                <T id="table.department" />
              </th>
              <th className="px-3 py-3 font-semibold">
                <T id="table.signal" />
              </th>
              <th className="px-3 py-3 font-semibold">
                <T id="table.occupancy" />
              </th>
              <th className="px-3 py-3 font-semibold">
                <T id="table.available" />
              </th>
              <th className="px-3 py-3 font-semibold">
                <T id="table.shiftTrend" />
              </th>
              <th className="px-5 py-3 text-end font-semibold">
                <T id="table.capacity" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7ebe5]">
            {rows.map((d) => (
              <tr
                key={d.id}
                className="group hover:bg-[#f8f9f5]"
                data-testid={`row-department-${d.id}`}
              >
                <td className="px-5 py-3.5 font-semibold text-[#334b52]">
                  {t(departmentKeys[d.name] ?? d.name)}
                </td>
                <td className="px-3 py-3.5">
                  <StatusPill status={d.status} />
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#e2e9e3]">
                      <div
                        className={`h-full rounded-full ${d.occupancy > 92 ? "bg-[#d76655]" : d.occupancy > 88 ? "bg-[#e0a13e]" : "bg-[#4baa99]"}`}
                        style={{ width: `${d.occupancy}%` }}
                      />
                    </div>
                    <span className="mono text-[11px] text-[#526a6d]">
                      {d.occupancy}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3.5 mono text-[#526a6d]">
                  {d.availableBeds} <T id="common.beds" />
                </td>
                <td className="px-3 py-3.5">
                  <span
                    className={`mono text-[11px] ${d.trend > 0 ? "text-[#bb634d]" : "text-[#358d7d]"}`}
                  >
                    {d.trend > 0 ? "+" : ""}
                    {d.trend}%
                  </span>
                  <span className="ms-1 text-[10px] text-[#8c9995]">
                    <T id="table.vsPlan" />
                  </span>
                </td>
                <td className="px-5 py-3.5 text-end mono text-[11px] text-[#677a78]">
                  {d.capacity} <T id="common.beds" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Priority({
  tone,
  icon,
  label,
  title,
  text,
  target,
}: {
  tone: "critical" | "watch" | "stable";
  icon: React.ReactNode;
  label: string;
  title: string;
  text: string;
  target: string;
}) {
  const styles = {
    critical: "border-[#f0d4cc] bg-[#fff8f5] text-[#be5b49]",
    watch: "border-[#efdfbd] bg-[#fffbf2] text-[#9a7029]",
    stable: "border-[#d3e8e0] bg-[#f4fbf8] text-[#398271]",
  };
  return (
    <div className={`rounded-lg border p-4 ${styles[tone]}`}>
      <div className="flex justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider">
          <T id={label} />
        </span>
        {icon}
      </div>
      <div className="mt-3 text-sm font-bold text-[#3b4549]">
        <T id={title} />
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#7f7772]">
        <T id={text} />
      </p>
      <div className="mt-3 text-[11px] font-semibold">
        <T id={target} />
      </div>
    </div>
  );
}

export function TwinStat({
  value,
  label,
  tone = "slate",
}: {
  value: string;
  label: string;
  tone?: "teal" | "amber" | "slate";
}) {
  const colors = {
    teal: "text-[#318477]",
    amber: "text-[#9b7937]",
    slate: "text-[#2c4e52]",
  };
  return (
    <div className="rounded-lg bg-[#f9faf6] p-3">
      <div className={`mono text-lg font-bold ${colors[tone]}`}>{value}</div>
      <div className="text-[10px] text-[#87918c]">
        <T id={label} />
      </div>
    </div>
  );
}

export function TwinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e4e9e3] pb-3 text-xs last:border-0">
      <span className="text-[#768783]">
        <T id={label} />
      </span>
      <strong className="mono text-[#405e62]">{value}</strong>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-[#859490]">
      <i className="h-2 w-2 rounded-full bg-[#2a3e47]" />
      <T id="common.actual" />
      <i className="ms-2 h-2 w-2 rounded-full bg-[#2d9791]" />
      <T id="common.forecast" />
    </div>
  );
}

export function ForecastSignal({
  tone,
  icon,
  title,
  text,
}: {
  tone: "critical" | "watch" | "stable";
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  const colors = {
    critical: "bg-[#fff8f5] text-[#b85d49] bg-[#f5ddd6]",
    watch: "bg-[#fffbf2] text-[#a27532] bg-[#f4e4bf]",
    stable: "bg-[#f4fbf8] text-[#398475] bg-[#d5ebe3]",
  };
  return (
    <div className={`flex gap-3 rounded-lg p-4 ${colors[tone].split(" ")[0]}`}>
      <div className={`rounded-md p-2 ${colors[tone].split(" ")[2]}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-[#405054]">
          <T id={title} />
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-[#788582]">
          <T id={text} />
        </p>
      </div>
    </div>
  );
}

export function InsightCount({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "critical" | "watch" | "stable";
}) {
  const styles = {
    critical: "border-[#efd5ce] bg-[#fff8f5] text-[#be5b49]",
    watch: "border-[#efdfbd] bg-[#fffbf2] text-[#a67733]",
    stable: "border-[#d3e8e0] bg-[#f4fbf8] text-[#388574]",
  };
  return (
    <div className={`rounded-lg border p-3 ${styles[tone]}`}>
      <div className="mono text-xl font-bold">{value}</div>
      <div className="text-[10px]">
        <T id={label} />
      </div>
    </div>
  );
}

export function SimSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const { t } = useI18n();
  const [unitKey, unitText] = unit.startsWith(" ")
    ? unit.trim().split(" ")
    : ["", unit];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-semibold text-[#536a6b]">
          <T id={label} />
        </label>
        <span className="mono rounded bg-[#e8f2ec] px-2 py-1 text-[11px] font-bold text-[#32766e]">
          {value > 0 ? "+" : ""}
          {value}
          {unitKey ? ` ${t(unitKey)}` : unitText}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, #4aaba0 ${pct}%, #dfe8e1 ${pct}%)`,
        }}
        data-testid={`slider-${label}`}
      />
      <div className="mt-1 flex justify-between mono text-[9px] text-[#9aa6a2]">
        <span>
          {min}
          {unitKey ? ` ${t(unitKey)}` : unitText}
        </span>
        <span>
          {max}
          {unitKey ? ` ${t(unitKey)}` : unitText}
        </span>
      </div>
    </div>
  );
}

export function SimulationOutcome({
  result,
}: {
  result: ReturnType<typeof import("@/lib/ops-data").runSimulation>;
}) {
  const { t } = useI18n();
  const urgent = result.erPressure > 85 || result.icuOccupancy > 95;
  return (
    <div className="animate-rise">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Outcome
          label="simulation.erPressure"
          value={`${result.erPressure}`}
          unit="/ 100"
          tone={result.erPressure > 85 ? "bad" : "ok"}
        />
        <Outcome
          label="simulation.icuOccupancy"
          value={`${result.icuOccupancy}%`}
          tone={result.icuOccupancy > 95 ? "bad" : "warn"}
        />
        <Outcome
          label="simulation.availableBeds"
          value={`${result.availableBeds}`}
          unit="common.beds"
          tone={result.availableBeds < 40 ? "warn" : "ok"}
        />
        <Outcome
          label="simulation.waitTime"
          value={`${result.waitTimeDelta > 0 ? "+" : ""}${result.waitTimeDelta}`}
          unit="common.patients"
          tone={result.waitTimeDelta > 15 ? "bad" : "ok"}
        />
      </div>
      <div
        className={`mt-5 rounded-xl border p-5 ${urgent ? "border-[#efd0c8] bg-[#fff7f4]" : "border-[#bcded3] bg-[#f2faf6]"}`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#71857f]">
          <div className="h-4 w-4" /> <T id="simulation.suggestedPosture" />
        </div>
        <p className="mt-3 text-base font-bold leading-relaxed text-[#355458]">
          <T
            id={
              urgent
                ? "simulation.recommendEscalate"
                : "simulation.recommendProceed"
            }
          />
        </p>
      </div>
      <div className="mt-6">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[.1em] text-[#84918d]">
          <T id="simulation.scenarioDelta" />
        </div>
        <div className="space-y-2 text-xs text-[#667876]">
          <Delta
            label="simulation.erPressure"
            value={`+${result.erPressure - 74} ${t("simulation.points")}`}
          />
          <Delta
            label="simulation.icuOccupancy"
            value={`+${(result.icuOccupancy - 92.4).toFixed(1)} ${t("simulation.points")}`}
          />
          <Delta
            label="simulation.hospitalBeds"
            value={`${result.availableBeds - 47} ${t("common.beds")}`}
          />
        </div>
      </div>
    </div>
  );
}

export function Delta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[#e6ebe5] pb-2 last:border-0">
      <span>
        <T id={label} />
      </span>
      <span className="mono font-bold text-[#bd6b4e]">{value}</span>
    </div>
  );
}

export function Outcome({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "bad" | "warn" | "ok";
}) {
  const colors =
    tone === "bad"
      ? "border-[#efd2ca] bg-[#fff7f4] text-[#be5a49]"
      : tone === "warn"
        ? "border-[#f0dfbd] bg-[#fffbf3] text-[#a37632]"
        : "border-[#d2e8df] bg-[#f4fbf8] text-[#347d72]";
  return (
    <div className={`rounded-lg border p-3 ${colors}`}>
      <div className="text-[10px] uppercase tracking-wide text-[#86938e]">
        <T id={label} />
      </div>
      <div className="mt-2 mono text-xl font-bold">
        {value}
        <span className="ms-1 text-[10px] font-normal text-[#81918c]">
          {unit?.startsWith("common.") ? <T id={unit} /> : unit}
        </span>
      </div>
    </div>
  );
}

export function getSharedCard() {
  return card;
}
