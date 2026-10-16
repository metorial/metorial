import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A Laposta API key is required.');
    this.axios = createAxios({
      baseURL: 'https://api.laposta.nl/v2',
      timeout: 30000,
      auth: {
        username: config.token,
        password: ''
      }
    });
    this.axios.interceptors.response.use(
      response => response,
      error =>
        Promise.reject(
          buildApiServiceError(error, {
            providerLabel: 'Laposta',
            reason: 'laposta_api_error',
            extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
            extractUpstreamCode: (_error, response) => {
              let body = response?.data;
              return isApiErrorRecord(body) &&
                isApiErrorRecord(body.error) &&
                (typeof body.error.code === 'number' || typeof body.error.code === 'string')
                ? String(body.error.code)
                : undefined;
            }
          })
        )
    );
  }

  // ── Lists ────────────────────────────────────────────

  async getLists() {
    let response = await this.axios.get('/list');
    return this.collection<ListResponse>(response.data, 'list');
  }

  async getList(listId: string) {
    let response = await this.axios.get(`/list/${encodeURIComponent(listId)}`);
    return this.entity<ListResponse>(response.data, 'list');
  }

  async createList(params: CreateListParams) {
    let response = await this.axios.post('/list', this.encodeParams(params));
    return this.entity<ListResponse>(response.data, 'list');
  }

  async updateList(listId: string, params: UpdateListParams) {
    let response = await this.axios.post(
      `/list/${encodeURIComponent(listId)}`,
      this.encodeParams(params)
    );
    return this.entity<ListResponse>(response.data, 'list');
  }

  async deleteList(listId: string) {
    let response = await this.axios.delete(`/list/${encodeURIComponent(listId)}`);
    return this.entity<ListResponse>(response.data, 'list');
  }

  async purgeList(listId: string) {
    let response = await this.axios.delete(`/list/${encodeURIComponent(listId)}/members`);
    return this.entity<ListResponse>(response.data, 'list');
  }

  // ── Members ──────────────────────────────────────────

  async getMembers(listId: string, state?: string, options: MemberQuery = {}) {
    if (options.search && options.search.length > 255)
      throw createApiServiceError('Search must contain at most 255 characters.');
    this.validateLimit(options.limit);
    let params = { list_id: listId, ...options };
    let query = { ...params, state };
    let response = await this.axios.get('/member', { params: query });
    let pagination = this.pagination(response.data);
    if ((options.limit !== undefined || options.cursor !== undefined) && !pagination)
      throw createApiServiceError('Laposta did not return subscriber pagination information.');
    return { members: this.collection<MemberResponse>(response.data, 'member'), pagination };
  }

  async getMember(memberId: string, listId: string) {
    let response = await this.axios.get(`/member/${this.memberPath(memberId)}`, {
      params: { list_id: listId }
    });
    return this.entity<MemberResponse>(response.data, 'member');
  }

  async createMember(params: CreateMemberParams) {
    let formData = this.encodeParams({
      list_id: params.listId,
      email: params.email,
      ip: params.ip,
      source_url: params.sourceUrl,
      options: params.options,
      custom_fields: params.customFields
    });
    let response = await this.axios.post('/member', formData);
    return this.entity<MemberResponse>(response.data, 'member');
  }

  async updateMember(memberId: string, params: UpdateMemberParams) {
    let formData = this.encodeParams({
      list_id: params.listId,
      email: params.email,
      state: params.state,
      custom_fields: params.customFields
    });
    let response = await this.axios.post(`/member/${this.memberPath(memberId)}`, formData);
    return this.entity<MemberResponse>(response.data, 'member');
  }

  async deleteMember(memberId: string, listId: string) {
    let response = await this.axios.delete(`/member/${this.memberPath(memberId)}`, {
      params: { list_id: listId }
    });
    return this.entity<MemberResponse>(response.data, 'member');
  }

  async bulkSyncMembers(listId: string, params: BulkSyncParams) {
    if (!params.actions.length)
      throw createApiServiceError('Choose at least one bulk synchronization action.');
    if (params.members.length < 1 || params.members.length > 500000)
      throw createApiServiceError('Provide between 1 and 500,000 subscribers.');
    if (params.members.some(member => !member.member_id && !member.email))
      throw createApiServiceError('Each subscriber must have a memberId or email.');
    let response = await this.axios.post(
      `/list/${encodeURIComponent(listId)}/members`,
      params,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    let result = this.entity<BulkSyncResponse>(response.data, 'report');
    for (let key of [
      'provided_count',
      'errors_count',
      'skipped_count',
      'edited_count',
      'added_count',
      'unsubscribed_count'
    ] as const) {
      if (typeof result.report[key] !== 'number' || !Number.isFinite(result.report[key]))
        throw createApiServiceError(`Laposta returned an invalid bulk report field: ${key}.`);
    }
    return result;
  }

  // ── Fields ───────────────────────────────────────────

  async getFields(listId: string) {
    let response = await this.axios.get('/field', {
      params: { list_id: listId }
    });
    return this.collection<FieldResponse>(response.data, 'field');
  }

  async getField(fieldId: string, listId: string) {
    let response = await this.axios.get(`/field/${encodeURIComponent(fieldId)}`, {
      params: { list_id: listId }
    });
    return this.entity<FieldResponse>(response.data, 'field');
  }

  async createField(params: CreateFieldParams) {
    if (
      ['select_single', 'select_multiple'].includes(params.datatype) &&
      !params.options?.length
    )
      throw createApiServiceError('Select fields require at least one option.');
    let formData = this.encodeParams({
      list_id: params.listId,
      name: params.name,
      datatype: params.datatype,
      defaultvalue: params.defaultvalue,
      datatype_display: params.datatypeDisplay,
      required: params.required,
      in_form: params.inForm,
      in_list: params.inList
    });
    if (params.options) {
      for (let i = 0; i < params.options.length; i++) {
        formData.append(`options[${i}]`, params.options[i]!);
      }
    }
    let response = await this.axios.post('/field', formData);
    return this.entity<FieldResponse>(response.data, 'field');
  }

  async updateField(fieldId: string, params: UpdateFieldParams) {
    let response = await this.axios.post(
      `/field/${encodeURIComponent(fieldId)}`,
      {
        list_id: params.listId,
        name: params.name,
        datatype: params.datatype,
        datatype_display: params.datatypeDisplay,
        defaultvalue: params.defaultvalue,
        required: params.required,
        in_form: params.inForm,
        in_list: params.inList,
        options_full: params.optionsFull
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return this.entity<FieldResponse>(response.data, 'field');
  }

  async deleteField(fieldId: string, listId: string) {
    let response = await this.axios.delete(`/field/${encodeURIComponent(fieldId)}`, {
      params: { list_id: listId }
    });
    return this.entity<FieldResponse>(response.data, 'field');
  }

  // ── Segments ─────────────────────────────────────────

  async getSegments(listId: string) {
    let response = await this.axios.get('/segment', {
      params: { list_id: listId }
    });
    return this.collection<SegmentResponse>(response.data, 'segment');
  }

  async getSegment(segmentId: string, listId: string) {
    let response = await this.axios.get(`/segment/${encodeURIComponent(segmentId)}`, {
      params: { list_id: listId }
    });
    return this.entity<SegmentResponse>(response.data, 'segment');
  }

  async createSegment(params: CreateSegmentParams) {
    let response = await this.axios.post(
      '/segment',
      this.encodeParams({
        list_id: params.listId,
        name: params.name,
        definition: params.definition
      })
    );
    return this.entity<SegmentResponse>(response.data, 'segment');
  }

  async updateSegment(segmentId: string, params: UpdateSegmentParams) {
    let response = await this.axios.post(
      `/segment/${encodeURIComponent(segmentId)}`,
      this.encodeParams({
        list_id: params.listId,
        name: params.name,
        definition: params.definition
      })
    );
    return this.entity<SegmentResponse>(response.data, 'segment');
  }

  async deleteSegment(segmentId: string, listId: string) {
    let response = await this.axios.delete(`/segment/${encodeURIComponent(segmentId)}`, {
      params: { list_id: listId }
    });
    return this.entity<SegmentResponse>(response.data, 'segment');
  }

  // ── Campaigns ────────────────────────────────────────

  async getCampaigns() {
    let response = await this.axios.get('/campaign');
    return this.collection<CampaignResponse>(response.data, 'campaign');
  }

  async getCampaign(campaignId: string) {
    let response = await this.axios.get(`/campaign/${encodeURIComponent(campaignId)}`);
    return this.entity<CampaignResponse>(response.data, 'campaign');
  }

  async createCampaign(params: CreateCampaignParams) {
    let formData = this.encodeParams({
      type: params.type,
      name: params.name,
      subject: params.subject,
      'from[name]': params.fromName,
      'from[email]': params.fromEmail,
      reply_to: params.replyTo,
      previewtext: params.previewText
    });
    if (params.listIds) {
      for (let i = 0; i < params.listIds.length; i++) {
        formData.append(`list_ids[${i}]`, params.listIds[i]!);
      }
    }
    if (params.googleAnalytics !== undefined) {
      formData.append('stats[ga]', params.googleAnalytics ? 'true' : 'false');
    }
    if (params.mtrack !== undefined) {
      formData.append('stats[mtrack]', params.mtrack ? 'true' : 'false');
    }
    if (!params.listIds.length)
      throw createApiServiceError('Provide at least one target mailing list.');
    let response = await this.axios.post('/campaign', formData);
    return this.entity<CampaignResponse>(response.data, 'campaign');
  }

  async updateCampaign(campaignId: string, params: UpdateCampaignParams) {
    let formData = this.encodeParams({
      name: params.name,
      subject: params.subject,
      'from[name]': params.fromName,
      'from[email]': params.fromEmail,
      reply_to: params.replyTo,
      previewtext: params.previewText
    });
    if (params.listIds) {
      for (let i = 0; i < params.listIds.length; i++) {
        formData.append(`list_ids[${i}]`, params.listIds[i]!);
      }
    }
    if (params.googleAnalytics !== undefined) {
      formData.append('stats[ga]', params.googleAnalytics ? 'true' : 'false');
    }
    if (params.mtrack !== undefined) {
      formData.append('stats[mtrack]', params.mtrack ? 'true' : 'false');
    }
    let response = await this.axios.post(
      `/campaign/${encodeURIComponent(campaignId)}`,
      formData
    );
    return this.entity<CampaignResponse>(response.data, 'campaign');
  }

  async deleteCampaign(campaignId: string) {
    let response = await this.axios.delete(`/campaign/${encodeURIComponent(campaignId)}`);
    return this.entity<CampaignResponse>(response.data, 'campaign');
  }

  async getCampaignContent(campaignId: string) {
    let response = await this.axios.get(`/campaign/${encodeURIComponent(campaignId)}/content`);
    return this.entity<CampaignContentResponse>(response.data, 'campaign');
  }

  async setCampaignContent(campaignId: string, params: SetCampaignContentParams) {
    if (!params.html && !params.importUrl)
      throw createApiServiceError('Provide HTML content or an import URL.');
    let response = await this.axios.post(
      `/campaign/${encodeURIComponent(campaignId)}/content`,
      this.encodeParams({
        html: params.html,
        import_url: params.importUrl,
        inline_css: params.inlineCss
      })
    );
    return this.entity<CampaignContentResponse>(response.data, 'campaign');
  }

  async sendCampaign(campaignId: string) {
    let response = await this.axios.post(
      `/campaign/${encodeURIComponent(campaignId)}/action/send`
    );
    return this.entity<CampaignResponse>(response.data, 'campaign');
  }

  async scheduleCampaign(campaignId: string, deliveryRequested: string) {
    let response = await this.axios.post(
      `/campaign/${encodeURIComponent(campaignId)}/action/schedule`,
      this.encodeParams({ delivery_requested: deliveryRequested })
    );
    return this.entity<CampaignResponse>(response.data, 'campaign');
  }

  async sendTestEmail(campaignId: string, email: string) {
    let response = await this.axios.post(
      `/campaign/${encodeURIComponent(campaignId)}/action/testmail`,
      this.encodeParams({ email })
    );
    return this.entity<CampaignResponse>(response.data, 'campaign');
  }

  // ── Reports ──────────────────────────────────────────

  async getReports() {
    let response = await this.axios.get('/report');
    return this.collection<ReportResponse>(response.data, 'report');
  }

  async getReport(campaignId: string) {
    let response = await this.axios.get(`/report/${encodeURIComponent(campaignId)}`);
    return this.entity<ReportResponse>(response.data, 'report');
  }

  // ── Webhooks ─────────────────────────────────────────

  async getWebhooks(listId: string) {
    let response = await this.axios.get('/webhook', {
      params: { list_id: listId }
    });
    return this.collection<WebhookResponse>(response.data, 'webhook');
  }

  async getWebhook(webhookId: string, listId: string) {
    let response = await this.axios.get(`/webhook/${encodeURIComponent(webhookId)}`, {
      params: { list_id: listId }
    });
    return this.entity<WebhookResponse>(response.data, 'webhook');
  }

  async createWebhook(params: CreateWebhookParams) {
    let response = await this.axios.post(
      '/webhook',
      this.encodeParams({
        list_id: params.listId,
        event: params.event,
        url: params.url,
        blocked: params.blocked
      })
    );
    return this.entity<WebhookResponse>(response.data, 'webhook');
  }

  async updateWebhook(webhookId: string, params: UpdateWebhookParams) {
    let response = await this.axios.post(
      `/webhook/${encodeURIComponent(webhookId)}`,
      this.encodeParams({
        list_id: params.listId,
        event: params.event,
        url: params.url,
        blocked: params.blocked
      })
    );
    return this.entity<WebhookResponse>(response.data, 'webhook');
  }

  async deleteWebhook(webhookId: string, listId: string) {
    let response = await this.axios.delete(`/webhook/${encodeURIComponent(webhookId)}`, {
      params: { list_id: listId }
    });
    return this.entity<WebhookResponse>(response.data, 'webhook');
  }

  // ── Helpers ──────────────────────────────────────────

  private encodeParams(params: object): URLSearchParams {
    let formData = new URLSearchParams();
    let append = (key: string, value: unknown) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value) && value.length === 0) {
        formData.append(key, '');
      } else if (typeof value === 'object') {
        for (let [child, entry] of Object.entries(value)) append(`${key}[${child}]`, entry);
      } else formData.append(key, String(value));
    };
    for (let [key, value] of Object.entries(params)) append(key, value);
    return formData;
  }

  private memberPath(memberId: string) {
    return encodeURIComponent(memberId).replace(/%2B/gi, '%252B');
  }

  private entity<T>(body: unknown, key: string): T {
    if (!isApiErrorRecord(body) || !isApiErrorRecord(body[key])) {
      throw createApiServiceError(`Laposta returned an invalid ${key} response.`);
    }
    return body as T;
  }

  private collection<T>(body: unknown, key: string): T[] {
    if (!isApiErrorRecord(body) || !Array.isArray(body.data)) {
      throw createApiServiceError(`Laposta returned an invalid ${key} collection.`);
    }
    return body.data.map(item => this.entity<T>(item, key));
  }

  private validateLimit(limit?: number) {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 1000)) {
      throw createApiServiceError('limit must be an integer between 1 and 1000.');
    }
  }

  private pagination(body: unknown) {
    if (!isApiErrorRecord(body) || body.pagination === undefined) return undefined;
    let page = body.pagination;
    if (
      !isApiErrorRecord(page) ||
      typeof page.limit !== 'number' ||
      typeof page.has_more !== 'boolean' ||
      (page.next_cursor !== null && typeof page.next_cursor !== 'string') ||
      (page.has_more && !page.next_cursor)
    ) {
      throw createApiServiceError('Laposta returned invalid pagination information.');
    }
    return { limit: page.limit, hasMore: page.has_more, nextCursor: page.next_cursor };
  }

  async getHistory(resource: 'member' | 'campaign', id: string, params: HistoryQuery) {
    this.validateLimit(params.limit);
    let response = await this.axios.get(
      `/${resource}/${resource === 'member' ? this.memberPath(id) : encodeURIComponent(id)}/history`,
      { params }
    );
    let body = response.data;
    if (
      !isApiErrorRecord(body) ||
      !Array.isArray(body.data) ||
      body.data.some(item => !isApiErrorRecord(item))
    ) {
      throw createApiServiceError('Laposta returned an invalid history response.');
    }
    let pagination = this.pagination(body);
    if (!pagination)
      throw createApiServiceError('Laposta did not return history pagination information.');
    return { events: body.data as Record<string, unknown>[], pagination, raw: body };
  }
}

