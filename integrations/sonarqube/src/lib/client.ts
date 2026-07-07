import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  requestAxios,
  requestAxiosData
} from 'slates';
import { sonarqubeApiError, sonarqubeValidationError } from './errors';

export type SonarDeployment = 'server' | 'cloud';
export type SonarCloudRegion = 'eu' | 'us';

export type SonarConfig = {
  deployment?: SonarDeployment;
  serverBaseUrl?: string;
  cloudRegion?: SonarCloudRegion;
  organization?: string;
  defaultProjectKey?: string;
};

export type SonarAuth = {
  token: string;
};

export type SonarPage = {
  page?: number;
  pageSize?: number;
  total?: number;
  hasNextPage?: boolean;
};

export type SonarListResult<T> = {
  items: T[];
  page?: SonarPage;
};

export type SonarIssueSearchParams = {
  organization?: string;
  issueKeys?: string[];
  projectKeys?: string[];
  componentKeys?: string[];
  files?: string[];
  branch?: string;
  pullRequest?: string;
  resolved?: boolean;
  severities?: string[];
  statuses?: string[];
  issueStatuses?: string[];
  impactSoftwareQualities?: string[];
  impactSeverities?: string[];
  types?: string[];
  tags?: string[];
  query?: string;
  page?: number;
  pageSize?: number;
};

export type SonarDuplicatedFilesSearchParams = {
  projectKey: string;
  branch?: string;
  pullRequest?: string;
  pageIndex?: number;
  pageSize?: number;
};

export type SonarDuplicatedFile = {
  key: string;
  name?: string;
  path?: string;
  duplicatedLines?: number;
  duplicatedBlocks?: number;
  duplicatedLinesDensity?: string;
  raw: Record<string, unknown>;
};

export type SonarDuplicatedFilesSummary = {
  duplicatedLines?: number;
  duplicatedBlocks?: number;
  duplicatedLinesDensity?: string;
};

export type SonarDuplicatedFilesResult = {
  items: SonarDuplicatedFile[];
  page?: SonarPage;
  summary?: SonarDuplicatedFilesSummary;
  raw: Record<string, unknown>;
};

export type SonarDependencyRiskSearchParams = {
  projectKey: string;
  branch?: string;
  pullRequest?: string;
  pageIndex?: number;
  pageSize?: number;
};

export type SonarCoverageFileSearchParams = {
  projectKey: string;
  branch?: string;
  pullRequest?: string;
  pageIndex?: number;
  pageSize?: number;
};

export type SonarAdvancedAnalysisParams = {
  organizationKey: string;
  projectKey: string;
  branchName: string;
  filePath: string;
  fileContent: string;
  fileScope?: 'MAIN' | 'TEST';
};

export type SonarProjectSearchParams = {
  organization?: string;
  query?: string;
  qualifiers?: string[];
  page?: number;
  pageSize?: number;
};

export type SonarAuthenticationValidation = {
  valid?: boolean;
};

