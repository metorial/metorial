import { createAxios, isApiErrorRecord, pickDefined } from 'slates';
import { z } from 'zod';
import {
  guardCredentialReflection,
  id,
  invalid,
  nonempty,
  pageNumber,
  upstream
} from './helpers';
import {
  customerSchema,
  customerSummarySchema,
  productSchema,
  purchaseSchema,
  storefrontSchema,
  subscriberSchema,
  subscriptionSchema
} from './schemas';

export interface ClientConfig {
  username: string;
  token: string;
}
export type PurchaseListParams = {
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
};
export type CustomerListParams = {
  email?: string;
  firstName?: string;
  lastName?: string;
  productId?: number;
  receivesNewsletters?: boolean;
  dateMin?: string;
  dateMax?: string;
  page?: number;
};
export type Page<T> = { items: T[]; page: number; nextPage?: number; endOfResults: boolean };
type Row = Record<string, unknown>;
type Decoder = (value: unknown) => unknown;
type Fields = Record<string, string | [string, Decoder]>;
const text: Decoder = value => {
  if (typeof value !== 'string')
    throw invalid('DPD returned a non-string field. Contact DPD support.');
  return value;
};
const number: Decoder = value => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw invalid('DPD returned an invalid or unsafe integer. Contact DPD support.');
  return value;
};
const identifier: Decoder = value => id(number(value) as number);
const boolean: Decoder = value => {
  if (typeof value !== 'boolean')
    throw invalid('DPD returned an invalid boolean. Contact DPD support.');
  return value;
};
const decimal: Decoder = value => {
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value))
    throw invalid(
      'DPD must return money as an exact decimal string. Numeric amounts cannot preserve decimal precision.'
    );
  return value;
};
const nullableNumber: Decoder = value => (value === null ? null : number(value));
const stringWeight: Decoder = value =>
  typeof value === 'string' ? decimal(value) : String(number(value));
const array =
  (decode: Decoder): Decoder =>
  value => {
    if (!Array.isArray(value))
      throw invalid('DPD returned an invalid nested list. Contact DPD support.');
    return value.map(decode);
  };
const strings = array(text);
function row(value: unknown): Row {
  if (!isApiErrorRecord(value))
    throw invalid('DPD returned an invalid resource object. Contact DPD support.');
  return value;
}
function mapped<S extends z.ZodType>(raw: unknown, schema: S, fields: Fields): z.infer<S> {
  const data = row(raw),
    result: Row = {};
  for (const [target, entry] of Object.entries(fields)) {
    const [source, decode] = typeof entry === 'string' ? [entry, text] : entry;
    if (data[source] !== undefined && (data[source] !== null || decode === nullableNumber))
      result[target] = decode(data[source]);
  }
  const parsed = schema.safeParse(result);
  if (!parsed.success)
    throw invalid(
      'DPD returned an incomplete or invalid resource. Required IDs must be present; contact DPD support.'
    );
  return parsed.data;
}
const mapStorefront = (raw: unknown) =>
  mapped(raw, storefrontSchema, {
    storefrontId: ['id', identifier],
    name: 'name',
    url: 'url',
    contactName: 'contact_name',
    contactEmail: 'contact_email',
    currency: 'currency',
    storefrontType: 'type',
    subdomain: 'subdomain',
    createdAt: ['created_at', number],
    updatedAt: ['updated_at', number]
  });
const mapPrice = (raw: unknown) =>
  mapped(raw, productSchema.shape.prices.unwrap().element, {
    priceId: ['id', identifier],
    name: 'name',
    price: ['price', decimal]
  });
const mapProduct = (raw: unknown) =>
  mapped(raw, productSchema, {
    productId: ['id', identifier],
    storefrontId: ['storefront_id', identifier],
    name: 'name',
    description: 'description',
    longDescription: 'long_description',
    price: ['price', decimal],
    sku: 'sku',
    weight: ['weight', stringWeight],
    visibility: ['visibility', number],
    imageFileName: 'image_file_name',
    mimeType: 'mime_type',
    fileSize: ['file_size', number],
    fileName: 'file_name',
    prices: ['prices', array(mapPrice)],
    createdAt: ['created_at', number],
    updatedAt: ['updated_at', number],
    imageUpdatedAt: ['image_updated_at', number]
  });
