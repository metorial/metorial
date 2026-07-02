import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://clientapi.benchmarkemail.com',
      headers: {
        AuthToken: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ───────────── Campaigns ─────────────

  async listCampaigns(params?: {
    pageNumber?: number;
    pageSize?: number;
    filter?: string;
    status?: string;
    orderBy?: string;
    sortOrder?: string;
  }) {
    let query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('PageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('PageSize', String(params.pageSize));
    if (params?.filter) query.set('Filter', params.filter);
    if (params?.status) query.set('Status', params.status);
    if (params?.orderBy) query.set('OrderBy', params.orderBy);
    if (params?.sortOrder) query.set('SortOrder', params.sortOrder);

    let qs = query.toString();
    let response = await this.axios.get(`/Emails${qs ? `?${qs}` : ''}`);
    return response.data?.Response;
  }

  async getCampaign(emailId: string) {
    let response = await this.axios.get(`/Emails/${emailId}`);
    return response.data?.Response;
  }

  async createCampaign(data: Record<string, any>) {
    let response = await this.axios.post('/Emails', { Data: data });
    return response.data?.Response;
  }

  async updateCampaign(emailId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/Emails/${emailId}`, { Data: data });
    return response.data?.Response;
  }

  async deleteCampaign(emailId: string) {
    let response = await this.axios.delete(`/Emails/${emailId}`);
    return response.data?.Response;
  }

  async duplicateCampaign(emailId: string) {
    let response = await this.axios.post(`/Emails/${emailId}/Copy`);
    return response.data?.Response;
  }

  async scheduleCampaign(emailId: string, data: { scheduleDate: string; timezone: string }) {
    let response = await this.axios.post(`/Emails/${emailId}/Schedule`, {
      Data: {
        ScheduleDate: data.scheduleDate,
        Zone: data.timezone
      }
    });
    return response.data?.Response;
  }

  async setToDraft(emailId: string) {
    let response = await this.axios.patch(`/Emails/${emailId}/Draft`);
    return response.data?.Response;
  }

  async resendCampaign(emailId: string) {
    let response = await this.axios.post(`/Emails/${emailId}/Resend`);
    return response.data?.Response;
  }

  // ───────────── Campaign Reports ─────────────

  async getCampaignReport(emailId: string) {
    let response = await this.axios.get(`/Emails/${emailId}/Report`);
    return response.data?.Response;
  }

  async getCampaignOpens(
    emailId: string,
    params?: { pageNumber?: number; pageSize?: number }
  ) {
    let query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('PageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('PageSize', String(params.pageSize));
    let qs = query.toString();
    let response = await this.axios.get(
      `/Emails/${emailId}/Report/Opens${qs ? `?${qs}` : ''}`
    );
    return response.data?.Response;
  }

  async getCampaignClicks(
    emailId: string,
    params?: { pageNumber?: number; pageSize?: number }
  ) {
    let query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('PageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('PageSize', String(params.pageSize));
    let qs = query.toString();
    let response = await this.axios.get(
      `/Emails/${emailId}/Report/Clicks${qs ? `?${qs}` : ''}`
    );
    return response.data?.Response;
  }

  async getCampaignBounces(
    emailId: string,
    params?: { pageNumber?: number; pageSize?: number }
  ) {
    let query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('PageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('PageSize', String(params.pageSize));
    let qs = query.toString();
    let response = await this.axios.get(
      `/Emails/${emailId}/Report/Bounces${qs ? `?${qs}` : ''}`
    );
    return response.data?.Response;
  }

  async getCampaignUnsubscribes(
    emailId: string,
    params?: { pageNumber?: number; pageSize?: number }
  ) {
    let query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('PageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('PageSize', String(params.pageSize));
    let qs = query.toString();
    let response = await this.axios.get(
      `/Emails/${emailId}/Report/Unsubscribes${qs ? `?${qs}` : ''}`
    );
    return response.data?.Response;
  }

  async getCampaignClickPerformance(emailId: string) {
    let response = await this.axios.get(`/Emails/${emailId}/Report/ClickPerformance`);
    return response.data?.Response;
  }

  // ───────────── Contact Lists ─────────────

  async listContactLists(params?: {
    pageNumber?: number;
    pageSize?: number;
    searchFilter?: string;
    orderBy?: string;
    sortOrder?: string;
  }) {
    let query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('PageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('PageSize', String(params.pageSize));
    if (params?.searchFilter) query.set('SearchFilter', params.searchFilter);
    if (params?.orderBy) query.set('OrderBy', params.orderBy);
    if (params?.sortOrder) query.set('SortOrder', params.sortOrder);

    let qs = query.toString();
    let response = await this.axios.get(`/Contact${qs ? `?${qs}` : ''}`);
    return response.data?.Response;
  }

  async getContactList(listId: string) {
    let response = await this.axios.get(`/Contact/${listId}`);
    return response.data?.Response;
  }

  async createContactList(data: Record<string, any>) {
    let response = await this.axios.post('/Contact', { Data: data });
    return response.data?.Response;
  }

  async updateContactList(listId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/Contact/${listId}`, { Data: data });
    return response.data?.Response;
  }

  async deleteContactList(listId: string) {
    let response = await this.axios.delete(`/Contact/${listId}`);
    return response.data?.Response;
  }

  async getContactCount(listId: string) {
    let response = await this.axios.get(`/Contact/${listId}/ContactCount`);
    return response.data?.Response;
  }

  // ───────────── Contacts ─────────────

  async listContacts(
    listId: string,
    params?: {
      pageNumber?: number;
      pageSize?: number;
      filter?: string;
      searchFilter?: string;
      orderBy?: string;
      sortOrder?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('PageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('PageSize', String(params.pageSize));
    if (params?.filter) query.set('Filter', params.filter);
    if (params?.searchFilter) query.set('SearchFilter', params.searchFilter);
    if (params?.orderBy) query.set('OrderBy', params.orderBy);
    if (params?.sortOrder) query.set('SortOrder', params.sortOrder);

    let qs = query.toString();
    let response = await this.axios.get(
      `/Contact/${listId}/ContactDetails${qs ? `?${qs}` : ''}`
    );
    return response.data?.Response;
  }

  async addContact(listId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/Contact/${listId}/ContactDetails`, { Data: data });
    return response.data?.Response;
  }

  async updateContact(listId: string, contactId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/Contact/${listId}/ContactDetails/${contactId}`, {
      Data: data
    });
    return response.data?.Response;
  }

  async deleteContact(listId: string, contactId: string) {
    let response = await this.axios.delete(`/Contact/${listId}/ContactDetails/${contactId}`);
    return response.data?.Response;
  }

  // ───────────── Webhooks ─────────────

  async listWebhooks(listId: string) {
    let response = await this.axios.get(`/Contact/${listId}/Webhooks`);
    return response.data?.Response;
  }

  async getWebhook(listId: string, webhookId: string) {
    let response = await this.axios.get(`/Contact/${listId}/Webhooks/${webhookId}`);
    return response.data?.Response;
  }

  async createWebhook(
    listId: string,
    data: {
      clientUrl: string;
      subscribes?: boolean;
      unsubscribes?: boolean;
      profileUpdates?: boolean;
      cleanedAddress?: boolean;
      emailChanged?: boolean;
    }
  ) {
    let response = await this.axios.post(`/Contact/${listId}/Webhooks`, {
      Data: {
        ContactMasterID: listId,
        ClientUrl: data.clientUrl,
        Subscribes: data.subscribes ? '1' : '0',
        Unsubscribes: data.unsubscribes ? '1' : '0',
        ProfileUpdates: data.profileUpdates ? '1' : '0',
        CleanedAddress: data.cleanedAddress ? '1' : '0',
        EmailChanged: data.emailChanged ? '1' : '0'
      }
    });
    return response.data?.Response;
  }

  async updateWebhook(listId: string, webhookId: string, data: Record<string, any>) {
    let response = await this.axios.patch(`/Contact/${listId}/Webhooks/${webhookId}`, {
      Data: data
    });
    return response.data?.Response;
  }

  async deleteWebhook(listId: string, webhookId: string) {
    let response = await this.axios.delete(`/Contact/${listId}/Webhooks/${webhookId}`);
    return response.data?.Response;
  }

  // ───────────── Account ─────────────

  async getProfile() {
    let response = await this.axios.get('/Client/ProfileDetails');
    return response.data?.Response;
  }
}