export const TOKEN_EXPIRATION_HEADER = 'SonarQube-Authentication-Token-Expiration';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export let normalizeServerBaseUrl = (serverBaseUrl: string | undefined) => {
  let trimmed = serverBaseUrl?.trim();
  if (!trimmed) {
    throw sonarqubeValidationError(
      'serverBaseUrl config is required when deployment is server.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw sonarqubeValidationError('serverBaseUrl must be a valid URL.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw sonarqubeValidationError('serverBaseUrl must use http or https.');
  }

  let normalized = trimTrailingSlash(parsed.toString());
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

export let cloudV1BaseUrl = (region: SonarCloudRegion = 'eu') =>
  region === 'us' ? 'https://sonarqube.us/api' : 'https://sonarcloud.io/api';

export let cloudV2BaseUrl = (region: SonarCloudRegion = 'eu') =>
  region === 'us' ? 'https://api.sonarqube.us' : 'https://api.sonarcloud.io';

export let resolveV1BaseUrl = (config: SonarConfig) =>
  (config.deployment ?? 'server') === 'cloud'
    ? cloudV1BaseUrl(config.cloudRegion ?? 'eu')
    : normalizeServerBaseUrl(config.serverBaseUrl);

export let resolveV2BaseUrl = (config: SonarConfig) =>
  (config.deployment ?? 'server') === 'cloud'
    ? cloudV2BaseUrl(config.cloudRegion ?? 'eu')
    : normalizeServerBaseUrl(config.serverBaseUrl);

export let serializeSonarParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      let concrete = value
        .filter(item => item !== undefined && item !== null && item !== '')
        .map(String);
      if (concrete.length > 0) search.append(key, concrete.join(','));
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

export let pageSize = (value: number | undefined, defaultValue: number, max: number) => {
  if (value === undefined) return defaultValue;
  if (!Number.isFinite(value) || value < 1) {
    throw sonarqubeValidationError('pageSize must be a positive number.');
  }
  return Math.min(Math.floor(value), max);
};

export let optionalPageSizeIncludingAll = (value: number | undefined) => {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) {
    throw sonarqubeValidationError('pageSize must be a non-negative number.');
  }
  return Math.floor(value);
};

export let pageNumber = (value: number | undefined) => {
  if (value === undefined) return 1;
  if (!Number.isFinite(value) || value < 1) {
    throw sonarqubeValidationError('page must be a positive number.');
  }
  return Math.floor(value);
};

export let requireCloudOrganization = (
  config: SonarConfig,
  organization: string | undefined
) => {
  if ((config.deployment ?? 'server') !== 'cloud') return undefined;

  let value = organization?.trim() || config.organization?.trim();
  if (!value) {
    throw sonarqubeValidationError(
      'organization is required for this SonarQube Cloud operation. Set the organization key in the integration config.'
    );
  }
  return value || undefined;
};

export let optionalCloudOrganization = (
  config: SonarConfig,
  organization: string | undefined
) => {
  if ((config.deployment ?? 'server') !== 'cloud') return undefined;
  return organization?.trim() || config.organization?.trim() || undefined;
};

export let projectKeyFor = (config: SonarConfig, projectKey: string | undefined) => {
  let value = projectKey?.trim() || config.defaultProjectKey?.trim();
  if (!value) {
    throw sonarqubeValidationError(
      'projectKey is required. Provide projectKey input or defaultProjectKey config.'
    );
  }
  return value;
};

export let requireOneProjectStatusIdentifier = (input: {
  analysisId?: string;
  projectId?: string;
  projectKey?: string;
}) => {
  let identifiers = [input.analysisId, input.projectId, input.projectKey].filter(
    value => typeof value === 'string' && value.trim().length > 0
  );
  if (identifiers.length < 1) {
    throw sonarqubeValidationError(
      'Provide at least one of analysisId, projectId, or projectKey.'
    );
  }
};

export let validateQualityGateStatusParams = (input: {
  analysisId?: string;
  projectId?: string;
  projectKey?: string;
  branch?: string;
  pullRequest?: string;
}) => {
  requireOneProjectStatusIdentifier(input);
  validateBranchPullRequestChoice(input);

  if (input.projectId && (input.branch || input.pullRequest)) {
    throw sonarqubeValidationError(
      'projectId cannot be combined with branch or pullRequest for quality gate status requests.'
    );
  }
};

export let requireServerDeployment = (config: SonarConfig, operation: string) => {
  if ((config.deployment ?? 'server') === 'cloud') {
    throw sonarqubeValidationError(`${operation} is only available for SonarQube Server.`);
  }
};

export let metricsSearchParams = (params: { page?: number; pageSize?: number }) => ({
  p: pageNumber(params.page),
  ps: pageSize(params.pageSize, 100, 500)
});

let cleanStringArray = (values: string[] | undefined) =>
  values?.map(value => value.trim()).filter(value => value.length > 0);

export let projectMeasuresParams = (
  _config: SonarConfig,
  params: {
    projectKey: string;
    metricKeys?: string[];
    branch?: string;
    pullRequest?: string;
  }
) => {
  validateBranchPullRequestChoice(params);

  return {
    component: params.projectKey,
    metricKeys: params.metricKeys,
    branch: params.branch,
    pullRequest: params.pullRequest,
    additionalFields: 'metrics'
  };
};

export let hotspotProjectSearchParams = (
  _config: SonarConfig,
  projectKey: string | undefined
) => ({
  projectKey
});

export let validateBranchPullRequestChoice = (params: {
  branch?: string;
  pullRequest?: string;
}) => {
  if (params.branch && params.pullRequest) {
    throw sonarqubeValidationError(
      "Cannot use 'branch' and 'pullRequest' together. Use 'branch' for long-lived branches (see list_branches) or 'pullRequest' for pull requests (see list_pull_requests)."
    );
  }
};

let branchPullRequestParams = (params: { branch?: string; pullRequest?: string }) => {
  validateBranchPullRequestChoice(params);

  return {
    branch: params.branch,
    pullRequest: params.pullRequest
  };
};

export let sourceRawParams = (
  _config: SonarConfig,
  params: {
    component: string;
    branch?: string;
    pullRequest?: string;
  }
) => ({
  key: params.component,
  ...branchPullRequestParams(params)
});

export let sourceScmParams = (params: {
  component: string;
  fromLine?: number;
  toLine?: number;
  commitsByLine?: boolean;
}) => ({
  key: params.component,
  from: params.fromLine,
  to: params.toLine,
  commits_by_line: params.commitsByLine
});

export let duplicationShowParams = (
  _config: SonarConfig,
  params: {
    component: string;
    branch?: string;
    pullRequest?: string;
  }
) => ({
  key: params.component,
  ...branchPullRequestParams(params)
});

let issueComponentFilter = (params: SonarIssueSearchParams) => {
  let values = [
    ...(params.projectKeys ?? []),
    ...(params.componentKeys ?? []),
    ...(params.files ?? [])
  ].filter(value => typeof value === 'string' && value.length > 0);
  if (values.length === 0) return undefined;
  return [...new Set(values)];
};

export let projectSearchParams = (config: SonarConfig, params: SonarProjectSearchParams) => {
  let qualifiers = projectSearchQualifiers(config, params.qualifiers);

  return {
    organization: requireCloudOrganization(config, params.organization),
    q: params.query?.trim() || undefined,
    qualifiers: (config.deployment ?? 'server') === 'cloud' ? undefined : qualifiers,
    p: pageNumber(params.page),
    ps: pageSize(params.pageSize, 500, 500)
  };
};

let projectSearchQualifiers = (config: SonarConfig, qualifiers: string[] | undefined) => {
  let concrete = cleanStringArray(qualifiers);
  if (concrete?.length) return concrete;
  return (config.deployment ?? 'server') === 'server' ? ['TRK'] : undefined;
};

let matchesProjectQualifiers = (
  project: Record<string, unknown>,
  qualifiers: string[] | undefined
) => {
  if (!qualifiers?.length) return true;
  return typeof project.qualifier === 'string' && qualifiers.includes(project.qualifier);
};

let projectSearchPage = (
  page: SonarPage | undefined,
  items: Record<string, unknown>[]
): SonarPage => ({
  page: page?.page ?? 1,
  pageSize: page?.pageSize ?? items.length,
  total: page?.total === undefined ? items.length : Math.max(page.total, items.length),
  hasNextPage:
    page?.hasNextPage ??
    (page?.page ?? 1) * (page?.pageSize ?? items.length) <
      (page?.total === undefined ? items.length : Math.max(page.total, items.length))
});

let currentImpactSeverityValues = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'BLOCKER'];
let legacyIssueSeverityValues = ['CRITICAL', 'MAJOR', 'MINOR'];
let supportedIssueSeverityValues = new Set([
  ...currentImpactSeverityValues,
  ...legacyIssueSeverityValues
]);

