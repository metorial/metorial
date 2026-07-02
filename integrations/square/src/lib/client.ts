import { createAxios } from 'slates';
import type {
  SquareCatalogObject,
  SquareClientConfig,
  SquareCustomer,
  SquareInventoryCount,
  SquareInvoice,
  SquareLocation,
  SquareOrder,
  SquarePayment,
  SquareRefund,
  SquareWebhookSubscription
} from './types';

let BASE_URLS: Record<string, string> = {
  production: 'https://connect.squareup.com/v2',
  sandbox: 'https://connect.squareupsandbox.com/v2'
};

export class SquareClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: SquareClientConfig) {
    let baseURL = BASE_URLS[config.environment] || BASE_URLS.production!;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Square-Version': '2025-04-16'
      }
    });
  }

  // ─── Payments ───

  async listPayments(params?: {
    beginTime?: string;
    endTime?: string;
    sortOrder?: string;
    cursor?: string;
    locationId?: string;
    limit?: number;
  }): Promise<{ payments: SquarePayment[]; cursor?: string }> {
    let response = await this.axios.get('/payments', {
      params: {
        begin_time: params?.beginTime,
        end_time: params?.endTime,
        sort_order: params?.sortOrder,
        cursor: params?.cursor,
        location_id: params?.locationId,
        limit: params?.limit
      }
    });
    return {
      payments: response.data.payments || [],
      cursor: response.data.cursor
    };
  }

  async getPayment(paymentId: string): Promise<SquarePayment> {
    let response = await this.axios.get(`/payments/${paymentId}`);
    return response.data.payment;
  }

  async createPayment(payment: {
    sourceId: string;
    idempotencyKey: string;
    amountMoney: { amount: number; currency: string };
    tipMoney?: { amount: number; currency: string };
    appFeeMoney?: { amount: number; currency: string };
    customerId?: string;
    locationId?: string;
    orderId?: string;
    referenceId?: string;
    note?: string;
    autocomplete?: boolean;
    delayDuration?: string;
  }): Promise<SquarePayment> {
    let response = await this.axios.post('/payments', {
      source_id: payment.sourceId,
      idempotency_key: payment.idempotencyKey,
      amount_money: payment.amountMoney,
      tip_money: payment.tipMoney,
      app_fee_money: payment.appFeeMoney,
      customer_id: payment.customerId,
      location_id: payment.locationId,
      order_id: payment.orderId,
      reference_id: payment.referenceId,
      note: payment.note,
      autocomplete: payment.autocomplete,
      delay_duration: payment.delayDuration
    });
    return response.data.payment;
  }

  async completePayment(paymentId: string): Promise<SquarePayment> {
    let response = await this.axios.post(`/payments/${paymentId}/complete`);
    return response.data.payment;
  }

  async cancelPayment(paymentId: string): Promise<SquarePayment> {
    let response = await this.axios.post(`/payments/${paymentId}/cancel`);
    return response.data.payment;
  }

  // ─── Refunds ───

  async listRefunds(params?: {
    beginTime?: string;
    endTime?: string;
    sortOrder?: string;
    cursor?: string;
    locationId?: string;
    limit?: number;
  }): Promise<{ refunds: SquareRefund[]; cursor?: string }> {
    let response = await this.axios.get('/refunds', {
      params: {
        begin_time: params?.beginTime,
        end_time: params?.endTime,
        sort_order: params?.sortOrder,
        cursor: params?.cursor,
        location_id: params?.locationId,
        limit: params?.limit
      }
    });
    return {
      refunds: response.data.refunds || [],
      cursor: response.data.cursor
    };
  }

  async getRefund(refundId: string): Promise<SquareRefund> {
    let response = await this.axios.get(`/refunds/${refundId}`);
    return response.data.refund;
  }

  async refundPayment(params: {
    idempotencyKey: string;
    paymentId: string;
    amountMoney: { amount: number; currency: string };
    reason?: string;
  }): Promise<SquareRefund> {
    let response = await this.axios.post('/refunds', {
      idempotency_key: params.idempotencyKey,
      payment_id: params.paymentId,
      amount_money: params.amountMoney,
      reason: params.reason
    });
    return response.data.refund;
  }

  // ─── Orders ───

  async createOrder(order: {
    locationId: string;
    lineItems?: Record<string, any>[];
    taxes?: Record<string, any>[];
    discounts?: Record<string, any>[];
    fulfillments?: Record<string, any>[];
    customerId?: string;
    referenceId?: string;
    idempotencyKey?: string;
  }): Promise<SquareOrder> {
    let response = await this.axios.post('/orders', {
      idempotency_key: order.idempotencyKey,
      order: {
        location_id: order.locationId,
        line_items: order.lineItems,
        taxes: order.taxes,
        discounts: order.discounts,
        fulfillments: order.fulfillments,
        customer_id: order.customerId,
        reference_id: order.referenceId
      }
    });
    return response.data.order;
  }

  async getOrder(orderId: string): Promise<SquareOrder> {
    let response = await this.axios.get(`/orders/${orderId}`);
    return response.data.order;
  }

  async searchOrders(params: {
    locationIds: string[];
    cursor?: string;
    limit?: number;
    query?: {
      filter?: Record<string, any>;
      sort?: Record<string, any>;
    };
  }): Promise<{ orders: SquareOrder[]; cursor?: string }> {
    let response = await this.axios.post('/orders/search', {
      location_ids: params.locationIds,
      cursor: params.cursor,
      limit: params.limit,
      query: params.query
    });
    return {
      orders: response.data.orders || [],
      cursor: response.data.cursor
    };
  }

  async updateOrder(
    orderId: string,
    params: {
      order: Record<string, any>;
      fieldsToClear?: string[];
      idempotencyKey?: string;
    }
  ): Promise<SquareOrder> {
    let response = await this.axios.put(`/orders/${orderId}`, {
      order: { ...params.order, version: params.order.version },
      fields_to_clear: params.fieldsToClear,
      idempotency_key: params.idempotencyKey
    });
    return response.data.order;
  }

  // ─── Customers ───

  async listCustomers(params?: {
    cursor?: string;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  }): Promise<{ customers: SquareCustomer[]; cursor?: string }> {
    let response = await this.axios.get('/customers', {
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        sort_field: params?.sortField,
        sort_order: params?.sortOrder
      }
    });
    return {
      customers: response.data.customers || [],
      cursor: response.data.cursor
    };
  }

  async getCustomer(customerId: string): Promise<SquareCustomer> {
    let response = await this.axios.get(`/customers/${customerId}`);
    return response.data.customer;
  }

  async createCustomer(customer: {
    givenName?: string;
    familyName?: string;
    companyName?: string;
    nickname?: string;
    emailAddress?: string;
    phoneNumber?: string;
    address?: Record<string, any>;
    note?: string;
    referenceId?: string;
    birthday?: string;
    idempotencyKey?: string;
  }): Promise<SquareCustomer> {
    let response = await this.axios.post('/customers', {
      idempotency_key: customer.idempotencyKey,
      given_name: customer.givenName,
      family_name: customer.familyName,
      company_name: customer.companyName,
      nickname: customer.nickname,
      email_address: customer.emailAddress,
      phone_number: customer.phoneNumber,
      address: customer.address,
      note: customer.note,
      reference_id: customer.referenceId,
      birthday: customer.birthday
    });
    return response.data.customer;
  }

  async updateCustomer(
    customerId: string,
    customer: {
      givenName?: string;
      familyName?: string;
      companyName?: string;
      nickname?: string;
      emailAddress?: string;
      phoneNumber?: string;
      address?: Record<string, any>;
      note?: string;
      referenceId?: string;
      birthday?: string;
      version?: number;
    }
  ): Promise<SquareCustomer> {
    let response = await this.axios.put(`/customers/${customerId}`, {
      given_name: customer.givenName,
      family_name: customer.familyName,
      company_name: customer.companyName,
      nickname: customer.nickname,
      email_address: customer.emailAddress,
      phone_number: customer.phoneNumber,
      address: customer.address,
      note: customer.note,
      reference_id: customer.referenceId,
      birthday: customer.birthday,
      version: customer.version
    });
    return response.data.customer;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.axios.delete(`/customers/${customerId}`);
  }

  async searchCustomers(params: {
    cursor?: string;
    limit?: number;
    query?: Record<string, any>;
  }): Promise<{ customers: SquareCustomer[]; cursor?: string }> {
    let response = await this.axios.post('/customers/search', {
      cursor: params.cursor,
      limit: params.limit,
      query: params.query
    });
    return {
      customers: response.data.customers || [],
      cursor: response.data.cursor
    };
  }

  // ─── Catalog ───

  async listCatalog(params?: {
    cursor?: string;
    types?: string;
  }): Promise<{ objects: SquareCatalogObject[]; cursor?: string }> {
    let response = await this.axios.get('/catalog/list', {
      params: {
        cursor: params?.cursor,
        types: params?.types
      }
    });
    return {
      objects: response.data.objects || [],
      cursor: response.data.cursor
    };
  }

  async getCatalogObject(
    objectId: string,
    includeRelatedObjects?: boolean
  ): Promise<{
    object: SquareCatalogObject;
    relatedObjects?: SquareCatalogObject[];
  }> {
    let response = await this.axios.get(`/catalog/object/${objectId}`, {
      params: { include_related_objects: includeRelatedObjects }
    });
    return {
      object: response.data.object,
      relatedObjects: response.data.related_objects
    };
  }

  async upsertCatalogObject(params: {
    idempotencyKey: string;
    object: Record<string, any>;
  }): Promise<SquareCatalogObject> {
    let response = await this.axios.post('/catalog/object', {
      idempotency_key: params.idempotencyKey,
      object: params.object
    });
    return response.data.catalog_object;
  }

  async deleteCatalogObject(
    objectId: string
  ): Promise<{ deletedObjectIds: string[]; deletedAt: string }> {
    let response = await this.axios.delete(`/catalog/object/${objectId}`);
    return {
      deletedObjectIds: response.data.deleted_object_ids || [],
      deletedAt: response.data.deleted_at
    };
  }

  async searchCatalogObjects(params: {
    cursor?: string;
    objectTypes?: string[];
    query?: Record<string, any>;
    limit?: number;
    includeRelatedObjects?: boolean;
    includeDeletedObjects?: boolean;
  }): Promise<{ objects: SquareCatalogObject[]; cursor?: string }> {
    let response = await this.axios.post('/catalog/search', {
      cursor: params.cursor,
      object_types: params.objectTypes,
      query: params.query,
      limit: params.limit,
      include_related_objects: params.includeRelatedObjects,
      include_deleted_objects: params.includeDeletedObjects
    });
    return {
      objects: response.data.objects || [],
      cursor: response.data.cursor
    };
  }

  async searchCatalogItems(params: {
    textFilter?: string;
    categoryIds?: string[];
    cursor?: string;
    limit?: number;
    sortOrder?: string;
    productTypes?: string[];
  }): Promise<{ items: SquareCatalogObject[]; cursor?: string }> {
    let response = await this.axios.post('/catalog/search-catalog-items', {
      text_filter: params.textFilter,
      category_ids: params.categoryIds,
      cursor: params.cursor,
      limit: params.limit,
      sort_order: params.sortOrder,
      product_types: params.productTypes
    });
    return {
      items: response.data.items || [],
      cursor: response.data.cursor
    };
  }

  // ─── Inventory ───

  async retrieveInventoryCount(
    catalogObjectId: string,
    params?: {
      locationIds?: string;
      cursor?: string;
    }
  ): Promise<{ counts: SquareInventoryCount[]; cursor?: string }> {
    let response = await this.axios.get(`/inventory/${catalogObjectId}`, {
      params: {
        location_ids: params?.locationIds,
        cursor: params?.cursor
      }
    });
    return {
      counts: response.data.counts || [],
      cursor: response.data.cursor
    };
  }

  async batchChangeInventory(params: {
    idempotencyKey: string;
    changes: {
      type: string;
      physicalCount?: Record<string, any>;
      adjustment?: Record<string, any>;
      transfer?: Record<string, any>;
    }[];
  }): Promise<{ counts: SquareInventoryCount[] }> {
    let response = await this.axios.post('/inventory/changes/batch-create', {
      idempotency_key: params.idempotencyKey,
      changes: params.changes
    });
    return {
      counts: response.data.counts || []
    };
  }

  async batchRetrieveInventoryCounts(params: {
    catalogObjectIds?: string[];
    locationIds?: string[];
    cursor?: string;
    states?: string[];
    updatedAfter?: string;
  }): Promise<{ counts: SquareInventoryCount[]; cursor?: string }> {
    let response = await this.axios.post('/inventory/counts/batch-retrieve', {
      catalog_object_ids: params.catalogObjectIds,
      location_ids: params.locationIds,
      cursor: params.cursor,
      states: params.states,
      updated_after: params.updatedAfter
    });
    return {
      counts: response.data.counts || [],
      cursor: response.data.cursor
    };
  }

  // ─── Invoices ───

  async listInvoices(
    locationId: string,
    params?: {
      cursor?: string;
      limit?: number;
    }
  ): Promise<{ invoices: SquareInvoice[]; cursor?: string }> {
    let response = await this.axios.get('/invoices', {
      params: {
        location_id: locationId,
        cursor: params?.cursor,
        limit: params?.limit
      }
    });
    return {
      invoices: response.data.invoices || [],
      cursor: response.data.cursor
    };
  }

  async getInvoice(invoiceId: string): Promise<SquareInvoice> {
    let response = await this.axios.get(`/invoices/${invoiceId}`);
    return response.data.invoice;
  }

  async createInvoice(params: {
    invoice: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<SquareInvoice> {
    let response = await this.axios.post('/invoices', {
      invoice: params.invoice,
      idempotency_key: params.idempotencyKey
    });
    return response.data.invoice;
  }

  async updateInvoice(
    invoiceId: string,
    params: {
      invoice: Record<string, any>;
      idempotencyKey?: string;
      fieldsToClear?: string[];
    }
  ): Promise<SquareInvoice> {
    let response = await this.axios.put(`/invoices/${invoiceId}`, {
      invoice: params.invoice,
      idempotency_key: params.idempotencyKey,
      fields_to_clear: params.fieldsToClear
    });
    return response.data.invoice;
  }

  async publishInvoice(
    invoiceId: string,
    params: {
      version: number;
      idempotencyKey?: string;
    }
  ): Promise<SquareInvoice> {
    let response = await this.axios.post(`/invoices/${invoiceId}/publish`, {
      version: params.version,
      idempotency_key: params.idempotencyKey
    });
    return response.data.invoice;
  }

  async cancelInvoice(invoiceId: string, version: number): Promise<SquareInvoice> {
    let response = await this.axios.post(`/invoices/${invoiceId}/cancel`, {
      version
    });
    return response.data.invoice;
  }

  async deleteInvoice(invoiceId: string, version?: number): Promise<void> {
    await this.axios.delete(`/invoices/${invoiceId}`, {
      params: { version }
    });
  }

  // ─── Locations ───

  async listLocations(): Promise<SquareLocation[]> {
    let response = await this.axios.get('/locations');
    return response.data.locations || [];
  }

  async getLocation(locationId: string): Promise<SquareLocation> {
    let response = await this.axios.get(`/locations/${locationId}`);
    return response.data.location;
  }

  async createLocation(location: Record<string, any>): Promise<SquareLocation> {
    let response = await this.axios.post('/locations', { location });
    return response.data.location;
  }

  async updateLocation(
    locationId: string,
    location: Record<string, any>
  ): Promise<SquareLocation> {
    let response = await this.axios.put(`/locations/${locationId}`, { location });
    return response.data.location;
  }

  // ─── Merchants ───

  async getMerchant(merchantId: string = 'me'): Promise<Record<string, any>> {
    let response = await this.axios.get(`/merchants/${merchantId}`);
    return response.data.merchant;
  }

  // ─── Webhook Subscriptions ───

  async createWebhookSubscription(params: {
    idempotencyKey: string;
    subscription: {
      name: string;
      eventTypes: string[];
      notificationUrl: string;
      apiVersion?: string;
    };
  }): Promise<SquareWebhookSubscription> {
    let response = await this.axios.post('/webhooks/subscriptions', {
      idempotency_key: params.idempotencyKey,
      subscription: {
        name: params.subscription.name,
        event_types: params.subscription.eventTypes,
        notification_url: params.subscription.notificationUrl,
        api_version: params.subscription.apiVersion
      }
    });
    return response.data.subscription;
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/webhooks/subscriptions/${subscriptionId}`);
  }

  async updateWebhookSubscription(
    subscriptionId: string,
    params: {
      subscription: {
        name?: string;
        eventTypes?: string[];
        notificationUrl?: string;
        enabled?: boolean;
      };
    }
  ): Promise<SquareWebhookSubscription> {
    let response = await this.axios.put(`/webhooks/subscriptions/${subscriptionId}`, {
      subscription: {
        name: params.subscription.name,
        event_types: params.subscription.eventTypes,
        notification_url: params.subscription.notificationUrl,
        enabled: params.subscription.enabled
      }
    });
    return response.data.subscription;
  }

  // ─── Bookings ───

  async listBookings(params?: {
    cursor?: string;
    limit?: number;
    locationId?: string;
    teamMemberId?: string;
    startAtMin?: string;
    startAtMax?: string;
  }): Promise<{ bookings: Record<string, any>[]; cursor?: string }> {
    let response = await this.axios.get('/bookings', {
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        location_id: params?.locationId,
        team_member_id: params?.teamMemberId,
        start_at_min: params?.startAtMin,
        start_at_max: params?.startAtMax
      }
    });
    return {
      bookings: response.data.bookings || [],
      cursor: response.data.cursor
    };
  }

  async getBooking(bookingId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/bookings/${bookingId}`);
    return response.data.booking;
  }

  async createBooking(params: {
    idempotencyKey?: string;
    booking: Record<string, any>;
  }): Promise<Record<string, any>> {
    let response = await this.axios.post('/bookings', {
      idempotency_key: params.idempotencyKey,
      booking: params.booking
    });
    return response.data.booking;
  }

  async updateBooking(
    bookingId: string,
    params: {
      idempotencyKey?: string;
      booking: Record<string, any>;
    }
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(`/bookings/${bookingId}`, {
      idempotency_key: params.idempotencyKey,
      booking: params.booking
    });
    return response.data.booking;
  }

  async cancelBooking(
    bookingId: string,
    params?: {
      idempotencyKey?: string;
      bookingVersion?: number;
    }
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/bookings/${bookingId}/cancel`, {
      idempotency_key: params?.idempotencyKey,
      booking_version: params?.bookingVersion
    });
    return response.data.booking;
  }

  // ─── Subscriptions ───

  async searchSubscriptions(params: {
    cursor?: string;
    limit?: number;
    query?: Record<string, any>;
  }): Promise<{ subscriptions: Record<string, any>[]; cursor?: string }> {
    let response = await this.axios.post('/subscriptions/search', {
      cursor: params.cursor,
      limit: params.limit,
      query: params.query
    });
    return {
      subscriptions: response.data.subscriptions || [],
      cursor: response.data.cursor
    };
  }

  async getSubscription(subscriptionId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/subscriptions/${subscriptionId}`);
    return response.data.subscription;
  }

  // ─── Disputes ───

  async listDisputes(params?: {
    cursor?: string;
    states?: string;
    locationId?: string;
  }): Promise<{ disputes: Record<string, any>[]; cursor?: string }> {
    let response = await this.axios.get('/disputes', {
      params: {
        cursor: params?.cursor,
        states: params?.states,
        location_id: params?.locationId
      }
    });
    return {
      disputes: response.data.disputes || [],
      cursor: response.data.cursor
    };
  }

  async getDispute(disputeId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/disputes/${disputeId}`);
    return response.data.dispute;
  }

  async acceptDispute(disputeId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/disputes/${disputeId}/accept`);
    return response.data.dispute;
  }

  // ─── Gift Cards ───

  async listGiftCards(params?: {
    cursor?: string;
    limit?: number;
    type?: string;
    state?: string;
  }): Promise<{ giftCards: Record<string, any>[]; cursor?: string }> {
    let response = await this.axios.get('/gift-cards', {
      params: {
        cursor: params?.cursor,
        limit: params?.limit,
        type: params?.type,
        state: params?.state
      }
    });
    return {
      giftCards: response.data.gift_cards || [],
      cursor: response.data.cursor
    };
  }

  async getGiftCard(giftCardId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/gift-cards/${giftCardId}`);
    return response.data.gift_card;
  }

  // ─── Loyalty ───

  async getLoyaltyProgram(programId: string = 'main'): Promise<Record<string, any>> {
    let response = await this.axios.get(`/loyalty/programs/${programId}`);
    return response.data.program;
  }

  async searchLoyaltyAccounts(params: {
    query?: Record<string, any>;
    cursor?: string;
    limit?: number;
  }): Promise<{ loyaltyAccounts: Record<string, any>[]; cursor?: string }> {
    let response = await this.axios.post('/loyalty/accounts/search', {
      query: params.query,
      cursor: params.cursor,
      limit: params.limit
    });
    return {
      loyaltyAccounts: response.data.loyalty_accounts || [],
      cursor: response.data.cursor
    };
  }

  // ─── Team Members ───

  async searchTeamMembers(params?: {
    query?: Record<string, any>;
    cursor?: string;
    limit?: number;
  }): Promise<{ teamMembers: Record<string, any>[]; cursor?: string }> {
    let response = await this.axios.post('/team-members/search', {
      query: params?.query,
      cursor: params?.cursor,
      limit: params?.limit
    });
    return {
      teamMembers: response.data.team_members || [],
      cursor: response.data.cursor
    };
  }

  async getTeamMember(teamMemberId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/team-members/${teamMemberId}`);
    return response.data.team_member;
  }
}
