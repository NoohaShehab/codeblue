import { Link } from "wouter";
import { ArrowUpRight, Check, ShieldAlert, Siren } from "lucide-react";
import { T } from "@/lib/i18n";
import { kpis, insights } from "@/lib/ops-data";
import {
  KpiCard,
  PageHeader,
  SectionTitle,
} from "@/components/command-shell";
import {
  DepartmentTable,
  InsightRow,
  Metric,
  Priority,
  card,
} from "@/components/command-page-shared";

export function Dashboard() {
  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="dashboard.eyebrow"
        title="dashboard.title"
        description="dashboard.description"
        action={
          <div className="flex items-center gap-2 rounded-lg border border-[#dce4dc] bg-[#fbfaf7] px-3 py-2 text-xs text-[#697b79]">
            <span className="mono text-[10px]">
              <T id="common.nextHuddle" />
            </span>
            <strong className="text-[#294c50]">15:00</strong>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="dashboard.patientsInHouse"
          value={kpis.totalPatients}
          sub="dashboard.since0800"
          tone="slate"
        />
        <KpiCard
          label="dashboard.hospitalOccupancy"
          value={kpis.occupancy}
          unit="%"
          sub="dashboard.bedsAvailable"
          tone="teal"
        />
        <KpiCard
          label="dashboard.erPressure"
          value={kpis.erPressure}
          unit="/ 100"
          sub="dashboard.aboveTarget"
          tone="red"
          href="/er"
        />
        <KpiCard
          label="dashboard.icuOccupancy"
          value={kpis.icuOccupancy}
          unit="%"
          sub="dashboard.threeBedsAvailable"
          tone="amber"
          href="/icu"
        />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.9fr]">
        <div className={`${card} p-5`}>
          <SectionTitle
            title="dashboard.attention"
            meta="dashboard.attentionMeta"
            action={
              <span className="mono text-[10px] text-[#8b9995]">
                <T id="dashboard.activePriorities" />
              </span>
            }
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Priority
              tone="critical"
              icon={<Siren className="h-4 w-4" />}
              label="dashboard.immediate"
              title="dashboard.reduceBoarding"
              text="dashboard.boardingDescription"
              target="dashboard.medicineDischarges"
            />
            <Priority
              tone="watch"
              icon={<ShieldAlert className="h-4 w-4" />}
              label="dashboard.watch"
              title="dashboard.protectBuffer"
              text="dashboard.bufferDescription"
              target="dashboard.stepDown"
            />
            <Priority
              tone="stable"
              icon={<Check className="h-4 w-4" />}
              label="dashboard.ready"
              title="dashboard.useSurgicalBuffer"
              text="dashboard.surgicalDescription"
              target="dashboard.offerStepDown"
            />
          </div>
        </div>
        <div className={`${card} p-5`}>
          <SectionTitle
            title="dashboard.operationalPulse"
            meta="dashboard.operationalPulseMeta"
          />
          <div className="space-y-5">
            <Metric
              label="dashboard.admissionsToday"
              value="38"
              sub="dashboard.aheadPlan"
              trend={1}
            />
            <Metric
              label="dashboard.dischargesToday"
              value="31"
              sub="dashboard.behindPlan"
              trend={-1}
            />
            <Metric
              label="dashboard.medianWait"
              value="42m"
              sub="dashboard.aboveThreshold"
              trend={1}
            />
            <Metric
              label="dashboard.transferRequests"
              value="14"
              sub="dashboard.pendingPlacement"
              trend={1}
            />
          </div>
          <div className="mt-5 border-t border-[#e2e8e1] pt-4">
            <div className="flex items-center justify-between text-[10px] text-[#82918e]">
              <span>
                <T id="dashboard.flowStability" />
              </span>
              <span className="mono font-bold text-[#bf704e]">
                <T id="dashboard.needsAttention" />
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#e5ebe5]">
              <div className="h-full w-[68%] rounded-full bg-[#e5a13e]" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <div className={`${card} p-5`}>
          <SectionTitle
            title="dashboard.capacityByDepartment"
            meta="dashboard.capacityMeta"
            action={
              <Link
                className="text-xs font-bold text-[#378d87] hover:text-[#226965]"
                href="/digital-twin"
              >
                <T id="common.openDigitalTwin" />{" "}
                <ArrowUpRight className="inline h-3.5 w-3.5" />
              </Link>
            }
          />
          <DepartmentTable />
        </div>
        <div>
          <SectionTitle
            title="dashboard.latestInsights"
            meta="dashboard.latestInsightsMeta"
            action={
              <Link
                href="/insights"
                className="text-xs font-bold text-[#378d87]"
              >
                <T id="common.viewAll" />
              </Link>
            }
          />
          <div className="space-y-3">
            {insights.slice(0, 3).map((i) => (
              <InsightRow key={i.id} insight={i} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
