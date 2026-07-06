import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  requestAxios,
  requestAxiosData
} from 'slates';
import {
  hasProjectLookupFailureMessage,
  sonarqubeApiError,
  sonarqubeValidationError
} from './errors';

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

export type SonarComputeTaskAdditionalField = 'scannerContext' | 'warnings' | 'stacktrace';

export type SonarProjectAnalysisStatusUnavailable = {
  projectKey: string;
  reason: 'ce_component_not_found';
  message: string;
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

export type SonarRuleSearchParams = {
  organization?: string;
  query?: string;
  languages?: string[];
  repositories?: string[];
  tags?: string[];
  severities?: string[];
  types?: string[];
  statuses?: string[];
  page?: number;
  pageSize?: number;
};

export type SonarProjectSearchParams = {
  organization?: string;
  query?: string;
  projectKeys?: string[];
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

let errorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (isRecord(error)) {
    let message = error.message;
    if (typeof message === 'string') return message;
  }
  return '';
};

let isProjectLookupFailure = (error: unknown) =>
  hasProjectLookupFailureMessage(errorMessage(error));

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
      'organization is required for this SonarQube Cloud operation. Provide organization input or config.'
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

  if (input.branch && input.pullRequest) {
    throw sonarqubeValidationError('Provide either branch or pullRequest, not both.');
  }

  if ((input.branch || input.pullRequest) && !input.projectKey?.trim()) {
    throw sonarqubeValidationError(
      'branch and pullRequest can only be used with projectKey quality gate status requests.'
    );
  }

  if (input.projectId && (input.branch || input.pullRequest)) {
    throw sonarqubeValidationError(
      'projectId cannot be combined with branch or pullRequest for quality gate status requests.'
    );
  }
};

let computeTaskAdditionalFields = new Set<string>([
  'scannerContext',
  'warnings',
  'stacktrace'
]);

export let validateComputeTaskAdditionalFields = (
  config: SonarConfig,
  additionalFields: string[] | undefined
) => {
  let invalidField = additionalFields?.find(field => !computeTaskAdditionalFields.has(field));
  if (invalidField) {
    throw sonarqubeValidationError(
      `Unsupported compute task additional field: ${invalidField}.`
    );
  }

  if (
    (config.deployment ?? 'server') === 'cloud' &&
    additionalFields?.includes('stacktrace')
  ) {
    throw sonarqubeValidationError(
      'Compute task additional field stacktrace is only available for SonarQube Server.'
    );
  }
};

export let requireServerDeployment = (config: SonarConfig, operation: string) => {
  if ((config.deployment ?? 'server') === 'cloud') {
    throw sonarqubeValidationError(`${operation} is only available for SonarQube Server.`);
  }
};

export let metricsSearchParams = (params: {
  query?: string;
  page?: number;
  pageSize?: number;
}) => ({
  p: pageNumber(params.page),
  ps: pageSize(params.pageSize, 100, 500)
});

let metricSearchFields = ['key', 'name'] as const;

