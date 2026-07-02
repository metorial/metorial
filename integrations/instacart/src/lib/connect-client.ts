import { createAuthenticatedAxios } from './client';

export interface FindStoresParams {
  fulfillmentType: 'delivery' | 'pickup' | 'last_mile';
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  postalCode?: string;
}

export interface Store {
  locationCode: string;
  name: string;
  address: string;
  phone: string;
  alcohol: boolean;
  pickupOnly: boolean;
}

export interface PreviewServiceOptionsParams {
  fulfillmentType: 'delivery' | 'pickup';
  postalCode: string;
  cartTotalCents?: number;
  itemsCount?: number;
  withEtaOptions?: boolean;
  withPriorityEtaOptions?: boolean;
}

export interface ServiceOption {
  serviceOptionId: string;
  serviceOptionReference: string;
  date: string;
  window: {
    startAt: string;
    endAt: string;
    type: string;
    asap: boolean;
  };
  available: boolean;
}

export interface CreateUserParams {
  userId: string;
  firstName: string;
  lastName?: string;
  phoneNumber?: string;
  locale?: string;
  addressLine1: string;
  addressLine2?: string;
  addressType?: string;
  postalCode: string;
  city?: string;
}

export interface OrderItem {
  lineNum: string;
  count: number;
  weight?: number;
  specialInstructions?: string;
  replacementPolicy?: 'no_replacements' | 'shoppers_choice' | 'users_choice';
  productCodes?: Array<{
    type: 'upc' | 'rrc';
    value: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface CreateDeliveryOrderParams {
  userId: string;
  orderId?: string;
  serviceOptionHoldId?: number;
  locationCode: string;
  initialTipCents?: number;
  leaveUnattended?: boolean;
  specialInstructions?: string;
  loyaltyNumber?: string;
  locale?: string;
  paidWithEbt?: boolean;
  items: OrderItem[];
  address?: {
    addressLine1: string;
    addressLine2?: string;
    addressType?: string;
    postalCode: string;
    city?: string;
  };
  user?: {
    birthday?: string;
    phoneNumber?: string;
    smsOptIn?: boolean;
  };
}

export interface CreatePickupOrderParams {
  userId: string;
  orderId?: string;
  serviceOptionHoldId?: number;
  locationCode: string;
  loyaltyNumber?: string;
  locale?: string;
  items: OrderItem[];
  user?: {
    birthday?: string;
    phoneNumber?: string;
    smsOptIn?: boolean;
  };
}

export interface Order {
  orderId: string;
  status: string;
  orderUrl?: string;
  createdAt?: string;
  cancellationReason?: string;
  locale?: string;
  isInstacartplus?: boolean;
  fulfillmentDetails?: {
    storeLocation?: string;
    windowStartsAt?: string;
    windowEndsAt?: string;
    deliveredAt?: string;
    bagCount?: number;
  };
  items?: Array<{
    lineNum: string;
    qty?: number;
    replaced?: boolean;
    refunded?: boolean;
    scanCode?: string;
  }>;
  warnings?: Array<{ message: string }>;
}

export interface ListServiceOptionsParams {
  userId: string;
  fulfillmentType: 'delivery' | 'pickup';
  locationCode: string;
  items?: Array<{
    lineNum: string;
    count: number;
    productCodes?: Array<{ type: string; value: string }>;
  }>;
  withEtaOptions?: boolean;
  withPriorityEtaOptions?: boolean;
}

export class ConnectClient {
  private token: string;
  private environment: string;

  constructor(config: { token: string; environment: string }) {
    this.token = config.token;
    this.environment = config.environment;
  }

  async findStores(params: FindStoresParams): Promise<Store[]> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let findBy: Record<string, unknown> = {};
    if (params.latitude !== undefined && params.longitude !== undefined) {
      findBy.latitude = params.latitude;
      findBy.longitude = params.longitude;
    }
    if (params.addressLine1) findBy.address_line_1 = params.addressLine1;
    if (params.postalCode) findBy.postal_code = params.postalCode;

    let path = `/v2/fulfillment/stores/${params.fulfillmentType}`;
    if (params.fulfillmentType === 'last_mile') {
      path = '/v2/fulfillment/stores/last_mile';
    }

    let response = await axios.post(path, { find_by: findBy });

    let stores = response.data.stores || [];
    return stores.map((s: Record<string, unknown>) => ({
      locationCode: (s.location_code || '') as string,
      name: (s.name || '') as string,
      address: (s.address || '') as string,
      phone: (s.phone || '') as string,
      alcohol: Boolean(s.alcohol),
      pickupOnly: Boolean(s.pickup_only)
    }));
  }

  async previewServiceOptions(params: PreviewServiceOptionsParams): Promise<ServiceOption[]> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let body: Record<string, unknown> = {
      postal_code: params.postalCode
    };
    if (params.cartTotalCents !== undefined) body.cart_total_cents = params.cartTotalCents;
    if (params.itemsCount !== undefined) body.items_count = params.itemsCount;
    if (params.withEtaOptions !== undefined) body.with_eta_options = params.withEtaOptions;
    if (params.withPriorityEtaOptions !== undefined)
      body.with_priority_eta_options = params.withPriorityEtaOptions;

    let path = `/v2/fulfillment/service_options/${params.fulfillmentType}`;
    let response = await axios.post(path, body);

    let options = response.data.service_options || [];
    return options.map((o: Record<string, unknown>) => {
      let window = o.window as Record<string, unknown> | undefined;
      let availability = o.availability as Record<string, unknown> | undefined;
      return {
        serviceOptionId: (o.id || '') as string,
        serviceOptionReference: (o.service_option_reference || '') as string,
        date: (o.date || '') as string,
        window: {
          startAt: (window?.start_at || '') as string,
          endAt: (window?.end_at || '') as string,
          type: (window?.type || '') as string,
          asap: Boolean(window?.asap)
        },
        available: Boolean(availability?.available ?? true)
      };
    });
  }

