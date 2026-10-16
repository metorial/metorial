import { createApiServiceError } from 'slates';
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
  address?: string;
  phone?: string;
  raw?: unknown;
  alcohol: boolean;
  pickupOnly: boolean;
}

export interface PreviewServiceOptionsParams {
  locationCode?: string;
  fulfillmentType: 'delivery' | 'pickup';
  postalCode: string;
  cartTotalCents?: number;
  itemsCount?: number;
  withEtaOptions?: boolean;
  withPriorityEtaOptions?: boolean;
  desiredWindows?: Array<{ startsAt: string; endsAt: string }>;
}

export interface ServiceOption {
  serviceOptionId: string;
  serviceOptionReference?: string;
  date: string;
  window: {
    startAt?: string;
    endAt?: string;
    type: string;
    asap?: boolean;
    immediateHour?: number;
  };
  available: boolean;
  raw?: unknown;
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
  item?: { upc?: string; rrc?: string };
  replacementItems?: Array<{ upc?: string; rrc?: string }>;
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
  raw?: unknown;
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
  warnings?: Array<{ message?: string; raw?: unknown }>;
}

export interface ListServiceOptionsParams {
  userId: string;
  fulfillmentType: 'delivery' | 'pickup';
  locationCode: string;
  address?: CreateDeliveryOrderParams['address'];
  items?: Array<{
    lineNum: string;
    count: number;
    productCodes?: Array<{ type: string; value: string }>;
    item?: { upc?: string; rrc?: string };
    weight?: number;
  }>;
  withEtaOptions?: boolean;
  withPriorityEtaOptions?: boolean;
  desiredWindows?: Array<{ startsAt: string; endsAt: string }>;
}

export class ConnectClient {
  private token: string;
  private environment: string;
  private baseUrl?: string;

  constructor(config: { token: string; environment: string; baseUrl?: string }) {
    this.token = config.token;
    this.environment = config.environment;
    this.baseUrl = config.baseUrl;
  }