const mapCustomerSummary = (raw: unknown) =>
  mapped(raw, customerSummarySchema, {
    customerId: ['id', identifier],
    firstname: 'firstname',
    lastname: 'lastname',
    email: 'email'
  });
const mapCustomer = (raw: unknown) =>
  mapped(raw, customerSchema, {
    customerId: ['id', identifier],
    firstname: 'firstname',
    lastname: 'lastname',
    email: 'email',
    receivesEmail: ['receives_email', boolean],
    createdAt: ['created_at', number],
    updatedAt: ['updated_at', number]
  });
const mapLine = (raw: unknown) =>
  mapped(raw, purchaseSchema.shape.lineItems.unwrap().element, {
    lineItemId: ['id', identifier],
    purchaseId: ['purchase_id', identifier],
    productId: ['product_id', identifier],
    productName: 'product_name',
    price: ['price', decimal],
    quantity: ['quantity', number],
    downloadLimit: ['download_limit', number],
    downloadCount: ['download_count', number],
    expiresAt: ['expires_at', nullableNumber],
    productKeys: ['product_keys', strings]
  });
const mapCustom = (raw: unknown) =>
  mapped(raw, purchaseSchema.shape.customFields.unwrap().element, {
    label: 'label',
    response: 'response'
  });
const mapCoupon = (raw: unknown) =>
  mapped(raw, purchaseSchema.shape.coupons.unwrap().element, {
    name: 'name',
    code: 'code',
    discountAmount: ['discount_amount', decimal],
    discountType: 'discount_type'
  });
const mapPurchase = (raw: unknown) => {
  const purchase = mapped(raw, purchaseSchema, {
    purchaseId: ['id', identifier],
    storefrontId: ['storefront_id', identifier],
    status: 'status',
    currency: 'currency',
    subtotal: ['subtotal', decimal],
    discount: ['discount', decimal],
    tax: ['tax', decimal],
    shipping: ['shipping', decimal],
    total: ['total', decimal],
    processorFee: ['processor_fee', decimal],
    buyerEmail: 'buyer_email',
    buyerFirstname: 'buyer_firstname',
    buyerLastname: 'buyer_lastname',
    ipAddress: 'ip_address',
    marketingOptin: ['marketing_optin', boolean],
    tangiblesToshIp: ['tangibles_to_ship', number],
    tangiblesToShip: ['tangibles_to_ship', nullableNumber],
    customer: ['customer', mapCustomerSummary],
    lineItems: ['line_items', array(mapLine)],
    customFields: ['custom_fields', array(mapCustom)],
    coupons: ['coupons', array(mapCoupon)],
    createdAt: ['created_at', number],
    updatedAt: ['updated_at', number]
  });
  for (const line of purchase.lineItems ?? [])
    if (line.purchaseId !== undefined && line.purchaseId !== purchase.purchaseId)
      throw invalid(
        'DPD returned a line item belonging to another purchase. No exact purchase contents can be confirmed.'
      );
  return purchase;
};
const mapSubscription = (raw: unknown) =>
  mapped(raw, subscriptionSchema, {
    subscriptionId: ['id', identifier],
    status: 'status',
    price: ['price', decimal],
    period: ['period', number],
    unit: 'unit',
    taxAmount: ['tax_amount', decimal],
    trialTaxAmount: ['trial_tax_amount', decimal],
    trialPrice: ['trial_price', decimal],
    trialPeriod: ['trial_period', number],
    trialUnit: 'trial_unit',
    createdAt: ['created_at', number],
    updatedAt: ['updated_at', number],
    startedAt: ['started_at', number],
    endedAt: ['ended_at', nullableNumber],
    trialStartedAt: ['trial_started_at', nullableNumber],
    lastPaymentAt: ['last_payment_at', number],
    nextPaymentAt: ['next_payment_at', number]
  });
