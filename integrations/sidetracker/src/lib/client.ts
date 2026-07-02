import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.sidetracker.io/api/',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Lists ──────────────────────────────────────────────────

  async getLists(
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let params: Record<string, unknown> = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    let response = await this.axios.get('lists', { params });
    return response.data;
  }

  async getList(uniqueId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`lists/${uniqueId}`);
    return response.data;
  }

  async createList(params: {
    name: string;
    description: string;
    preset: 'tracking' | 'checks';
    columns: string[];
  }): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`lists/create?preset=${params.preset}`, {
      name: params.name,
      description: params.description,
      preset: params.preset,
      columns: params.columns
    });
    return response.data;
  }

  async deleteList(uniqueId: string): Promise<void> {
    await this.axios.delete(`lists/${uniqueId}/delete`);
  }

  // ─── List Rows ──────────────────────────────────────────────

  async getListRows(
    uniqueId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let params: Record<string, unknown> = { unique_id: uniqueId };
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    let response = await this.axios.get('zapier/get_list_rows', { params });
    return response.data;
  }

  async getListRow(uniqueId: string, rowId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`lists/${uniqueId}/get/row/${rowId}`);
    return response.data;
  }

  async addListRow(
    uniqueId: string,
    rowData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`lists/${uniqueId}/add/row`, rowData);
    return response.data;
  }

  async updateListRow(
    uniqueId: string,
    rowId: string,
    rowData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`lists/${uniqueId}/update/row/${rowId}`, rowData);
    return response.data;
  }

  async deleteListRow(uniqueId: string, rowId: string): Promise<void> {
    await this.axios.delete(`lists/${uniqueId}/delete/row/${rowId}`);
  }

  async deleteListRowBySession(uniqueId: string, sessionId: string): Promise<void> {
    await this.axios.delete(`lists/${uniqueId}/delete/row/session/${sessionId}`);
  }

  // ─── Sessions ───────────────────────────────────────────────

  async getSessions(
    domainId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let params: Record<string, unknown> = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    let response = await this.axios.get(`tracking/sessions/${domainId}`, { params });
    return response.data;
  }

  async getSession(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`tracking/session/${sessionId}/get`);
    return response.data;
  }

  async updateSession(
    sessionId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`tracking/session/${sessionId}/update`, data);
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.axios.delete(`tracking/session/${sessionId}/delete`);
  }

  // ─── Session Visits ─────────────────────────────────────────

  async getSessionVisits(
    sessionId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let params: Record<string, unknown> = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    let response = await this.axios.get(`tracking/session/${sessionId}/visits`, { params });
    return response.data;
  }

  async getSessionVisit(sessionId: string, visitId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`tracking/session/${sessionId}/visit/${visitId}/get`);
    return response.data;
  }

  async deleteSessionVisit(sessionId: string, visitId: string): Promise<void> {
    await this.axios.delete(`tracking/session/${sessionId}/visit/${visitId}/delete`);
  }

  // ─── Session Notes ──────────────────────────────────────────

  async getSessionNotes(sessionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`tracking/session/${sessionId}/notes`);
    return response.data;
  }

  async addSessionNote(sessionId: string, content: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`tracking/session/${sessionId}/note/add`, {
      content
    });
    return response.data;
  }

  async getSessionNote(sessionId: string, noteId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`tracking/session/${sessionId}/note/${noteId}/get`);
    return response.data;
  }

  async deleteSessionNote(sessionId: string, noteId: string): Promise<void> {
    await this.axios.delete(`tracking/session/${sessionId}/note/${noteId}/delete`);
  }

  // ─── Revenue & Sales ───────────────────────────────────────

  async addRevenue(sessionId: string, amount: number): Promise<Record<string, unknown>> {
    let response = await this.axios.put('zapier/add_revenue', {
      session_id: sessionId,
      amount
    });
    return response.data;
  }

  async updateSalesStatus(
    sessionId: string,
    salesStatus: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put('zapier/update_sales_status', {
      session_id: sessionId,
      sales_status: salesStatus
    });
    return response.data;
  }

  // ─── Triggers ───────────────────────────────────────────────

  async executeTrigger(
    sessionId: string,
    triggerId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`triggers/${sessionId}/execute/${triggerId}`);
    return response.data;
  }

  // ─── Webhooks ───────────────────────────────────────────────

  async subscribeWebhook(
    webhookUrl: string,
    listId: string,
    eventType: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('zapier/subscribe_webhook', {
      target_url: webhookUrl,
      unique_id: listId,
      event: eventType
    });
    return response.data;
  }

  async unsubscribeWebhook(webhookUrl: string): Promise<void> {
    await this.axios.post('zapier/unsubscribe_webhook', {
      target_url: webhookUrl
    });
  }
}
