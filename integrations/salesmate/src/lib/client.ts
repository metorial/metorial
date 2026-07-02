import { createAxios } from 'slates';

export interface SearchQuery {
  group: {
    operator: 'AND' | 'OR';
    rules: Array<{
      moduleName: string;
      field: { fieldName: string };
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

  constructor(params: {
    token: string;
    linkname: string;
    domain: string;
  }) {
    this.axios = createAxios({
      baseURL: `https://${params.domain}.salesmate.io/apis/core/v4`,
      headers: {
        accessToken: params.token,
        'x-linkname': params.linkname,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Contacts ---

  async createContact(data: Record<string, unknown>) {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async searchContacts(params: SearchParams) {
    let { pageNo = 1, rows = 25, ...body } = params;
    let response = await this.axios.post(
      `/contacts/search?pageNo=${pageNo}&rows=${rows}`,
      body
    );
    return response.data;
  }

  // --- Companies ---

  async createCompany(data: Record<string, unknown>) {
    let response = await this.axios.post('/companies', data);
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.axios.get(`/companies/${companyId}`);
    return response.data;
  }

  async updateCompany(companyId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/companies/${companyId}`, data);
    return response.data;
  }

  async deleteCompany(companyId: string) {
    let response = await this.axios.delete(`/companies/${companyId}`);
    return response.data;
  }

  async searchCompanies(params: SearchParams) {
    let { pageNo = 1, rows = 25, ...body } = params;
    let response = await this.axios.post(
      `/companies/search?pageNo=${pageNo}&rows=${rows}`,
      body
    );
    return response.data;
  }

  // --- Deals ---

  async createDeal(data: Record<string, unknown>) {
    let response = await this.axios.post('/deals', data);
    return response.data;
  }

  async getDeal(dealId: string) {
    let response = await this.axios.get(`/deals/${dealId}`);
    return response.data;
  }

  async updateDeal(dealId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/deals/${dealId}`, data);
    return response.data;
  }

  async deleteDeal(dealId: string) {
    let response = await this.axios.delete(`/deals/${dealId}`);
    return response.data;
  }

  async searchDeals(params: SearchParams) {
    let { pageNo = 1, rows = 25, ...body } = params;
    let response = await this.axios.post(`/deals/search?pageNo=${pageNo}&rows=${rows}`, body);
    return response.data;
  }

  // --- Activities ---

  async createActivity(data: Record<string, unknown>) {
    let response = await this.axios.post('/activities', data);
    return response.data;
  }

  async getActivity(activityId: string) {
    let response = await this.axios.get(`/activities/${activityId}`);
    return response.data;
  }

  async updateActivity(activityId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/activities/${activityId}`, data);
    return response.data;
  }

  async deleteActivity(activityId: string) {
    let response = await this.axios.delete(`/activities/${activityId}`);
    return response.data;
  }

  async searchActivities(params: SearchParams) {
    let { pageNo = 1, rows = 25, ...body } = params;
    let response = await this.axios.post(
      `/activities/search?pageNo=${pageNo}&rows=${rows}`,
      body
    );
    return response.data;
  }

  // --- Products ---

  async createProduct(data: Record<string, unknown>) {
    let response = await this.axios.post('/products', data);
    return response.data;
  }

  async getProduct(productId: string) {
    let response = await this.axios.get(`/products/${productId}`);
    return response.data;
  }

  async updateProduct(productId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/products/${productId}`, data);
    return response.data;
  }

  async deleteProduct(productId: string) {
    let response = await this.axios.delete(`/products/${productId}`);
    return response.data;
  }

  async searchProducts(params: SearchParams) {
    let { pageNo = 1, rows = 25, ...body } = params;
    let response = await this.axios.post(
      `/products/search?pageNo=${pageNo}&rows=${rows}`,
      body
    );
    return response.data;
  }

  // --- Tickets ---

  async createTicket(data: Record<string, unknown>) {
    let response = await this.axios.post('/tickets', data);
    return response.data;
  }

  async getTicket(ticketId: string) {
    let response = await this.axios.get(`/tickets/${ticketId}`);
    return response.data;
  }

  async updateTicket(ticketId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/tickets/${ticketId}`, data);
    return response.data;
  }

  async deleteTicket(ticketId: string) {
    let response = await this.axios.delete(`/tickets/${ticketId}`);
    return response.data;
  }

  async searchTickets(params: SearchParams) {
    let { pageNo = 1, rows = 25, ...body } = params;
    let response = await this.axios.post(
      `/tickets/search?pageNo=${pageNo}&rows=${rows}`,
      body
    );
    return response.data;
  }

  // --- Notes ---

  async createNote(data: Record<string, unknown>) {
    let response = await this.axios.post('/notes', data);
    return response.data;
  }

  async getNote(noteId: string) {
    let response = await this.axios.get(`/notes/${noteId}`);
    return response.data;
  }

  async updateNote(noteId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/notes/${noteId}`, data);
    return response.data;
  }

  async deleteNote(noteId: string) {
    let response = await this.axios.delete(`/notes/${noteId}`);
    return response.data;
  }

  // --- Users ---

  async getUsers() {
    let response = await this.axios.get('/users');
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }
}
