export type GenesisLanguage = 'en' | 'de';

export type GenesisStatusCode = string | number;
export type GenesisArea = 'public' | 'user' | 'all';

export interface GenesisStatus {
  Code: GenesisStatusCode;
  Content?: unknown;
  Type?: unknown;
}

export type GenesisEnvelope<T extends Record<string, unknown> = Record<string, unknown>> =
  T & {
    Status: GenesisStatus;
    Copyright?: unknown;
    Parameter?: unknown;
  };

export interface GenesisResponse<T> {
  data: T;
  warning?: string;
  copyright?: string;
}

export type GenesisCatalogCategory =
  | 'cube'
  | 'statistic'
  | 'table'
  | 'time_series'
  | 'variable';

export interface GenesisCatalogItem {
  category: GenesisCatalogCategory;
  [key: string]: unknown;
}

export interface GenesisSearchParams {
  language: GenesisLanguage;
  searchTerm: string;
  category?: GenesisCatalogCategory | 'all';
  pageLength?: number;
  allowNoResult?: boolean;
}

export type GenesisMetadataObjectType =
  | 'table'
  | 'cube'
  | 'statistic'
  | 'time_series'
  | 'variable'
  | 'value';

export interface GenesisMetadataParams {
  language: GenesisLanguage;
  objectType: GenesisMetadataObjectType;
  code: string;
  area?: GenesisArea;
}

export interface GenesisVariableValuesParams {
  language: GenesisLanguage;
  variableCode: string;
  selection?: string;
  area?: GenesisArea;
  searchCriterion?: 'content' | 'code';
  sortCriterion?: 'content' | 'code';
  pageLength?: number;
  allowNoResult?: boolean;
}

export type GenesisTableFormat = 'csv' | 'datencsv' | 'ffcsv' | 'html' | 'genml' | 'xlsx';

export interface GenesisSelection {
  variableCode: string;
  valueCodes: string[];
}

export interface GenesisDownloadParams {
  language: GenesisLanguage;
  area?: GenesisArea;
  contents?: string[];
  startYear?: string;
  endYear?: string;
  timeSlices?: number;
  regionalSelection?: GenesisSelection;
  classifyingSelections?: GenesisSelection[];
  updatedAfter?: string;
}

export interface GenesisTableDownloadParams extends GenesisDownloadParams {
  tableCode: string;
  format?: GenesisTableFormat;
  transpose?: boolean;
  compress?: boolean;
}

export interface GenesisCubeDownloadParams extends GenesisDownloadParams {
  cubeCode: string;
  includeValues?: boolean;
  includeMetadata?: boolean;
  includeAdditionalMetadata?: boolean;
}

export interface GenesisFile {
  contentBase64: string;
  mimeType: string;
  byteLength: number;
  fileName: string;
  isArchive: boolean;
}

export interface GenesisLoginProfile {
  username: string;
}
