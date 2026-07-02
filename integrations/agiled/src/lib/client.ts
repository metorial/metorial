import { createAxios } from 'slates';

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
  private axios: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string; brand: string }) {
    this.token = config.token;
    this.axios = createAxios({
      baseURL: 'https://my.agiled.app/api/v1',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Brand: config.brand
      }
    });
  }

  private params(
    extra?: Record<string, string | number | undefined>
  ): Record<string, string | number> {
    let result: Record<string, string | number> = { api_token: this.token };
    if (extra) {
      for (let [key, value] of Object.entries(extra)) {
        if (value !== undefined) {
          result[key] = value;
        }
      }
    }
    return result;
  }

  // --- Contacts / Accounts ---

  async listContacts(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/contacts', {
      params: this.params({ page, per_page: perPage })
    });
    return response.data;
  }

  async getContact(contactId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/contacts/${contactId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createContact(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/contacts', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/contacts/${contactId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}`, {
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
    return response.data;
  }

  async getProject(projectId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/projects/${projectId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createProject(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/projects', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateProject(
    projectId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/projects/${projectId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}`, {
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
    return response.data;
  }

  async getTask(taskId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/tasks/${taskId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createTask(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/tasks', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateTask(
    taskId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/tasks/${taskId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async completeTask(taskId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(
      `/tasks/${taskId}`,
      { board_column_id: 2 },
      {
        params: this.params()
      }
    );
    return response.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.axios.delete(`/tasks/${taskId}`, {
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
    return response.data;
  }

  async getInvoice(invoiceId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/invoices/${invoiceId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createInvoice(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/invoices', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateInvoice(
    invoiceId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/invoices/${invoiceId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    await this.axios.delete(`/invoices/${invoiceId}`, {
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
    return response.data;
  }

  async getEstimate(estimateId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/estimates/${estimateId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createEstimate(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/estimates', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateEstimate(
    estimateId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/estimates/${estimateId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteEstimate(estimateId: string): Promise<void> {
    await this.axios.delete(`/estimates/${estimateId}`, {
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
    return response.data;
  }

  async getContract(contractId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/contracts/${contractId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createContract(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/contracts', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateContract(
    contractId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/contracts/${contractId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteContract(contractId: string): Promise<void> {
    await this.axios.delete(`/contracts/${contractId}`, {
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
    return response.data;
  }

  async getEmployee(employeeId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/employees/${employeeId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createEmployee(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/employees', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateEmployee(
    employeeId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/employees/${employeeId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    await this.axios.delete(`/employees/${employeeId}`, {
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
    return response.data;
  }

  async getTicket(ticketId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/tickets/${ticketId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createTicket(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/tickets', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateTicket(
    ticketId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/tickets/${ticketId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await this.axios.delete(`/tickets/${ticketId}`, {
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
    return response.data;
  }

  async getProduct(productId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/products/${productId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createProduct(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/products', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateProduct(
    productId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/products/${productId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.axios.delete(`/products/${productId}`, {
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
    return response.data;
  }

  async getDeal(dealId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/deals/${dealId}`, {
      params: this.params()
    });
    return response.data;
  }

  async createDeal(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/deals', data, {
      params: this.params()
    });
    return response.data;
  }

  async updateDeal(
    dealId: string,
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.put(`/deals/${dealId}`, data, {
      params: this.params()
    });
    return response.data;
  }

  async deleteDeal(dealId: string): Promise<void> {
    await this.axios.delete(`/deals/${dealId}`, {
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
    return response.data;
  }

  async getUser(userId: string): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.get(`/users/${userId}`, {
      params: this.params()
    });
    return response.data;
  }

  // --- Expenses ---

  async listExpenses(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/expenses', {
      params: this.params({ page, per_page: perPage })
    });
    return response.data;
  }

  async createExpense(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/expenses', data, {
      params: this.params()
    });
    return response.data;
  }

  // --- Time Entries ---

  async listTimeEntries(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/timelogs', {
      params: this.params({ page, per_page: perPage })
    });
    return response.data;
  }

  async createTimeEntry(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/timelogs', data, {
      params: this.params()
    });
    return response.data;
  }

  // --- CRM Sources ---

  async listCrmSources(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/crm-sources', {
      params: this.params({ page, per_page: perPage })
    });
    return response.data;
  }

  async createCrmSource(
    data: Record<string, unknown>
  ): Promise<SingleResponse<Record<string, unknown>>> {
    let response = await this.axios.post('/crm-sources', data, {
      params: this.params()
    });
    return response.data;
  }

  // --- CRM Statuses ---

  async listCrmStatuses(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/crm-statuses', {
      params: this.params({ page, per_page: perPage })
    });
    return response.data;
  }

  // --- CRM Stages ---

  async listCrmStages(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/crm-stages', {
      params: this.params({ page, per_page: perPage })
    });
    return response.data;
  }

  // --- Contract Types ---

  async listContractTypes(
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get('/contract-types', {
      params: this.params({ page, per_page: perPage })
    });
    return response.data;
  }
}
