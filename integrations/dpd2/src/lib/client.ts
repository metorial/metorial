import { createAxios } from 'slates';

export interface ClientConfig {
  username: string;
  token: string;
}

export interface Storefront {
  storefrontId: number;
  name: string;
  url: string;
  contactName: string;
  contactEmail: string;
  currency: string;
  storefrontType: string;
  subdomain: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProductPrice {
  priceId: number;
  name: string;
  price: string;
}

export interface Product {
  productId: number;
  storefrontId: number;
  name: string;
  description: string;
  longDescription: string;
  price: string;
  sku: string;
  weight: string;
  visibility: number;
  imageFileName: string;
  mimeType: string;
  fileSize: number;
  fileName: string;
  prices: ProductPrice[];
  createdAt: number;
  updatedAt: number;
  imageUpdatedAt: number;
}

export interface CustomerSummary {
  customerId: number;
  firstname: string;
  lastname: string;
  email: string;
}

export interface Customer {
  customerId: number;
  firstname: string;
  lastname: string;
  email: string;
  receivesEmail: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PurchaseLineItem {
  productId: number;
  productName: string;
  price: string;
  quantity: number;
  downloadLimit: number;
  downloadCount: number;
  expiresAt: number | null;
  productKeys: string[];
}

export interface PurchaseCustomField {
  label: string;
  response: string;
}

export interface PurchaseCoupon {
  name: string;
  code: string;
  discountAmount: string;
  discountType: string;
}

export interface Purchase {
  purchaseId: number;
  status: string;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  total: string;
  processorFee: string;
  buyerEmail: string;
  buyerFirstname: string;
  buyerLastname: string;
  ipAddress: string;
  marketingOptin: boolean;
  tangiblesToshIp: number;
  customer: CustomerSummary;
  lineItems: PurchaseLineItem[];
  customFields: PurchaseCustomField[];
  coupons: PurchaseCoupon[];
  createdAt: number;
  updatedAt: number;
}

export interface Subscription {
  subscriptionId: number;
  status: string;
  price: string;
  period: number;
  unit: string;
  taxAmount: string;
  trialTaxAmount: string;
  trialPrice: string;
  trialPeriod: number;
  trialUnit: string;
  createdAt: number;
  updatedAt: number;
  startedAt: number;
  endedAt: number | null;
  trialStartedAt: number | null;
  lastPaymentAt: number;
  nextPaymentAt: number;
}

export interface Subscriber {
  subscriberId: number;
  username: string;
  subscription: Subscription;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number | null;
}

export interface PurchaseListParams {
  status?: string;
  productId?: number;
  storefrontId?: number;
  customerId?: number;
  subscriberId?: number;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  dateMin?: string;
  dateMax?: string;
  total?: string;
  totalOp?: string;
  ship?: boolean;
  page?: number;
}

export interface CustomerListParams {
  email?: string;
  firstName?: string;
  lastName?: string;
  productId?: number;
  receivesNewsletters?: boolean;
  dateMin?: string;
  dateMax?: string;
  page?: number;
}

let mapStorefront = (raw: any): Storefront => ({
  storefrontId: raw.id,
  name: raw.name ?? '',
  url: raw.url ?? '',
  contactName: raw.contact_name ?? '',
  contactEmail: raw.contact_email ?? '',
  currency: raw.currency ?? '',
  storefrontType: raw.type ?? '',
  subdomain: raw.subdomain ?? '',
  createdAt: raw.created_at ?? 0,
  updatedAt: raw.updated_at ?? 0
});

let mapProductPrice = (raw: any): ProductPrice => ({
  priceId: raw.id,
  name: raw.name ?? '',
  price: raw.price ?? '0'
});

let mapProduct = (raw: any): Product => ({
  productId: raw.id,
  storefrontId: raw.storefront_id ?? 0,
  name: raw.name ?? '',
  description: raw.description ?? '',
  longDescription: raw.long_description ?? '',
  price: raw.price ?? '0',
  sku: raw.sku ?? '',
  weight: raw.weight ?? '0',
  visibility: raw.visibility ?? 0,
  imageFileName: raw.image_file_name ?? '',
  mimeType: raw.mime_type ?? '',
  fileSize: raw.file_size ?? 0,
  fileName: raw.file_name ?? '',
  prices: Array.isArray(raw.prices) ? raw.prices.map(mapProductPrice) : [],
  createdAt: raw.created_at ?? 0,
  updatedAt: raw.updated_at ?? 0,
  imageUpdatedAt: raw.image_updated_at ?? 0
});

let mapCustomerSummary = (raw: any): CustomerSummary => ({
  customerId: raw.id,
  firstname: raw.firstname ?? raw.first_name ?? '',
  lastname: raw.lastname ?? raw.last_name ?? '',
  email: raw.email ?? ''
});

let mapCustomer = (raw: any): Customer => ({
  customerId: raw.id,
  firstname: raw.firstname ?? '',
  lastname: raw.lastname ?? '',
  email: raw.email ?? '',
  receivesEmail: raw.receives_email ?? false,
  createdAt: raw.created_at ?? 0,
  updatedAt: raw.updated_at ?? 0
});

let mapLineItem = (raw: any): PurchaseLineItem => ({
  productId: raw.product_id ?? 0,
  productName: raw.product_name ?? raw.name ?? '',
  price: raw.price ?? '0',
  quantity: raw.quantity ?? 0,
  downloadLimit: raw.download_limit ?? 0,
  downloadCount: raw.download_count ?? 0,
  expiresAt: raw.expires_at ?? null,
  productKeys: Array.isArray(raw.product_keys) ? raw.product_keys : []
});

let mapCustomField = (raw: any): PurchaseCustomField => ({
  label: raw.label ?? '',
  response: raw.response ?? ''
});

let mapCoupon = (raw: any): PurchaseCoupon => ({
  name: raw.name ?? '',
  code: raw.code ?? '',
  discountAmount: raw.discount_amount ?? '0',
  discountType: raw.discount_type ?? ''
});

let mapPurchase = (raw: any): Purchase => ({
  purchaseId: raw.id,
  status: raw.status ?? '',
  currency: raw.currency ?? '',
  subtotal: raw.subtotal ?? '0',
  discount: raw.discount ?? '0',
  tax: raw.tax ?? '0',
  shipping: raw.shipping ?? '0',
  total: raw.total ?? '0',
  processorFee: raw.processor_fee ?? '0',
  buyerEmail: raw.buyer_email ?? '',
  buyerFirstname: raw.buyer_firstname ?? '',
  buyerLastname: raw.buyer_lastname ?? '',
  ipAddress: raw.ip_address ?? '',
  marketingOptin: raw.marketing_optin ?? false,
  tangiblesToshIp: raw.tangibles_to_ship ?? 0,
  customer: raw.customer
    ? mapCustomerSummary(raw.customer)
    : { customerId: 0, firstname: '', lastname: '', email: '' },
  lineItems: Array.isArray(raw.line_items) ? raw.line_items.map(mapLineItem) : [],
  customFields: Array.isArray(raw.custom_fields) ? raw.custom_fields.map(mapCustomField) : [],
  coupons: Array.isArray(raw.coupons) ? raw.coupons.map(mapCoupon) : [],
  createdAt: raw.created_at ?? 0,
  updatedAt: raw.updated_at ?? 0
});

let mapSubscription = (raw: any): Subscription => ({
  subscriptionId: raw.id,
  status: raw.status ?? '',
  price: raw.price ?? '0',
  period: raw.period ?? 0,
  unit: raw.unit ?? '',
  taxAmount: raw.tax_amount ?? '0',
  trialTaxAmount: raw.trial_tax_amount ?? '0',
  trialPrice: raw.trial_price ?? '0',
  trialPeriod: raw.trial_period ?? 0,
  trialUnit: raw.trial_unit ?? '',
  createdAt: raw.created_at ?? 0,
  updatedAt: raw.updated_at ?? 0,
  startedAt: raw.started_at ?? 0,
  endedAt: raw.ended_at ?? null,
  trialStartedAt: raw.trial_started_at ?? null,
  lastPaymentAt: raw.last_payment_at ?? 0,
  nextPaymentAt: raw.next_payment_at ?? 0
});

let mapSubscriber = (raw: any): Subscriber => ({
  subscriberId: raw.id,
  username: raw.username ?? '',
  subscription: raw.subscription
    ? mapSubscription(raw.subscription)
    : {
        subscriptionId: 0,
        status: '',
        price: '0',
        period: 0,
        unit: '',
        taxAmount: '0',
        trialTaxAmount: '0',
        trialPrice: '0',
        trialPeriod: 0,
        trialUnit: '',
        createdAt: 0,
        updatedAt: 0,
        startedAt: 0,
        endedAt: null,
        trialStartedAt: null,
        lastPaymentAt: 0,
        nextPaymentAt: 0
      },
  createdAt: raw.created_at ?? 0,
  updatedAt: raw.updated_at ?? 0,
  lastLoginAt: raw.last_login_at ?? null
});

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.axios = createAxios({
      baseURL: 'https://api.getdpd.com/v2/',
      auth: {
        username: config.username,
        password: config.token
      }
    });
  }

