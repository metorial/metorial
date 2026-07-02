import { createAxios, pickDefined } from 'slates';
import { squarespaceApiError } from './errors';

let apiV1 = createAxios({
  baseURL: 'https://api.squarespace.com/1.0'
});

let apiCurrentV1 = createAxios({
  baseURL: 'https://api.squarespace.com/v1'
});

let apiV2 = createAxios({
  baseURL: 'https://api.squarespace.com/v2'
});

for (let api of [apiV1, apiCurrentV1, apiV2]) {
  api.interceptors?.response?.use(
    response => response,
    error => Promise.reject(squarespaceApiError(error))
  );
}

export interface PaginationResponse {
  hasNextPage: boolean;
  nextPageCursor?: string;
  nextPageUrl?: string;
}

export interface MoneyAmount {
  currency: string;
  value: string | number;
}

export interface ListOrdersParams {
  modifiedAfter?: string;
  modifiedBefore?: string;
  cursor?: string;
  fulfillmentStatus?: 'PENDING' | 'FULFILLED' | 'CANCELED';
  paymentStates?: string;
  customerId?: string;
}

export interface FulfillOrderParams {
  shouldSendNotification: boolean;
  shipments: Array<{
    shipDate: string;
    carrierName: string;
    service: string;
    trackingNumber: string;
    trackingUrl?: string;
  }>;
}

export interface CreateOrderParams {
  channelName: string;
  externalOrderReference: string;
  createdOn: string;
  grandTotal: MoneyAmount;
  lineItems: Array<{
    lineItemId?: string;
    lineItemType?: string;
    variantId?: string;
    sku?: string;
    productName?: string;
    title?: string;
    quantity: number;
    unitPricePaid: MoneyAmount;
    nonSaleUnitPrice?: MoneyAmount;
  }>;
  priceTaxInterpretation: 'EXCLUSIVE' | 'INCLUSIVE';
  customerEmail?: string;
  fulfillmentStatus?: 'PENDING' | 'FULFILLED' | 'CANCELED';
  fulfilledOn?: string;
  fulfillments?: FulfillOrderParams['shipments'];
  inventoryBehavior?: 'DEDUCT' | 'SKIP';
  shopperFulfillmentNotificationBehavior?: 'SEND' | 'SKIP';
  billingAddress?: Record<string, any>;
  shippingAddress?: Record<string, any>;
  subtotal?: MoneyAmount;
  shippingTotal?: MoneyAmount;
  discountTotal?: MoneyAmount;
  taxTotal?: MoneyAmount;
  shippingLines?: Record<string, any>[];
  discountLines?: Record<string, any>[];
}

export interface ListProductsParams {
  cursor?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  query?: string;
  type?: string;
  productTypes?: Array<'PHYSICAL' | 'SERVICE' | 'GIFT_CARD' | 'DIGITAL'>;
}

export interface CreateProductParams {
  type: 'PHYSICAL' | 'SERVICE' | 'GIFT_CARD' | 'DIGITAL';
  storePageId: string;
  name?: string;
  description?: string;
  urlSlug?: string;
  tags?: string[];
  isVisible?: boolean;
  variants?: Array<{
    sku: string;
    pricing: {
      basePrice: MoneyAmount;
    };
    attributes?: Record<string, string>;
    shippingMeasurements?: {
      weight?: { unit: string; value: number };
      dimensions?: { unit: string; length: number; width: number; height: number };
    };
  }>;
  pricing?: {
    basePrice: MoneyAmount;
  };
}

export interface UpdateProductParams {
  name?: string;
  description?: string;
  urlSlug?: string;
  tags?: string[];
  isVisible?: boolean;
  productAttributeNames?: string[];
  seoData?: {
    title?: string;
    description?: string;
  };
  pricing?: {
    basePrice?: MoneyAmount;
    onSale?: boolean;
    salePrice?: MoneyAmount;
  };
}

export interface ProductVariantParams {
  sku: string;
  pricing: {
    basePrice: MoneyAmount;
  };
  attributes?: Record<string, string>;
  shippingMeasurements?: Record<string, any>;
}

