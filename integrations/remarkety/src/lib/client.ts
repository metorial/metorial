import { createAxios } from 'slates';

let webhookAxios = createAxios({
  baseURL: 'https://webhooks.remarkety.com'
});

let appAxios = createAxios({
  baseURL: 'https://app.remarkety.com'
});

export class RemarketyClient {
  private storeId: string;
  private token: string;
  private storeDomain?: string;
  private platform?: string;

  constructor(config: {
    token: string;
    storeId: string;
    storeDomain?: string;
    platform?: string;
  }) {
    this.token = config.token;
    this.storeId = config.storeId;
    this.storeDomain = config.storeDomain;
    this.platform = config.platform;
  }

  private getEventHeaders(eventType: string): Record<string, string> {
    let headers: Record<string, string> = {
      'x-api-key': this.token,
      'x-event-type': eventType,
      'Content-Type': 'application/json; charset=UTF-8'
    };
    if (this.storeDomain) {
      headers['x-domain'] = this.storeDomain;
    }
    if (this.platform) {
      headers['x-platform'] = this.platform;
    }
    return headers;
  }

  async sendEvent(
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await webhookAxios.post(
      `/webhooks/?storeId=${encodeURIComponent(this.storeId)}`,
      payload,
      {
        headers: this.getEventHeaders(eventType)
      }
    );
    return response.data as Record<string, unknown>;
  }

  async createOrUpdateCustomer(
    data: Record<string, unknown>,
    isCreate: boolean
  ): Promise<Record<string, unknown>> {
    let eventType = isCreate ? 'customers/create' : 'customers/update';
    return this.sendEvent(eventType, data);
  }

  async unsubscribeContact(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.sendEvent('newsletter/unsubscribe', data);
  }

  async subscribeNewsletter(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.sendEvent('newsletter/subscribe', data);
  }

  async createOrUpdateOrder(
    data: Record<string, unknown>,
    isCreate: boolean
  ): Promise<Record<string, unknown>> {
    let eventType = isCreate ? 'orders/create' : 'orders/update';
    return this.sendEvent(eventType, data);
  }

  async sendProductEvent(
    data: Record<string, unknown>,
    eventType: 'products/create' | 'products/update' | 'products/delete'
  ): Promise<Record<string, unknown>> {
    return this.sendEvent(eventType, data);
  }

  async createOrUpdateCart(
    data: Record<string, unknown>,
    isCreate: boolean
  ): Promise<Record<string, unknown>> {
    let eventType = isCreate ? 'carts/create' : 'carts/update';
    return this.sendEvent(eventType, data);
  }

  async sendCustomEvent(
    eventType: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return this.sendEvent(eventType, data);
  }

  async batchUploadContacts(
    contacts: Record<string, unknown>[],
    options: {
      updateExisting?: boolean;
      appendTags?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let response = await appAxios.post(
      `/api/v2/stores/${encodeURIComponent(this.storeId)}/contacts/batch`,
      {
        contacts,
        update_existing: options.updateExisting ?? true,
        append_tags: options.appendTags ?? true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Token': this.token
        }
      }
    );
    return response.data as Record<string, unknown>;
  }
}

export let toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
  let result: Record<string, unknown> = {};
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = toSnakeCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? toSnakeCase(item as Record<string, unknown>)
          : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
};

export let formatCustomerPayload = (
  data: Record<string, unknown>
): Record<string, unknown> => {
  let mapped: Record<string, unknown> = { ...data };

  if (mapped.customerId !== undefined) {
    mapped.id = mapped.customerId;
    mapped.customerId = undefined;
  }
  if (mapped.defaultAddress !== undefined) {
    mapped.default_address = toSnakeCase(mapped.defaultAddress as Record<string, unknown>);
    mapped.defaultAddress = undefined;
  }
  if (mapped.groups !== undefined) {
    mapped.groups = (mapped.groups as Record<string, unknown>[]).map(g => ({
      id: g.groupId,
      name: g.name
    }));
  }
  if (mapped.rewardPoints !== undefined) {
    mapped.rewards = { points: mapped.rewardPoints };
    mapped.rewardPoints = undefined;
  }

  return toSnakeCase(mapped);
};

