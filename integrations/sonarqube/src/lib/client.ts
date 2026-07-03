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
};

export type SonarListResult<T> = {
  items: T[];
  page?: SonarPage;
};

export type SonarComputeTaskAdditionalField = 'scannerContext' | 'warnings' | 'stacktrace';

export type SonarIssueSearchParams = {
  organization?: string;
  issueKeys?: string[];
  projectKeys?: string[];
  componentKeys?: string[];
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
  if (identifiers.length !== 1) {
    throw sonarqubeValidationError(
      'Provide exactly one of analysisId, projectId, or projectKey.'
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

  if ((input.analysisId || input.projectId) && (input.branch || input.pullRequest)) {
    throw sonarqubeValidationError(
      'branch and pullRequest can only be used with projectKey quality gate status requests.'
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

export let projectMeasuresParams = (
  config: SonarConfig,
  params: {
    projectKey: string;
    metricKeys: string[];
    branch?: string;
    pullRequest?: string;
  }
) => ({
  component: params.projectKey,
  metricKeys: params.metricKeys,
  branch: params.branch,
  pullRequest: params.pullRequest,
  additionalFields: (config.deployment ?? 'server') === 'cloud' ? 'periods' : 'period'
});

export let hotspotProjectSearchParams = (config: SonarConfig, projectKey: string) =>
  (config.deployment ?? 'server') === 'cloud' ? { projectKey } : { project: projectKey };

let validateBranchPullRequestChoice = (params: { branch?: string; pullRequest?: string }) => {
  if (params.branch && params.pullRequest) {
    throw sonarqubeValidationError('Provide either branch or pullRequest, not both.');
  }
};

let cloudBranchPullRequestParams = (
  config: SonarConfig,
  params: {
    branch?: string;
    pullRequest?: string;
  },
  operation: string
) => {
  validateBranchPullRequestChoice(params);

  if ((config.deployment ?? 'server') !== 'cloud') {
    if (params.branch || params.pullRequest) {
      throw sonarqubeValidationError(
        `${operation} branch and pullRequest parameters are only documented for SonarQube Cloud.`
      );
    }

    return {};
  }

  return {
    branch: params.branch,
    pullRequest: params.pullRequest
  };
};

export let sourceRawParams = (
  config: SonarConfig,
  params: {
    component: string;
    branch?: string;
    pullRequest?: string;
  }
) => ({
  key: params.component,
  ...cloudBranchPullRequestParams(config, params, 'sources/raw')
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
  config: SonarConfig,
  params: {
    component: string;
    branch?: string;
    pullRequest?: string;
  }
) => ({
  key: params.component,
  ...cloudBranchPullRequestParams(config, params, 'duplications/show')
});

let issueComponentFilter = (params: SonarIssueSearchParams) => {
  let values = [...(params.projectKeys ?? []), ...(params.componentKeys ?? [])].filter(
    value => typeof value === 'string' && value.length > 0
  );
  if (values.length === 0) return undefined;
  return [...new Set(values)];
};

export let projectSearchParams = (config: SonarConfig, params: SonarProjectSearchParams) => {
  let isCloud = (config.deployment ?? 'server') === 'cloud';

  return {
    organization: requireCloudOrganization(config, params.organization),
    q: params.query,
    ...(isCloud
      ? { projects: params.projectKeys }
      : {
          projectKeys: params.projectKeys,
          qualifiers: params.qualifiers
        }),
    p: pageNumber(params.page),
    ps: pageSize(params.pageSize, 50, 500)
  };
};

export let issueSearchParams = (config: SonarConfig, params: SonarIssueSearchParams) => {
  let isCloud = (config.deployment ?? 'server') === 'cloud';
  let components = issueComponentFilter(params);

  return {
    organization: requireCloudOrganization(config, params.organization),
    issues: params.issueKeys,
    ...(isCloud ? { componentKeys: components } : { components }),
    branch: params.branch,
    pullRequest: params.pullRequest,
    resolved: params.resolved,
    severities: params.severities,
    statuses: params.statuses,
    issueStatuses: params.issueStatuses,
    impactSoftwareQualities: params.impactSoftwareQualities,
    impactSeverities: params.impactSeverities,
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
      ? requireCloudOrganization(config, organization)
      : undefined,
  key: ruleKey
});

export let validateAuthenticationResponse = (data: unknown) => {
  if (!isRecord(data) || data.valid !== true) {
    throw sonarqubeValidationError('SonarQube token validation failed.');
  }
};

let optionalRecordNumber = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === 'number' ? record[key] : undefined;

export let normalizePage = (data: unknown): SonarPage | undefined => {
  if (!isRecord(data)) return undefined;
  let paging = isRecord(data.paging) ? data.paging : undefined;
  let source = paging ?? data;
  let page = optionalRecordNumber(source, 'pageIndex') ?? optionalRecordNumber(source, 'p');
  let normalizedPageSize =
    optionalRecordNumber(source, 'pageSize') ?? optionalRecordNumber(source, 'ps');
  let total = optionalRecordNumber(source, 'total');

  if (page === undefined && normalizedPageSize === undefined && total === undefined) {
    return undefined;
  }

  return { page, pageSize: normalizedPageSize, total };
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

  async searchProjects(params: SonarProjectSearchParams) {
    let data = await this.get<unknown>(
      'search projects',
      '/projects/search',
      projectSearchParams(this.config, params)
    );
    return normalizeArray<Record<string, unknown>>(data, 'components');
  }

  async getComponent(params: { component: string; branch?: string; pullRequest?: string }) {
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
    return normalizeArray<Record<string, unknown>>(data, 'branches');
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

  async getProjectAnalysisStatus(projectKey: string) {
    return await this.get<Record<string, unknown>>(
      'get project analysis status',
      '/ce/component',
      {
        component: projectKey
      }
    );
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
    metricKeys: string[];
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
      {
        issue: params.issueKey,
        transition: params.transition
      }
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
    projectKey: string;
    branch?: string;
    pullRequest?: string;
    files?: string[];
    status?: string;
    resolution?: string;
    onlyMine?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    let data = await this.get<unknown>('search security hotspots', '/hotspots/search', {
      ...hotspotProjectSearchParams(this.config, params.projectKey),
      branch: params.branch,
      pullRequest: params.pullRequest,
      files: params.files,
      status: params.status,
      resolution: params.resolution,
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

  async listQualityGates() {
    let organization = requireCloudOrganization(this.config, undefined);
    let data = await this.get<unknown>('list quality gates', '/qualitygates/list', {
      organization
    });
    return normalizeArray<Record<string, unknown>>(data, 'qualitygates');
  }

  async listLanguages(params: { query?: string; pageSize?: number }) {
    let data = await this.get<unknown>('list languages', '/languages/list', {
      q: params.query,
      ps: optionalPageSizeIncludingAll(params.pageSize)
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