  async listCartServiceOptions(params: ListServiceOptionsParams): Promise<ServiceOption[]> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let body: Record<string, unknown> = {};
    if (params.locationCode) body.location_code = params.locationCode;
    if (params.items) {
      body.items = params.items.map(item => ({
        line_num: item.lineNum,
        count: item.count,
        product_codes: item.productCodes?.map(pc => ({ type: pc.type, value: pc.value }))
      }));
    }
    if (params.withEtaOptions !== undefined) body.with_eta_options = params.withEtaOptions;
    if (params.withPriorityEtaOptions !== undefined)
      body.with_priority_eta_options = params.withPriorityEtaOptions;

    let path = `/v2/fulfillment/users/${params.userId}/service_options/cart/${params.fulfillmentType}`;
    let response = await axios.post(path, body);

    let options = response.data.service_options || [];
    return options.map((o: Record<string, unknown>) => {
      let window = o.window as Record<string, unknown> | undefined;
      let availability = o.availability as Record<string, unknown> | undefined;
      return {
        serviceOptionId: (o.id || '') as string,
        serviceOptionReference: (o.service_option_reference || '') as string,
        date: (o.date || '') as string,
        window: {
          startAt: (window?.start_at || '') as string,
          endAt: (window?.end_at || '') as string,
          type: (window?.type || '') as string,
          asap: Boolean(window?.asap)
        },
        available: Boolean(availability?.available ?? true)
      };
    });
  }

  async createUserWithAddress(params: CreateUserParams): Promise<{ userId: string }> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let body: Record<string, unknown> = {
      address_line_1: params.addressLine1,
      postal_code: params.postalCode
    };
    if (params.firstName) body.first_name = params.firstName;
    if (params.lastName) body.last_name = params.lastName;
    if (params.phoneNumber) body.phone_number = params.phoneNumber;
    if (params.locale) body.locale = params.locale;
    if (params.addressLine2) body.address_line_2 = params.addressLine2;
    if (params.addressType) body.address_type = params.addressType;
    if (params.city) body.city = params.city;

    let response = await axios.post(`/v2/fulfillment/users/${params.userId}/addresses`, body);

    return {
      userId: response.data.user_id || params.userId
    };
  }

  async createDeliveryOrder(params: CreateDeliveryOrderParams): Promise<Order> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let body: Record<string, unknown> = {
      location_code: params.locationCode,
      items: params.items.map(item => {
        let mapped: Record<string, unknown> = {
          line_num: item.lineNum,
          count: item.count
        };
        if (item.weight !== undefined) mapped.weight = item.weight;
        if (item.specialInstructions) mapped.special_instructions = item.specialInstructions;
        if (item.replacementPolicy) mapped.replacement_policy = item.replacementPolicy;
        if (item.productCodes) {
          mapped.product_codes = item.productCodes.map(pc => ({
            type: pc.type,
            value: pc.value
          }));
        }
        if (item.metadata) mapped.metadata = item.metadata;
        return mapped;
      })
    };

    if (params.orderId) body.order_id = params.orderId;
    if (params.serviceOptionHoldId !== undefined)
      body.service_option_hold_id = params.serviceOptionHoldId;
    if (params.initialTipCents !== undefined) body.initial_tip_cents = params.initialTipCents;
    if (params.leaveUnattended !== undefined) body.leave_unattended = params.leaveUnattended;
    if (params.specialInstructions) body.special_instructions = params.specialInstructions;
    if (params.loyaltyNumber) body.loyalty_number = params.loyaltyNumber;
    if (params.locale) body.locale = params.locale;
    if (params.paidWithEbt !== undefined) body.paid_with_ebt = params.paidWithEbt;

    if (params.address) {
      body.address = {
        address_line_1: params.address.addressLine1,
        address_line_2: params.address.addressLine2,
        address_type: params.address.addressType,
        postal_code: params.address.postalCode,
        city: params.address.city
      };
    }

    if (params.user) {
      body.user = {
        birthday: params.user.birthday,
        phone_number: params.user.phoneNumber,
        sms_opt_in: params.user.smsOptIn
      };
    }

    let response = await axios.post(
      `/v2/fulfillment/users/${params.userId}/orders/delivery`,
      body
    );
    return this.mapOrder(response.data);
  }

  async createPickupOrder(params: CreatePickupOrderParams): Promise<Order> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let body: Record<string, unknown> = {
      location_code: params.locationCode,
      items: params.items.map(item => {
        let mapped: Record<string, unknown> = {
          line_num: item.lineNum,
          count: item.count
        };
        if (item.weight !== undefined) mapped.weight = item.weight;
        if (item.specialInstructions) mapped.special_instructions = item.specialInstructions;
        if (item.replacementPolicy) mapped.replacement_policy = item.replacementPolicy;
        if (item.productCodes) {
          mapped.product_codes = item.productCodes.map(pc => ({
            type: pc.type,
            value: pc.value
          }));
        }
        return mapped;
      })
    };

    if (params.orderId) body.order_id = params.orderId;
    if (params.serviceOptionHoldId !== undefined)
      body.service_option_hold_id = params.serviceOptionHoldId;
    if (params.loyaltyNumber) body.loyalty_number = params.loyaltyNumber;
    if (params.locale) body.locale = params.locale;

    if (params.user) {
      body.user = {
        birthday: params.user.birthday,
        phone_number: params.user.phoneNumber,
        sms_opt_in: params.user.smsOptIn
      };
    }

    let response = await axios.post(
      `/v2/fulfillment/users/${params.userId}/orders/pickup`,
      body
    );
    return this.mapOrder(response.data);
  }

  async getOrder(userId: string, orderId: string): Promise<Order> {
    let axios = createAuthenticatedAxios(this.token, this.environment);
    let response = await axios.get(`/v2/fulfillment/users/${userId}/orders/${orderId}`);
    return this.mapOrder(response.data);
  }

  async getOrders(userId: string): Promise<Order[]> {
    let axios = createAuthenticatedAxios(this.token, this.environment);
    let response = await axios.get(`/v2/fulfillment/users/${userId}/orders`);
    let orders = response.data.orders || [];
    return orders.map((o: Record<string, unknown>) => this.mapOrder(o));
  }

  async cancelOrder(userId: string, orderId: string): Promise<Order> {
    let axios = createAuthenticatedAxios(this.token, this.environment);
    let response = await axios.post(
      `/v2/fulfillment/users/${userId}/orders/${orderId}/cancel`
    );
    return this.mapOrder(response.data);
  }

  async reserveServiceOption(
    userId: string,
    serviceOptionId: string,
    locationCode: string,
    items?: Array<{
      lineNum: string;
      count: number;
      productCodes?: Array<{ type: string; value: string }>;
    }>
  ): Promise<{ serviceOptionHoldId: number; expiresAt: string }> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let body: Record<string, unknown> = {
      location_code: locationCode
    };
    if (items) {
      body.items = items.map(item => ({
        line_num: item.lineNum,
        count: item.count,
        product_codes: item.productCodes?.map(pc => ({ type: pc.type, value: pc.value }))
      }));
    }

    let response = await axios.post(
      `/v2/fulfillment/users/${userId}/service_options/${serviceOptionId}/reserve/cart`,
      body
    );

    return {
      serviceOptionHoldId: response.data.service_option_hold_id,
      expiresAt: response.data.expires_at || ''
    };
  }

  async createSandboxShopper(): Promise<{ shopperId: string }> {
    let axios = createAuthenticatedAxios(this.token, this.environment);
    let response = await axios.post('/v2/fulfillment_sandbox/shoppers', {});
    return { shopperId: response.data.id || response.data.shopper_id || '' };
  }

  async createSandboxBatch(orderId: string, shopperId: string): Promise<{ batchId: string }> {
    let axios = createAuthenticatedAxios(this.token, this.environment);
    let response = await axios.post('/v2/fulfillment_sandbox/batches', {
      order_id: orderId,
      shopper_id: shopperId
    });
    return { batchId: response.data.id || response.data.batch_id || '' };
  }

  async advanceSandboxBatch(batchId: string): Promise<{ status: string }> {
    let axios = createAuthenticatedAxios(this.token, this.environment);
    let response = await axios.post(`/v2/fulfillment_sandbox/batches/${batchId}/advance`, {});
    return { status: response.data.status || '' };
  }

  private mapOrder(data: Record<string, unknown>): Order {
    let fulfillmentDetails = data.fulfillment_details as Record<string, unknown> | undefined;
    let items = data.items as Record<string, unknown>[] | undefined;
    let warnings = data.warnings as Record<string, unknown>[] | undefined;

    return {
      orderId: (data.id || '') as string,
      status: (data.status || '') as string,
      orderUrl: data.order_url as string | undefined,
      createdAt: data.created_at as string | undefined,
      cancellationReason: data.cancellation_reason as string | undefined,
      locale: data.locale as string | undefined,
      isInstacartplus: data.is_instacartplus as boolean | undefined,
      fulfillmentDetails: fulfillmentDetails
        ? {
            storeLocation: fulfillmentDetails.store_location as string | undefined,
            windowStartsAt: fulfillmentDetails.window_starts_at as string | undefined,
            windowEndsAt: fulfillmentDetails.window_ends_at as string | undefined,
            deliveredAt: fulfillmentDetails.delivered_at as string | undefined,
            bagCount: fulfillmentDetails.bag_count as number | undefined
          }
        : undefined,
      items: items?.map(item => ({
        lineNum: (item.line_num || '') as string,
        qty: item.qty as number | undefined,
        replaced: item.replaced as boolean | undefined,
        refunded: item.refunded as boolean | undefined,
        scanCode: item.scan_code as string | undefined
      })),
      warnings: warnings?.map(w => ({ message: (w.message || '') as string }))
    };
  }
}