let matchesMetricQuery = (metric: Record<string, unknown>, query: string) =>
  metricSearchFields.some(field => {
    let value = metric[field];
    return typeof value === 'string' && value.toLowerCase().includes(query);
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
    throw sonarqubeValidationError('Provide either branch or pullRequest, not both.');
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

export let sourceShowParams = (params: {
  component: string;
  fromLine?: number;
  toLine?: number;
}) => ({
  key: params.component,
  from: params.fromLine,
  to: params.toLine
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

let mergeProjectItems = (
  first: Record<string, unknown>[],
  second: Record<string, unknown>[]
) => {
  let seen = new Set<string>();
  let merged: Record<string, unknown>[] = [];

  for (let item of [...first, ...second]) {
    let key = typeof item.key === 'string' ? item.key : undefined;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    merged.push(item);
  }

  return merged;
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

export let issueTransitionParams = (params: { issueKey: string; status: string }) => ({
  key: params.issueKey,
  status: params.status
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

export let ruleSearchParams = (config: SonarConfig, params: SonarRuleSearchParams) => ({
  organization: optionalCloudOrganization(config, params.organization),
  q: params.query,
  languages: params.languages,
  repositories: params.repositories,
  tags: params.tags,
  severities: params.severities,
  types: params.types,
  statuses: params.statuses,
  f: 'name,repo,lang,langName,severity,status,tags,sysTags',
  p: pageNumber(params.page),
  ps: pageSize(params.pageSize, 100, 500)
});

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

export let componentTreeMeasuresParams = (params: {
  component: string;
  branch?: string;
  pullRequest?: string;
  metricKeys: string[];
  qualifiers?: string[];
  strategy?: string;
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
    p: pageNumber(params.pageIndex),
    ps: pageSize(params.pageSize, 500, 500),
    additionalFields: params.additionalFields
  };
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

export let projectAnalysisComponentIdFromBranches = (branches: Record<string, unknown>[]) => {
  let branch =
    branches.find(item => item.isMain === true) ??
    branches.find(item => optionalRecordString(item, 'name') === 'main') ??
    branches[0];

  if (!branch) return undefined;

  return (
    optionalRecordString(branch, 'branchUuidV1') ??
    optionalRecordString(branch, 'componentId') ??
    optionalRecordString(branch, 'uuid') ??
    optionalRecordString(branch, 'id') ??
    optionalRecordString(branch, 'branchId')
  );
};

export let projectAnalysisStatusUnavailable = (
  projectKey: string
): Record<string, unknown> => ({
  queue: [],
  statusUnavailable: {
    projectKey,
    reason: 'ce_component_not_found',
    message:
      'SonarQube confirmed the project is readable through project branches, but its Compute Engine component status resource was not found. This can happen when SonarQube Cloud does not expose CE component status for the project; retry later or use quality gate/project measures for the last completed analysis.'
  }
});

let truthyParams = (params: Record<string, unknown>) => params;

export class SonarQubeClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
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

  private async getComponentByKey(component: string) {
    let data = await this.get<Record<string, unknown>>('get component', '/components/show', {
      component
    });
    return optionalRecord(data.component) ?? data;
  }

  async searchProjects(params: SonarProjectSearchParams) {
    let projectKeys = cleanStringArray(params.projectKeys) ?? [];
    let hasQuery = Boolean(params.query?.trim());
    let shouldSearch = hasQuery || projectKeys.length === 0;
    let qualifiers = projectSearchQualifiers(this.config, params.qualifiers);
    let searchResult: SonarListResult<Record<string, unknown>> | undefined;

    if (shouldSearch) {
      searchResult = await this.searchProjectsPage(params);
    }

    let exactProjects = await Promise.all(
      projectKeys.map(async projectKey => await this.getComponentByKey(projectKey))
    );
    let filteredExactProjects = exactProjects.filter(project =>
      matchesProjectQualifiers(project, qualifiers)
    );
    let filteredSearchProjects = (searchResult?.items ?? []).filter(project =>
      matchesProjectQualifiers(project, qualifiers)
    );
    let items = mergeProjectItems(filteredExactProjects, filteredSearchProjects);

    return {
      items,
      page: projectSearchPage(searchResult?.page, items)
    };
  }

  async getComponent(params: { component: string; branch?: string; pullRequest?: string }) {
    validateBranchPullRequestChoice(params);
    return await this.get<Record<string, unknown>>('get component', '/components/show', {
      component: params.component,
      branch: params.branch,
      pullRequest: params.pullRequest
    });
  }

  async listComponentTree(params: {
    component: string;
    branch?: string;
    pullRequest?: string;
    query?: string;
    qualifiers?: string[];
    page?: number;
    pageSize?: number;
  }) {
    validateBranchPullRequestChoice(params);
    let data = await this.get<unknown>('list component tree', '/components/tree', {
      component: params.component,
      branch: params.branch,
      pullRequest: params.pullRequest,
      q: params.query,
      qualifiers: params.qualifiers,
      p: pageNumber(params.page),
      ps: pageSize(params.pageSize, 100, 500)
    });
    return normalizeArray<Record<string, unknown>>(data, 'components');
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

  async getComputeTask(params: {
    taskId: string;
    additionalFields?: SonarComputeTaskAdditionalField[];
  }) {
    validateComputeTaskAdditionalFields(this.config, params.additionalFields);
    return await this.get<Record<string, unknown>>('get compute task', '/ce/task', {
      id: params.taskId,
      additionalFields: params.additionalFields
    });
  }

  private async getProjectAnalysisStatusBy(params: {
    component?: string;
    componentId?: string;
  }) {
    return await this.get<Record<string, unknown>>(
      'get project analysis status',
      '/ce/component',
      params
    );
  }

  private async getProjectAnalysisStatusByBranchComponentId(projectKey: string) {
    let branches = await this.listProjectBranches(projectKey);
    let componentId = projectAnalysisComponentIdFromBranches(branches.items);
    if (!componentId) return undefined;

    try {
      return await this.getProjectAnalysisStatusBy({ componentId });
    } catch (error) {
      if (isProjectLookupFailure(error)) return undefined;
      throw error;
    }
  }

  async getProjectAnalysisStatus(projectKey: string) {
    try {
      return await this.getProjectAnalysisStatusBy({ component: projectKey });
    } catch (error) {
      if ((this.config.deployment ?? 'server') !== 'cloud' || !isProjectLookupFailure(error)) {
        throw error;
      }

      try {
        return (
          (await this.getProjectAnalysisStatusByBranchComponentId(projectKey)) ??
          projectAnalysisStatusUnavailable(projectKey)
        );
      } catch (fallbackError) {
        if (isProjectLookupFailure(fallbackError)) {
          throw error;
        }
        throw fallbackError;
      }
    }
  }

  async listMetrics(params: { query?: string; page?: number; pageSize?: number }) {
    let query = params.query?.trim().toLowerCase();
    if (query) {
      let requestedPage = pageNumber(params.page);
      let requestedPageSize = pageSize(params.pageSize, 100, 500);
      let firstPage = await this.get<unknown>(
        'list metrics',
        '/metrics/search',
        metricsSearchParams({ page: 1, pageSize: 500 })
      );
      let firstResult = normalizeArray<Record<string, unknown>>(firstPage, 'metrics');
      let allMetrics = [...firstResult.items];
      let total = firstResult.page?.total ?? allMetrics.length;
      let pageCount = Math.ceil(total / 500);

      for (let page = 2; page <= pageCount; page++) {
        let data = await this.get<unknown>(
          'list metrics',
          '/metrics/search',
          metricsSearchParams({ page, pageSize: 500 })
        );
        allMetrics.push(...normalizeArray<Record<string, unknown>>(data, 'metrics').items);
      }

      let filteredMetrics = allMetrics.filter(metric => matchesMetricQuery(metric, query));
      let start = (requestedPage - 1) * requestedPageSize;

      return {
        items: filteredMetrics.slice(start, start + requestedPageSize),
        page: {
          page: requestedPage,
          pageSize: requestedPageSize,
          total: filteredMetrics.length
        }
      };
    }

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

  async searchMeasureHistory(params: {
    projectKey: string;
    metricKeys: string[];
    branch?: string;
    pullRequest?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    validateBranchPullRequestChoice(params);
    let data = await this.get<unknown>('search measure history', '/measures/search_history', {
      component: params.projectKey,
      metrics: params.metricKeys,
      branch: params.branch,
      pullRequest: params.pullRequest,
      from: params.from,
      to: params.to,
      p: pageNumber(params.page),
      ps: pageSize(params.pageSize, 100, 1000)
    });

    return {
      data,
      page: normalizePage(data)
    };
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

  async getIssue(issueKey: string, organization?: string) {
    let result = await this.searchIssues({ organization, issueKeys: [issueKey], pageSize: 1 });
    let issue = result.items[0];
    if (!issue) {
      throw sonarqubeValidationError(`SonarQube issue ${issueKey} was not found.`);
    }
    return issue;
  }

  async getIssueChangelog(issueKey: string) {
    return await this.get<Record<string, unknown>>(
      'get issue changelog',
      '/issues/changelog',
      {
        issue: issueKey
      }
    );
  }

  async transitionIssue(params: { issueKey: string; transition: string }) {
    return await this.post<Record<string, unknown>>(
      'transition issue',
      '/issues/do_transition',
      issueTransitionParams({
        issueKey: params.issueKey,
        status: params.transition
      })
    );
  }

  async assignIssue(params: { issueKey: string; assignee: string }) {
    return await this.post<Record<string, unknown>>('assign issue', '/issues/assign', {
      issue: params.issueKey,
      assignee: params.assignee
    });
  }

  async addIssueComment(params: { issueKey: string; comment: string }) {
    return await this.post<Record<string, unknown>>(
      'add issue comment',
      '/issues/add_comment',
      {
        issue: params.issueKey,
        text: params.comment
      }
    );
  }

  async setIssueTags(params: { issueKey: string; tags: string[] }) {
    return await this.post<Record<string, unknown>>('set issue tags', '/issues/set_tags', {
      issue: params.issueKey,
      tags: params.tags
    });
  }

  async setIssueSeverity(params: { issueKey: string; severity: string }) {
    return await this.post<Record<string, unknown>>(
      'set issue severity',
      '/issues/set_severity',
      {
        issue: params.issueKey,
        severity: params.severity
      }
    );
  }

  async setIssueType(params: { issueKey: string; type: string }) {
    return await this.post<Record<string, unknown>>('set issue type', '/issues/set_type', {
      issue: params.issueKey,
      type: params.type
    });
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
      throw sonarqubeValidationError(
        'Provide projectKey or at least one hotspotKeys value to search SonarQube security hotspots.'
      );
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

  async searchRules(params: SonarRuleSearchParams) {
    let data = await this.get<unknown>(
      'search rules',
      '/rules/search',
      ruleSearchParams(this.config, params)
    );
    return normalizeArray<Record<string, unknown>>(data, 'rules');
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

  async showSource(params: { component: string; fromLine?: number; toLine?: number }) {
    return await this.get<Record<string, unknown>>(
      'show source',
      '/sources/show',
      sourceShowParams(params)
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

  private async getComponentTreeMeasures(params: {
    component: string;
    branch?: string;
    pullRequest?: string;
    metricKeys: string[];
    qualifiers?: string[];
    strategy?: string;
    pageIndex?: number;
    pageSize?: number;
    additionalFields?: string;
  }) {
    let data = await this.get<unknown>(
      'search duplicated files',
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
      let componentTree = await this.getComponentTreeMeasures({
        component: params.projectKey,
        branch: params.branch,
        pullRequest: params.pullRequest,
        metricKeys: duplicatedFileMetricKeys,
        qualifiers: ['FIL'],
        strategy: 'all',
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
      let componentTree = await this.getComponentTreeMeasures({
        component: params.projectKey,
        branch: params.branch,
        pullRequest: params.pullRequest,
        metricKeys: duplicatedFileMetricKeys,
        qualifiers: ['FIL'],
        strategy: 'all',
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
    return await this.get<Record<string, unknown>>('get system status', '/system/status');
  }
}

export let createSonarQubeClient = (params: { auth: SonarAuth; config: SonarConfig }) =>
  new SonarQubeClient(params);