// ── Types ────────────────────────────────────────────────

export interface ListResponse {
  list: {
    list_id: string;
    created: string;
    modified: string;
    state: string;
    name: string;
    remarks: string;
    subscribe_notification_email: string;
    unsubscribe_notification_email: string;
    members: {
      active: number;
      unsubscribed: number;
      cleaned: number;
    };
  };
}

export interface MemberResponse {
  member: {
    member_id: string;
    list_id: string;
    email: string;
    state: string;
    signup_date: string;
    modified: string | null;
    ip: string;
    source_url: string;
    custom_fields: Record<string, unknown>;
  };
}

export interface FieldResponse {
  field: {
    field_id: string;
    list_id: string;
    created: string;
    modified: string | null;
    state: string;
    name: string;
    tag: string;
    datatype: string;
    datatype_display: string | null;
    defaultvalue: string;
    required: boolean;
    in_form: boolean;
    in_list: boolean;
    options?: string[];
    options_full?: Array<{ id: number | string; value: string }>;
  };
}

export interface SegmentResponse {
  segment: {
    segment_id: string;
    list_id: string;
    created: string;
    modified: string | null;
    state?: string;
    name: string;
    definition: string;
  };
}

export interface CampaignResponse {
  campaign: {
    campaign_id: string;
    created: string;
    modified: string | null;
    state?: string;
    type: string;
    name: string;
    subject: string;
    from: {
      name: string;
      email: string;
    };
    reply_to: string;
    list_ids: string[] | Record<string, string[]>;
    stats: {
      ga: string;
      mtrack?: string;
    };
    delivery_requested: string | null;
    delivery_started: string | null;
    delivery_ended: string | null;
  };
}

