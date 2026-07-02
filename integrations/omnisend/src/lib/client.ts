import { createAxios } from 'slates';

export class OmnisendClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.omnisend.com/v5',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': token
      }
    });
  }

  // ── Contacts ──

  async listContacts(params?: {
    email?: string;
    phone?: string;
    status?: string;
    segmentID?: string;
    tag?: string;
    limit?: number;
    after?: string;
    before?: string;
    updatedAfter?: string;
  }): Promise<any> {
    let queryParams: Record<string, string | number> = {};
    if (params?.email) queryParams.email = params.email;
    if (params?.phone) queryParams.phone = params.phone;
    if (params?.status) queryParams.status = params.status;
    if (params?.segmentID) queryParams.segmentID = params.segmentID;
    if (params?.tag) queryParams.tag = params.tag;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;
    if (params?.updatedAfter) queryParams.updatedAfter = params.updatedAfter;

    let response = await this.http.get('/contacts', { params: queryParams });
    return response.data;
  }

  async getContact(contactId: string): Promise<any> {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createOrUpdateContact(contact: Record<string, any>): Promise<any> {
    let response = await this.http.post('/contacts', contact);
    return response.data;
  }

  async updateContact(contactId: string, updates: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/contacts/${contactId}`, updates);
    return response.data;
  }

  // ── Products ──

  async listProducts(params?: {
    offset?: number;
    limit?: number;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string | number> = {};
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.http.get('/products', { params: queryParams });
    return response.data;
  }

  async getProduct(productId: string): Promise<any> {
    let response = await this.http.get(`/products/${productId}`);
    return response.data;
  }

  async createProduct(product: Record<string, any>): Promise<any> {
    let response = await this.http.post('/products', product);
    return response.data;
  }

  async updateProduct(productId: string, updates: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/products/${productId}`, updates);
    return response.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.http.delete(`/products/${productId}`);
  }

  // ── Product Categories ──

  async listCategories(params?: { offset?: number; limit?: number }): Promise<any> {
    let queryParams: Record<string, string | number> = {};
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.http.get('/categories', { params: queryParams });
    return response.data;
  }

  async createCategory(category: Record<string, any>): Promise<any> {
    let response = await this.http.post('/categories', category);
    return response.data;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.http.delete(`/categories/${categoryId}`);
  }

  // ── Events ──

  async sendEvent(event: {
    eventName: string;
    eventID?: string;
    eventTime?: string;
    eventVersion?: string;
    origin?: string;
    contact: Record<string, any>;
    properties?: Record<string, any>;
  }): Promise<any> {
    let response = await this.http.post('/events', event);
    return response.data;
  }

  // ── Campaigns ──

  async listCampaigns(params?: { updatedAtFrom?: string }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.updatedAtFrom) queryParams.updatedAtFrom = params.updatedAtFrom;

    let response = await this.http.get('/campaigns', { params: queryParams });
    return response.data;
  }

  // ── Automations ──

  async listAutomations(): Promise<any> {
    let response = await this.http.get('/automations');
    return response.data;
  }

  // ── Brands ──

  async getBrand(): Promise<any> {
    let response = await this.http.get('/brands');
    return response.data;
  }

  // ── Batches ──

  async createBatch(batch: { method: string; endpoint: string; items: any[] }): Promise<any> {
    let response = await this.http.post('/batches', batch);
    return response.data;
  }

  async getBatch(batchId: string): Promise<any> {
    let response = await this.http.get(`/batches/${batchId}`);
    return response.data;
  }
}
