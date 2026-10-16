import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export let BASE_URL = 'https://www.hackerrank.com/x/api/v3';

export interface PaginationParams {
  [key: string]: unknown;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page_total: number;
  offset: number;
  total: number;
  previous?: string;
  next?: string;
  first?: string;
  last?: string;
  raw?: Record<string, unknown>;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    if (!params.token.trim())
      throw createApiServiceError('A HackerRank API token is required.');
    this.axios = createAxios({
      baseURL: BASE_URL,
      timeout: 20_000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${params.token}`
      }
    });
  }

  private async request<T = any>(
    method: string,
    url: string,
    options: { data?: unknown; params?: Record<string, unknown>; signal?: AbortSignal } = {}
  ): Promise<T> {
    try {
      let response = await this.axios.request<T>({ method, url, ...options });
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'HackerRank',
        reason: 'hackerrank_api_error',
        operation: `${method.toUpperCase()} ${url}`,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
        detailKeys: ['message', 'detail', 'error', 'error_description', 'code'],
        nestedKeys: ['errors', 'messages', 'error'],
        extractUpstreamCode: (_error, response, helpers) =>
          helpers.isRecord(response?.data) && typeof response.data.code === 'string'
            ? response.data.code
            : undefined
      });
    }
  }

  private async page(
    url: string,
    params?: PaginationParams & Record<string, unknown>
  ): Promise<PaginatedResponse<any>> {
    for (let [key, value] of Object.entries({
      limit: params?.limit,
      offset: params?.offset
    })) {
      if (
        value !== undefined &&
        (!Number.isSafeInteger(value) ||
          value < (key === 'limit' ? 1 : 0) ||
          (key === 'limit' && value > 100))
      ) {
        throw createApiServiceError(
          `${key} must be an integer ${key === 'limit' ? 'between 1 and 100' : 'of zero or greater'}.`
        );
      }
    }
    let result = await this.request('get', url, {
      params: {
        ...pickDefined(params ?? {}),
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0
      }
    });
    if (!isApiErrorRecord(result) || !Array.isArray(result.data))
      throw createApiServiceError('HackerRank returned an invalid paginated response.');
    function count(key: string) {
      let value = result[key];
      let numeric = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
      if (typeof numeric !== 'number' || !Number.isSafeInteger(numeric) || numeric < 0)
        throw createApiServiceError(`HackerRank returned an invalid ${key} count.`);
      return numeric;
    }
    return {
      ...result,
      data: result.data,
      total: count('total'),
      offset: count('offset'),
      page_total: count('page_total'),
      raw: result
    };
  }

  // ---- Tests ----

  async listTests(params?: PaginationParams & { fields?: string }) {
    return this.page('/tests', params);
  }

  async getTest(testId: string) {
    return this.request('get', `/tests/${resourceId(testId)}`);
  }

  async createTest(data: {
    name: string;
    duration?: number;
    instructions?: string;
    languages?: string[];
    experience?: string[];
    role_ids?: string[];
    questions?: string[];
    draft?: boolean;
    starttime?: string;
    endtime?: string;
    candidate_tab_switch?: boolean;
    custom_acknowledge_text?: string;
    cutoff_score?: number;
    master_password?: string;
    hide_compile_test?: boolean;
    tags?: string[];
  }) {
    return this.request('post', '/tests', { data });
  }

  async updateTest(testId: string, data: Record<string, any>) {
    await this.request('put', `/tests/${resourceId(testId)}`, { data });
    return this.getTest(testId);
  }

  async deleteTest(testId: string) {
    return this.request('delete', `/tests/${resourceId(testId)}`);
  }

  async archiveTest(testId: string) {
    return this.request('post', `/tests/${resourceId(testId)}/archive`);
  }

  // ---- Candidates ----

  async listCandidates(testId: string, params?: PaginationParams & { fields?: string }) {
    return this.page(`/tests/${resourceId(testId)}/candidates`, params);
  }

  async getCandidate(testId: string, candidateId: string, signal?: AbortSignal) {
    return this.request(
      'get',
      `/tests/${resourceId(testId)}/candidates/${resourceId(candidateId)}`,
      { signal }
    );
  }

  async inviteCandidate(
    testId: string,
    data: {
      email: string;
      full_name?: string;
      force?: boolean;
      send_email?: boolean;
      tags?: string[];
      accommodations?: Record<string, unknown>;
      invite_valid_from?: string;
      invite_valid_to?: string;
      template?: string;
      invite_metadata?: Record<string, unknown>;
      force_reattempt?: boolean;
    }
  ) {
    return this.request('post', `/tests/${resourceId(testId)}/candidates`, { data });
  }

  async updateCandidate(testId: string, candidateId: string, data: Record<string, any>) {
    return this.request(
      'put',
      `/tests/${resourceId(testId)}/candidates/${resourceId(candidateId)}`,
      { data }
    );
  }

  async getCandidateReportUrl(testId: string, candidateId: string, signal?: AbortSignal) {
    return this.request(
      'get',
      `/tests/${resourceId(testId)}/candidates/${resourceId(candidateId)}/pdf`,
      {
        params: { format: 'url' },
        signal
      }
    );
  }

  // ---- Interviews ----

  async listInterviews(
    params?: PaginationParams & { fields?: string; [key: string]: unknown }
  ) {
    return this.page('/interviews', params);
  }

  async getInterview(interviewId: string) {
    return this.request('get', `/interviews/${resourceId(interviewId)}`);
  }

  async createInterview(data: {
    title?: string;
    candidate?: { email: string; name?: string };
    interviewers?: string[];
    send_email?: boolean;
    interview_template_id?: number;
    timezone?: string;
    metadata?: Record<string, unknown>;
    resume_url?: string;
    notes?: string;
    from?: string;
    to?: string;
  }) {
    return this.request('post', '/interviews', { data });
  }

  async updateInterview(interviewId: string, data: Record<string, any>) {
    return this.request('put', `/interviews/${resourceId(interviewId)}`, { data });
  }

  async deleteInterview(interviewId: string) {
    return this.request('delete', `/interviews/${resourceId(interviewId)}`);
  }

  async getInterviewTranscript(interviewId: string) {
    return this.request('get', `/interviews/${resourceId(interviewId)}/transcript`);
  }

  // ---- Users ----

  async listUsers(params?: PaginationParams & { fields?: string }) {
    return this.page('/users', params);
  }

  async getUser(userId: string) {
    return this.request('get', `/users/${resourceId(userId)}`);
  }

  async createUser(data: {
    email: string;
    firstname?: string;
    lastname?: string;
    role?: string;
    country?: string;
    phone?: string;
    timezone?: string;
    teams?: { id: string }[];
    send_email?: boolean;
  }) {
    return this.request('post', '/users', { data });
  }

  async updateUser(userId: string, data: Record<string, any>) {
    await this.request('put', `/users/${resourceId(userId)}`, { data });
    return this.getUser(userId);
  }

  async deleteUser(userId: string) {
    return this.request('delete', `/users/${resourceId(userId)}`);
  }

  async searchUsers(query: string, params?: PaginationParams) {
    return this.page('/users/search', { ...params, search: query });
  }

  // ---- Teams ----

  async listTeams(params?: PaginationParams & { fields?: string }) {
    return this.page('/teams', params);
  }

  async getTeam(teamId: string) {
    return this.request('get', `/teams/${resourceId(teamId)}`);
  }

  async createTeam(data: { name: string; [key: string]: unknown }) {
    return this.request('post', '/teams', { data });
  }

  async updateTeam(teamId: string, data: Record<string, any>) {
    await this.request('put', `/teams/${resourceId(teamId)}`, { data });
    return this.getTeam(teamId);
  }

  async deleteTeam(teamId: string) {
    return this.request('delete', `/teams/${resourceId(teamId)}`);
  }

  async listTeamMembers(teamId: string, params?: PaginationParams) {
    return this.page(`/teams/${resourceId(teamId)}/users`, params);
  }

  // ---- Questions ----

  async listQuestions(
    params?: PaginationParams & { fields?: string; type?: string; [key: string]: unknown }
  ) {
    return this.page('/questions', params);
  }

  async getQuestion(questionId: string) {
    return this.request('get', `/questions/${resourceId(questionId)}`);
  }

  async createQuestion(data: {
    name: string;
    type: string;
    description?: string;
    difficulty?: string;
    tags?: string[];
    [key: string]: any;
  }) {
    return this.request('post', '/questions', { data });
  }

  async updateQuestion(questionId: string, data: Record<string, any>) {
    return this.request('put', `/questions/${resourceId(questionId)}`, { data });
  }

  // ---- Audit Logs ----

  async listAuditLogs(params?: PaginationParams & { userId?: string }) {
    return this.page('/audit_log', { ...params, user_id: params?.userId, userId: undefined });
  }
  async cancelCandidateInvite(testId: string, candidateId: string) {
    return this.request(
      'delete',
      `/tests/${resourceId(testId)}/candidates/${resourceId(candidateId)}/invite`
    );
  }

  async addTeamMember(teamId: string, userId: string, license?: string) {
    await this.request('post', `/teams/${resourceId(teamId)}/users/${resourceId(userId)}`, {
      params: pickDefined({ license })
    });
    return this.request('get', `/teams/${resourceId(teamId)}/users/${resourceId(userId)}`);
  }

  async removeTeamMember(teamId: string, userId: string) {
    return this.request('delete', `/teams/${resourceId(teamId)}/users/${resourceId(userId)}`);
  }

  async listInterviewTemplates(params?: PaginationParams & { filter?: string }) {
    return this.page('/interview_templates', params);
  }

  async getInterviewTemplate(templateId: string) {
    return this.request('get', `/interview_templates/${resourceId(templateId)}`);
  }

  async listInviteTemplates(params?: PaginationParams & { access?: string }) {
    return this.page('/templates', params);
  }
}

function resourceId(value: string) {
  if (!value.trim())
    throw createApiServiceError(
      'A non-empty resource ID is required. Use the corresponding list tool to discover IDs.'
    );
  return encodeURIComponent(value);
}
