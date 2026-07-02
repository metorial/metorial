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
  let value = organization?.trim() || config.organization?.trim();
  if ((config.deployment ?? 'server') === 'cloud' && !value) {
    throw sonarqubeValidationError(
      'organization is required for this SonarQube Cloud operation. Provide organization input or config.'
    );
  }
  return value || undefined;
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
  ps: pageSize(params.pageSize, 100, 500),
  f: 'name,description,domain',
  q: params.query
});

export let validateAuthenticationResponse = (data: unknown) => {
  if (!isRecord(data) || data.valid !== true) {
    throw sonarqubeValidationError('SonarQube token validation failed.');
  }
};

let normalizePage = (data: unknown): SonarPage | undefined => {
  if (!isRecord(data)) return undefined;
  let paging = isRecord(data.paging) ? data.paging : undefined;
  if (!paging) return undefined;

  return {
    page: typeof paging.pageIndex === 'number' ? paging.pageIndex : undefined,
    pageSize: typeof paging.pageSize === 'number' ? paging.pageSize : undefined,
    total: typeof paging.total === 'number' ? paging.total : undefined
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

  async searchProjects(params: {
    organization?: string;
    query?: string;
    projectKeys?: string[];
    qualifiers?: string[];
    page?: number;
    pageSize?: number;
  }) {
    let organization = requireCloudOrganization(this.config, params.organization);
    let data = await this.get<unknown>('search projects', '/projects/search', {
      organization,
      q: params.query,
      projects: params.projectKeys,
      qualifiers: params.qualifiers,
      p: pageNumber(params.page),
      ps: pageSize(params.pageSize, 50, 500)
    });
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

  async getComputeTask(taskId: string) {
    return await this.get<Record<string, unknown>>('get compute task', '/ce/task', {
      id: taskId
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
      {
        component: params.projectKey,
        metricKeys: params.metricKeys,
        branch: params.branch,
        pullRequest: params.pullRequest
      }
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
    requireOneProjectStatusIdentifier(params);
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

  async searchIssues(params: {
    organization?: string;
    issueKeys?: string[];
    projectKeys?: string[];
    componentKeys?: string[];
    branch?: string;
    pullRequest?: string;
    resolved?: boolean;
    severities?: string[];
    statuses?: string[];
    types?: string[];
    tags?: string[];
    query?: string;
    page?: number;
    pageSize?: number;
  }) {
    let organization = requireCloudOrganization(this.config, params.organization);
    let data = await this.get<unknown>('search issues', '/issues/search', {
      organization,
      issues: params.issueKeys,
      projects: params.projectKeys,
      componentKeys: params.componentKeys,
      branch: params.branch,
      pullRequest: params.pullRequest,
      resolved: params.resolved,
      severities: params.severities,
      statuses: params.statuses,
      types: params.types,
      tags: params.tags,
      q: params.query,
      p: pageNumber(params.page),
      ps: pageSize(params.pageSize, 100, 500)
    });
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
      projectKey: params.projectKey,
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

  async searchRules(params: {
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
  }) {
    let organization = requireCloudOrganization(this.config, params.organization);
    let data = await this.get<unknown>('search rules', '/rules/search', {
      organization,
      q: params.query,
      languages: params.languages,
      repositories: params.repositories,
      tags: params.tags,
      severities: params.severities,
      types: params.types,
      statuses: params.statuses,
      f: 'name,repo,langName,severity,status,tags,sysTags',
      p: pageNumber(params.page),
      ps: pageSize(params.pageSize, 100, 500)
    });
    return normalizeArray<Record<string, unknown>>(data, 'rules');
  }

  async getRule(ruleKey: string, organization?: string) {
    let resolvedOrganization = requireCloudOrganization(this.config, organization);
    return await this.get<Record<string, unknown>>('get rule', '/rules/show', {
      organization: resolvedOrganization,
      key: ruleKey
    });
  }

  async getSourceRaw(params: { component: string; branch?: string; pullRequest?: string }) {
    return await this.getText('get raw source', '/sources/raw', {
      key: params.component,
      branch: params.branch,
      pullRequest: params.pullRequest
    });
  }

  async showSource(params: {
    component: string;
    branch?: string;
    pullRequest?: string;
    fromLine?: number;
    toLine?: number;
  }) {
    return await this.get<Record<string, unknown>>('show source', '/sources/show', {
      key: params.component,
      branch: params.branch,
      pullRequest: params.pullRequest,
      from: params.fromLine,
      to: params.toLine
    });
  }

  async getScmInfo(params: {
    component: string;
    branch?: string;
    pullRequest?: string;
    fromLine?: number;
    toLine?: number;
    commitsByLine?: boolean;
  }) {
    return await this.get<Record<string, unknown>>('get source SCM info', '/sources/scm', {
      key: params.component,
      branch: params.branch,
      pullRequest: params.pullRequest,
      from: params.fromLine,
      to: params.toLine,
      commits_by_line: params.commitsByLine
    });
  }

  async getDuplications(params: { component: string; branch?: string; pullRequest?: string }) {
    return await this.get<Record<string, unknown>>('get duplications', '/duplications/show', {
      key: params.component,
      branch: params.branch,
      pullRequest: params.pullRequest
    });
  }

  async listQualityGates() {
    let organization = requireCloudOrganization(this.config, undefined);
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