export interface CampaignContentResponse {
  campaign: {
    campaign_id: string;
    html: string;
    plaintext: string;
    import_url: string;
  };
}

export interface ReportResponse {
  report: {
    campaign_id: string;
    sent: number;
    accepted: number;
    cleaned: number;
    complained: number;
    hardbounced: number;
    softbounced?: number;
    unsubscribed: number;
    opened_unique: number;
    clicked_unique: number;
    webversion_unique: number;
    accepted_ratio: number;
    opened_ratio: number;
    clicked_ratio: number;
  };
}

export interface WebhookResponse {
  webhook: {
    webhook_id: string;
    list_id: string;
    created: string;
    modified: string | null;
    state: string;
    event: string;
    url: string;
    blocked: boolean;
    secret: string;
  };
}

export interface CreateListParams {
  name: string;
  locked?: boolean;
  remarks?: string;
  subscribe_notification_email?: string;
  unsubscribe_notification_email?: string;
}

export interface UpdateListParams {
  name?: string;
  locked?: boolean;
  remarks?: string;
  subscribe_notification_email?: string;
  unsubscribe_notification_email?: string;
}

export interface CreateMemberParams {
  listId: string;
  email: string;
  ip: string;
  sourceUrl?: string;
  customFields?: Record<string, string | number | string[]>;
  options?: {
    upsert?: boolean;
    suppress_reactivation?: boolean;
    suppress_email_notification?: boolean;
    ignore_doubleoptin?: boolean;
  };
}

