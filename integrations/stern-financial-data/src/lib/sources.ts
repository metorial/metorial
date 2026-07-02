export let PAGE_BASE = 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/';
export let WORKBOOK_BASE = 'https://www.stern.nyu.edu/~adamodar/pc/datasets/';

export let ERP_FIELDS = [
  'country',
  'moodysRating',
  'adjustedDefaultSpread',
  'countryRiskPremium',
  'equityRiskPremium',
  'corporateTaxRate',
  'sovereignCds',
  'erpBasedOnSovereignCds'
] as const;

export let BETA_FIELDS = [
  'industryName',
  'numberOfFirms',
  'beta',
  'debtToEquityRatio',
  'effectiveTaxRate',
  'unleveredBeta',
  'cashToFirmValue',
  'unleveredBetaCorrectedForCash',
  'hiloRisk',
  'standardDeviationOfEquity',
  'standardDeviationInOperatingIncomeLast10Years'
] as const;

export type ErpField = (typeof ERP_FIELDS)[number];
export type BetaField = (typeof BETA_FIELDS)[number];
export type SourceId = 'erp' | 'us_industry_betas' | 'global_industry_betas';
export type SourceKind = 'erp' | 'beta';
export type SourceType = 'workbook' | 'html';
export type BetaRowType = 'industry' | 'aggregate';

export type ErpRow = {
  country: string;
  moodysRating: string | null;
  adjustedDefaultSpread: number | null;
  countryRiskPremium: number | null;
  equityRiskPremium: number | null;
  corporateTaxRate: number | null;
  sovereignCds: number | null;
  erpBasedOnSovereignCds: number | null;
  raw: Record<ErpField, string>;
};

export type BetaRow = {
  industryName: string;
  numberOfFirms: number | null;
  beta: number | null;
  debtToEquityRatio: number | null;
  effectiveTaxRate: number | null;
  unleveredBeta: number | null;
  cashToFirmValue: number | null;
  unleveredBetaCorrectedForCash: number | null;
  hiloRisk: number | null;
  standardDeviationOfEquity: number | null;
  standardDeviationInOperatingIncomeLast10Years: number | null;
  rowType: BetaRowType;
  raw: Record<BetaField, string>;
};

export type SternRow = ErpRow | BetaRow;

export type SternSource = {
  id: SourceId;
  title: string;
  description: string;
  kind: SourceKind;
  pageUrl: string;
  workbookUrl: string;
  rowFields: readonly string[];
  supportedFilters: readonly string[];
};

export let SOURCES: Record<SourceId, SternSource> = {
  erp: {
    id: 'erp',
    title: 'Country Equity Risk Premiums',
    description:
      "Country equity risk premiums, Moody's ratings, default spreads, tax rates, and sovereign CDS data.",
    kind: 'erp',
    pageUrl: `${PAGE_BASE}ctryprem.html`,
    workbookUrl: `${WORKBOOK_BASE}ctryprem.xlsx`,
    rowFields: ERP_FIELDS,
    supportedFilters: [
      'countries',
      'countrySearch',
      'moodysRatings',
      'minEquityRiskPremium',
      'maxEquityRiskPremium',
      'minCountryRiskPremium',
      'maxCountryRiskPremium',
      'minCorporateTaxRate',
      'maxCorporateTaxRate',
      'hasSovereignCds'
    ]
  },
  us_industry_betas: {
    id: 'us_industry_betas',
    title: 'US Industry Betas',
    description:
      'US industry beta, leverage, tax, cash, risk, and volatility measures by industry.',
    kind: 'beta',
    pageUrl: `${PAGE_BASE}Betas.html`,
    workbookUrl: `${WORKBOOK_BASE}betas.xls`,
    rowFields: [...BETA_FIELDS, 'rowType'],
    supportedFilters: [
      'industries',
      'industrySearch',
      'rowType',
      'minBeta',
      'maxBeta',
      'minUnleveredBeta',
      'maxUnleveredBeta',
      'minNumberOfFirms',
      'maxDebtToEquityRatio'
    ]
  },
  global_industry_betas: {
    id: 'global_industry_betas',
    title: 'Global Industry Betas',
    description:
      'Global industry beta, leverage, tax, cash, risk, and volatility measures by industry.',
    kind: 'beta',
    pageUrl: `${PAGE_BASE}BetasGlobal.html`,
    workbookUrl: `${WORKBOOK_BASE}betaGlobal.xls`,
    rowFields: [...BETA_FIELDS, 'rowType'],
    supportedFilters: [
      'industries',
      'industrySearch',
      'rowType',
      'minBeta',
      'maxBeta',
      'minUnleveredBeta',
      'maxUnleveredBeta',
      'minNumberOfFirms',
      'maxDebtToEquityRatio'
    ]
  }
};

export let SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
export let SOURCE_LIST = SOURCE_IDS.map(sourceId => SOURCES[sourceId]);

export let isSourceId = (value: string): value is SourceId =>
  SOURCE_IDS.includes(value as SourceId);
