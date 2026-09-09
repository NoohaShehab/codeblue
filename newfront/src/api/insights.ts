export type InsightSeverity = "critical" | "watch" | "stable";

export type InsightEvidence = {
  label: string;
  value: string | number;
  source: string;
};

export type Insight = {
  id: string;
  department: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  evidence: InsightEvidence[];
  source: string;
  as_of: string | null;
  rank: number;
};

export type InsightSummary = {
  critical: number;
  watch: number;
  stable: number;
};

export type InsightsResponse = {
  summary: InsightSummary;
  insights: Insight[];
};

export async function getInsights(): Promise<InsightsResponse> {
  const response = await fetch("/api/insights");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(
      body?.detail ?? `Insights API request failed (${response.status})`,
    );
  }
  return response.json() as Promise<InsightsResponse>;
}