let issueSeverityParams = (params: SonarIssueSearchParams) => {
  let severities = cleanStringArray(params.severities);
  let explicitImpactSeverities = cleanStringArray(params.impactSeverities);

  if (!severities?.length) {
    return {
      severities: undefined,
      impactSeverities: explicitImpactSeverities
    };
  }

  let invalidSeverity = severities.find(value => !supportedIssueSeverityValues.has(value));
  if (invalidSeverity) {
    throw sonarqubeValidationError(
      `Unsupported SonarQube issue severity filter: ${invalidSeverity}.`
    );
  }

  let hasLegacySeverity = severities.some(value => legacyIssueSeverityValues.includes(value));
  let hasCurrentImpactSeverity = severities.some(value =>
    currentImpactSeverityValues.includes(value)
  );

  if (hasLegacySeverity && hasCurrentImpactSeverity) {
    throw sonarqubeValidationError(
      'Do not mix current impact severities (INFO, LOW, MEDIUM, HIGH, BLOCKER) with legacy issue severities (CRITICAL, MAJOR, MINOR) in severities.'
    );
  }

  if (hasLegacySeverity) {
    return {
      severities,
      impactSeverities: explicitImpactSeverities
    };
  }

  return {
    severities: undefined,
    impactSeverities: [...new Set([...(explicitImpactSeverities ?? []), ...severities])]
  };
};

export let issueSearchParams = (config: SonarConfig, params: SonarIssueSearchParams) => {
  let isCloud = (config.deployment ?? 'server') === 'cloud';
  let components = issueComponentFilter(params);
  let severityParams = issueSeverityParams(params);
  validateBranchPullRequestChoice(params);

  return {
    organization: requireCloudOrganization(config, params.organization),
    issues: params.issueKeys,
    ...(isCloud ? { componentKeys: components } : { components }),
    branch: params.branch,
    pullRequest: params.pullRequest,
    resolved: params.resolved,
    severities: severityParams.severities,
    statuses: params.statuses,
    issueStatuses: params.issueStatuses,
    impactSoftwareQualities: params.impactSoftwareQualities,
    impactSeverities: severityParams.impactSeverities,
    types: params.types,
    tags: params.tags,
    q: params.query,
    p: pageNumber(params.page),
    ps: pageSize(params.pageSize, 100, 500)
  };
};

export let ruleShowParams = (
  config: SonarConfig,
  ruleKey: string,
  organization: string | undefined
) => ({
  organization:
    (config.deployment ?? 'server') === 'cloud'
      ? optionalCloudOrganization(config, organization)
      : undefined,
  key: ruleKey
});

let duplicatedFileMetricKeys = [
  'duplicated_lines',
  'duplicated_blocks',
  'duplicated_lines_density'
];

let coverageSummaryMetricKeys = ['coverage', 'lines_to_cover', 'uncovered_lines'];

