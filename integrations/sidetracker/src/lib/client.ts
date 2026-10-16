import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('Connect a Sidetracker API key before continuing.', {
        reason: 'sidetracker_api_key_required'
      });
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.sidetracker.io/api/',
      authHeader: { value: config.token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Sidetracker',
          reason: 'sidetracker_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
  }

  async getCurrentUser(): Promise<unknown> {
    let response = await this.axios.get('zapier_api/me');
    return response.data;
  }

  async getConversions(params: URLSearchParams): Promise<unknown> {
    let response = await this.axios.get('tracking/conversions', { params });
    return response.data;
  }

  // ─── Lists ──────────────────────────────────────────────────

  async getLists(
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let params: Record<string, unknown> = {};
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.page_size = pageSize;
    let response = await this.axios.get('lists', { params });
    return response.data;
  }

  async getList(uniqueId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`lists/${encodeURIComponent(uniqueId)}`);
    return response.data;
  }

  async createList(params: {
    name: string;
    description?: string;
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
    await this.axios.delete(`lists/${encodeURIComponent(uniqueId)}/delete`);
  }

  // ─── List Rows ──────────────────────────────────────────────

  async getListRows(
    uniqueId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let params: Record<string, unknown> = { unique_id: uniqueId };
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.page_size = pageSize;
    let response = await this.axios.get('zapier/get_list_rows', { params });
    return response.data;
  }

  async getListRow(uniqueId: string, rowId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `lists/${encodeURIComponent(uniqueId)}/get/row/${encodeURIComponent(rowId)}`
    );
    return response.data;
  }

  async addListRow(
    uniqueId: string,
    rowData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `lists/${encodeURIComponent(uniqueId)}/add/row`,
      rowData
    );
    return response.data;
  }

  async updateListRow(
    uniqueId: string,
    rowId: string,
    rowData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `lists/${encodeURIComponent(uniqueId)}/update/row/${encodeURIComponent(rowId)}`,
      rowData
    );
    return response.data;
  }

  async deleteListRow(uniqueId: string, rowId: string): Promise<void> {
    await this.axios.delete(
      `lists/${encodeURIComponent(uniqueId)}/delete/row/${encodeURIComponent(rowId)}`
    );
  }

  async deleteListRowBySession(uniqueId: string, sessionId: string): Promise<void> {
    await this.axios.delete(
      `lists/${encodeURIComponent(uniqueId)}/delete/row/session/${encodeURIComponent(sessionId)}`
    );
  }

  // ─── Sessions ───────────────────────────────────────────────

  async getSessions(
    domainId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let params: Record<string, unknown> = {};
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.page_size = pageSize;
    let response = await this.axios.get(`tracking/sessions/${encodeURIComponent(domainId)}`, {
      params
    });
    return response.data;
  }

  async getSession(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `tracking/session/${encodeURIComponent(sessionId)}/get`
    );
    return response.data;
  }

  async updateSession(
    sessionId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `tracking/session/${encodeURIComponent(sessionId)}/update`,
      data
    );
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.axios.delete(`tracking/session/${encodeURIComponent(sessionId)}/delete`);
  }

  // ─── Session Visits ─────────────────────────────────────────

  async getSessionVisits(
    sessionId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let params: Record<string, unknown> = {};
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.page_size = pageSize;
    let response = await this.axios.get(
      `tracking/session/${encodeURIComponent(sessionId)}/visits`,
      { params }
    );
    return response.data;
  }

  async getSessionVisit(sessionId: string, visitId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `tracking/session/${encodeURIComponent(sessionId)}/visit/${encodeURIComponent(visitId)}/get`
    );
    return response.data;
  }

  async deleteSessionVisit(sessionId: string, visitId: string): Promise<void> {
    await this.axios.delete(
      `tracking/session/${encodeURIComponent(sessionId)}/visit/${encodeURIComponent(visitId)}/delete`
    );
  }

  // ─── Session Notes ──────────────────────────────────────────

  async getSessionNotes(sessionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `tracking/session/${encodeURIComponent(sessionId)}/notes`
    );
    return response.data;
  }

  async addSessionNote(sessionId: string, content: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `tracking/session/${encodeURIComponent(sessionId)}/note/add`,
      {
        content
      }
    );
    return response.data;
  }

  async getSessionNote(sessionId: string, noteId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `tracking/session/${encodeURIComponent(sessionId)}/note/${encodeURIComponent(noteId)}/get`
    );
    return response.data;
  }

  async deleteSessionNote(sessionId: string, noteId: string): Promise<void> {
    await this.axios.delete(
      `tracking/session/${encodeURIComponent(sessionId)}/note/${encodeURIComponent(noteId)}/delete`
    );
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
    let response = await this.axios.post(
      `triggers/${encodeURIComponent(sessionId)}/execute/${encodeURIComponent(triggerId)}`
    );
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
