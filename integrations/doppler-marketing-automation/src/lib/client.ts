import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  accountEmail: string;
}

export interface DopplerList {
  listId: number;
  name: string;
  currentStatus: string;
  subscribersCount: number;
  creationDate: string;
}

export interface DopplerListCollection {
  items: DopplerList[];
  itemsCount: number;
  currentPage: number;
  pagesCount: number;
  pageSize: number;
}

export interface FieldValue {
  name: string;
  value: string;
}

export interface DopplerSubscriber {
  email: string;
  fields: FieldValue[];
  status: string;
  score: number;
  unsubscriptionDate?: string;
  unsubscriptionType?: string;
}

export interface DopplerSubscriberCollection {
  items: DopplerSubscriber[];
  itemsCount: number;
  currentPage: number;
  pagesCount: number;
  pageSize: number;
}

export interface DopplerFieldDescriptor {
  name: string;
  type: string;
  predefined: boolean;
  private: boolean;
  readonly: boolean;
  sample: string;
}

export interface DopplerCampaign {
  campaignId: number;
  name: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preheader?: string;
  replyTo?: string;
  status: string;
  textCampaign?: boolean;
  scheduledDate?: string;
}

export interface DopplerCampaignCollection {
  items: DopplerCampaign[];
  itemsCount: number;
  currentPage: number;
  pagesCount: number;
  pageSize: number;
}

export interface ImportResult {
  createdResourceId: string;
  message: string;
}

export interface CampaignReport {
  campaignId: number;
  campaignName: string;
  campaignSubject: string;
  campaignStatus: string;
  deliveryRate: number;
  totalShipped: number;
  uniqueOpens: number;
  totalOpens: number;
  lastOpenDate?: string;
  uniqueClicks: number;
  totalClicks: number;
  lastClickDate?: string;
  totalUnopened: number;
  hardBounces: number;
  softBounces: number;
  totalUnsubscribes: number;
}

export interface UnsubscribedContact {
  email: string;
  unsubscriptionDate: string;
  unsubscriptionType: string;
  fields?: FieldValue[];
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private accountEmail: string;

