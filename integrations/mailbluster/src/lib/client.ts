import { createAxios } from 'slates';

export interface LeadInput {
  email: string;
  firstName?: string;
  lastName?: string;
  subscribed?: boolean;
  fields?: Record<string, string>;
  timezone?: string;
  ipAddress?: string;
  doubleOptIn?: boolean;
  tags?: string[];
  overrideExisting?: boolean;
}

export interface LeadResponse {
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  subscribed: boolean;
  timezone: string | null;
  ipAddress: string | null;
  fields: Record<string, string>;
  tags: string[];
  meta: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  id: string;
  name: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemInput {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderInput {
  id: string;
  customerEmail: string;
  customerFirstName?: string;
  customerLastName?: string;
  campaignId?: string;
  currency: string;
  totalPrice: number;
  items: OrderItemInput[];
}

export interface OrderResponse {
  id: string;
  customer: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  campaignId: string | null;
  currency: string;
  totalPrice: number;
  items: OrderItemInput[];
  createdAt: string;
  updatedAt: string;
}

export interface FieldResponse {
  fieldLabel: string;
  fieldMergeTag: string;
}

export interface PaginatedResponse<T> {
  [key: string]: T[] | any;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.mailbluster.com/api',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.token
      }
    });
  }

  // ---- Leads ----

  async createLead(input: LeadInput): Promise<LeadResponse> {
    let response = await this.axios.post('/leads', input);
    return response.data;
  }

  async getLead(email: string): Promise<LeadResponse> {
    let response = await this.axios.get(`/leads/${encodeURIComponent(email)}`);
    return response.data;
  }

  async updateLead(
    email: string,
    input: Partial<Omit<LeadInput, 'email' | 'overrideExisting'>>
  ): Promise<LeadResponse> {
    let response = await this.axios.put(`/leads/${encodeURIComponent(email)}`, input);
    return response.data;
  }

  async deleteLead(email: string): Promise<{ message: string }> {
    let response = await this.axios.delete(`/leads/${encodeURIComponent(email)}`);
    return response.data;
  }

  // ---- Products ----

  async createProduct(input: ProductInput): Promise<ProductResponse> {
    let response = await this.axios.post('/products', input);
    return response.data;
  }

  async getProduct(productId: string): Promise<ProductResponse> {
    let response = await this.axios.get(`/products/${encodeURIComponent(productId)}`);
    return response.data;
  }

  async listProducts(pageNo?: number, perPage?: number): Promise<ProductResponse[]> {
    let params: Record<string, any> = {};
    if (pageNo !== undefined) params.pageNo = pageNo;
    if (perPage !== undefined) params.perPage = perPage;
    let response = await this.axios.get('/products', { params });
    return response.data.products || response.data;
  }

  async updateProduct(productId: string, name: string): Promise<ProductResponse> {
    let response = await this.axios.put(`/products/${encodeURIComponent(productId)}`, {
      name
    });
    return response.data;
  }

  async deleteProduct(productId: string): Promise<{ message: string }> {
    let response = await this.axios.delete(`/products/${encodeURIComponent(productId)}`);
    return response.data;
  }

  // ---- Orders ----

  async createOrder(input: OrderInput): Promise<OrderResponse> {
    let body: Record<string, any> = {
      id: input.id,
      customer: {
        email: input.customerEmail,
        ...(input.customerFirstName && { firstName: input.customerFirstName }),
        ...(input.customerLastName && { lastName: input.customerLastName })
      },
      currency: input.currency,
      totalPrice: input.totalPrice,
      items: input.items
    };
    if (input.campaignId) {
      body.campaignId = input.campaignId;
    }
    let response = await this.axios.post('/orders', body);
    return response.data;
  }

  async getOrder(orderId: string): Promise<OrderResponse> {
    let response = await this.axios.get(`/orders/${encodeURIComponent(orderId)}`);
    return response.data;
  }

  async listOrders(pageNo?: number, perPage?: number): Promise<OrderResponse[]> {
    let params: Record<string, any> = {};
    if (pageNo !== undefined) params.pageNo = pageNo;
    if (perPage !== undefined) params.perPage = perPage;
    let response = await this.axios.get('/orders', { params });
    return response.data.orders || response.data;
  }

  async updateOrder(
    orderId: string,
    input: Partial<Omit<OrderInput, 'id'>>
  ): Promise<OrderResponse> {
    let body: Record<string, any> = {};
    if (input.customerEmail) {
      body.customer = {
        email: input.customerEmail,
        ...(input.customerFirstName && { firstName: input.customerFirstName }),
        ...(input.customerLastName && { lastName: input.customerLastName })
      };
    }
    if (input.currency) body.currency = input.currency;
    if (input.totalPrice !== undefined) body.totalPrice = input.totalPrice;
    if (input.items) body.items = input.items;
    if (input.campaignId) body.campaignId = input.campaignId;
    let response = await this.axios.put(`/orders/${encodeURIComponent(orderId)}`, body);
    return response.data;
  }

  async deleteOrder(orderId: string): Promise<{ message: string }> {
    let response = await this.axios.delete(`/orders/${encodeURIComponent(orderId)}`);
    return response.data;
  }

  // ---- Fields ----

  async getFields(): Promise<FieldResponse[]> {
    let response = await this.axios.get('/fields');
    return response.data.fields || response.data;
  }

  async createField(fieldLabel: string, fieldMergeTag: string): Promise<FieldResponse> {
    let response = await this.axios.post('/fields', { fieldLabel, fieldMergeTag });
    return response.data;
  }
}