export interface UpdateProductVariantParams {
  sku?: string;
  pricing?: {
    basePrice?: MoneyAmount;
    onSale?: boolean;
    salePrice?: MoneyAmount;
  };
  attributes?: Record<string, string>;
  shippingMeasurements?: Record<string, any>;
}

export interface InventoryAdjustment {
  incrementOperations?: Array<{ variantId: string; quantity: number }>;
  decrementOperations?: Array<{ variantId: string; quantity: number }>;
  setFiniteOperations?: Array<{ variantId: string; quantity: number }>;
  setUnlimitedOperations?: string[];
}

export interface ListTransactionsParams {
  modifiedAfter?: string;
  modifiedBefore?: string;
  cursor?: string;
  orderId?: string;
}

export interface ListProfilesParams {
  cursor?: string;
  filter?: string;
  email?: string;
  sortField?: 'createdOn' | 'id' | 'email' | 'lastName';
  sortDirection?: 'asc' | 'dsc';
}

export interface ListContactsParams {
  cursor?: string;
  pageSize?: number;
  searchString?: string;
  sortField?: string;
  sortDirection?: 'ASCENDING' | 'DESCENDING';
}

export interface ContactEmailInput {
  email: string;
  acceptsMarketing?: boolean;
}

export interface ContactInput {
  firstName?: string;
  lastName?: string;
  locale?: string;
  primaryEmail?: ContactEmailInput;
}

export interface ContactAddressInput {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  countryCode: string;
  postalCode: string;
  phoneNumber?: string;
}

export interface AddressBookEntryInput {
  address: ContactAddressInput;
  defaultShipping?: boolean;
}

export interface WebhookSubscriptionParams {
  endpointUrl: string;
  topics: string[];
}

let present = <T>(value: T | undefined) =>
  value === undefined
    ? undefined
    : {
        present: true,
        value
      };

