import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://connect.mailerlite.com/api'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`
    };
  }

  // ── Subscribers ──────────────────────────────────────────────────

  async listSubscribers(params?: { status?: string; limit?: number; cursor?: string }) {
    let response = await api.get('/subscribers', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createOrUpdateSubscriber(data: {
    email: string;
    fields?: Record<string, any>;
    groups?: string[];
    status?: string;
    subscribed_at?: string;
    ip_address?: string;
    opted_in_at?: string;
    optin_ip?: string;
  }) {
    let response = await api.post('/subscribers', data, {
      headers: this.headers
    });
    return response.data;
  }

  async getSubscriber(subscriberIdOrEmail: string) {
    let response = await api.get(`/subscribers/${subscriberIdOrEmail}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateSubscriber(
    subscriberId: string,
    data: {
      fields?: Record<string, any>;
      groups?: string[];
      status?: string;
    }
  ) {
    let response = await api.put(`/subscribers/${subscriberId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteSubscriber(subscriberId: string) {
    let response = await api.delete(`/subscribers/${subscriberId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async forgetSubscriber(subscriberId: string) {
    let response = await api.post(
      `/subscribers/${subscriberId}/forget`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getSubscriberCount() {
    let response = await api.get('/subscribers', {
      headers: this.headers,
      params: { limit: 0 }
    });
    return response.data;
  }

  async getSubscriberActivity(
    subscriberId: string,
    params?: {
      type?: string;
      limit?: number;
      cursor?: string;
    }
  ) {
    let response = await api.get(`/subscribers/${subscriberId}/activity`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ── Groups ───────────────────────────────────────────────────────

  async listGroups(params?: {
    filter?: { name?: string };
    limit?: number;
    page?: number;
    sort?: string;
  }) {
    let response = await api.get('/groups', {
      headers: this.headers,
      params: {
        ...(params?.filter?.name ? { 'filter[name]': params.filter.name } : {}),
        limit: params?.limit,
        page: params?.page,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async createGroup(name: string) {
    let response = await api.post(
      '/groups',
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateGroup(groupId: string, name: string) {
    let response = await api.put(
      `/groups/${groupId}`,
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteGroup(groupId: string) {
    let response = await api.delete(`/groups/${groupId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getGroupSubscribers(
    groupId: string,
    params?: {
      status?: string;
      limit?: number;
      cursor?: string;
    }
  ) {
    let response = await api.get(`/groups/${groupId}/subscribers`, {
      headers: this.headers,
      params: {
        ...(params?.status ? { 'filter[status]': params.status } : {}),
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  async assignSubscriberToGroup(subscriberId: string, groupId: string) {
    let response = await api.post(
      `/subscribers/${subscriberId}/groups/${groupId}`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async unassignSubscriberFromGroup(subscriberId: string, groupId: string) {
    let response = await api.delete(`/subscribers/${subscriberId}/groups/${groupId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Segments ─────────────────────────────────────────────────────

  async listSegments(params?: { limit?: number; page?: number }) {
    let response = await api.get('/segments', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async updateSegment(segmentId: string, name: string) {
    let response = await api.put(
      `/segments/${segmentId}`,
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteSegment(segmentId: string) {
    let response = await api.delete(`/segments/${segmentId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getSegmentSubscribers(
    segmentId: string,
    params?: {
      status?: string;
      limit?: number;
      cursor?: string;
    }
  ) {
    let response = await api.get(`/segments/${segmentId}/subscribers`, {
      headers: this.headers,
      params: {
        ...(params?.status ? { 'filter[status]': params.status } : {}),
        limit: params?.limit,
        cursor: params?.cursor
      }
    });
    return response.data;
  }

  // ── Custom Fields ────────────────────────────────────────────────

  async listFields(params?: {
    filter?: { keyword?: string; type?: string };
    limit?: number;
    page?: number;
    sort?: string;
  }) {
    let response = await api.get('/fields', {
      headers: this.headers,
      params: {
        ...(params?.filter?.keyword ? { 'filter[keyword]': params.filter.keyword } : {}),
        ...(params?.filter?.type ? { 'filter[type]': params.filter.type } : {}),
        limit: params?.limit,
        page: params?.page,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async createField(data: { name: string; type: string }) {
    let response = await api.post('/fields', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateField(fieldId: string, name: string) {
    let response = await api.put(
      `/fields/${fieldId}`,
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteField(fieldId: string) {
    let response = await api.delete(`/fields/${fieldId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Campaigns ────────────────────────────────────────────────────

  async listCampaigns(params?: {
    status?: string;
    type?: string;
    limit?: number;
    page?: number;
  }) {
    let response = await api.get('/campaigns', {
      headers: this.headers,
      params: {
        ...(params?.status ? { 'filter[status]': params.status } : {}),
        ...(params?.type ? { 'filter[type]': params.type } : {}),
        limit: params?.limit,
        page: params?.page
      }
    });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await api.get(`/campaigns/${campaignId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createCampaign(data: {
    name: string;
    type: string;
    emails: Array<{
      subject: string;
      from_name: string;
      from: string;
      content?: string;
    }>;
    groups?: string[];
    segments?: string[];
    filter?: Record<string, any>;
  }) {
    let response = await api.post('/campaigns', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCampaign(
    campaignId: string,
    data: {
      name?: string;
      emails?: Array<{
        subject?: string;
        from_name?: string;
        from?: string;
        content?: string;
      }>;
      groups?: string[];
      segments?: string[];
      filter?: Record<string, any>;
    }
  ) {
    let response = await api.put(`/campaigns/${campaignId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async scheduleCampaign(
    campaignId: string,
    data: {
      delivery: string;
      date?: string;
      hours?: string;
      minutes?: string;
      timezone_id?: number;
      resend?: string;
    }
  ) {
    let response = await api.post(`/campaigns/${campaignId}/schedule`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async cancelCampaign(campaignId: string) {
    let response = await api.post(
      `/campaigns/${campaignId}/cancel`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteCampaign(campaignId: string) {
    let response = await api.delete(`/campaigns/${campaignId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getCampaignSubscriberActivity(
    campaignId: string,
    params?: {
      type?: string;
      limit?: number;
      page?: number;
    }
  ) {
    let response = await api.get(`/campaigns/${campaignId}/reports/subscriber-activity`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ── Automations ──────────────────────────────────────────────────

  async listAutomations(params?: {
    enabled?: boolean;
    name?: string;
    group?: string;
    limit?: number;
    page?: number;
  }) {
    let response = await api.get('/automations', {
      headers: this.headers,
      params: {
        ...(params?.enabled !== undefined ? { 'filter[enabled]': params.enabled } : {}),
        ...(params?.name ? { 'filter[name]': params.name } : {}),
        ...(params?.group ? { 'filter[group]': params.group } : {}),
        limit: params?.limit,
        page: params?.page
      }
    });
    return response.data;
  }

  async getAutomation(automationId: string) {
    let response = await api.get(`/automations/${automationId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getAutomationSubscriberActivity(
    automationId: string,
    params?: {
      status?: string;
      limit?: number;
      page?: number;
    }
  ) {
    let response = await api.get(`/automations/${automationId}/activity`, {
      headers: this.headers,
      params: {
        ...(params?.status ? { 'filter[status]': params.status } : {}),
        limit: params?.limit,
        page: params?.page
      }
    });
    return response.data;
  }

  // ── Forms ────────────────────────────────────────────────────────

  async listForms(
    type: string,
    params?: {
      name?: string;
      limit?: number;
      page?: number;
      sort?: string;
    }
  ) {
    let response = await api.get(`/forms/${type}`, {
      headers: this.headers,
      params: {
        ...(params?.name ? { 'filter[name]': params.name } : {}),
        limit: params?.limit,
        page: params?.page,
        sort: params?.sort
      }
    });
    return response.data;
  }

  async getForm(formId: string) {
    let response = await api.get(`/forms/${formId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateForm(formId: string, name: string) {
    let response = await api.put(
      `/forms/${formId}`,
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteForm(formId: string) {
    let response = await api.delete(`/forms/${formId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getFormSubscribers(
    formId: string,
    params?: {
      status?: string;
      limit?: number;
      page?: number;
    }
  ) {
    let response = await api.get(`/forms/${formId}/subscribers`, {
      headers: this.headers,
      params: {
        ...(params?.status ? { 'filter[status]': params.status } : {}),
        limit: params?.limit,
        page: params?.page
      }
    });
    return response.data;
  }

  // ── Webhooks ─────────────────────────────────────────────────────

  async listWebhooks() {
    let response = await api.get('/webhooks', {
      headers: this.headers
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await api.get(`/webhooks/${webhookId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createWebhook(data: {
    name?: string;
    url: string;
    events: string[];
    enabled?: boolean;
    batchable?: boolean;
  }) {
    let response = await api.post('/webhooks', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      name?: string;
      url?: string;
      events?: string[];
      enabled?: boolean;
      batchable?: boolean;
    }
  ) {
    let response = await api.put(`/webhooks/${webhookId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await api.delete(`/webhooks/${webhookId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Timezones ────────────────────────────────────────────────────

  async listTimezones() {
    let response = await api.get('/timezones', {
      headers: this.headers
    });
    return response.data;
  }

  // ── Campaign Languages ───────────────────────────────────────────

  async listCampaignLanguages() {
    let response = await api.get('/campaigns/languages', {
      headers: this.headers
    });
    return response.data;
  }
}
