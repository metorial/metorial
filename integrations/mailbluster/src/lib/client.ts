import { createHash } from 'node:crypto';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

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

export interface LeadUpdateInput
  extends Partial<Omit<LeadInput, 'email' | 'overrideExisting' | 'doubleOptIn'>> {
  newEmail?: string;
  addTags?: string[];
  removeTags?: string[];
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

interface ApiOrderResponse {
  id: string;
  lead: OrderResponse['customer'];
  campaign: { id: number } | null;
  currency: string;
  totalPrice: string;
  orderItems: {
    product: ProductResponse;
    price: string;
    quantity: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface FieldResponse {
  id: number;
  fieldLabel: string;
  fieldMergeTag: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  prevPageNo: number | null;
  pageNo: number;
  nextPageNo: number | null;
  perPage: number;
  totalPage: number;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A MailBluster API key is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.mailbluster.com/api',
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'MailBluster',
          reason: 'mailbluster_api_error'
        })
    });
  }

  private leadHash(email: string): string {
    return createHash('md5').update(email).digest('hex');
  }

  private campaignId(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw createApiServiceError('Provide campaignId as a numeric campaign ID.');
    }
    return Number(value);
  }

  private mapOrder(order: ApiOrderResponse): OrderResponse {
    return {
      id: order.id,
      customer: order.lead,
      campaignId: order.campaign ? String(order.campaign.id) : null,
      currency: order.currency,
      totalPrice: Number(order.totalPrice),
      items: order.orderItems.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: Number(item.price),
        quantity: item.quantity
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }

  // ---- Leads ----

  async createLead(input: LeadInput): Promise<LeadResponse> {
    let response = await this.axios.post<{ lead: LeadResponse }>('/leads', {
      ...input,
      subscribed: input.subscribed ?? false
    });
    return response.data.lead;
  }

  async getLead(email: string): Promise<LeadResponse> {
    let response = await this.axios.get<LeadResponse>(`/leads/${this.leadHash(email)}`);
    return response.data;
  }

  async updateLead(email: string, input: LeadUpdateInput): Promise<LeadResponse> {
    let { tags, newEmail, ...body } = input;
    if (tags !== undefined) {
      if (input.addTags !== undefined || input.removeTags !== undefined) {
        throw createApiServiceError('Use tags or addTags/removeTags in one update.');
      }
      let lead = await this.getLead(email);
      body.addTags = tags;
      body.removeTags = (lead.tags ?? []).filter(tag => !tags.includes(tag));
    }
    let response = await this.axios.put<{ lead: LeadResponse }>(
      `/leads/${this.leadHash(email)}`,
      pickDefined({ ...body, email: newEmail })
    );
    return response.data.lead;
  }

  async deleteLead(email: string): Promise<{ message: string }> {
    let response = await this.axios.delete(`/leads/${this.leadHash(email)}`);
    return response.data;
  }

  // ---- Products ----

  async createProduct(input: ProductInput): Promise<ProductResponse> {
    let response = await this.axios.post<{ product: ProductResponse }>('/products', input);
    return response.data.product;
  }

  async getProduct(productId: string): Promise<ProductResponse> {
    let response = await this.axios.get(`/products/${encodeURIComponent(productId)}`);
    return response.data;
  }

  async listProducts(pageNo?: number, perPage?: number) {
    let response = await this.axios.get<{
      products: ProductResponse[];
      meta: PaginationMeta;
    }>('/products', { params: pickDefined({ pageNo, perPage }) });
    return response.data;
  }

  async updateProduct(productId: string, name: string): Promise<ProductResponse> {
    let response = await this.axios.put<{ product: ProductResponse }>(
      `/products/${encodeURIComponent(productId)}`,
      { name }
    );
    return response.data.product;
  }

  async deleteProduct(productId: string): Promise<{ message: string }> {
    let response = await this.axios.delete(`/products/${encodeURIComponent(productId)}`);
    return response.data;
  }

  // ---- Orders ----

  async createOrder(input: OrderInput): Promise<OrderResponse> {
    let body = pickDefined({
      id: input.id,
      customer: {
        email: input.customerEmail,
        ...pickDefined({
          firstName: input.customerFirstName,
          lastName: input.customerLastName
        })
      },
      currency: input.currency,
      totalPrice: input.totalPrice,
      items: input.items,
      campaignId: this.campaignId(input.campaignId)
    });
    let response = await this.axios.post<{ order: ApiOrderResponse }>('/orders', body);
    return this.mapOrder(response.data.order);
  }

  async getOrder(orderId: string): Promise<OrderResponse> {
    let response = await this.axios.get<ApiOrderResponse>(
      `/orders/${encodeURIComponent(orderId)}`
    );
    return this.mapOrder(response.data);
  }

  async listOrders(pageNo?: number, perPage?: number) {
    let response = await this.axios.get<{
      orders: ApiOrderResponse[];
      meta: PaginationMeta;
    }>('/orders', { params: pickDefined({ pageNo, perPage }) });
    return {
      orders: response.data.orders.map(order => this.mapOrder(order)),
      meta: response.data.meta
    };
  }

  async updateOrder(
    orderId: string,
    input: Partial<Omit<OrderInput, 'id'>>
  ): Promise<OrderResponse> {
    let customer = pickDefined({
      email: input.customerEmail,
      firstName: input.customerFirstName,
      lastName: input.customerLastName
    });
    let body = pickDefined({
      customer: Object.keys(customer).length ? customer : undefined,
      currency: input.currency,
      totalPrice: input.totalPrice,
      items: input.items,
      campaignId: this.campaignId(input.campaignId)
    });
    let response = await this.axios.put<{ order: ApiOrderResponse }>(
      `/orders/${encodeURIComponent(orderId)}`,
      body
    );
    return this.mapOrder(response.data.order);
  }

  async deleteOrder(orderId: string): Promise<{ message: string }> {
    let response = await this.axios.delete(`/orders/${encodeURIComponent(orderId)}`);
    return response.data;
  }

  // ---- Fields ----

  async getFields(): Promise<FieldResponse[]> {
    let response = await this.axios.get<{ fields: FieldResponse[] }>('/fields');
    return response.data.fields;
  }

  async createField(fieldLabel: string, fieldMergeTag: string): Promise<FieldResponse> {
    let response = await this.axios.post<{ field: FieldResponse }>('/fields', {
      fieldLabel,
      fieldMergeTag
    });
    return response.data.field;
  }

  async updateField(
    fieldId: number,
    fieldLabel: string,
    fieldMergeTag: string
  ): Promise<FieldResponse> {
    let response = await this.axios.put<{ field: FieldResponse }>(`/fields/${fieldId}`, {
      fieldLabel,
      fieldMergeTag
    });
    return response.data.field;
  }

  async deleteField(fieldId: number): Promise<{ message: string; id: number }> {
    let response = await this.axios.delete<{ message: string; id: number }>(
      `/fields/${fieldId}`
    );
    return response.data;
  }
}
