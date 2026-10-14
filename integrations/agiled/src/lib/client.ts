import {
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { agiledApiError } from './errors';

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;

  constructor(config: { token?: string; brand?: string }) {
    if (!config.token?.trim() || !config.brand?.trim()) {
      throw createApiServiceError('This tool requires an API Key & Brand connection.', {
        reason: 'agiled_legacy_auth_required'
      });
    }
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://my.agiled.app/api/v1',
      timeout: 30000,
      errorAdapter: agiledApiError,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Brand: config.brand
      }
    });
  }

  private params(extra?: Record<string, string | number | undefined>) {
    return pickDefined({ api_token: this.token, ...extra });
  }

  private listResponse(value: unknown): PaginatedResponse<Record<string, unknown>> {
    if (
      !isApiErrorRecord(value) ||
      !Array.isArray(value.data) ||
      !value.data.every(isApiErrorRecord)
    ) {
      throw createApiServiceError('Agiled returned an invalid list response.', {
        reason: 'agiled_invalid_response'
      });
    }
    return value as unknown as PaginatedResponse<Record<string, unknown>>;
  }

  private singleResponse(value: unknown): SingleResponse<Record<string, unknown>> {
    if (!isApiErrorRecord(value) || !isApiErrorRecord(value.data)) {
      throw createApiServiceError('Agiled returned an invalid record response.', {
        reason: 'agiled_invalid_response'
      });
    }
    return { ...value, data: value.data };
  }

  private pathId(id: string): string {
    if (!id.trim()) {
      throw createApiServiceError('Provide a non-empty Agiled record ID.');
    }
    try {
      return encodeURIComponent(id);
    } catch {
      throw createApiServiceError('The Agiled record ID must contain valid text.');
    }
  }

  // --- Contacts / Accounts ---

  async listContacts(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/contacts', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getContact(contactId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/contacts/${this.pathId(contactId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createContact(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/contacts', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateContact(
    contactId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/contacts/${this.pathId(contactId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/contacts/${this.pathId(contactId)}`, {
      params: this.params()
    });
  }

  // --- Projects ---

  async listProjects(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/projects', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getProject(projectId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/projects/${this.pathId(projectId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createProject(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/projects', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateProject(
    projectId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/projects/${this.pathId(projectId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/projects/${this.pathId(projectId)}`, {
      params: this.params()
    });
  }

  // --- Tasks ---

  async listTasks(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/tasks', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getTask(taskId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/tasks/${this.pathId(taskId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createTask(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/tasks', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateTask(
    taskId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/tasks/${this.pathId(taskId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async completeTask(
    taskId: string,
    data: Record<string, unknown> = {}
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(
      `/tasks/${this.pathId(taskId)}`,
      { ...data, board_column_id: 2 },
      {
        params: this.params()
      }
    );
    return this.singleResponse(response.data);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.axios.delete(`/tasks/${this.pathId(taskId)}`, {
      params: this.params()
    });
  }

  // --- Invoices ---

  async listInvoices(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/invoices', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getInvoice(invoiceId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/invoices/${this.pathId(invoiceId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createInvoice(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/invoices', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateInvoice(
    invoiceId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/invoices/${this.pathId(invoiceId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    await this.axios.delete(`/invoices/${this.pathId(invoiceId)}`, {
      params: this.params()
    });
  }

  // --- Estimates ---

  async listEstimates(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/estimates', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getEstimate(estimateId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/estimates/${this.pathId(estimateId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createEstimate(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/estimates', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateEstimate(
    estimateId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/estimates/${this.pathId(estimateId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteEstimate(estimateId: string): Promise<void> {
    await this.axios.delete(`/estimates/${this.pathId(estimateId)}`, {
      params: this.params()
    });
  }

  // --- Contracts ---

  async listContracts(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/contracts', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getContract(contractId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/contracts/${this.pathId(contractId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createContract(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/contracts', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateContract(
    contractId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/contracts/${this.pathId(contractId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteContract(contractId: string): Promise<void> {
    await this.axios.delete(`/contracts/${this.pathId(contractId)}`, {
      params: this.params()
    });
  }

  // --- Employees ---

  async listEmployees(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/employees', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getEmployee(employeeId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/employees/${this.pathId(employeeId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createEmployee(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/employees', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateEmployee(
    employeeId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/employees/${this.pathId(employeeId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    await this.axios.delete(`/employees/${this.pathId(employeeId)}`, {
      params: this.params()
    });
  }

  // --- Tickets ---

  async listTickets(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/tickets', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getTicket(ticketId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/tickets/${this.pathId(ticketId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createTicket(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/tickets', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateTicket(
    ticketId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/tickets/${this.pathId(ticketId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await this.axios.delete(`/tickets/${this.pathId(ticketId)}`, {
      params: this.params()
    });
  }

  // --- Products ---

  async listProducts(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/products', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getProduct(productId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/products/${this.pathId(productId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createProduct(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/products', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateProduct(
    productId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/products/${this.pathId(productId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.axios.delete(`/products/${this.pathId(productId)}`, {
      params: this.params()
    });
  }

  // --- Deals / Leads ---

  async listDeals(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/deals', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getDeal(dealId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/deals/${this.pathId(dealId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async createDeal(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/deals', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async updateDeal(
    dealId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/deals/${this.pathId(dealId)}`, data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  async deleteDeal(dealId: string): Promise<void> {
    await this.axios.delete(`/deals/${this.pathId(dealId)}`, {
      params: this.params()
    });
  }

  // --- Users ---

  async listUsers(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/users', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async getUser(userId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/users/${this.pathId(userId)}`, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  // --- Expenses ---

  async listExpenses(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/expenses', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async createExpense(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/expenses', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  // --- Time Entries ---

  async listTimeEntries(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/timelogs', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async createTimeEntry(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/timelogs', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  // --- CRM Sources ---

  async listCrmSources(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/crm-sources', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  async createCrmSource(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/crm-sources', data, {
      params: this.params()
    });
    return this.singleResponse(response.data);
  }

  // --- CRM Statuses ---

  async listCrmStatuses(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/crm-statuses', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  // --- CRM Stages ---

  async listCrmStages(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/crm-stages', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }

  // --- Contract Types ---

  async listContractTypes(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/contract-types', {
      params: this.params({ page, per_page: perPage })
    });
    return this.listResponse(response.data);
  }
}
