import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

type SenderPageResponse<T> = Omit<PaginatedResponse<T>, 'data'> & { data: T | T[] };

// Some Sender list endpoint examples wrap one result in an object instead of an array.
let senderPage = <T>(response: SenderPageResponse<T>): PaginatedResponse<T> => ({
  ...response,
  data: Array.isArray(response.data) ? response.data : [response.data]
});

export interface Subscriber {
  id: string | number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  phone: string | null;
  phone_country: { phone_code: number; country_code: string } | string | null;
  created: string;
  subscriber_status?: string;
  sms_status?: string;
  transactional_email_status?: string;
  status?: { email?: string; sms?: string; temail?: string };
  subscriber_tags: Array<{ id: string; title: string }>;
  columns?:
    | Record<string, string>
    | Array<{
        id: string;
        title: string;
        type: string;
        field_name?: string;
        value: string | number | boolean | null;
      }>;
}

export interface Group {
  id: string;
  title: string;
  recipient_count: number;
  active_subscribers: number;
  unsubscribed_count: number;
  bounced_count: number;
  phone_count: number;
  active_phone_count: number;
  opens_rate?: number;
  click_rate?: number;
  created: string;
  account_id: string;
}

export interface Segment {
  id: string;
  account_id: string;
  name: string;
  conditions: unknown[];
  subscribers: number;
  active_subscribers: number;
  phone_count: number;
  created: string;
  modified: string;
}

export interface Campaign {
  id: string;
  subject: string;
  title: string | null;
  from: string | null;
  reply_to: string | null;
  content_type?: string;
  editor?: string;
  status: string;
  created: string;
  modified: string;
  groups?: string[];
  campaign_groups?: string[];
  segments?: string[];
  html?: { html_content?: string | null; html_body?: string | null } | null;
}

export interface CustomField {
  id: string | null;
  title: string;
  type: string;
  field_name: string;
  default: boolean;
}

export interface Webhook {
  id: string;
  account_id: string;
  url: string;
  topic: string;
  group: string | null;
  total_deliveries: number;
  total_failures: number;
  response_time: number;
  status: string;
}

export interface Workflow {
  id: string;
  title: string;
  status: string;
  created: string;
  modified: string | null;
  description?: string | null;
  emails_sent?: number;
}

