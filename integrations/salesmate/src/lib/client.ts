import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface SearchQuery {
  group: {
    operator: 'AND' | 'OR';
    rules: Array<{
      moduleName: string;
      field: { fieldName: string; type?: string };
      condition: string;
      data: string;
    }>;
  };
}

export interface SearchParams {
  fields: string[];
  query?: SearchQuery;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageNo?: number;
  rows?: number;
}

export class Client {
  private axios;
  private productAxios;

  constructor(params: {
    token: string;
    domain: string;
  }) {
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Salesmate',
        reason: 'salesmate_api_error',
        detailKeys: ['Message', 'message', 'Code', 'code'],
        nestedKeys: ['Error', 'errors']
      });
    let baseURL = `https://${params.domain}.salesmate.io/apis`;
    this.axios = createAuthenticatedAxios({
      baseURL,
      errorAdapter,
      headers: {
        accessToken: params.token,
        'x-linkname': `${params.domain}.salesmate.io`
      }
    });
    this.productAxios = createAuthenticatedAxios({
      baseURL,
      errorAdapter,
      headers: {
        sessionToken: params.token,
        'x-linkname': params.domain
      }
    });
  }

  // --- Contacts ---

  async createContact(data: Record<string, unknown>) {
    let response = await this.axios.post('/contact/v4', data);
    this.checkResponse(response.data);
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contact/v4/${encodeURIComponent(contactId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/contact/v4/${encodeURIComponent(contactId)}`, data);
    this.checkResponse(response.data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contact/v4/${encodeURIComponent(contactId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async searchContacts(params: SearchParams) {
    return this.searchRecords('contact', 1, params);
  }

  // --- Companies ---

  async createCompany(data: Record<string, unknown>) {
    let response = await this.axios.post('/company/v4', data);
    this.checkResponse(response.data);
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.axios.get(`/company/v4/${encodeURIComponent(companyId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async updateCompany(companyId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/company/v4/${encodeURIComponent(companyId)}`, data);
    this.checkResponse(response.data);
    return response.data;
  }

  async deleteCompany(companyId: string) {
    let response = await this.axios.delete(`/company/v4/${encodeURIComponent(companyId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async searchCompanies(params: SearchParams) {
    return this.searchRecords('company', 5, params);
  }

  // --- Deals ---

  async createDeal(data: Record<string, unknown>) {
    let response = await this.axios.post('/deal/v4', data);
    this.checkResponse(response.data);
    return response.data;
  }

  async getDeal(dealId: string) {
    let response = await this.axios.get(`/deal/v4/${encodeURIComponent(dealId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async updateDeal(dealId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/deal/v4/${encodeURIComponent(dealId)}`, data);
    this.checkResponse(response.data);
    return response.data;
  }

  async deleteDeal(dealId: string) {
    let response = await this.axios.delete(`/deal/v4/${encodeURIComponent(dealId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async searchDeals(params: SearchParams) {
    return this.searchRecords('deal', 4, params);
  }

  // --- Activities ---

  async createActivity(data: Record<string, unknown>) {
    let response = await this.axios.post('/activity/v4', data);
    this.checkResponse(response.data);
    return response.data;
  }

  async getActivity(activityId: string) {
    let response = await this.axios.get(`/activity/v4/${encodeURIComponent(activityId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async updateActivity(activityId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(
      `/activity/v4/${encodeURIComponent(activityId)}`,
      data
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async deleteActivity(activityId: string) {
    let response = await this.axios.delete(`/activity/v4/${encodeURIComponent(activityId)}`, {
      params: { hardDelete: false }
    });
    this.checkResponse(response.data);
    return response.data;
  }

  async searchActivities(params: SearchParams) {
    return this.searchRecords('activity', 2, params);
  }

  // --- Products ---

  async createProduct(data: Record<string, unknown>) {
    let response = await this.productAxios.post('/v1/products', data);
    this.checkResponse(response.data);
    return response.data;
  }

  async getProduct(productId: string) {
    let response = await this.productAxios.get(
      `/v1/products/${encodeURIComponent(productId)}`
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async updateProduct(productId: string, data: Record<string, unknown>) {
    let response = await this.productAxios.put(
      `/v1/products/${encodeURIComponent(productId)}`,
      data
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async deleteProduct(productId: string) {
    let response = await this.productAxios.delete(
      `/v1/products/${encodeURIComponent(productId)}`
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async searchProducts(params: SearchParams) {
    let { pageNo = 1, rows = 25, sortBy, sortOrder, ...body } = params;
    let response = await this.productAxios.post('/v3/products/search', body, {
      params: { from: (pageNo - 1) * rows, rows, sortBy, sortOrder }
    });
    this.checkResponse(response.data);
    return response.data;
  }

  // --- Tickets ---

  async createTicket(data: Record<string, unknown>) {
    let response = await this.axios.post('/core/v4/tickets', data);
    this.checkResponse(response.data);
    return response.data;
  }

  async getTicket(ticketId: string) {
    let response = await this.axios.get(`/core/v4/tickets/${encodeURIComponent(ticketId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async updateTicket(ticketId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(
      `/core/v4/tickets/${encodeURIComponent(ticketId)}`,
      data
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async deleteTicket(ticketId: string) {
    let response = await this.axios.delete(`/core/v4/tickets/${encodeURIComponent(ticketId)}`);
    this.checkResponse(response.data);
    return response.data;
  }

  async searchTickets(params: SearchParams) {
    let { pageNo = 1, rows = 25, ...body } = params;
    let response = await this.axios.post(
      `/core/v4/tickets/search?pageNo=${pageNo}&rows=${rows}`,
      body
    );
    this.checkResponse(response.data);
    return response.data;
  }

  // --- Notes ---

  async createNote(moduleId: number, recordId: number, data: Record<string, unknown>) {
    let response = await this.axios.post(this.notePath(moduleId, recordId), data);
    this.checkResponse(response.data);
    return response.data;
  }

  async getNote(noteId: string, moduleId: number, recordId: number) {
    let response = await this.axios.get(
      `/module/v4/modules/${moduleId}/objects/${recordId}/notes/${encodeURIComponent(noteId)}`
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async updateNote(
    noteId: string,
    moduleId: number,
    recordId: number,
    data: Record<string, unknown>
  ) {
    let response = await this.axios.put(
      `${this.notePath(moduleId, recordId)}/${encodeURIComponent(noteId)}`,
      data
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async deleteNote(noteId: string, moduleId: number, recordId: number) {
    let response = await this.axios.delete(
      `${this.notePath(moduleId, recordId)}/${encodeURIComponent(noteId)}`
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async listNotes(moduleId: number, recordId: number) {
    let response = await this.axios.get(
      `/module/v4/modules/${moduleId}/objects/${recordId}/notes`
    );
    this.checkResponse(response.data);
    return response.data;
  }

  async getModuleId(internalName: string) {
    let response = await this.axios.get(
      `/module/v4/modules/${encodeURIComponent(internalName)}`
    );
    this.checkResponse(response.data);
    return response.data;
  }

  private notePath(moduleId: number, recordId: number) {
    let resources: Record<number, string> = {
      1: 'contact',
      2: 'activity',
      4: 'deal',
      5: 'company'
    };
    let resource = resources[moduleId];
    return resource
      ? `/${resource}/v4/modules/${moduleId}/object/${recordId}/notes`
      : `/module/v4/modules/${moduleId}/objects/${recordId}/notes`;
  }

  private async searchRecords(resource: string, moduleId: number, params: SearchParams) {
    let { pageNo = 1, rows = 25, fields, query, sortBy, sortOrder } = params;
    if (
      !Number.isInteger(pageNo) ||
      pageNo < 1 ||
      !Number.isInteger(rows) ||
      rows < 1 ||
      rows > 250
    ) {
      throw createApiServiceError(
        'Page must be a positive integer and page size must be between 1 and 250.',
        {
          reason: 'salesmate_invalid_pagination'
        }
      );
    }
    let qualify = (field: string) =>
      field.startsWith(`${resource}.`) ? field : `${resource}.${field}`;
    let filterQuery = {
      group: {
        operator: query?.group.operator ?? 'AND',
        rules: (query?.group.rules ?? []).map(rule => ({
          ...rule,
          field: { ...rule.field, fieldName: qualify(rule.field.fieldName) },
          condition:
            (
              {
                NOT_CONTAINS: 'DOES_NOT_CONTAINS',
                IS_EMPTY: 'EMPTY',
                IS_NOT_EMPTY: 'NOT_EMPTY'
              } as Record<string, string>
            )[rule.condition] ?? rule.condition
        }))
      }
    };
    let response = await this.axios.post(
      `/${resource}/v4/search`,
      {
        displayingFields: fields.map(qualify),
        filterQuery,
        sort: { fieldName: sortBy ? qualify(sortBy) : '', order: sortOrder ?? '' },
        moduleId,
        reportType: 'get_data',
        getRecordsCount: true
      },
      {
        params: {
          from: (pageNo - 1) * rows,
          rows,
          ...(resource === 'activity' ? { viewType: 'list' } : {})
        }
      }
    );
    this.checkResponse(response.data);
    return response.data;
  }

  private checkResponse(data: unknown) {
    if (isApiErrorRecord(data) && data.Status === 'failure') {
      let error = isApiErrorRecord(data.Error) ? data.Error : {};
      throw createApiServiceError(
        typeof error.Message === 'string'
          ? `Salesmate API request failed: ${error.Message}`
          : 'Salesmate API request failed.',
        {
          reason: 'salesmate_api_error',
          upstreamCode: typeof error.Code === 'string' ? error.Code : undefined
        }
      );
    }
  }

  // --- Users ---

  async getUsers() {
    let response = await this.axios.get('/core/v4/users', { params: { status: 'active' } });
    this.checkResponse(response.data);
    return response.data;
  }

  async getCurrentUser() {
    let result = await this.getUsers();
    let users: unknown = result?.Data;
    let user = Array.isArray(users)
      ? users.find(user => isApiErrorRecord(user) && user.isCurrentUser === true)
      : undefined;
    if (!isApiErrorRecord(user)) {
      throw createApiServiceError(
        'Salesmate did not identify the current user in the active user list.',
        {
          reason: 'salesmate_current_user_unavailable'
        }
      );
    }
    return { Status: 'success', Data: user };
  }

  async getUser(userId: string) {
    let result = await this.getUsers();
    let users: unknown = result?.Data;
    let user = Array.isArray(users)
      ? users.find(user => isApiErrorRecord(user) && String(user.id) === userId)
      : undefined;
    if (!user) {
      throw createApiServiceError('No active Salesmate user found with that ID.', {
        reason: 'salesmate_user_not_found'
      });
    }
    return { Status: 'success', Data: user };
  }
}
