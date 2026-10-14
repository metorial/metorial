import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord
} from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://clientapi.benchmarkemail.com',
      authHeader: { name: 'AuthToken', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Benchmark Email',
          reason: 'benchmark_email_api_error',
          detailKeys: ['Message', 'message', 'Code', 'code'],
          nestedKeys: ['Error', 'Errors', 'Response']
        })
    });

    this.axios.interceptors.response.use(response => {
      let result = response.data?.Response;
      if (!isApiErrorRecord(result)) {
        throw createApiServiceError('Benchmark Email returned an invalid response.', {
          reason: 'benchmark_email_invalid_response'
        });
      }
      if (String(result.Status) === '-1') {
        let error = { response: { status: response.status, data: result } };
        let options = {
          providerLabel: 'Benchmark Email',
          reason: 'benchmark_email_api_error',
          detailKeys: ['Message', 'message', 'Code', 'code'],
          nestedKeys: ['Error', 'Errors']
        };
        let path = response.config.url?.split('?')[0] ?? '';
        let isListRequest =
          response.config.method === 'get' &&
          (path === '/Emails' ||
            path === '/Contact' ||
            /^\/Contact\/[^/]+\/ContactDetails$/.test(path));
        if (
          isListRequest &&
          /NO_RECORDS_FOUND/i.test(extractApiErrorMessage(error, options))
        ) {
          response.data.Response = { ...result, Status: '1', Count: 0, Data: [] };
        } else {
          throw buildApiServiceError(error, options);
        }
      }
      return response;
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

  async createCampaign(data: Record<string, unknown>) {
    let response = await this.axios.post('/Emails', { Detail: data });
    return response.data?.Response;
  }

  async updateCampaign(emailId: string, data: Record<string, unknown>) {
    let response = await this.axios.patch(`/Emails/${emailId}`, { Detail: data });
    return response.data?.Response;
  }

  async deleteCampaign(emailId: string) {
    let response = await this.axios.delete(`/Emails/${emailId}`);
    return response.data?.Response;
  }

  async duplicateCampaign(emailId: string, name: string) {
    let response = await this.axios.post(`/Emails/${emailId}`, { Name: name });
    return response.data?.Response;
  }

  async scheduleCampaign(emailId: string, data: { scheduleDate: string; timezone: string }) {
    let response = await this.axios.post(`/Emails/${emailId}/Schedule`, {
      ScheduleDate: data.scheduleDate,
      TimeZone: data.timezone
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

  async createContactList(data: Record<string, unknown>) {
    let response = await this.axios.post('/Contact', { Data: data });
    return response.data?.Response;
  }

  async updateContactList(listId: string, data: Record<string, unknown>) {
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
      searchField?: string;
      searchType?: string;
      orderBy?: string;
      sortOrder?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('PageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('PageSize', String(params.pageSize));
    if (params?.filter) query.set('Filter', params.filter);
    if (params?.searchFilter) query.set('SearchFilter', params.searchFilter);
    if (params?.searchField) query.set('SearchField', params.searchField);
    if (params?.searchType) query.set('SearchType', params.searchType);
    if (params?.orderBy) query.set('OrderBy', params.orderBy);
    if (params?.sortOrder) query.set('SortOrder', params.sortOrder);

    let qs = query.toString();
    let response = await this.axios.get(
      `/Contact/${listId}/ContactDetails${qs ? `?${qs}` : ''}`
    );
    return response.data?.Response;
  }

  async addContact(listId: string, data: Record<string, unknown>) {
    let response = await this.axios.post(`/Contact/${listId}/ContactDetails`, { Data: data });
    return response.data?.Response;
  }

  async updateContact(listId: string, contactId: string, data: Record<string, unknown>) {
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

  async updateWebhook(listId: string, webhookId: string, data: Record<string, unknown>) {
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
    let profile = response.data.Response;
    let clientId = profile.client_id ?? profile['Client ID'];
    if (clientId === undefined || clientId === null || String(clientId).trim() === '') {
      throw createApiServiceError('Benchmark Email returned a profile without a client ID.', {
        reason: 'benchmark_email_invalid_profile'
      });
    }
    return {
      clientId: String(clientId),
      email: String(profile.email ?? profile.Email ?? ''),
      firstName: String(profile.first_name ?? profile['First Name'] ?? ''),
      lastName: String(profile.last_name ?? profile['Last Name'] ?? ''),
      login: String(profile.login ?? profile.Login ?? ''),
      company: String(profile.Company ?? profile.company ?? ''),
      status: String(profile.client_status ?? profile['Client Status'] ?? ''),
      planName: String(profile.plan_name ?? profile['Plan Name'] ?? '')
    };
  }
}