let coverageTreeMetricKeys = [
  'coverage',
  'line_coverage',
  'branch_coverage',
  'lines_to_cover',
  'uncovered_lines',
  'conditions_to_cover',
  'uncovered_conditions'
];

export let normalizeCoveragePageIndex = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;

export let normalizeCoveragePageSize = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), 500)
    : 100;

export let componentTreeMeasuresParams = (params: {
  component: string;
  branch?: string;
  pullRequest?: string;
  metricKeys: string[];
  qualifiers?: string[];
  strategy?: string;
  sort?: string;
  metricSort?: string;
  ascending?: boolean;
  pageIndex?: number;
  pageSize?: number;
  additionalFields?: string;
}) => {
  validateBranchPullRequestChoice(params);

  return {
    component: params.component,
    branch: params.branch,
    metricKeys: params.metricKeys,
    pullRequest: params.pullRequest,
    qualifiers: params.qualifiers,
    strategy: params.strategy,
    s: params.sort,
    metricSort: params.metricSort,
    asc: params.ascending,
    p: pageNumber(params.pageIndex),
    ps: pageSize(params.pageSize, 500, 500),
    additionalFields: params.additionalFields
  };
};

export let dependencyRiskParams = (params: SonarDependencyRiskSearchParams) => {
  validateBranchPullRequestChoice(params);

  if (
    params.pageIndex !== undefined &&
    (!Number.isFinite(params.pageIndex) || params.pageIndex < 1)
  ) {
    throw sonarqubeValidationError('pageIndex must be greater than 0.');
  }

  if (
    params.pageSize !== undefined &&
    (!Number.isFinite(params.pageSize) || params.pageSize < 1 || params.pageSize > 500)
  ) {
    throw sonarqubeValidationError(
      'pageSize must be greater than 0 and less than or equal to 500.'
    );
  }

  return {
    projectKey: params.projectKey,
    branchKey: params.branch,
    pullRequestKey: params.pullRequest,
    pageIndex: params.pageIndex === undefined ? undefined : Math.floor(params.pageIndex),
    pageSize: params.pageSize === undefined ? undefined : Math.floor(params.pageSize)
  };
};

let parseVersionNumbers = (version: string) =>
  version
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(value => Number.parseInt(value, 10))
    .filter(value => Number.isFinite(value));

export let isVersionAtLeast = (version: string, minimum: string) => {
  let currentParts = parseVersionNumbers(version);
  let minimumParts = parseVersionNumbers(minimum);
  let length = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < length; index++) {
    let current = currentParts[index] ?? 0;
    let target = minimumParts[index] ?? 0;
    if (current > target) return true;
    if (current < target) return false;
  }

  return true;
};

export let validateAuthenticationResponse = (data: unknown) => {
  if (!isRecord(data) || data.valid !== true) {
    throw sonarqubeValidationError('SonarQube token validation failed.');
  }
};

let optionalRecordNumber = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === 'number' ? record[key] : undefined;

let optionalRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export let normalizePage = (data: unknown): SonarPage | undefined => {
  if (!isRecord(data)) return undefined;
  let paging = isRecord(data.paging) ? data.paging : undefined;
  let source = paging ?? data;
  let page = optionalRecordNumber(source, 'pageIndex') ?? optionalRecordNumber(source, 'p');
  let normalizedPageSize =
    optionalRecordNumber(source, 'pageSize') ?? optionalRecordNumber(source, 'ps');
  let total = optionalRecordNumber(source, 'total');
  let hasNextPage = typeof source.hasNextPage === 'boolean' ? source.hasNextPage : undefined;

  if (
    hasNextPage === undefined &&
    page === undefined &&
    normalizedPageSize === undefined &&
    total === undefined
  ) {
    return undefined;
  }

  return {
    page,
    pageSize: normalizedPageSize,
    total,
    hasNextPage:
      hasNextPage ??
      (page !== undefined && normalizedPageSize !== undefined && total !== undefined
        ? page * normalizedPageSize < total
        : undefined)
  };
};

let normalizeArray = <T>(data: unknown, key: string): SonarListResult<T> => {
  if (!isRecord(data) || !Array.isArray(data[key])) {
    throw sonarqubeValidationError(`SonarQube response did not include ${key}.`);
  }

  return {
    items: data[key] as T[],
    page: normalizePage(data)
  };
};

let optionalRecordString = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === 'string' && record[key].length > 0 ? record[key] : undefined;

let measuresFromRecord = (record: Record<string, unknown>) =>
  Array.isArray(record.measures)
    ? record.measures.filter((measure): measure is Record<string, unknown> =>
        isRecord(measure)
      )
    : [];

let measureValue = (record: Record<string, unknown>, metricKey: string) => {
  let measure = measuresFromRecord(record).find(item => item.metric === metricKey);
  return typeof measure?.value === 'string' ? measure.value : undefined;
};