export interface UpdateMemberParams {
  listId: string;
  email?: string;
  state?: string;
  customFields?: Record<string, string | number | string[]>;
}

export interface BulkSyncParams {
  actions: string[];
  members: Array<{
    member_id?: string;
    email?: string;
    custom_fields?: Record<string, string | number | string[]>;
    state?: 'active' | 'unsubscribed';
    source_url?: string;
  }>;
}

export interface BulkSyncResponse {
  report: {
    provided_count: number;
    errors_count: number;
    skipped_count: number;
    edited_count: number;
    added_count: number;
    unsubscribed_count: number;
  };
}

export interface CreateFieldParams {
  listId: string;
  name: string;
  datatype: string;
  defaultvalue?: string;
  datatypeDisplay?: string;
  options?: string[];
  required: boolean;
  inForm: boolean;
  inList: boolean;
}

export interface UpdateFieldParams {
  listId: string;
  name?: string;
  datatype?: string;
  datatypeDisplay?: string;
  defaultvalue?: string;
  optionsFull?: Record<string, string>;
  required?: boolean;
  inForm?: boolean;
  inList?: boolean;
}

export interface CreateSegmentParams {
  listId: string;
  name: string;
  definition: string;
}

export interface UpdateSegmentParams {
  listId: string;
  name?: string;
  definition?: string;
}

export interface CreateCampaignParams {
  type: string;
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  listIds: string[];
  previewText?: string;
  googleAnalytics?: boolean;
  mtrack?: boolean;
}

export interface UpdateCampaignParams {
  name?: string;
  subject?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  listIds?: string[];
  previewText?: string;
  googleAnalytics?: boolean;
  mtrack?: boolean;
}

export interface SetCampaignContentParams {
  html?: string;
  importUrl?: string;
  inlineCss?: boolean;
}

export interface CreateWebhookParams {
  listId: string;
  event: string;
  url: string;
  blocked: boolean;
}

export interface UpdateWebhookParams {
  listId: string;
  event?: string;
  url?: string;
  blocked?: boolean;
}

export interface MemberQuery {
  limit?: number;
  cursor?: string;
  order_by?: string;
  order?: 'asc' | 'desc';
  search?: string;
  label?: string;
}

export interface HistoryQuery {
  list_id?: string;
  campaign_id?: string;
  event_date_from?: string;
  event_date_to?: string;
  limit?: number;
  cursor?: string;
  order_by?: 'event_date';
  order?: 'asc' | 'desc';
}
