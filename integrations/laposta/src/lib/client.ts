import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.laposta.org/v2',
      auth: {
        username: config.token,
        password: ''
      }
    });
  }

  // ── Lists ────────────────────────────────────────────

  async getLists() {
    let response = await this.axios.get('/list');
    return response.data.data as ListResponse[];
  }

  async getList(listId: string) {
    let response = await this.axios.get(`/list/${listId}`);
    return response.data.data as ListResponse;
  }

  async createList(params: CreateListParams) {
    let response = await this.axios.post('/list', this.encodeParams(params));
    return response.data.data as ListResponse;
  }

  async updateList(listId: string, params: UpdateListParams) {
    let response = await this.axios.post(`/list/${listId}`, this.encodeParams(params));
    return response.data.data as ListResponse;
  }

  async deleteList(listId: string) {
    let response = await this.axios.delete(`/list/${listId}`);
    return response.data.data as ListResponse;
  }

  async purgeList(listId: string) {
    let response = await this.axios.delete(`/list/${listId}/members`);
    return response.data.data as ListResponse;
  }

  // ── Members ──────────────────────────────────────────

  async getMembers(listId: string, state?: string) {
    let params: Record<string, string> = { list_id: listId };
    if (state) params.state = state;
    let response = await this.axios.get('/member', { params });
    return response.data.data as MemberResponse[];
  }

  async getMember(memberId: string, listId: string) {
    let response = await this.axios.get(`/member/${memberId}`, {
      params: { list_id: listId }
    });
    return response.data.data as MemberResponse;
  }

  async createMember(params: CreateMemberParams) {
    let formData = this.encodeParams({
      list_id: params.listId,
      email: params.email,
      ip: params.ip,
      source_url: params.sourceUrl,
      options: params.options
    });
    if (params.customFields) {
      for (let [key, value] of Object.entries(params.customFields)) {
        formData.append(`custom_fields[${key}]`, String(value));
      }
    }
    let response = await this.axios.post('/member', formData);
    return response.data.data as MemberResponse;
  }

  async updateMember(memberId: string, params: UpdateMemberParams) {
    let formData = this.encodeParams({
      list_id: params.listId,
      email: params.email,
      state: params.state
    });
    if (params.customFields) {
      for (let [key, value] of Object.entries(params.customFields)) {
        formData.append(`custom_fields[${key}]`, String(value));
      }
    }
    let response = await this.axios.post(`/member/${memberId}`, formData);
    return response.data.data as MemberResponse;
  }

  async deleteMember(memberId: string, listId: string) {
    let response = await this.axios.delete(`/member/${memberId}`, {
      params: { list_id: listId }
    });
    return response.data.data as MemberResponse;
  }

  async bulkSyncMembers(listId: string, params: BulkSyncParams) {
    let response = await this.axios.post(`/list/${listId}/members`, params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.data as BulkSyncResponse;
  }

  // ── Fields ───────────────────────────────────────────

  async getFields(listId: string) {
    let response = await this.axios.get('/field', {
      params: { list_id: listId }
    });
    return response.data.data as FieldResponse[];
  }

  async getField(fieldId: string, listId: string) {
    let response = await this.axios.get(`/field/${fieldId}`, {
      params: { list_id: listId }
    });
    return response.data.data as FieldResponse;
  }

  async createField(params: CreateFieldParams) {
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
    return response.data.data as FieldResponse;
  }

  async updateField(fieldId: string, params: UpdateFieldParams) {
    let formData = this.encodeParams({
      list_id: params.listId,
      name: params.name,
      datatype: params.datatype,
      datatype_display: params.datatypeDisplay,
      defaultvalue: params.defaultvalue,
      required: params.required,
      in_form: params.inForm,
      in_list: params.inList
    });
    if (params.optionsFull) {
      for (let [key, value] of Object.entries(params.optionsFull)) {
        formData.append(`options_full[${key}]`, String(value));
      }
    }
    let response = await this.axios.post(`/field/${fieldId}`, formData);
    return response.data.data as FieldResponse;
  }

  async deleteField(fieldId: string, listId: string) {
    let response = await this.axios.delete(`/field/${fieldId}`, {
      params: { list_id: listId }
    });
    return response.data.data as FieldResponse;
  }

  // ── Segments ─────────────────────────────────────────

  async getSegments(listId: string) {
    let response = await this.axios.get('/segment', {
      params: { list_id: listId }
    });
    return response.data.data as SegmentResponse[];
  }

  async getSegment(segmentId: string, listId: string) {
    let response = await this.axios.get(`/segment/${segmentId}`, {
      params: { list_id: listId }
    });
    return response.data.data as SegmentResponse;
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
    return response.data.data as SegmentResponse;
  }

  async updateSegment(segmentId: string, params: UpdateSegmentParams) {
    let response = await this.axios.post(
      `/segment/${segmentId}`,
      this.encodeParams({
        list_id: params.listId,
        name: params.name,
        definition: params.definition
      })
    );
    return response.data.data as SegmentResponse;
  }

  async deleteSegment(segmentId: string, listId: string) {
    let response = await this.axios.delete(`/segment/${segmentId}`, {
      params: { list_id: listId }
    });
    return response.data.data as SegmentResponse;
  }

  // ── Campaigns ────────────────────────────────────────

  async getCampaigns() {
    let response = await this.axios.get('/campaign');
    return response.data.data as CampaignResponse[];
  }

  async getCampaign(campaignId: string) {
    let response = await this.axios.get(`/campaign/${campaignId}`);
    return response.data.data as CampaignResponse;
  }

  async createCampaign(params: CreateCampaignParams) {
    let formData = this.encodeParams({
      type: params.type,
      name: params.name,
      subject: params.subject,
      'from[name]': params.fromName,
      'from[email]': params.fromEmail,
      reply_to: params.replyTo
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
    let response = await this.axios.post('/campaign', formData);
    return response.data.data as CampaignResponse;
  }

  async updateCampaign(campaignId: string, params: UpdateCampaignParams) {
    let formData = this.encodeParams({
      name: params.name,
      subject: params.subject,
      'from[name]': params.fromName,
      'from[email]': params.fromEmail,
      reply_to: params.replyTo
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
    let response = await this.axios.post(`/campaign/${campaignId}`, formData);
    return response.data.data as CampaignResponse;
  }

  async deleteCampaign(campaignId: string) {
    let response = await this.axios.delete(`/campaign/${campaignId}`);
    return response.data.data as CampaignResponse;
  }

  async getCampaignContent(campaignId: string) {
    let response = await this.axios.get(`/campaign/${campaignId}/content`);
    return response.data.data as CampaignContentResponse;
  }

  async setCampaignContent(campaignId: string, params: SetCampaignContentParams) {
    let response = await this.axios.post(
      `/campaign/${campaignId}/content`,
      this.encodeParams({
        html: params.html,
        import_url: params.importUrl,
        inline_css: params.inlineCss
      })
    );
    return response.data.data as CampaignContentResponse;
  }

  async sendCampaign(campaignId: string) {
    let response = await this.axios.post(`/campaign/${campaignId}/action/send`);
    return response.data.data as CampaignResponse;
  }

  async scheduleCampaign(campaignId: string, deliveryRequested: string) {
    let response = await this.axios.post(
      `/campaign/${campaignId}/action/schedule`,
      this.encodeParams({ delivery_requested: deliveryRequested })
    );
    return response.data.data as CampaignResponse;
  }

  async sendTestEmail(campaignId: string, email: string) {
    let response = await this.axios.post(
      `/campaign/${campaignId}/action/testmail`,
      this.encodeParams({ email })
    );
    return response.data.data as CampaignResponse;
  }

  // ── Reports ──────────────────────────────────────────

  async getReports() {
    let response = await this.axios.get('/report');
    return response.data.data as ReportResponse[];
  }

  async getReport(campaignId: string) {
    let response = await this.axios.get(`/report/${campaignId}`);
    return response.data.data as ReportResponse;
  }

  // ── Webhooks ─────────────────────────────────────────

  async getWebhooks(listId: string) {
    let response = await this.axios.get('/webhook', {
      params: { list_id: listId }
    });
    return response.data.data as WebhookResponse[];
  }

  async getWebhook(webhookId: string, listId: string) {
    let response = await this.axios.get(`/webhook/${webhookId}`, {
      params: { list_id: listId }
    });
    return response.data.data as WebhookResponse;
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
    return response.data.data as WebhookResponse;
  }

  async updateWebhook(webhookId: string, params: UpdateWebhookParams) {
    let response = await this.axios.post(
      `/webhook/${webhookId}`,
      this.encodeParams({
        list_id: params.listId,
        event: params.event,
        url: params.url,
        blocked: params.blocked
      })
    );
    return response.data.data as WebhookResponse;
  }

  async deleteWebhook(webhookId: string, listId: string) {
    let response = await this.axios.delete(`/webhook/${webhookId}`, {
      params: { list_id: listId }
    });
    return response.data.data as WebhookResponse;
  }

  // ── Helpers ──────────────────────────────────────────

  private encodeParams(params: object): URLSearchParams {
    let formData = new URLSearchParams();
    for (let [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'boolean') {
        formData.append(key, value ? 'true' : 'false');
      } else {
        formData.append(key, String(value));
      }
    }
    return formData;
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
    modified: string;
    ip: string;
    source_url: string;
    custom_fields: Record<string, string>;
  };
}

export interface FieldResponse {
  field: {
    field_id: string;
    list_id: string;
    created: string;
    modified: string;
    state: string;
    name: string;
    tag: string;
    datatype: string;
    datatype_display: string;
    defaultvalue: string;
    required: boolean;
    in_form: boolean;
    in_list: boolean;
    options: Record<string, string>;
  };
}

export interface SegmentResponse {
  segment: {
    segment_id: string;
    list_id: string;
    created: string;
    modified: string;
    state: string;
    name: string;
    definition: string;
  };
}

export interface CampaignResponse {
  campaign: {
    campaign_id: string;
    created: string;
    modified: string;
    state: string;
    type: string;
    name: string;
    subject: string;
    from: {
      name: string;
      email: string;
    };
    reply_to: string;
    list_ids: string[];
    stats: {
      ga: string;
      mtrack: string;
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
    softbounced: number;
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
    modified: string;
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
  customFields?: Record<string, string>;
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
  customFields?: Record<string, string>;
}

export interface BulkSyncParams {
  actions: string[];
  members: Array<{
    member_id?: string;
    email?: string;
    custom_fields?: Record<string, string>;
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