let integerMeasureValue = (record: Record<string, unknown>, metricKey: string) => {
  let value = measureValue(record, metricKey);
  if (value === undefined) return undefined;
  let parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

let hasDuplicatedLines = (component: Record<string, unknown>) => {
  let duplicatedLines = integerMeasureValue(component, 'duplicated_lines');
  return duplicatedLines !== undefined && duplicatedLines > 0;
};

let mapDuplicatedFile = (component: Record<string, unknown>): SonarDuplicatedFile => ({
  key: String(component.key ?? ''),
  name: optionalRecordString(component, 'name'),
  path: optionalRecordString(component, 'path'),
  duplicatedLines: integerMeasureValue(component, 'duplicated_lines'),
  duplicatedBlocks: integerMeasureValue(component, 'duplicated_blocks'),
  duplicatedLinesDensity: measureValue(component, 'duplicated_lines_density'),
  raw: component
});

let duplicationSummaryFromProjectMeasures = (
  projectMeasures: Record<string, unknown>
): SonarDuplicatedFilesSummary | undefined => {
  let component = optionalRecord(projectMeasures.component);
  if (!component) return undefined;

  let summary = {
    duplicatedLines: integerMeasureValue(component, 'duplicated_lines'),
    duplicatedBlocks: integerMeasureValue(component, 'duplicated_blocks'),
    duplicatedLinesDensity: measureValue(component, 'duplicated_lines_density')
  };

  return summary.duplicatedLines !== undefined ||
    summary.duplicatedBlocks !== undefined ||
    summary.duplicatedLinesDensity !== undefined
    ? summary
    : undefined;
};

let isBranchParameterType = (branch: Record<string, unknown>) => {
  let type = optionalRecordString(branch, 'type');
  return type === 'LONG' || type === 'BRANCH';
};

let truthyParams = (params: Record<string, unknown>) => params;

export class SonarQubeClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private httpAnonymous: ReturnType<typeof createAuthenticatedAxios>;
  private httpV2: ReturnType<typeof createAuthenticatedAxios>;
  private config: SonarConfig;
  private tokenExpiration?: string;

  constructor(params: { auth: SonarAuth; config: SonarConfig }) {
    this.config = params.config;
    this.http = createAuthenticatedAxios({
      baseURL: resolveV1BaseUrl(params.config),
      authHeader: { value: `Bearer ${params.auth.token}` },
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeSonarParams }
    });
    this.httpAnonymous = createAuthenticatedAxios({
      baseURL: resolveV1BaseUrl(params.config),
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeSonarParams }
    });
    this.httpV2 = createAuthenticatedAxios({
      baseURL: resolveV2BaseUrl(params.config),
      authHeader: { value: `Bearer ${params.auth.token}` },
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeSonarParams }
    });
  }

  get lastTokenExpiration() {
    return this.tokenExpiration;
  }

  private captureTokenExpiration(headers: unknown) {
    let value = getResponseHeaderValue(headers, TOKEN_EXPIRATION_HEADER);
    if (value) this.tokenExpiration = value;
  }

  private async get<T>(operation: string, path: string, params?: Record<string, unknown>) {
    let response = await requestAxios<T>(
      operation,
      () => this.http.get(path, { params }),
      sonarqubeApiError
    );
    this.captureTokenExpiration(response.headers);
    return response.data as T;
  }

  private async getAnonymous<T>(
    operation: string,
    path: string,
    params?: Record<string, unknown>
  ) {
    let response = await requestAxios<T>(
      operation,
      () => this.httpAnonymous.get(path, { params }),
      sonarqubeApiError
    );
    return response.data as T;
  }

  private async getText(operation: string, path: string, params?: Record<string, unknown>) {
    let response = await requestAxios<string>(
      operation,
      () =>
        this.http.get(path, {
          params,
          responseType: 'text',
          transformResponse: value => value
        }),
      sonarqubeApiError
    );
    this.captureTokenExpiration(response.headers);
    return response.data;
  }

  private async post<T>(operation: string, path: string, params?: Record<string, unknown>) {
    let response = await requestAxios<T>(
      operation,
      () =>
        this.http.post(path, serializeSonarParams(params ?? {}), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }),
      sonarqubeApiError
    );
    this.captureTokenExpiration(response.headers);
    return response.data as T;
  }

  private async getV2<T>(operation: string, path: string, params?: Record<string, unknown>) {
    let response = await requestAxios<T>(
      operation,
      () => this.httpV2.get(path, { params }),
      sonarqubeApiError
    );
    this.captureTokenExpiration(response.headers);
    return response.data as T;
  }

  private async postJsonV2<T>(operation: string, path: string, data: Record<string, unknown>) {
    let response = await requestAxios<T>(
      operation,
      () =>
        this.httpV2.post(path, data, {
          headers: {
            'Content-Type': 'application/json'
          }
        }),
      sonarqubeApiError
    );
    this.captureTokenExpiration(response.headers);
    return response.data as T;
  }

  async validateAuthentication() {
    let data = await this.get<SonarAuthenticationValidation>(
      'validate authentication',
      '/authentication/validate'
    );
    validateAuthenticationResponse(data);
    return data;
  }

  async getServerVersion() {
    return await requestAxiosData<string>(
      'get server version',
      () =>
        this.http.get('/server/version', {
          responseType: 'text',
          transformResponse: value => value
        }),
      sonarqubeApiError
    );
  }

  private async searchProjectsPage(params: SonarProjectSearchParams) {
    let data = await this.get<unknown>(
      'search projects',
      '/components/search',
      projectSearchParams(this.config, params)
    );
    return normalizeArray<Record<string, unknown>>(data, 'components');
  }

  async searchProjects(params: SonarProjectSearchParams) {
    let qualifiers = projectSearchQualifiers(this.config, params.qualifiers);
    let searchResult = await this.searchProjectsPage(params);
    let items = searchResult.items.filter(project =>
      matchesProjectQualifiers(project, qualifiers)
    );

    return {
      items,
      page: projectSearchPage(searchResult.page, items)
    };
  }

  async listProjectBranches(projectKey: string) {
    let data = await this.get<unknown>('list project branches', '/project_branches/list', {
      project: projectKey
    });
    let result = normalizeArray<Record<string, unknown>>(data, 'branches');
    return {
      items: result.items.filter(isBranchParameterType),
      page: result.page
    };
  }

  async listProjectPullRequests(projectKey: string) {
    let data = await this.get<unknown>(
      'list project pull requests',
      '/project_pull_requests/list',
      {
        project: projectKey
      }
    );
    return normalizeArray<Record<string, unknown>>(data, 'pullRequests');
  }

  async listMetrics(params: { page?: number; pageSize?: number }) {
    let data = await this.get<unknown>(
      'list metrics',
      '/metrics/search',
      metricsSearchParams(params)
    );
    return normalizeArray<Record<string, unknown>>(data, 'metrics');
  }

  async getProjectMeasures(params: {
    projectKey: string;
    metricKeys?: string[];
    branch?: string;
    pullRequest?: string;
  }) {
    return await this.get<Record<string, unknown>>(
      'get project measures',
      '/measures/component',
      projectMeasuresParams(this.config, params)
    );
  }

  async getQualityGateStatus(params: {
    analysisId?: string;
    projectId?: string;
    projectKey?: string;
    branch?: string;
    pullRequest?: string;
  }) {
    validateQualityGateStatusParams(params);
    return await this.get<Record<string, unknown>>(
      'get quality gate status',
      '/qualitygates/project_status',
      truthyParams({
        analysisId: params.analysisId,
        projectId: params.projectId,
        projectKey: params.projectKey,
        branch: params.branch,
        pullRequest: params.pullRequest
      })
    );
  }

  async searchIssues(params: SonarIssueSearchParams) {
    let data = await this.get<unknown>(
      'search issues',
      '/issues/search',
      issueSearchParams(this.config, params)
    );
    return normalizeArray<Record<string, unknown>>(data, 'issues');
  }

  async changeIssueStatus(params: { issueKey: string; transition: string }) {
    return await this.post<Record<string, unknown>>(
      'change issue status',
      '/issues/do_transition',
      {
        issue: params.issueKey,
        transition: params.transition
      }
    );
  }

  async searchHotspots(params: {
    projectKey?: string;
    branch?: string;
    pullRequest?: string;
    hotspotKeys?: string[];
    files?: string[];
    status?: string;
    resolution?: string;
    sinceLeakPeriod?: boolean;
    onlyMine?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    validateBranchPullRequestChoice(params);
    let projectKey = params.projectKey?.trim() || undefined;
    let hotspotKeys = cleanStringArray(params.hotspotKeys);
    if (!projectKey && !hotspotKeys?.length) {
      throw sonarqubeValidationError("Either 'projectKey' or 'hotspotKeys' must be provided");
    }
    let data = await this.get<unknown>('search security hotspots', '/hotspots/search', {
      ...hotspotProjectSearchParams(this.config, projectKey),
      branch: params.branch,
      pullRequest: params.pullRequest,
      hotspots: hotspotKeys,
      files: params.files,
      status: params.status,
      resolution: params.resolution,
      sinceLeakPeriod: params.sinceLeakPeriod,
      onlyMine: params.onlyMine,
      p: pageNumber(params.page),
      ps: pageSize(params.pageSize, 100, 500)
    });
    return normalizeArray<Record<string, unknown>>(data, 'hotspots');
  }

  async getHotspot(hotspotKey: string) {
    return await this.get<Record<string, unknown>>('get security hotspot', '/hotspots/show', {
      hotspot: hotspotKey
    });
  }

  async changeHotspotStatus(params: {
    hotspotKey: string;
    status: string;
    resolution?: string;
    comment?: string;
  }) {
    return await this.post<Record<string, unknown>>(
      'change security hotspot status',
      '/hotspots/change_status',
      {
        hotspot: params.hotspotKey,
        status: params.status,
        resolution: params.resolution,
        comment: params.comment
      }
    );
  }

  async getRule(ruleKey: string, organization?: string) {
    return await this.get<Record<string, unknown>>(
      'get rule',
      '/rules/show',
      ruleShowParams(this.config, ruleKey, organization)
    );
  }

  async getSourceRaw(params: { component: string; branch?: string; pullRequest?: string }) {
    return await this.getText(
      'get raw source',
      '/sources/raw',
      sourceRawParams(this.config, params)
    );
  }

  async getScmInfo(params: {
    component: string;
    fromLine?: number;
    toLine?: number;
    commitsByLine?: boolean;
  }) {
    return await this.get<Record<string, unknown>>(
      'get source SCM info',
      '/sources/scm',
      sourceScmParams(params)
    );
  }

  async getDuplications(params: { component: string; branch?: string; pullRequest?: string }) {
    return await this.get<Record<string, unknown>>(
      'get duplications',
      '/duplications/show',
      duplicationShowParams(this.config, params)
    );
  }

  private async getComponentTreeMeasures(
    operation: string,
    params: {
      component: string;
      branch?: string;
      pullRequest?: string;
      metricKeys: string[];
      qualifiers?: string[];
      strategy?: string;
      sort?: string;
      metricSort?: string;
      ascending?: boolean;
      pageIndex?: number;
      pageSize?: number;
      additionalFields?: string;
    }
  ) {
    let data = await this.get<unknown>(
      operation,
      '/measures/component_tree',
      componentTreeMeasuresParams(params)
    );
    let result = normalizeArray<Record<string, unknown>>(data, 'components');

    return {
      data,
      items: result.items,
      page: result.page
    };
  }

  async searchDuplicatedFiles(
    params: SonarDuplicatedFilesSearchParams
  ): Promise<SonarDuplicatedFilesResult> {
    validateBranchPullRequestChoice(params);

    let projectMeasures = await this.getProjectMeasures({
      projectKey: params.projectKey,
      metricKeys: duplicatedFileMetricKeys,
      branch: params.branch,
      pullRequest: params.pullRequest
    });
    let summary = duplicationSummaryFromProjectMeasures(projectMeasures);
    let manualPagination = params.pageIndex !== undefined || params.pageSize !== undefined;
    let pageSizeValue = pageSize(params.pageSize, 500, 500);

    if (manualPagination) {
      let componentTree = await this.getComponentTreeMeasures('search duplicated files', {
        component: params.projectKey,
        branch: params.branch,
        pullRequest: params.pullRequest,
        metricKeys: duplicatedFileMetricKeys,
        qualifiers: ['FIL'],
        strategy: 'leaves',
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
        additionalFields: 'metrics'
      });
      let items = componentTree.items.filter(hasDuplicatedLines).map(mapDuplicatedFile);

      return {
        items,
        page: componentTree.page,
        summary,
        raw: {
          projectMeasures,
          componentTree: componentTree.data
        }
      };
    }

    let duplicatedFiles: Record<string, unknown>[] = [];
    let rawPages: unknown[] = [];
    for (let pageIndex = 1; pageIndex <= 20; pageIndex++) {
      let componentTree = await this.getComponentTreeMeasures('search duplicated files', {
        component: params.projectKey,
        branch: params.branch,
        pullRequest: params.pullRequest,
        metricKeys: duplicatedFileMetricKeys,
        qualifiers: ['FIL'],
        strategy: 'leaves',
        pageIndex,
        pageSize: pageSizeValue,
        additionalFields: 'metrics'
      });
      rawPages.push(componentTree.data);
      duplicatedFiles.push(...componentTree.items.filter(hasDuplicatedLines));

      let total = componentTree.page?.total ?? componentTree.items.length;
      if (componentTree.items.length === 0 || pageIndex * pageSizeValue >= total) break;
    }

    let items = duplicatedFiles.map(mapDuplicatedFile);
    return {
      items,
      page: {
        page: 1,
        pageSize: items.length,
        total: items.length
      },
      summary,
      raw: {
        projectMeasures,
        componentTreePages: rawPages
      }
    };
  }

  async searchFilesByCoverage(params: SonarCoverageFileSearchParams) {
    validateBranchPullRequestChoice(params);
    let pageIndex = normalizeCoveragePageIndex(params.pageIndex);
    let requestedPageSize = normalizeCoveragePageSize(params.pageSize);

    let projectMeasures = await this.getProjectMeasures({
      projectKey: params.projectKey,
      metricKeys: coverageSummaryMetricKeys,
      branch: params.branch,
      pullRequest: params.pullRequest
    });
    let componentTree = await this.getComponentTreeMeasures('search files by coverage', {
      component: params.projectKey,
      branch: params.branch,
      pullRequest: params.pullRequest,
      metricKeys: coverageTreeMetricKeys,
      qualifiers: ['FIL'],
      strategy: 'all',
      sort: 'metric',
      metricSort: 'coverage',
      ascending: true,
      pageIndex,
      pageSize: requestedPageSize
    });

    return {
      projectMeasures,
      items: componentTree.items,
      page: componentTree.page,
      pageIndex,
      pageSize: requestedPageSize
    };
  }

  async getSourceLines(params: { key: string; branch?: string; pullRequest?: string }) {
    validateBranchPullRequestChoice(params);
    return await this.get<Record<string, unknown>>('get source lines', '/sources/lines', {
      key: params.key,
      branch: params.branch,
      pullRequest: params.pullRequest
    });
  }

  async listQualityGates() {
    let organization = optionalCloudOrganization(this.config, undefined);
    let data = await this.get<unknown>('list quality gates', '/qualitygates/list', {
      organization
    });
    return normalizeArray<Record<string, unknown>>(data, 'qualitygates');
  }

  async listLanguages(params: { query?: string }) {
    let data = await this.get<unknown>('list languages', '/languages/list', {
      q: params.query
    });
    return normalizeArray<Record<string, unknown>>(data, 'languages');
  }

  async getSystemStatus() {
    requireServerDeployment(this.config, 'get system status');
    return await this.getAnonymous<Record<string, unknown>>(
      'get system status',
      '/system/status'
    );
  }

  async getOrganizationUuidV4(organizationKey: string) {
    let data = await this.getV2<unknown>(
      'get organization uuid',
      '/organizations/organizations',
      {
        organizationKey,
        excludeEligibility: true
      }
    );

    if (!Array.isArray(data) || data.length === 0) return undefined;
    let organization = data[0];
    if (!isRecord(organization)) return undefined;
    return typeof organization.uuidV4 === 'string' ? organization.uuidV4 : undefined;
  }

  async getAdvancedAnalysisOrganizationConfig(organizationUuidV4: string) {
    return await this.getV2<Record<string, unknown>>(
      'get advanced code analysis organization config',
      `/a3s-analysis/org-config/${encodeURIComponent(organizationUuidV4)}`
    );
  }

  async isAdvancedAnalysisEnabled(organizationKey: string) {
    let uuid = await this.getOrganizationUuidV4(organizationKey);
    if (!uuid) return false;
    let config = await this.getAdvancedAnalysisOrganizationConfig(uuid);
    return config.enabled === true;
  }

  async runAdvancedCodeAnalysis(params: SonarAdvancedAnalysisParams) {
    if ((this.config.deployment ?? 'server') !== 'cloud') {
      throw sonarqubeValidationError(
        'run_advanced_code_analysis is only available for SonarQube Cloud.'
      );
    }

    let enabled = await this.isAdvancedAnalysisEnabled(params.organizationKey);
    if (!enabled) {
      throw sonarqubeValidationError(
        'run_advanced_code_analysis is not available because Advanced Code Analysis is not enabled for the configured SonarQube Cloud organization.'
      );
    }

    return await this.postJsonV2<Record<string, unknown>>(
      'run advanced code analysis',
      '/a3s-analysis/analyses',
      params
    );
  }

  async isCloudScaEnabled(organization: string) {
    let data = await this.getV2<Record<string, unknown>>(
      'check dependency risks feature',
      '/sca/feature-enabled',
      { organization }
    );
    return data.enabled === true;
  }

  async isServerScaEnabled() {
    let features = await this.get<unknown>('list server features', '/features/list');
    return Array.isArray(features) && features.includes('sca');
  }

  async searchDependencyRisks(params: SonarDependencyRiskSearchParams) {
    if ((this.config.deployment ?? 'server') === 'cloud') {
      let organization = requireCloudOrganization(this.config, undefined);
      if (!organization) {
        throw sonarqubeValidationError(
          'organization is required for search_dependency_risks.'
        );
      }
      let isEnabled = await this.isCloudScaEnabled(organization);
      if (!isEnabled) {
        throw sonarqubeValidationError(
          'Search Dependency Risks tool is not available in your SonarQube Cloud organization because Advanced Security is not enabled.'
        );
      }
      return await this.getV2<Record<string, unknown>>(
        'search dependency risks',
        '/sca/issues-releases',
        dependencyRiskParams(params)
      );
    }

    let serverVersion = await this.getServerVersion();
    if (!isVersionAtLeast(serverVersion, '2025.4')) {
      throw sonarqubeValidationError(
        'Search Dependency Risks tool is not available because it requires SonarQube Server 2025.4 Enterprise or higher.'
      );
    }

    let isEnabled = await this.isServerScaEnabled();
    if (!isEnabled) {
      throw sonarqubeValidationError(
        'Search Dependency Risks tool is not available for SonarQube Server because Advanced Security is not enabled.'
      );
    }

    return await this.getV2<Record<string, unknown>>(
      'search dependency risks',
      '/v2/sca/issues-releases',
      dependencyRiskParams(params)
    );
  }
}

export let createSonarQubeClient = (params: { auth: SonarAuth; config: SonarConfig }) =>
  new SonarQubeClient(params);
