import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Planly',
    reason: 'planly_api_error',
    nestedKeys: ['error', 'errors'],
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractStatus: (_value, response) => {
      let body = response?.data;
      let detail =
        isApiErrorRecord(body) && isApiErrorRecord(body.error) ? body.error : undefined;
      let code = detail?.code;
      let status =
        typeof code === 'number' || typeof code === 'string' ? Number(code) : Number.NaN;
      return Number.isInteger(status) && status >= 400 && status <= 599
        ? status
        : response?.status;
    },
    extractUpstreamCode: (_value, response) => {
      let body = response?.data;
      let detail =
        isApiErrorRecord(body) && isApiErrorRecord(body.error) ? body.error : undefined;
      return typeof detail?.code === 'string' || typeof detail?.code === 'number'
        ? String(detail.code)
        : undefined;
    }
  });

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (typeof config.token !== 'string' || !config.token.trim()) {
      throw createApiServiceError('A Planly API key is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.planly.com/api',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30_000,
      errorAdapter: apiError
    });
    this.axios.interceptors.response.use(response => {
      let body: unknown = response.data;
      if (
        isApiErrorRecord(body) &&
        body.error !== undefined &&
        body.error !== null &&
        body.error !== false &&
        body.error !== ''
      ) {
        throw apiError({ response: { status: response.status, data: body } });
      }
      if (body === false || (isApiErrorRecord(body) && body.data === false)) {
        throw createApiServiceError('Planly did not confirm the requested operation.', {
          reason: 'planly_operation_rejected'
        });
      }
      return response;
    });
  }

  // ── Teams ──────────────────────────────────────────────────────────

  async listTeams() {
    let res = await this.axios.post('/teams/list');
    return res.data;
  }

  async getTeam(teamId: string) {
    let res = await this.axios.post('/v2/team/get', { id: teamId });
    return res.data;
  }

  async createTeam(name: string) {
    let res = await this.axios.post('/v2/team/create', { name });
    return res.data;
  }

  async editTeam(teamId: string, name: string) {
    let res = await this.axios.post('/v2/team/edit', { teamId, name });
    return res.data;
  }

  async deleteTeam(teamId: string) {
    let res = await this.axios.post('/v2/team/delete', null, {
      params: { id: teamId }
    });
    return res.data;
  }

  async listTeamUsers(teamId: string) {
    let res = await this.axios.post('/v2/team/users', { id: teamId });
    return res.data;
  }

  async transferTeamOwnership(teamId: string, userId: string) {
    let res = await this.axios.post('/v2/team/transfer-ownership', { teamId, userId });
    return res.data;
  }

  async removeTeamUser(teamId: string, userId: string) {
    let res = await this.axios.post('/v2/team/users/remove', { teamId, userId });
    return res.data;
  }

  // ── Channels ───────────────────────────────────────────────────────

  async listChannels(teamId: string, excludeCompetitors?: boolean) {
    let res = await this.axios.post('/v2/channels/list', {
      team_id: teamId,
      ...(excludeCompetitors !== undefined ? { excludeCompetitors } : {})
    });
    return res.data;
  }

  async deleteChannel(channelId: string) {
    let res = await this.axios.get('/v2/channels/delete', {
      params: { id: channelId }
    });
    return res.data;
  }

  // ── Schedules ──────────────────────────────────────────────────────

  async createSchedules(schedules: ScheduleInput[]) {
    let res = await this.axios.post('/v2/schedules/create', { schedules });
    return res.data;
  }

  async listSchedules(teamId: string, pagination?: PaginationInput) {
    let res = await this.axios.post('/v2/schedules/list', {
      teamId,
      ...(pagination ? { pagination } : {})
    });
    return res.data;
  }

  async deleteSchedules(ids: string[]) {
    let res = await this.axios.post('/v2/schedules/delete', { ids });
    return res.data;
  }

  // ── Schedule Groups ────────────────────────────────────────────────

  async createScheduleGroups(
    teamId: string,
    scheduleGroups: ScheduleGroupInput[],
    validateOnly?: boolean
  ) {
    let res = await this.axios.post('/v2/schedule-groups/create', {
      teamId,
      scheduleGroups,
      ...(validateOnly !== undefined ? { validateOnly } : {})
    });
    return res.data;
  }

  async listScheduleGroups(teamId: string, options?: ScheduleGroupListOptions) {
    let res = await this.axios.post('/v2/schedule-groups/list', {
      teamId,
      ...options
    });
    return res.data;
  }

  async deleteScheduleGroups(ids: string[]) {
    let res = await this.axios.post('/v2/schedule-groups/delete', { ids });
    return res.data;
  }

  // ── Media ──────────────────────────────────────────────────────────

  async startUpload(
    teamId: string,
    contentLength: number,
    contentType?: string,
    fileName?: string
  ) {
    let res = await this.axios.post('/v2/media/start-upload', {
      teamId,
      contentLength,
      ...(contentType ? { contentType } : {}),
      ...(fileName ? { fileName } : {})
    });
    return res.data;
  }

  async finishUpload(mediaId: string) {
    let res = await this.axios.post('/v2/media/finish-upload', { mediaId });
    return res.data;
  }

  async importMediaFromUrl(teamId: string, url: string) {
    let res = await this.axios.post('/v2/media/import-from-url', { teamId, url });
    return res.data;
  }

  async listMedia(teamId: string, pagination?: PaginationInput) {
    let res = await this.axios.post('/v2/media/list', {
      teamId,
      ...(pagination ? { pagination } : {})
    });
    return res.data;
  }

  async deleteMedia(ids: string[]) {
    let res = await this.axios.post('/v2/media/delete', { ids });
    return res.data;
  }

  // ── AI ─────────────────────────────────────────────────────────────

  async getAiCredits(teamId: string) {
    let res = await this.axios.get('/v2/ai/credits', {
      params: { teamId }
    });
    return res.data;
  }

  async aiComplete(teamId: string, prompt: string, n: number) {
    let res = await this.axios.post('/v2/ai/complete', { teamId, prompt, n });
    return res.data;
  }

  // ── Pinterest ──────────────────────────────────────────────────────

  async getPinterestBoards(channelId: string) {
    let res = await this.axios.post(
      `/v2/pinterest/get-board-list/${encodeURIComponent(channelId)}`
    );
    return res.data;
  }
}

// ── Types ──────────────────────────────────────────────────────────────

export interface PaginationInput {
  cursor?: string;
  orderBy?: [string, string];
  pageSize?: number;
}

export interface ScheduleInput {
  channelId: string;
  publishOn?: string;
  content?: string;
  media?: Array<{ id: string; options?: Record<string, unknown> }>;
  options?: Record<string, unknown>;
}

export interface ScheduleGroupInput {
  id?: string;
  publishOn?: string;
  status?: string;
  schedules: ScheduleInput[];
}

export interface ScheduleGroupListOptions {
  ids?: string[];
  filter?: {
    channels?: string[];
    status?: number[];
    socialNetworks?: string[];
    mediaType?: number[];
  };
  dateRange?: {
    since?: string;
    until?: string;
  };
  pagination?: PaginationInput;
}
