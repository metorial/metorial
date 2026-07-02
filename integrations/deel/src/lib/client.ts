import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  clientId?: string;
  environment: 'production' | 'sandbox';
}

export class Client {
  private http;

  constructor(config: ClientConfig) {
    let baseURL =
      config.environment === 'sandbox'
        ? 'https://api-sandbox.demo.deel.com/rest/v2'
        : 'https://api.letsdeel.com/rest/v2';

    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (config.clientId) {
      headers['x-client-id'] = config.clientId;
    }

    this.http = createAxios({ baseURL, headers });
  }

  // --- Contracts ---

  async listContracts(params?: Record<string, any>) {
    let response = await this.http.get('/contracts', { params });
    return response.data;
  }

  async getContract(contractId: string) {
    let response = await this.http.get(`/contracts/${contractId}`);
    return response.data;
  }

  async createContract(data: Record<string, any>) {
    let response = await this.http.post('/contracts', { data });
    return response.data;
  }

  async amendContract(contractId: string, data: Record<string, any>) {
    let response = await this.http.post(`/contracts/${contractId}/amendments`, { data });
    return response.data;
  }

  async signContract(contractId: string) {
    let response = await this.http.post(`/contracts/${contractId}/signatures`);
    return response.data;
  }

  async terminateContract(contractId: string, data: Record<string, any>) {
    let response = await this.http.post(`/contracts/${contractId}/terminations`, { data });
    return response.data;
  }

  // --- People ---

  async listPeople(params?: Record<string, any>) {
    let response = await this.http.get('/people', { params });
    return response.data;
  }

  async getPerson(personId: string) {
    let response = await this.http.get(`/people/${personId}`);
    return response.data;
  }

  // --- Timesheets ---

  async listTimesheets(contractId: string, params?: Record<string, any>) {
    let response = await this.http.get(`/contracts/${contractId}/timesheets`, { params });
    return response.data;
  }

  async createTimesheet(data: Record<string, any>) {
    let response = await this.http.post('/timesheets', { data });
    return response.data;
  }

  async reviewTimesheet(timesheetId: string, data: { status: string; reason?: string }) {
    let response = await this.http.post(`/timesheets/${timesheetId}/reviews`, { data });
    return response.data;
  }

  async reviewTimesheetsBatch(data: {
    timesheets: Array<{ id: string; status: string; reason?: string }>;
  }) {
    let response = await this.http.post('/timesheets/many/reviews', { data });
    return response.data;
  }

  // --- Time Off ---

  async listTimeOffs(profileId: string, params?: Record<string, any>) {
    let response = await this.http.get(`/time_offs/profile/${profileId}`, { params });
    return response.data;
  }

  async createTimeOff(data: Record<string, any>) {
    let response = await this.http.post('/time_offs', { data });
    return response.data;
  }

  async updateTimeOff(timeOffId: string, data: Record<string, any>) {
    let response = await this.http.patch(`/time_offs/${timeOffId}`, { data });
    return response.data;
  }

  async deleteTimeOff(timeOffId: string) {
    let response = await this.http.delete(`/time_offs/${timeOffId}`);
    return response.data;
  }

  // --- Invoice Adjustments ---

  async listInvoiceAdjustments(params?: Record<string, any>) {
    let response = await this.http.get('/invoice-adjustments', { params });
    return response.data;
  }

  async listContractInvoiceAdjustments(contractId: string, params?: Record<string, any>) {
    let response = await this.http.get(`/contracts/${contractId}/invoice-adjustments`, {
      params
    });
    return response.data;
  }

  async createInvoiceAdjustment(data: Record<string, any>) {
    let response = await this.http.post('/invoice-adjustments', { data });
    return response.data;
  }

  async reviewInvoiceAdjustment(
    adjustmentId: string,
    data: { status: string; reason?: string }
  ) {
    let response = await this.http.post(`/invoice-adjustments/${adjustmentId}/reviews`, {
      data
    });
    return response.data;
  }

  // --- Accounting / Invoices ---

  async listInvoices(params?: Record<string, any>) {
    let response = await this.http.get('/invoices', { params });
    return response.data;
  }

  // --- Payments ---

  async listPayments(params?: Record<string, any>) {
    let response = await this.http.get('/payments', { params });
    return response.data;
  }

  // --- Organizations ---

  async listLegalEntities(params?: Record<string, any>) {
    let response = await this.http.get('/legal-entities', { params });
    return response.data;
  }

  async listGroups(params?: Record<string, any>) {
    let response = await this.http.get('/teams', { params });
    return response.data;
  }

  async listDepartments(params?: Record<string, any>) {
    let response = await this.http.get('/departments', { params });
    return response.data;
  }

  // --- EOR ---

  async createEorContract(data: Record<string, any>) {
    let response = await this.http.post('/eor', { data });
    return response.data;
  }

  async getEorCountryGuide(countryCode: string) {
    let response = await this.http.get(`/eor/validations/${countryCode}`);
    return response.data;
  }

  async getEorCostCalculation(data: Record<string, any>) {
    let response = await this.http.post('/eor/employment_cost', { data });
    return response.data;
  }

  // --- Webhooks ---

  async listWebhookEventTypes() {
    let response = await this.http.get('/webhooks/events/types');
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    description?: string;
    url: string;
    events: string[];
    status?: string;
    api_version?: string;
  }) {
    let response = await this.http.post('/webhooks', {
      name: data.name,
      description: data.description,
      url: data.url,
      events: data.events,
      status: data.status ?? 'enabled',
      api_version: data.api_version ?? 'v2'
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  async listWebhooks() {
    let response = await this.http.get('/webhooks');
    return response.data;
  }
}