  async ping(): Promise<{ status: string }> {
    let response = await this.axios.get('/');
    return response.data;
  }

  // Storefronts

  async listStorefronts(): Promise<Storefront[]> {
    let response = await this.axios.get('/storefronts');
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map(mapStorefront);
  }

  async getStorefront(storefrontId: number): Promise<Storefront> {
    let response = await this.axios.get(`/storefronts/${storefrontId}`);
    return mapStorefront(response.data);
  }

  // Products

  async listProducts(
    storefrontId?: number
  ): Promise<Array<{ productId: number; name: string }>> {
    let params: any = {};
    if (storefrontId) params.storefront_id = storefrontId;
    let response = await this.axios.get('/products', { params });
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map((p: any) => ({ productId: p.id, name: p.name ?? '' }));
  }

  async getProduct(productId: number): Promise<Product> {
    let response = await this.axios.get(`/products/${productId}`);
    return mapProduct(response.data);
  }

  // Purchases

  async listPurchases(
    params: PurchaseListParams = {}
  ): Promise<Array<{ purchaseId: number; status: string }>> {
    let queryParams: any = {};
    if (params.status) queryParams.status = params.status;
    if (params.productId) queryParams.product_id = params.productId;
    if (params.storefrontId) queryParams.storefront_id = params.storefrontId;
    if (params.customerId) queryParams.customer_id = params.customerId;
    if (params.subscriberId) queryParams.subscriber_id = params.subscriberId;
    if (params.customerEmail) queryParams.customer_email = params.customerEmail;
    if (params.customerFirstName) queryParams.customer_first_name = params.customerFirstName;
    if (params.customerLastName) queryParams.customer_last_name = params.customerLastName;
    if (params.dateMin) queryParams.date_min = params.dateMin;
    if (params.dateMax) queryParams.date_max = params.dateMax;
    if (params.total) queryParams.total = params.total;
    if (params.totalOp) queryParams.total_op = params.totalOp;
    if (params.ship !== undefined) queryParams.ship = params.ship;
    if (params.page) queryParams.page = params.page;

    let response = await this.axios.get('/purchases', { params: queryParams });
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map((p: any) => ({ purchaseId: p.id, status: p.status ?? '' }));
  }