export let subscriberDetails = (subscriber: Subscriber) => ({
  subscriberId: typeof subscriber.id === 'number' ? subscriber.id : undefined,
  subscriberKey: String(subscriber.id),
  email: subscriber.email,
  firstname: subscriber.firstname ?? null,
  lastname: subscriber.lastname ?? null,
  phone: subscriber.phone ?? null,
  subscriberStatus: subscriber.subscriber_status ?? subscriber.status?.email ?? 'UNKNOWN',
  smsStatus: subscriber.sms_status ?? subscriber.status?.sms,
  transactionalEmailStatus:
    subscriber.transactional_email_status ?? subscriber.status?.temail ?? 'UNKNOWN',
  createdAt: subscriber.created
});

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Sender API access token is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.sender.net/v2',
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Sender',
          reason: 'sender_api_error'
        })
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  // ---- Subscribers ----

  async listSubscribers(page: number = 1): Promise<PaginatedResponse<Subscriber>> {
    let response = await this.axios.get('/subscribers', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  async getSubscriber(identifier: string): Promise<{ success: boolean; data: Subscriber }> {
    let response = await this.axios.get(`/subscribers/${encodeURIComponent(identifier)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createSubscriber(data: {
    email: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    groups?: string[];
    fields?: Record<string, string>;
    trigger_automation?: boolean;
  }): Promise<{ success: boolean; message: string[]; data: Subscriber }> {
    let response = await this.axios.post('/subscribers', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateSubscriber(
    identifier: string,
    data: {
      firstname?: string;
      lastname?: string;
      phone?: string;
      groups?: string[];
      fields?: Record<string, string>;
      subscriber_status?: string;
      sms_status?: string;
      transactional_email_status?: string;
      trigger_automation?: boolean;
    }
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    let response = await this.axios.patch(
      `/subscribers/${encodeURIComponent(identifier)}`,
      data,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteSubscribers(
    subscribers: string[]
  ): Promise<{ message: string; delete_instance: string }> {
    let response = await this.axios.delete('/subscribers', {
      headers: this.headers,
      data: { subscribers }
    });
    return response.data;
  }

  async addSubscribersToGroup(
    groupId: string,
    subscribers: string[],
    triggerAutomation: boolean = true
  ): Promise<{
    message: {
      subscribers_added_to_group?: string[];
      subscribers_add_tag_group?: string[];
      non_existing_subscribers?: string[];
      invalid_emails?: string[];
      subscribers_with_group_already?: string[];
    };
  }> {
    let response = await this.axios.post(
      `/subscribers/groups/${encodeURIComponent(groupId)}`,
      { subscribers, trigger_automation: triggerAutomation },
      { headers: this.headers }
    );
    return response.data;
  }

  async removeSubscribersFromGroup(
    groupId: string,
    subscribers: string[]
  ): Promise<{
    success?: boolean;
    message:
      | string
      | {
          subscribers_removed_from_group?: string[];
          subscribers_remove_tag_group?: string[];
          subscribers_without_group_already?: string[];
          non_existing_subscribers?: string[];
          invalid_emails?: string[];
        };
  }> {
    let response = await this.axios.delete(
      `/subscribers/groups/${encodeURIComponent(groupId)}`,
      {
        headers: this.headers,
        data: { subscribers }
      }
    );
    return response.data;
  }

  // ---- Groups ----

  async listGroups(page: number = 1): Promise<PaginatedResponse<Group>> {
    let response = await this.axios.get('/groups', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  async getGroup(groupId: string): Promise<{ success: boolean; data: Group }> {
    let response = await this.axios.get(`/groups/${encodeURIComponent(groupId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createGroup(
    title: string
  ): Promise<{ success: boolean; message: string; data: Group }> {
    let response = await this.axios.post(
      '/groups',
      { title },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<{ success: boolean; message: string }> {
    let response = await this.axios.delete(`/groups/${encodeURIComponent(groupId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listGroupSubscribers(
    groupId: string,
    page: number = 1
  ): Promise<PaginatedResponse<Subscriber>> {
    let response = await this.axios.get(`/groups/${encodeURIComponent(groupId)}/subscribers`, {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  // ---- Segments ----

  async listSegments(page: number = 1): Promise<PaginatedResponse<Segment>> {
    let response = await this.axios.get('/segments', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  // ---- Custom Fields ----

  async listFields(page: number = 1): Promise<PaginatedResponse<CustomField>> {
    let response = await this.axios.get<SenderPageResponse<CustomField>>('/fields', {
      headers: this.headers,
      params: { page }
    });
    return senderPage(response.data);
  }

  // ---- Campaigns ----

  async listCampaigns(params?: {
    limit?: number;
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<Campaign>> {
    let response = await this.axios.get<SenderPageResponse<Campaign>>('/campaigns', {
      headers: this.headers,
      params
    });
    return senderPage(response.data);
  }

  async getCampaign(campaignId: string): Promise<{ success: boolean; data: Campaign }> {
    let response = await this.axios.get(`/campaigns/${encodeURIComponent(campaignId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createCampaign(data: {
    subject: string;
    from: string;
    reply_to: string;
    content_type: string;
    title?: string;
    preheader?: string;
    groups?: string[];
    segments?: string[];
    content?: string;
    google_analytics?: number;
  }): Promise<{ success: boolean; message: string; data: Campaign }> {
    let response = await this.axios.post('/campaigns', data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    let response = await this.axios.delete(`/campaigns/${encodeURIComponent(campaignId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Transactional Emails ----

  async sendTransactionalEmail(data: {
    from: { email: string; name: string };
    to: { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
    variables?: Record<string, string>;
    attachments?: Record<string, string>;
    headers?: Record<string, string>;
  }): Promise<{ success: boolean; message: string; emailId: string }> {
    let response = await this.axios.post('/message/send', data, {
      headers: this.headers
    });
    return response.data;
  }

  async sendTransactionalCampaign(
    campaignId: string,
    data: {
      to: { email: string; name?: string };
      variables?: Record<string, string>;
      attachments?: Record<string, string>;
      text?: string;
      html?: string;
      headers?: Record<string, string>;
    }
  ): Promise<{ success: boolean; message: string; emailId: string }> {
    let response = await this.axios.post(
      `/message/${encodeURIComponent(campaignId)}/send`,
      data,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ---- Workflows ----

  async listWorkflows(params: {
    page?: number;
    limit?: number;
    status?: string;
    title?: string;
  }): Promise<PaginatedResponse<Workflow>> {
    let response = await this.axios.get('/workflows', { headers: this.headers, params });
    return response.data;
  }

  async startWorkflow(
    workflowId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    let response = await this.axios.post(
      `/workflows/${encodeURIComponent(workflowId)}/start`,
      { email },
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Statistics ----

  async getCampaignClicks(
    campaignId: string,
    page: number = 1
  ): Promise<
    PaginatedResponse<{
      recipient_id: string;
      link_id: string;
      created_at: string;
      email: string;
      url: string;
    }>
  > {
    let response = await this.axios.get(
      `/campaigns/${encodeURIComponent(campaignId)}/clicks`,
      {
        headers: this.headers,
        params: { page }
      }
    );
    return senderPage(response.data);
  }

  async getCampaignOpens(
    campaignId: string,
    page: number = 1
  ): Promise<
    PaginatedResponse<{
      recipient_id: string;
      created_at: string;
      email: string;
    }>
  > {
    let response = await this.axios.get(`/campaigns/${encodeURIComponent(campaignId)}/opens`, {
      headers: this.headers,
      params: { page }
    });
    return senderPage(response.data);
  }

  // ---- Webhooks ----

  async listWebhooks(): Promise<PaginatedResponse<Webhook>> {
    let response = await this.axios.get('/account/webhooks', {
      headers: this.headers
    });
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    topic: string;
    relation_id?: string;
  }): Promise<{ success: boolean; data: Webhook }> {
    let response = await this.axios.post('/account/webhooks', data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<{ success: boolean; message: string }> {
    let response = await this.axios.delete(
      `/account/webhooks/${encodeURIComponent(webhookId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}
