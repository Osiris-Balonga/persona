import snapshot from "@/content/coverage-snapshot.json";
import type { CoverageRow } from "@/lib/coverage-decoder";

export type { CoverageRow, CoverageStatus, PhoneStatus, CoveragePayload } from "@/lib/coverage-decoder";
export { decodeCoveragePayload } from "@/lib/coverage-decoder";

export const coverageSnapshot = snapshot;
export const coverageRows = snapshot.countries as CoverageRow[];
export const coverageTotals = {
  all: coverageRows.length,
  available: coverageRows.filter((row) => row.status === "available").length,
  pending: coverageRows.filter((row) => row.status === "pending-name-review").length,
  unavailable: coverageRows.filter((row) => row.status === "unavailable").length,
  postcodeCities: coverageRows.filter((row) => row.status === "available").reduce((sum, row) => sum + row.postcodeCities, 0),
  sampledCities: coverageRows.filter((row) => row.status === "available").reduce((sum, row) => sum + row.sampledCities, 0),
};