export let formatOrderPayload = (data: Record<string, unknown>): Record<string, unknown> => {
  let mapped: Record<string, unknown> = { ...data };

  if (mapped.orderId !== undefined) {
    mapped.id = mapped.orderId;
    mapped.orderId = undefined;
  }
  if (mapped.customer !== undefined) {
    mapped.customer = formatCustomerPayload(mapped.customer as Record<string, unknown>);
  }
  if (mapped.lineItems !== undefined) {
    mapped.line_items = (mapped.lineItems as Record<string, unknown>[]).map(item => {
      let formatted: Record<string, unknown> = { ...item };
      if (formatted.productId !== undefined) {
        formatted.product_id = formatted.productId;
        formatted.productId = undefined;
      }
      if (formatted.variantId !== undefined) {
        formatted.variant_id = formatted.variantId;
        formatted.variantId = undefined;
      }
      return toSnakeCase(formatted);
    });
    mapped.lineItems = undefined;
  }
  if (mapped.discountCodes !== undefined) {
    mapped.discount_codes = mapped.discountCodes;
    mapped.discountCodes = undefined;
  }
  if (mapped.billingAddress !== undefined) {
    mapped.billing_address = toSnakeCase(mapped.billingAddress as Record<string, unknown>);
    mapped.billingAddress = undefined;
  }
  if (mapped.shippingAddress !== undefined) {
    mapped.shipping_address = toSnakeCase(mapped.shippingAddress as Record<string, unknown>);
    mapped.shippingAddress = undefined;
  }

  return toSnakeCase(mapped);
};

export let formatProductPayload = (data: Record<string, unknown>): Record<string, unknown> => {
  let mapped: Record<string, unknown> = { ...data };

  if (mapped.productId !== undefined) {
    mapped.id = mapped.productId;
    mapped.productId = undefined;
  }
  if (mapped.imageUrl !== undefined) {
    mapped.image = mapped.imageUrl;
    mapped.imageUrl = undefined;
  }
  if (mapped.variants !== undefined) {
    mapped.variants = (mapped.variants as Record<string, unknown>[]).map(v => {
      let formatted: Record<string, unknown> = { ...v };
      if (formatted.variantId !== undefined) {
        formatted.id = formatted.variantId;
        formatted.variantId = undefined;
      }
      if (formatted.imageUrl !== undefined) {
        formatted.image = formatted.imageUrl;
        formatted.imageUrl = undefined;
      }
      return toSnakeCase(formatted);
    });
  }

  return toSnakeCase(mapped);
};

export let formatCartPayload = (data: Record<string, unknown>): Record<string, unknown> => {
  let mapped: Record<string, unknown> = { ...data };

  if (mapped.cartId !== undefined) {
    mapped.id = mapped.cartId;
    mapped.cartId = undefined;
  }
  if (mapped.customer !== undefined) {
    mapped.customer = formatCustomerPayload(mapped.customer as Record<string, unknown>);
  }
  if (mapped.lineItems !== undefined) {
    mapped.line_items = (mapped.lineItems as Record<string, unknown>[]).map(item => {
      let formatted: Record<string, unknown> = { ...item };
      if (formatted.productId !== undefined) {
        formatted.product_id = formatted.productId;
        formatted.productId = undefined;
      }
      if (formatted.variantId !== undefined) {
        formatted.variant_id = formatted.variantId;
        formatted.variantId = undefined;
      }
      return toSnakeCase(formatted);
    });
    mapped.lineItems = undefined;
  }

  return toSnakeCase(mapped);
};

export let formatContactForBatch = (
  contact: Record<string, unknown>
): Record<string, unknown> => {
  let result: Record<string, unknown> = {};
  if (contact.email !== undefined) result.email = contact.email;
  if (contact.firstName !== undefined) result.firstName = contact.firstName;
  if (contact.lastName !== undefined) result.lastName = contact.lastName;
  if (contact.smsPhoneNumber !== undefined) result.sms_phone_number = contact.smsPhoneNumber;
  if (contact.smsCountryCode !== undefined) result.sms_country_code = contact.smsCountryCode;
  if (contact.acceptsMarketing !== undefined)
    result.accepts_marketing = contact.acceptsMarketing;
  if (contact.acceptsSmsMarketing !== undefined)
    result.accepts_sms_marketing = contact.acceptsSmsMarketing;
  if (contact.tags !== undefined) result.tags = contact.tags;
  if (contact.properties !== undefined) result.properties = contact.properties;
  return result;
};