  async getPurchase(purchaseId: number): Promise<Purchase> {
    let response = await this.axios.get(`/purchases/${purchaseId}`);
    return mapPurchase(response.data);
  }

  async reactivatePurchase(
    purchaseId: number,
    customerEmail?: string,
    refulfill?: boolean
  ): Promise<{ status: string }> {
    let params: any = {};
    if (customerEmail) params.customer_email = customerEmail;
    if (refulfill !== undefined) params.refulfill = refulfill;
    let response = await this.axios.post(`/purchases/${purchaseId}/reactivate`, params);
    return { status: response.data?.status ?? 'OK' };
  }

  // Customers

  async listCustomers(
    params: CustomerListParams = {}
  ): Promise<Array<{ customerId: number; status: string }>> {
    let queryParams: any = {};
    if (params.email) queryParams.email = params.email;
    if (params.firstName) queryParams.first_name = params.firstName;
    if (params.lastName) queryParams.last_name = params.lastName;
    if (params.productId) queryParams.product_id = params.productId;
    if (params.receivesNewsletters !== undefined)
      queryParams.receives_newsletters = params.receivesNewsletters;
    if (params.dateMin) queryParams.date_min = params.dateMin;
    if (params.dateMax) queryParams.date_max = params.dateMax;
    if (params.page) queryParams.page = params.page;

    let response = await this.axios.get('/customers', { params: queryParams });
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map((c: any) => ({ customerId: c.id, status: c.status ?? '' }));
  }

  async getCustomer(customerId: number): Promise<Customer> {
    let response = await this.axios.get(`/customers/${customerId}`);
    return mapCustomer(response.data);
  }

  // Subscribers

  async listSubscribers(
    storefrontId: number,
    username?: string
  ): Promise<Array<{ subscriberId: number; username: string }>> {
    let params: any = {};
    if (username) params.username = username;
    let response = await this.axios.get(`/storefronts/${storefrontId}/subscribers`, {
      params
    });
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map((s: any) => ({ subscriberId: s.id, username: s.username ?? '' }));
  }

  async getSubscriber(storefrontId: number, subscriberId: number): Promise<Subscriber> {
    let response = await this.axios.get(
      `/storefronts/${storefrontId}/subscribers/${subscriberId}`
    );
    return mapSubscriber(response.data);
  }

  async verifySubscriber(
    storefrontId: number,
    params: { username?: string; subscriberId?: number }
  ): Promise<{ status: string }> {
    let queryParams: any = {};
    if (params.username) queryParams.username = params.username;
    if (params.subscriberId) queryParams.id = params.subscriberId;
    let response = await this.axios.get(`/storefronts/${storefrontId}/subscribers/verify`, {
      params: queryParams
    });
    return {
      status: typeof response.data === 'string' ? response.data : (response.data?.status ?? '')
    };
  }

  // Notification Verification

  async verifyNotification(
    notificationParams: Record<string, any>
  ): Promise<{ verified: boolean; result: string }> {
    let response = await this.axios.post('/notification/verify', notificationParams);
    let result =
      typeof response.data === 'string' ? response.data.trim() : String(response.data);
    return {
      verified: result === 'VERIFIED',
      result
    };
  }
}