const mapSubscriber = (raw: unknown) =>
  mapped(raw, subscriberSchema, {
    subscriberId: ['id', identifier],
    username: 'username',
    subscription: ['subscription', mapSubscription],
    createdAt: ['created_at', number],
    updatedAt: ['updated_at', number],
    lastLoginAt: ['last_login_at', nullableNumber]
  });

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private username: string;
  private token: string;
  constructor(config: ClientConfig) {
    this.username = nonempty(config.username, 'DPD username');
    if (this.username.includes(':'))
      throw invalid('DPD Basic Auth usernames cannot contain a colon.');
    this.token = nonempty(config.token, 'DPD API password');
    this.axios = createAxios({
      baseURL: 'https://api.getdpd.com/v2/',
      auth: { username: this.username, password: this.token },
      timeout: 30_000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      headers: { Accept: 'application/json' }
    });
  }
  private async request(
    method: 'get' | 'post',
    path: string,
    params: Record<string, string> = {},
    data?: string,
    collection = false
  ): Promise<unknown> {
    let response: { data: unknown; status: number };
    try {
      response = await this.axios.request({
        method,
        url: path,
        params,
        data,
        ...(method === 'post'
          ? { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          : {}),
        validateStatus: status => status === 200 || (collection && status === 404)
      });
    } catch (error) {
      throw upstream(
        error,
        method === 'post' ? 'verification or reactivation' : 'read',
        false
      );
    }
    guardCredentialReflection(response.data, this.username, this.token);
    if (
      response.status !== 200 &&
      !(
        collection &&
        response.status === 404 &&
        isApiErrorRecord(response.data) &&
        response.data.status === 'NOTFOUND'
      )
    )
      throw upstream({ response: { status: response.status } }, 'read', false);
    return response.data;
  }
  private params(input: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(pickDefined(input)).map(([key, value]) => {
        let result: string;
        if (typeof value === 'boolean') result = value ? '1' : '0';
        else if (typeof value === 'number') result = String(id(value, key));
        else if (typeof value === 'string') {
          if ([...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))
            throw invalid('DPD query values cannot contain control characters.');
          result = value;
        } else throw invalid('DPD query parameters must be strings, booleans or exact IDs.');
        if (result.length > 8000) throw invalid('A DPD query is too long.');
        guardCredentialReflection(result, this.username, this.token);
        return [key, result];
      })
    );
  }
  private async list<T>(
    path: string,
    query: Record<string, string>,
    page: number | undefined,
    decode: (raw: unknown) => T
  ): Promise<Page<T>> {
    const current = pageNumber(page),
      data = await this.request(
        'get',
        path,
        { ...query, page: String(current) },
        undefined,
        true
      );
    if (isApiErrorRecord(data) && data.status === 'NOTFOUND')
      return { items: [], page: current, endOfResults: true };
    if (!Array.isArray(data))
      throw invalid(
        'DPD returned an invalid collection. Expected records or the documented NOTFOUND sentinel.'
      );
    if (data.length > 100)
      throw invalid('DPD exceeded its documented page limit. Contact DPD support.');
    return {
      items: data.map(decode),
      page: current,
      nextPage: current + 1,
      endOfResults: false
    };
  }
  private async get<T extends Record<string, unknown>>(
    path: string,
    expectedId: number,
    field: keyof T,
    decode: (raw: unknown) => T
  ): Promise<T> {
    const data = decode(await this.request('get', path));
    if (data[field] !== expectedId)
      throw invalid(
        'DPD returned a different resource ID. No exact resource can be confirmed.'
      );
    return data;
  }
  async ping(): Promise<{ status: 'SUCCESS' }> {
    const data = await this.request('get', '/');
    if (!isApiErrorRecord(data) || data.status !== 'SUCCESS')
      throw invalid(
        'DPD did not confirm a successful authenticated API response. Reconnect and check API availability.'
      );
    return { status: 'SUCCESS' };
  }
  listStorefronts(page?: number) {
    return this.list('/storefronts', {}, page, mapStorefront);
  }
  getStorefront(storefrontId: number) {
    const value = id(storefrontId);
    return this.get(`/storefronts/${value}`, value, 'storefrontId', mapStorefront);
  }
  listProducts(storefrontId?: number, page?: number) {
    return this.list('/products', this.params({ storefront_id: storefrontId }), page, raw =>
      mapped(raw, z.object({ productId: z.number(), name: z.string().optional() }), {
        productId: ['id', identifier],
        name: 'name'
      })
    );
  }
  getProduct(productId: number) {
    const value = id(productId);
    return this.get(`/products/${value}`, value, 'productId', mapProduct);
  }
  listPurchases(params: PurchaseListParams = {}) {
    if (params.total !== undefined) decimal(params.total);
    if (
      params.totalOp !== undefined &&
      (params.total === undefined || !['eq', 'ne', 'gt', 'lt'].includes(params.totalOp))
    )
      throw invalid('Provide total with a documented totalOp: eq, ne, gt or lt.');
    if (
      params.status !== undefined &&
      !['ACT', 'PND', 'RFD', 'ERR', 'CAN', 'HLD'].includes(params.status)
    )
      throw invalid('Use a documented DPD purchase status code.');
    return this.list(
      '/purchases',
      this.params({
        status: params.status,
        product_id: params.productId,
        storefront_id: params.storefrontId,
        customer_id: params.customerId,
        subscriber_id: params.subscriberId,
        customer_email: params.customerEmail,
        customer_first_name: params.customerFirstName,
        customer_last_name: params.customerLastName,
        date_min: params.dateMin,
        date_max: params.dateMax,
        total: params.total,
        total_op: params.totalOp,
        ship: params.ship
      }),
      params.page,
      raw =>
        mapped(raw, z.object({ purchaseId: z.number(), status: z.string().optional() }), {
          purchaseId: ['id', identifier],
          status: 'status'
        })
    );
  }
  getPurchase(purchaseId: number) {
    const value = id(purchaseId);
    return this.get(`/purchases/${value}`, value, 'purchaseId', mapPurchase);
  }
  listCustomers(params: CustomerListParams = {}) {
    return this.list(
      '/customers',
      this.params({
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        product_id: params.productId,
        receives_newsletters: params.receivesNewsletters,
        date_min: params.dateMin,
        date_max: params.dateMax
      }),
      params.page,
      raw =>
        mapped(raw, z.object({ customerId: z.number(), status: z.string().optional() }), {
          customerId: ['id', identifier],
          status: 'status'
        })
    );
  }
  getCustomer(customerId: number) {
    const value = id(customerId);
    return this.get(`/customers/${value}`, value, 'customerId', mapCustomer);
  }
  listSubscribers(storefrontId: number, username?: string, page?: number) {
    return this.list(
      `/storefronts/${id(storefrontId)}/subscribers`,
      this.params({ username }),
      page,
      raw =>
        mapped(raw, z.object({ subscriberId: z.number(), username: z.string().optional() }), {
          subscriberId: ['id', identifier],
          username: 'username'
        })
    );
  }
  getSubscriber(storefrontId: number, subscriberId: number) {
    const store = id(storefrontId),
      value = id(subscriberId);
    return this.get(
      `/storefronts/${store}/subscribers/${value}`,
      value,
      'subscriberId',
      mapSubscriber
    );
  }
  async verifySubscriber(
    storefrontId: number,
    params: { username?: string; subscriberId?: number }
  ): Promise<{ status: string }> {
    const store = id(storefrontId);
    if ((params.username === undefined) === (params.subscriberId === undefined))
      throw invalid(
        'Provide exactly one subscriberUsername or subscriberId. Use list_subscribers for discovery.'
      );
    if (params.username !== undefined) nonempty(params.username, 'Subscriber username');
    const data = await this.request(
      'get',
      `/storefronts/${store}/subscribers/verify`,
      this.params({ username: params.username, id: params.subscriberId })
    );
    const status =
      typeof data === 'string'
        ? data.trim()
        : isApiErrorRecord(data)
          ? data.status
          : undefined;
    if (
      typeof status !== 'string' ||
      !['NEW', 'TRIAL', 'ACTIVE', 'CANCELED', 'CLOSED', 'PAST_DUE'].includes(status)
    )
      throw invalid(
        'DPD returned an invalid subscription status. Check the exact subscriber and storefront.'
      );
    return { status };
  }
  async verifyNotification(
    notificationParams: Record<string, unknown>
  ): Promise<{ verified: boolean; result: string }> {
    if (!Object.keys(notificationParams).length)
      throw invalid(
        'Pass every original DPD notification form parameter, including its verification signature.'
      );
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(notificationParams)) {
      if (!key || typeof value !== 'string')
        throw invalid(
          'Notification parameters must preserve original decoded form names and string values; do not convert amounts or signatures.'
        );
      guardCredentialReflection({ [key]: value }, this.username, this.token);
      body.append(key, value);
    }
    if (Buffer.byteLength(body.toString()) > 1024 * 1024)
      throw invalid(
        'The notification form is too large. Pass only the original DPD notification parameters.'
      );
    const data = await this.request('post', '/notification/verify', {}, body.toString());
    const result = typeof data === 'string' ? data.trim() : undefined;
    if (result !== 'VERIFIED' && result !== 'INVALID')
      throw invalid(
        'DPD returned an invalid verification response. Do not treat this notification as authenticated.'
      );
    return { verified: result === 'VERIFIED', result };
  }
  async reactivatePurchase(purchaseId: number, customerEmail?: string, refulfill?: boolean) {
    const value = id(purchaseId);
    if (
      customerEmail !== undefined &&
      customerEmail !== '' &&
      !z.email().safeParse(customerEmail).success
    )
      throw invalid(
        'Provide a valid reactivation email or omit it to use the original purchase email.'
      );
    if (refulfill !== undefined && typeof refulfill !== 'boolean')
      throw invalid('refulfill must be a boolean.');
    guardCredentialReflection(customerEmail, this.username, this.token);
    const before = await this.getPurchase(value);
    if (!['ACT', 'PND', 'RFD', 'ERR', 'CAN', 'HLD'].includes(before.status ?? ''))
      throw invalid(
        'DPD did not return a documented purchase state. No reactivation was submitted; inspect the purchase before retrying.'
      );
    const body = new URLSearchParams();
    if (customerEmail !== undefined) body.set('customer_email', customerEmail);
    if (refulfill !== undefined) body.set('refulfill', refulfill ? '1' : '0');
    try {
      const response = await this.request(
        'post',
        `/purchases/${value}/reactivate`,
        {},
        body.toString()
      );
      if (!isApiErrorRecord(response) || response.status !== 'OK')
        throw invalid(
          'DPD did not acknowledge reactivation. The purchase may have changed; inspect it before retrying.'
        );
      const purchase = await this.getPurchase(value);
      if (
        !['ACT', 'PND', 'RFD', 'ERR', 'CAN', 'HLD'].includes(purchase.status ?? '') ||
        (before.storefrontId !== undefined && purchase.storefrontId !== before.storefrontId) ||
        (before.buyerEmail !== undefined && purchase.buyerEmail !== before.buyerEmail)
      )
        throw invalid(
          'DPD acknowledged reactivation, but the purchase state or original ownership could not be confirmed. Reconcile the exact purchase before retrying.'
        );
      return {
        status: 'OK',
        purchaseId: value,
        purchaseStatus: purchase.status,
        readbackConfirmed: true,
        refulfillRequested: refulfill === true,
        deliveryVerified: false
      };
    } catch (error) {
      const failure = upstream(error, 'reactivation confirmation');
      failure.data.purchaseId = value;
      failure.data.reactivationMayHaveOccurred = true;
      failure.data.emailOrFulfillmentMayHaveOccurred = true;
      throw failure;
    }
  }
}