  async findStores(params: FindStoresParams): Promise<{ stores: Store[]; raw: unknown }> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);

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

    let stores = response.data.stores ?? [];
    return {
      raw: response.data,
      stores: stores.map((store: Record<string, unknown>) => {
        let flags = store.flags as Record<string, unknown> | undefined;
        return {
          locationCode: this.requiredString(store.location_code, 'store location_code'),
          name: this.requiredString(store.name, 'store name'),
          address: typeof store.address === 'string' ? store.address : undefined,
          phone: typeof store.phone === 'string' ? store.phone : undefined,
          alcohol: this.requiredBoolean(flags?.alcohol ?? store.alcohol, 'store alcohol flag'),
          pickupOnly: this.requiredBoolean(
            flags?.pickup_only ?? store.pickup_only,
            'store pickup_only flag'
          ),
          raw: store
        };
      })
    };
  }

  async previewServiceOptions(
    params: PreviewServiceOptionsParams
  ): Promise<{ serviceOptions: ServiceOption[]; raw: unknown }> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);

    let body: Record<string, unknown> = {
      postal_code: params.postalCode
    };
    if (params.fulfillmentType === 'pickup' && params.locationCode)
      body.location_code = params.locationCode;
    if (params.cartTotalCents !== undefined) body.cart_total_cents = params.cartTotalCents;
    if (params.itemsCount !== undefined) body.items_count = params.itemsCount;
    if (params.desiredWindows !== undefined)
      body.desired_windows = params.desiredWindows.map(window => ({
        starts_at: window.startsAt,
        ends_at: window.endsAt
      }));
    if (params.withEtaOptions !== undefined) body.with_eta_options = params.withEtaOptions;
    if (params.withPriorityEtaOptions !== undefined)
      body.with_priority_eta_options = params.withPriorityEtaOptions;

    let path = `/v2/fulfillment/service_options/${params.fulfillmentType}`;
    let response = await axios.post(path, body);

    let options = response.data.service_options ?? [];
    return {
      serviceOptions: options.map((option: Record<string, unknown>) =>
        this.mapServiceOption(option)
      ),
      raw: response.data
    };
  }

  async listCartServiceOptions(
    params: ListServiceOptionsParams
  ): Promise<{ serviceOptions: ServiceOption[]; raw: unknown }> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);

    let body: Record<string, unknown> = {};
    if (params.locationCode) body.location_code = params.locationCode;
    if (params.items) {
      body.items = params.items.map(item => ({
        line_num: item.lineNum,
        count: item.count,
        ...(item.item !== undefined
          ? { item: this.mapItemCode(item.item), weight: item.weight }
          : {
              product_codes: item.productCodes?.map(pc => ({ type: pc.type, value: pc.value }))
            })
      }));
    }
    if (params.desiredWindows !== undefined)
      body.desired_windows = params.desiredWindows.map(window => ({
        starts_at: window.startsAt,
        ends_at: window.endsAt
      }));
    if (params.withEtaOptions !== undefined) body.with_eta_options = params.withEtaOptions;
    if (params.withPriorityEtaOptions !== undefined)
      body.with_priority_eta_options = params.withPriorityEtaOptions;

    if (params.address !== undefined) body.address = this.mapAddress(params.address);
    let path = `/v2/fulfillment/users/${encodeURIComponent(params.userId)}/service_options/cart/${params.fulfillmentType}`;
    let response = await axios.post(path, body);

    let options = response.data.service_options ?? [];
    return {
      serviceOptions: options.map((option: Record<string, unknown>) =>
        this.mapServiceOption(option)
      ),
      raw: response.data
    };
  }

  async createUserWithAddress(
    params: CreateUserParams
  ): Promise<{ userId: string; raw: unknown }> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);

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

    let response = await axios.post(
      `/v2/fulfillment/users/${encodeURIComponent(params.userId)}/addresses`,
      body
    );

    return {
      userId: response.data.user_id ?? params.userId,
      raw: response.data
    };
  }

  async createDeliveryOrder(params: CreateDeliveryOrderParams): Promise<Order> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);

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
        if (item.item !== undefined) {
          mapped.item = this.mapItemCode(item.item);
        } else if (item.productCodes) {
          mapped.product_codes = item.productCodes.map(pc => ({
            type: pc.type,
            value: pc.value
          }));
        }
        if (item.metadata) mapped.metadata = item.metadata;
        if (item.replacementItems !== undefined)
          mapped.replacement_items = item.replacementItems.map(code => this.mapItemCode(code));
        if (item.metadata !== undefined) mapped.metadata = item.metadata;
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
      `/v2/fulfillment/users/${encodeURIComponent(params.userId)}/orders/delivery`,
      body
    );
    return this.mapOrder(response.data);
  }

  async createPickupOrder(params: CreatePickupOrderParams): Promise<Order> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);

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
        if (item.item !== undefined) {
          mapped.item = this.mapItemCode(item.item);
        } else if (item.productCodes) {
          mapped.product_codes = item.productCodes.map(pc => ({
            type: pc.type,
            value: pc.value
          }));
        }
        if (item.replacementItems !== undefined)
          mapped.replacement_items = item.replacementItems.map(code => this.mapItemCode(code));
        if (item.metadata !== undefined) mapped.metadata = item.metadata;
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
      `/v2/fulfillment/users/${encodeURIComponent(params.userId)}/orders/pickup`,
      body
    );
    return this.mapOrder(response.data);
  }

  async getOrder(userId: string, orderId: string): Promise<Order> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);
    let response = await axios.get(
      `/v2/fulfillment/users/${encodeURIComponent(userId)}/orders/${encodeURIComponent(orderId)}`
    );
    return this.mapOrder(response.data);
  }

  async getOrders(userId: string): Promise<Order[]> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);
    let response = await axios.get(
      `/v2/fulfillment/users/${encodeURIComponent(userId)}/orders`
    );
    let orders = response.data.orders || [];
    return orders.map((o: Record<string, unknown>) => this.mapOrder(o));
  }

  async cancelOrder(userId: string, orderId: string): Promise<Order> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);
    let response = await axios.post(
      `/v2/fulfillment/users/${encodeURIComponent(userId)}/orders/${encodeURIComponent(orderId)}/cancel`
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
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);
    let response = await axios.post('/v2/fulfillment_sandbox/shoppers', {});
    return {
      shopperId: this.requiredId(response.data.id ?? response.data.shopper_id, 'shopper ID')
    };
  }

  async createSandboxBatch(
    orderId: string,
    shopperId: string,
    batchType?: string
  ): Promise<{ batchId: string }> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);
    if (!/^\d+$/.test(shopperId))
      throw createApiServiceError('Instacart did not return a numeric sandbox shopper ID.');
    let response = await axios.post('/v2/fulfillment_sandbox/batches', {
      orders: [{ id: orderId }],
      shopper_id: Number(shopperId),
      ...(batchType !== undefined ? { batch_type: batchType } : {})
    });
    return {
      batchId: this.requiredId(response.data.id ?? response.data.batch_id, 'batch ID')
    };
  }

  async advanceSandboxBatch(batchId: string): Promise<{ status: string; raw: unknown }> {
    let axios = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);
    let response = await axios.post(
      `/v2/fulfillment_sandbox/batches/${encodeURIComponent(batchId)}/advance`,
      {}
    );
    return {
      status: this.requiredString(
        response.data.workflow_state ?? response.data.status,
        'batch workflow state'
      ),
      raw: response.data
    };
  }

  async getUser(userId: string) {
    let client = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);
    let response = await client.get(`/v2/fulfillment/users/${encodeURIComponent(userId)}`);
    return {
      userId,
      firstName: this.requiredString(response.data.first_name, 'user first name'),
      lastName: response.data.last_name as string | undefined,
      phoneNumber: response.data.phone_number as string | undefined,
      raw: response.data
    };
  }

  async reserveTimeSlot(
    userId: string,
    option: { serviceOptionId?: string; serviceOptionReference?: string }
  ) {
    let client = createAuthenticatedAxios(this.token, this.environment, this.baseUrl);
    if (Boolean(option.serviceOptionId) === Boolean(option.serviceOptionReference)) {
      throw createApiServiceError(
        'Provide exactly one serviceOptionId or serviceOptionReference from List Cart Service Options.'
      );
    }
    if (option.serviceOptionId && !/^\d+$/.test(option.serviceOptionId))
      throw createApiServiceError(
        'serviceOptionId must be the numeric ID returned by List Cart Service Options.'
      );
    let path = `/v2/fulfillment/users/${encodeURIComponent(userId)}/service_options`;
    let response = option.serviceOptionReference
      ? await client.post(`${path}/reserve`, {
          service_option_reference: option.serviceOptionReference
        })
      : await client.post(`${path}/${encodeURIComponent(option.serviceOptionId!)}/reserve`);
    let hold = response.data.service_option_hold;
    return {
      serviceOptionHoldId: this.requiredNumber(hold?.id, 'service option hold ID'),
      expiresAt: this.requiredString(hold?.expires_at, 'service option expiry'),
      raw: response.data
    };
  }

  private requiredString(value: unknown, field: string): string {
    if (typeof value !== 'string')
      throw createApiServiceError(`Instacart did not return a valid ${field}.`);
    return value;
  }

  private requiredBoolean(value: unknown, field: string): boolean {
    if (typeof value !== 'boolean')
      throw createApiServiceError(`Instacart did not return a valid ${field}.`);
    return value;
  }

  private requiredNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw createApiServiceError(`Instacart did not return a valid ${field}.`);
    return value;
  }

  private requiredId(value: unknown, field: string): string {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return this.requiredString(value, field);
  }

  private mapAddress(address: NonNullable<CreateDeliveryOrderParams['address']>) {
    return {
      address_line_1: address.addressLine1,
      address_line_2: address.addressLine2,
      address_type: address.addressType,
      postal_code: address.postalCode,
      city: address.city
    };
  }

  private mapItemCode(item: { upc?: string; rrc?: string }) {
    if (Boolean(item.upc) === Boolean(item.rrc))
      throw createApiServiceError('Each item code must specify exactly one upc or rrc.');
    return item;
  }

  private mapServiceOption(option: Record<string, unknown>): ServiceOption {
    let window = option.window as Record<string, unknown>;
    let availability = option.availability as Record<string, unknown>;
    return {
      serviceOptionId: this.requiredId(option.id, 'service option ID'),
      serviceOptionReference: option.service_option_reference as string | undefined,
      date: this.requiredString(option.date, 'service option date'),
      window: {
        startAt: window?.start_at as string | undefined,
        endAt: window?.end_at as string | undefined,
        type: this.requiredString(window?.type, 'service option window type'),
        asap: window?.asap as boolean | undefined,
        immediateHour: window?.immediate_hour as number | undefined
      },
      available: this.requiredBoolean(availability?.available, 'service option availability'),
      raw: option
    };
  }

  private mapOrder(data: Record<string, unknown>): Order {
    let fulfillmentDetails = data.fulfillment_details as Record<string, unknown> | undefined;
    let items = data.items as Record<string, unknown>[] | undefined;
    let warnings = data.warnings as Record<string, unknown>[] | undefined;

    return {
      raw: data,
      orderId: this.requiredString(data.id, 'order ID'),
      status: this.requiredString(data.status, 'order status'),
      orderUrl: typeof data.order_url === 'string' ? data.order_url : undefined,
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
        lineNum: this.requiredString(item.line_num, 'item line number'),
        qty: item.qty as number | undefined,
        replaced: item.replaced as boolean | undefined,
        refunded: item.refunded as boolean | undefined,
        scanCode: item.scan_code as string | undefined
      })),
      warnings: warnings?.map(w => ({
        message:
          (w.error as { message?: string } | undefined)?.message ??
          (w.message as string | undefined),
        raw: w
      }))
    };
  }
}