let buildPricingUpdate = (pricing?: UpdateProductParams['pricing']) => {
  if (!pricing) return undefined;

  let payload = pickDefined({
    basePrice: present(pricing.basePrice),
    onSale: present(pricing.onSale),
    salePrice: present(pricing.salePrice)
  });

  return Object.keys(payload).length > 0 ? payload : undefined;
};

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'User-Agent': 'Slates-Squarespace-Integration/1.0',
      'Content-Type': 'application/json'
    };
  }

  // ---- Site Info ----

  async getSiteInfo(): Promise<any> {
    let response = await apiV1.get('/authorization/website', {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Orders ----

  async listOrders(
    params: ListOrdersParams = {}
  ): Promise<{ result: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.modifiedAfter) queryParams.modifiedAfter = params.modifiedAfter;
    if (params.modifiedBefore) queryParams.modifiedBefore = params.modifiedBefore;
    if (params.fulfillmentStatus) queryParams.fulfillmentStatus = params.fulfillmentStatus;
    if (params.paymentStates) queryParams.paymentStates = params.paymentStates;
    if (params.customerId) queryParams.customerId = params.customerId;

    let response = await apiV1.get('/commerce/orders', {
      headers: this.headers,
      params: queryParams
    });

    return {
      result: response.data.result || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getOrder(orderId: string): Promise<any> {
    let response = await apiV1.get(`/commerce/orders/${orderId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createOrder(order: CreateOrderParams, idempotencyKey: string): Promise<any> {
    let response = await apiV1.post('/commerce/orders', order, {
      headers: {
        ...this.headers,
        'Idempotency-Key': idempotencyKey
      }
    });
    return response.data;
  }

  async fulfillOrder(orderId: string, fulfillment: FulfillOrderParams): Promise<void> {
    await apiV1.post(`/commerce/orders/${orderId}/fulfillments`, fulfillment, {
      headers: this.headers
    });
  }

  // ---- Products ----

  async listProducts(
    params: ListProductsParams = {}
  ): Promise<{ products: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string | string[]> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.modifiedAfter) queryParams.modifiedAfter = params.modifiedAfter;
    if (params.modifiedBefore) queryParams.modifiedBefore = params.modifiedBefore;
    if (params.query) queryParams.query = params.query;
    if (params.productTypes?.length) {
      queryParams.type = params.productTypes;
    } else if (params.type) {
      queryParams.type = params.type;
    }

    let response = await apiV2.get('/commerce/products', {
      headers: this.headers,
      params: queryParams
    });

    return {
      products: response.data.products || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getProducts(productIds: string[]): Promise<any[]> {
    let ids = productIds.join(',');
    let response = await apiV2.get(`/commerce/products/${ids}`, {
      headers: this.headers
    });
    return response.data.products || [response.data];
  }

  async createProduct(product: CreateProductParams): Promise<any> {
    let response = await apiV2.post('/commerce/products', product, {
      headers: this.headers
    });
    return response.data;
  }

  async updateProduct(productId: string, updates: UpdateProductParams): Promise<any> {
    let pricing = buildPricingUpdate(updates.pricing);
    let payload = pickDefined({
      name: present(updates.name),
      description: present(updates.description),
      urlSlug: present(updates.urlSlug),
      tags: present(updates.tags),
      isVisible: present(updates.isVisible),
      productAttributeNames: present(updates.productAttributeNames),
      seoData: present(updates.seoData),
      pricing: pricing ? present(pricing) : undefined
    });

    let response = await apiV2.post(`/commerce/products/${productId}`, payload, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await apiV2.delete(`/commerce/products/${productId}`, {
      headers: this.headers
    });
  }

  // ---- Product Variants ----

  async createVariant(productId: string, variant: ProductVariantParams): Promise<any> {
    let response = await apiV2.post(`/commerce/products/${productId}/variants`, variant, {
      headers: this.headers
    });
    return response.data;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    updates: UpdateProductVariantParams
  ): Promise<any> {
    let pricing = buildPricingUpdate(updates.pricing);
    let payload = pickDefined({
      sku: present(updates.sku),
      attributes: present(updates.attributes),
      shippingMeasurements: present(updates.shippingMeasurements),
      pricing: pricing ? present(pricing) : undefined
    });

    let response = await apiV2.post(
      `/commerce/products/${productId}/variants/${variantId}`,
      payload,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    await apiV2.delete(`/commerce/products/${productId}/variants/${variantId}`, {
      headers: this.headers
    });
  }

  // ---- Product Images ----

  async uploadProductImage(
    productId: string,
    imageUrl: string,
    fileName: string
  ): Promise<any> {
    let response = await apiV2.post(
      `/commerce/products/${productId}/images`,
      {
        url: imageUrl,
        fileName
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    await apiV2.delete(`/commerce/products/${productId}/images/${imageId}`, {
      headers: this.headers
    });
  }

  // ---- Store Pages ----

  async listStorePages(): Promise<any[]> {
    let response = await apiV2.get('/commerce/store_pages', {
      headers: this.headers
    });
    return response.data.storePages || [];
  }

  // ---- Inventory ----

  async listInventory(
    cursor?: string
  ): Promise<{ inventory: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (cursor) queryParams.cursor = cursor;

    let response = await apiV1.get('/commerce/inventory', {
      headers: this.headers,
      params: queryParams
    });

    return {
      inventory: response.data.inventory || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getInventory(variantIds: string[]): Promise<any[]> {
    let ids = variantIds.join(',');
    let response = await apiV1.get(`/commerce/inventory/${ids}`, {
      headers: this.headers
    });
    return response.data.inventory || [response.data];
  }

  async adjustInventory(
    adjustments: InventoryAdjustment,
    idempotencyKey: string
  ): Promise<void> {
    await apiV1.post('/commerce/inventory/adjustments', adjustments, {
      headers: {
        ...this.headers,
        'Idempotency-Key': idempotencyKey
      }
    });
  }

  // ---- Contacts ----

  async listContacts(
    params: ListContactsParams = {}
  ): Promise<{ contacts: any[]; pagination: PaginationResponse }> {
    let response = await apiCurrentV1.post('/contacts/query', pickDefined(params), {
      headers: this.headers
    });

    return {
      contacts: response.data.contacts || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getContact(contactId: string): Promise<any> {
    let response = await apiCurrentV1.get(`/contacts/${contactId}`, {
      headers: this.headers
    });
    return response.data.contact || response.data;
  }

  async createContact(contact: ContactInput): Promise<any> {
    let response = await apiCurrentV1.post('/contacts', contact, {
      headers: this.headers
    });
    return response.data.contact || response.data;
  }

  async updateContact(contactId: string, updates: ContactInput): Promise<any> {
    let response = await apiCurrentV1.patch(`/contacts/${contactId}`, pickDefined(updates), {
      headers: {
        ...this.headers,
        'Content-Type': 'application/merge-patch+json'
      }
    });
    return response.data.contact || response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await apiCurrentV1.delete(`/contacts/${contactId}`, {
      headers: this.headers
    });
  }

  async listContactAddresses(
    contactId: string,
    cursor?: string
  ): Promise<{ addressBook: any; pagination: PaginationResponse }> {
    let params = cursor ? { cursor } : {};
    let response = await apiCurrentV1.get(`/contacts/${contactId}/address-book`, {
      headers: this.headers,
      params
    });

    return {
      addressBook: response.data.addressBook || {},
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getContactAddress(contactId: string, addressBookEntryId: string): Promise<any> {
    let response = await apiCurrentV1.get(
      `/contacts/${contactId}/address-book/${addressBookEntryId}`,
      {
        headers: this.headers
      }
    );
    return response.data.addressBookEntry || response.data;
  }

  async createContactAddress(contactId: string, entry: AddressBookEntryInput): Promise<any> {
    let response = await apiCurrentV1.post(`/contacts/${contactId}/address-book`, entry, {
      headers: this.headers
    });
    return response.data.addressBookEntry || response.data;
  }

  async replaceContactAddress(
    contactId: string,
    addressBookEntryId: string,
    entry: AddressBookEntryInput
  ): Promise<any> {
    let response = await apiCurrentV1.put(
      `/contacts/${contactId}/address-book/${addressBookEntryId}`,
      entry,
      {
        headers: this.headers
      }
    );
    return response.data.addressBookEntry || response.data;
  }

  async deleteContactAddress(contactId: string, addressBookEntryId: string): Promise<void> {
    await apiCurrentV1.delete(`/contacts/${contactId}/address-book/${addressBookEntryId}`, {
      headers: this.headers
    });
  }

  async getContactTransactionSummaries(contactIds: string[]): Promise<any[]> {
    let response = await apiCurrentV1.post(
      '/analytics/transaction-summaries',
      {
        contactIds,
        groupBy: 'contactId'
      },
      {
        headers: this.headers
      }
    );
    return response.data.transactionsSummaryWrappers || [];
  }

  // ---- Profiles ----

  async listProfiles(
    params: ListProfilesParams = {}
  ): Promise<{ profiles: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.filter) queryParams.filter = params.filter;
    if (params.email) queryParams.email = params.email;
    if (params.sortField) queryParams.sortField = params.sortField;
    if (params.sortDirection) queryParams.sortDirection = params.sortDirection;

    let response = await apiV1.get('/profiles', {
      headers: this.headers,
      params: queryParams
    });

    return {
      profiles: response.data.profiles || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  async getProfile(profileId: string): Promise<any> {
    let response = await apiV1.get(`/profiles/${profileId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Transactions ----

  async listTransactions(
    params: ListTransactionsParams = {}
  ): Promise<{ documents: any[]; pagination: PaginationResponse }> {
    let queryParams: Record<string, string> = {};
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.modifiedAfter) queryParams.modifiedAfter = params.modifiedAfter;
    if (params.modifiedBefore) queryParams.modifiedBefore = params.modifiedBefore;
    if (params.orderId) queryParams.orderId = params.orderId;

    let response = await apiV1.get('/commerce/transactions', {
      headers: this.headers,
      params: queryParams
    });

    return {
      documents: response.data.documents || [],
      pagination: response.data.pagination || { hasNextPage: false }
    };
  }

  // ---- Webhooks ----

  async createWebhookSubscription(params: WebhookSubscriptionParams): Promise<any> {
    let response = await apiV1.post('/webhook_subscriptions', params, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await apiV1.delete(`/webhook_subscriptions/${subscriptionId}`, {
      headers: this.headers
    });
  }

  async listWebhookSubscriptions(): Promise<any[]> {
    let response = await apiV1.get('/webhook_subscriptions', {
      headers: this.headers
    });
    return response.data.webhookSubscriptions || [];
  }
}