  constructor(config: ClientConfig) {
    this.accountEmail = config.accountEmail;
    this.axios = createAxios({
      baseURL: `https://restapi.fromdoppler.com/accounts/${encodeURIComponent(config.accountEmail)}`,
      headers: {
        Authorization: `token ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Lists ----

  async getLists(page?: number, pageSize?: number): Promise<DopplerListCollection> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.per_page = pageSize;
    let response = await this.axios.get('/lists', { params });
    return response.data;
  }

  async getList(listId: number): Promise<DopplerList> {
    let response = await this.axios.get(`/lists/${listId}`);
    return response.data;
  }

  async createList(name: string): Promise<{ createdResourceId: number; message: string }> {
    let response = await this.axios.post('/lists', { name });
    return response.data;
  }

  async updateList(listId: number, name: string): Promise<void> {
    await this.axios.put(`/lists/${listId}`, { name });
  }

  async deleteList(listId: number): Promise<void> {
    await this.axios.delete(`/lists/${listId}`);
  }

  // ---- Subscribers ----

  async getListSubscribers(
    listId: number,
    options?: { page?: number; pageSize?: number; from?: string; to?: string }
  ): Promise<DopplerSubscriberCollection> {
    let params: Record<string, any> = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.pageSize !== undefined) params.per_page = options.pageSize;
    if (options?.from) params.from = options.from;
    if (options?.to) params.to = options.to;
    let response = await this.axios.get(`/lists/${listId}/subscribers`, { params });
    return response.data;
  }

  async getSubscriber(email: string): Promise<DopplerSubscriber> {
    let response = await this.axios.get(`/subscribers/${encodeURIComponent(email)}`);
    return response.data;
  }

  async addOrUpdateSubscriber(
    listId: number,
    subscriber: { email: string; fields?: FieldValue[] }
  ): Promise<void> {
    await this.axios.post(`/lists/${listId}/subscribers`, subscriber, {
      headers: {
        'X-Doppler-Subscriber-Origin': 'RestAPI'
      }
    });
  }

  async removeSubscriberFromList(listId: number, email: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}/subscribers/${encodeURIComponent(email)}`);
  }

  async unsubscribeFromAccount(
    email: string,
    reason?: string,
    comment?: string
  ): Promise<void> {
    let body: Record<string, any> = { email };
    if (reason) body.manualUnsubscriptionReason = reason;
    if (comment) body.unsubscriptionComment = comment;
    await this.axios.put(`/subscribers/${encodeURIComponent(email)}`, body);
  }

  async importSubscribers(
    listId: number,
    items: { email: string; fields?: FieldValue[] }[],
    fields?: string[],
    callbackUrl?: string
  ): Promise<ImportResult> {
    let body: Record<string, any> = {
      items,
      fields: fields ?? []
    };
    if (callbackUrl) body.callback = callbackUrl;
    let response = await this.axios.post(`/lists/${listId}/subscribers/import`, body, {
      headers: {
        'X-Doppler-Subscriber-Origin': 'RestAPI'
      }
    });
    return response.data;
  }

  // ---- Custom Fields ----

  async getFields(): Promise<{ items: DopplerFieldDescriptor[] }> {
    let response = await this.axios.get('/fields');
    return response.data;
  }

  async createField(field: {
    name: string;
    type: string;
    private?: boolean;
  }): Promise<{ createdResourceId: string; message: string }> {
    let response = await this.axios.post('/fields', field);
    return response.data;
  }

  async updateField(
    fieldName: string,
    updates: { name?: string; private?: boolean }
  ): Promise<void> {
    await this.axios.put(`/fields/${encodeURIComponent(fieldName)}`, updates);
  }

  async deleteField(fieldName: string): Promise<void> {
    await this.axios.delete(`/fields/${encodeURIComponent(fieldName)}`);
  }

  // ---- Campaigns ----

  async getCampaigns(
    page?: number,
    pageSize?: number,
    status?: string
  ): Promise<DopplerCampaignCollection> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.per_page = pageSize;
    if (status) params.status = status;
    let response = await this.axios.get('/campaigns', { params });
    return response.data;
  }

  async getCampaign(campaignId: number): Promise<DopplerCampaign> {
    let response = await this.axios.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(campaign: {
    name: string;
    fromName: string;
    fromEmail: string;
    subject: string;
    preheader?: string;
    replyTo?: string;
  }): Promise<{ createdResourceId: number; message: string }> {
    let response = await this.axios.post('/campaigns', campaign);
    return response.data;
  }

  async updateCampaign(
    campaignId: number,
    updates: {
      name?: string;
      fromName?: string;
      fromEmail?: string;
      subject?: string;
      preheader?: string;
      replyTo?: string;
    }
  ): Promise<void> {
    await this.axios.put(`/campaigns/${campaignId}`, updates);
  }

  async deleteCampaign(campaignId: number): Promise<void> {
    await this.axios.delete(`/campaigns/${campaignId}`);
  }

  async sendCampaign(
    campaignId: number,
    type: 'immediate' | 'scheduled',
    scheduledDate?: string
  ): Promise<void> {
    let body: Record<string, any> = { type };
    if (type === 'scheduled' && scheduledDate) {
      body.scheduledDate = scheduledDate;
    }
    await this.axios.post(`/campaigns/${campaignId}/shipping`, body);
  }

  // ---- Campaign Reports ----

  async getCampaignReport(campaignId: number): Promise<CampaignReport> {
    let response = await this.axios.get(`/campaigns/${campaignId}/report`);
    return response.data;
  }

  // ---- Unsubscribed ----

  async getUnsubscribed(options?: {
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: UnsubscribedContact[];
    itemsCount: number;
    currentPage: number;
    pagesCount: number;
    pageSize: number;
  }> {
    let params: Record<string, any> = {};
    if (options?.from) params.from = options.from;
    if (options?.to) params.to = options.to;
    if (options?.page !== undefined) params.page = options.page;
    if (options?.pageSize !== undefined) params.per_page = options.pageSize;
    let response = await this.axios.get('/subscribers/unsubscribed', { params });
    return response.data;
  }

  // ---- Tasks ----

  async getTask(taskId: string): Promise<{
    taskType: string;
    status: string;
    importDetails?: Record<string, any>;
  }> {
    let response = await this.axios.get(`/tasks/${taskId}`);
    return response.data;
  }
}
