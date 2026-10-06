import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';
import type {
  BugsnagError,
  Collaborator,
  Comment,
  Event,
  EventField,
  Filters,
  Organization,
  PageOptions,
  Pivot,
  PivotValue,
  Project,
  Release,
  SavedSearch,
  SearchOptions,
  Trend
} from './types';

export const apiEndpoints = [
  'https://api.bugsnag.com',
  'https://api.bugsnag.smartbear.com'
] as const;
export type BugsnagAuth = { token: string; apiEndpoint?: (typeof apiEndpoints)[number] };
export const filtersSchema = z.record(
  z.string(),
  z.array(
    z.object({
      type: z.enum(['eq', 'ne', 'empty']),
      value: z.string(),
      child_value: z.string().optional()
    })
  )
);
export const requireId = (value: string | undefined, label: string) => {
  if (!value?.trim())
    throw createApiServiceError(`${label} is required.`, { reason: 'invalid_input' });
  return value;
};
const segment = (value: string) => {
  requireId(value, 'Resource ID');
  if (value === '.' || value === '..')
    throw createApiServiceError('Resource ID must not be a relative path segment.', {
      reason: 'invalid_input'
    });
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Resource ID contains invalid Unicode.', {
      reason: 'invalid_input'
    });
  }
};

export class BugsnagClient {
  private axios;
  private endpoint: string;
  private adaptError;
  pageInfo: { nextPageUrl?: string; totalCount?: number; rateLimitRemaining?: number } = {};

