import type { CoveragePayload, CoverageRow } from "@/lib/coverage-decoder";

export type CoverageData = {
  rows: CoverageRow[];
  portraits: CoveragePayload["portraits"] | null;
  meta: CoveragePayload["meta"] | null;
  source: { kind: "live"; version: string } | { kind: "snapshot"; date: string } | { kind: "unavailable" };
};

export type CoverageSnapshotFallback = { rows: CoverageRow[]; date: string } | null;
export type CoverageResponse = { ok: boolean; status?: number; json(): Promise<unknown> };
export type CoverageDecoder = (value: unknown) => CoveragePayload;

export async function loadCoverageData(
  fetchCoverage: () => Promise<CoverageResponse>,
  fallback: CoverageSnapshotFallback,
  decode: CoverageDecoder,
): Promise<CoverageData> {
  try {
    const response = await fetchCoverage();
    if (!response.ok) throw new Error(`Coverage API returned ${response.status ?? "an error"}`);
    const payload = decode(await response.json());
    return {
      rows: payload.countries,
      portraits: payload.portraits,
      meta: payload.meta,
      source: { kind: "live", version: payload.meta.dataVersion },
    };
  } catch {
    if (fallback && fallback.rows.length > 0) {
      return { rows: fallback.rows, portraits: null, meta: null, source: { kind: "snapshot", date: fallback.date } };
    }
    return { rows: [], portraits: null, meta: null, source: { kind: "unavailable" } };
  }
}
