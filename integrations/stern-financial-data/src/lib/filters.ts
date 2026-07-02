import type { BetaRow, BetaRowType, ErpRow, SourceId, SternRow } from './sources';

export type CommonControls = {
  limit: number;
  offset: number;
  returnAll: boolean;
  includeRaw: boolean;
};

export type ErpFilters = CommonControls & {
  source: 'erp';
  countries?: string[];
  countrySearch?: string;
  moodysRatings?: string[];
  minEquityRiskPremium?: number;
  maxEquityRiskPremium?: number;
  minCountryRiskPremium?: number;
  maxCountryRiskPremium?: number;
  minCorporateTaxRate?: number;
  maxCorporateTaxRate?: number;
  hasSovereignCds?: boolean;
};

export type BetaFilters = CommonControls & {
  source: 'us_industry_betas' | 'global_industry_betas';
  industries?: string[];
  industrySearch?: string;
  rowType?: BetaRowType;
  minBeta?: number;
  maxBeta?: number;
  minUnleveredBeta?: number;
  maxUnleveredBeta?: number;
  minNumberOfFirms?: number;
  maxDebtToEquityRatio?: number;
};

export type SourceFilters = ErpFilters | BetaFilters;

export type PaginatedRows = {
  filteredRows: SternRow[];
  returnedRows: Array<Omit<SternRow, 'raw'> | SternRow>;
  returnedRowCount: number;
  filteredRowCount: number;
  totalRowCount: number;
  truncated: boolean;
};

let normalizeMatchText = (value: string) => value.trim().toLowerCase();

let valueInList = (value: string | null | undefined, accepted: string[] | undefined) => {
  if (!accepted?.length) return true;
  if (!value) return false;

  let normalizedValue = normalizeMatchText(value);
  return accepted.some(entry => normalizeMatchText(entry) === normalizedValue);
};

let valueContains = (value: string | null | undefined, search: string | undefined) => {
  if (!search) return true;
  if (!value) return false;

  return normalizeMatchText(value).includes(normalizeMatchText(search));
};

let numberAtLeast = (value: number | null, threshold: number | undefined) =>
  threshold === undefined || (value !== null && value >= threshold);

let numberAtMost = (value: number | null, threshold: number | undefined) =>
  threshold === undefined || (value !== null && value <= threshold);

let isErpRow = (row: SternRow): row is ErpRow => 'country' in row;
let isBetaRow = (row: SternRow): row is BetaRow => 'industryName' in row;

let filterErpRow = (row: ErpRow, filters: ErpFilters) =>
  valueInList(row.country, filters.countries) &&
  valueContains(row.country, filters.countrySearch) &&
  valueInList(row.moodysRating, filters.moodysRatings) &&
  numberAtLeast(row.equityRiskPremium, filters.minEquityRiskPremium) &&
  numberAtMost(row.equityRiskPremium, filters.maxEquityRiskPremium) &&
  numberAtLeast(row.countryRiskPremium, filters.minCountryRiskPremium) &&
  numberAtMost(row.countryRiskPremium, filters.maxCountryRiskPremium) &&
  numberAtLeast(row.corporateTaxRate, filters.minCorporateTaxRate) &&
  numberAtMost(row.corporateTaxRate, filters.maxCorporateTaxRate) &&
  (filters.hasSovereignCds === undefined ||
    (filters.hasSovereignCds ? row.sovereignCds !== null : row.sovereignCds === null));

let filterBetaRow = (row: BetaRow, filters: BetaFilters) =>
  valueInList(row.industryName, filters.industries) &&
  valueContains(row.industryName, filters.industrySearch) &&
  (filters.rowType === undefined || row.rowType === filters.rowType) &&
  numberAtLeast(row.beta, filters.minBeta) &&
  numberAtMost(row.beta, filters.maxBeta) &&
  numberAtLeast(row.unleveredBeta, filters.minUnleveredBeta) &&
  numberAtMost(row.unleveredBeta, filters.maxUnleveredBeta) &&
  numberAtLeast(row.numberOfFirms, filters.minNumberOfFirms) &&
  numberAtMost(row.debtToEquityRatio, filters.maxDebtToEquityRatio);

let withoutRaw = <T extends { raw: unknown }>(row: T) => {
  let { raw, ...rest } = row;
  return rest;
};

let shapeRows = (rows: SternRow[], includeRaw: boolean) =>
  includeRaw ? rows : rows.map(row => withoutRaw(row));

export let applySourceFilters = (
  sourceId: SourceId,
  rows: SternRow[],
  filters: SourceFilters
): PaginatedRows => {
  let filteredRows =
    sourceId === 'erp'
      ? rows.filter(row => isErpRow(row) && filterErpRow(row, filters as ErpFilters))
      : rows.filter(row => isBetaRow(row) && filterBetaRow(row, filters as BetaFilters));

  let returnedRows = filters.returnAll
    ? filteredRows.slice(filters.offset)
    : filteredRows.slice(filters.offset, filters.offset + filters.limit);

  return {
    filteredRows,
    returnedRows: shapeRows(returnedRows, filters.includeRaw),
    returnedRowCount: returnedRows.length,
    filteredRowCount: filteredRows.length,
    totalRowCount: rows.length,
    truncated: filters.offset + returnedRows.length < filteredRows.length
  };
};