  constructor(auth: BugsnagAuth) {
    requireId(auth.token, 'Personal auth token');
    this.endpoint = auth.apiEndpoint ?? apiEndpoints[0];
    if (!apiEndpoints.some(endpoint => endpoint === this.endpoint))
      throw createApiServiceError('Choose a documented Bugsnag Data Access endpoint.', {
        reason: 'invalid_input'
      });
    this.adaptError = (error: unknown) =>
      buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Bugsnag',
        reason: 'upstream_error',
        extractMessage: (failure, helpers) =>
          helpers.extractMessage(failure).split(auth.token).join('[redacted]')
      });
    this.axios = createAuthenticatedAxios({
      baseURL: this.endpoint,
      authHeader: { value: `token ${auth.token}` },
      headers: { 'X-Version': '2' },
      timeout: 30_000,
      maxRedirects: 0,
      validateStatus: status => (status >= 200 && status < 300) || status === 429,
      errorAdapter: this.adaptError
    });
  }
  private paginationUrl(value: string, path: string) {
    let url: URL;
    try {
      url = new URL(value, this.endpoint);
    } catch {
      throw createApiServiceError('The pagination URL is invalid.', {
        reason: 'invalid_input'
      });
    }
    if (
      url.origin !== this.endpoint ||
      url.pathname !== path ||
      url.username ||
      url.password ||
      url.hash ||
      [...url.searchParams.keys()].some(key =>
        /^(auth_token|authorization|api_key|token)$/i.test(key)
      )
    )
      throw createApiServiceError(
        'Use the next-page URL returned for this resource and account endpoint.',
        { reason: 'invalid_input' }
      );
    return url.toString();
  }
  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    params?: URLSearchParams
  ) {
    const response = await this.axios.request<T>({ method, url: path, data, params });
    if (response.status === 429) {
      const error = this.adaptError({ response });
      error.data.reason = 'rate_limited';
      const retry = Number(response.headers['retry-after']);
      if (Number.isFinite(retry) && retry >= 0) error.data.retryAfterSeconds = retry;
      throw error;
    }
    if (
      method !== 'DELETE' &&
      !(response.status === 204 && path.endsWith('/stability_trend')) &&
      !isApiErrorRecord(response.data) &&
      !(Array.isArray(response.data) && response.data.every(isApiErrorRecord))
    )
      throw createApiServiceError('Bugsnag returned an invalid resource response.', {
        reason: 'invalid_response'
      });
    return response;
  }
  private searchParams(options: SearchOptions = {}) {
    const params = new URLSearchParams();
    if (options.perPage !== undefined) {
      if (!Number.isInteger(options.perPage) || options.perPage < 1 || options.perPage > 100)
        throw createApiServiceError('Results per page must be an integer from 1 to 100.', {
          reason: 'invalid_input'
        });
      params.set('per_page', String(options.perPage));
    }
    if (options.sort) params.set('sort', options.sort);
    if (options.direction) params.set('direction', options.direction);
    for (const [field, values] of Object.entries(options.filters ?? {})) {
      for (const value of values) {
        params.append(`filters[${field}][][type]`, value.type);
        params.append(`filters[${field}][][value]`, value.value);
        if (value.child_value !== undefined)
          params.append(`filters[${field}][][child_value]`, value.child_value);
      }
    }
    return params;
  }
  private async list<T>(
    path: string,
    options: SearchOptions = {},
    extra: Record<string, string | undefined> = {}
  ) {
    const params = options.pageUrl ? undefined : this.searchParams(options);
    for (const [key, value] of Object.entries(extra))
      if (value !== undefined) params?.set(key, value);
    const response = await this.request<T[]>(
      'GET',
      options.pageUrl ? this.paginationUrl(options.pageUrl, path) : path,
      undefined,
      params
    );
    if (!Array.isArray(response.data))
      throw createApiServiceError('Bugsnag returned an invalid result list.', {
        reason: 'invalid_response'
      });
    const link = String(response.headers.link ?? '');
    const next = /<([^>]+)>\s*;\s*rel=(?:"next"|next)(?=\s*(?:,|;|$))/.exec(link)?.[1];
    const numericHeader = (key: string) => {
      const value = response.headers[key];
      if (value === undefined || value === '') return undefined;
      const number = Number(value);
      return Number.isFinite(number) ? number : undefined;
    };
    this.pageInfo = {
      nextPageUrl: next ? this.paginationUrl(next, path) : undefined,
      totalCount: numericHeader('x-total-count'),
      rateLimitRemaining: numericHeader('x-ratelimit-remaining')
    };
    return response.data;
  }
  listOrganizations(options?: PageOptions) {
    return this.list<Organization>('/user/organizations', options);
  }
  async getOrganization(id: string) {
    return (await this.request<Organization>('GET', `/organizations/${segment(id)}`)).data;
  }
  listProjects(id: string, options?: PageOptions) {
    return this.list<Project>(`/organizations/${segment(id)}/projects`, options);
  }
  async getProject(id: string) {
    return (await this.request<Project>('GET', `/projects/${segment(id)}`)).data;
  }
  async createProject(id: string, data: { name: string; type: string }) {
    return (
      await this.request<Project>('POST', `/organizations/${segment(id)}/projects`, data)
    ).data;
  }
  async updateProject(id: string, data: Record<string, unknown>) {
    return (await this.request<Project>('PATCH', `/projects/${segment(id)}`, data)).data;
  }
  async deleteProject(id: string) {
    await this.request('DELETE', `/projects/${segment(id)}`);
  }
  listErrors(id: string, options?: SearchOptions) {
    return this.list<BugsnagError>(`/projects/${segment(id)}/errors`, options);
  }
  async getError(project: string, id: string) {
    return (
      await this.request<BugsnagError>(
        'GET',
        `/projects/${segment(project)}/errors/${segment(id)}`
      )
    ).data;
  }
  async updateError(project: string, id: string, data: Record<string, unknown>) {
    return (
      await this.request<BugsnagError>(
        'PATCH',
        `/projects/${segment(project)}/errors/${segment(id)}`,
        data
      )
    ).data;
  }
  async deleteError(project: string, id: string) {
    await this.request('DELETE', `/projects/${segment(project)}/errors/${segment(id)}`);
  }
  listEvents(project: string, options?: SearchOptions) {
    return this.list<Event>(`/projects/${segment(project)}/events`, options);
  }
  listErrorEvents(project: string, id: string, options?: SearchOptions) {
    return this.list<Event>(
      `/projects/${segment(project)}/errors/${segment(id)}/events`,
      options
    );
  }
  async getEvent(project: string, id: string) {
    return (
      await this.request<Event>('GET', `/projects/${segment(project)}/events/${segment(id)}`)
    ).data;
  }
  async getTrends(
    project: string,
    error?: string,
    options: { resolution?: string; bucketsCount?: number; filters?: Filters } = {}
  ) {
    const params = this.searchParams({ filters: options.filters });
    if (options.resolution) params.set('resolution', options.resolution);
    else params.set('buckets_count', String(options.bucketsCount ?? 30));
    const response = await this.request<Trend[]>(
      'GET',
      `/projects/${segment(project)}${error ? `/errors/${segment(error)}` : ''}/trends`,
      undefined,
      params
    );
    if (!Array.isArray(response.data))
      throw createApiServiceError('Bugsnag returned an invalid trend result.', {
        reason: 'invalid_response'
      });
    return response.data;
  }
  listProjectPivots(project: string) {
    return this.list<Pivot>(`/projects/${segment(project)}/pivots`);
  }
  getPivotValues(project: string, field: string, options?: PageOptions) {
    return this.list<PivotValue>(
      `/projects/${segment(project)}/pivots/${segment(field)}/values`,
      options
    );
  }
  listReleases(project: string, options: PageOptions & { releaseStage?: string } = {}) {
    if (!options.pageUrl && options.perPage !== undefined && options.perPage > 10)
      throw createApiServiceError('Releases per page must be an integer from 1 to 10.', {
        reason: 'invalid_input'
      });
    return this.list<Release>(`/projects/${segment(project)}/releases`, options, {
      release_stage: options.releaseStage
    });
  }
  async getProjectStability(project: string) {
    const response = await this.request<unknown>(
      'GET',
      `/projects/${segment(project)}/stability_trend`
    );
    return response.status === 204 ? null : response.data;
  }

  listOrganizationCollaborators(org: string, options?: PageOptions) {
    return this.list<Collaborator>(`/organizations/${segment(org)}/collaborators`, options);
  }
  async inviteCollaborator(
    org: string,
    data: { email: string; admin?: boolean; project_ids?: string[] }
  ) {
    return (
      await this.request<Collaborator>(
        'POST',
        `/organizations/${segment(org)}/collaborators`,
        data
      )
    ).data;
  }
  async updateCollaborator(org: string, id: string, data: Record<string, unknown>) {
    return (
      await this.request<Collaborator>(
        'PATCH',
        `/organizations/${segment(org)}/collaborators/${segment(id)}`,
        data
      )
    ).data;
  }
  async removeCollaborator(org: string, id: string) {
    await this.request(
      'DELETE',
      `/organizations/${segment(org)}/collaborators/${segment(id)}`
    );
  }
  listComments(project: string, error: string, options?: PageOptions) {
    return this.list<Comment>(
      `/projects/${segment(project)}/errors/${segment(error)}/comments`,
      options
    );
  }
  async createComment(project: string, error: string, message: string) {
    return (
      await this.request<Comment>(
        'POST',
        `/projects/${segment(project)}/errors/${segment(error)}/comments`,
        { message }
      )
    ).data;
  }
  async updateComment(id: string, message: string) {
    return (await this.request<Comment>('PATCH', `/comments/${segment(id)}`, { message }))
      .data;
  }
  async deleteComment(id: string) {
    await this.request('DELETE', `/comments/${segment(id)}`);
  }
  listEventFields(project: string) {
    return this.list<EventField>(`/projects/${segment(project)}/event_fields`);
  }
  listSavedSearches(project: string) {
    return this.list<SavedSearch>(`/projects/${segment(project)}/saved_searches`);
  }
  async createSavedSearch(
    project: string,
    data: { name: string; filters: Filters; project_default: boolean }
  ) {
    return (
      await this.request<SavedSearch>('POST', '/saved_searches', {
        project_id: project,
        ...data
      })
    ).data;
  }
  async getSavedSearch(id: string) {
    return (await this.request<SavedSearch>('GET', `/saved_searches/${segment(id)}`)).data;
  }
  async updateSavedSearch(id: string, data: Record<string, unknown>) {
    return (await this.request<SavedSearch>('PATCH', `/saved_searches/${segment(id)}`, data))
      .data;
  }
  async deleteSavedSearch(id: string) {
    await this.request('DELETE', `/saved_searches/${segment(id)}`);
  }
}
