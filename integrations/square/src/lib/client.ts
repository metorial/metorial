import { createAxios } from 'slates';
import { SQUARE_API_VERSION, SQUARE_ORIGINS } from './constants';
import { squareApiError } from './errors';
import type {
  SquareCatalogObject,
  SquareClientConfig,
  SquareCustomer,
  SquareInventoryCount,
  SquareInvoice,
  SquareLocation,
  SquareOrder,
  SquarePayment,
  SquareRefund
} from './types';

export class SquareClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: SquareClientConfig) {
    let baseURL = `${SQUARE_ORIGINS[config.environment]}/v2`;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION
      }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(squareApiError(error))
    );
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: { body?: unknown; params?: Record<string, unknown> } = {}
  ): Promise<T> {
    let response = await this.axios.request<T>({
      method,
      url: path,
      data: options.body,
      params: options.params
    });
    return response.data;
  }

  // ─── Payments ───

  async listPayments(params?: {
    beginTime?: string;
    endTime?: string;
    sortOrder?: string;
    cursor?: string;
    locationId?: string;
    limit?: number;
    total?: number;
    last4?: string;
    cardBrand?: string;
    isOfflinePayment?: boolean;
    offlineBeginTime?: string;
    offlineEndTime?: string;
    updatedAtBeginTime?: string;
    updatedAtEndTime?: string;
    sortField?: 'CREATED_AT' | 'UPDATED_AT';
  }): Promise<{ payments: SquarePayment[]; cursor?: string }> {
    let response = await this.axios.get('/payments', {
      params: {
        begin_time: params?.beginTime,
        end_time: params?.endTime,
        sort_order: params?.sortOrder,
        cursor: params?.cursor,
        location_id: params?.locationId,
        limit: params?.limit,
        total: params?.total,
        last_4: params?.last4,
        card_brand: params?.cardBrand,
        is_offline_payment: params?.isOfflinePayment,
        offline_begin_time: params?.offlineBeginTime,
        offline_end_time: params?.offlineEndTime,
        updated_at_begin_time: params?.updatedAtBeginTime,
        updated_at_end_time: params?.updatedAtEndTime,
        sort_field: params?.sortField
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
    appFeeAllocations?: Record<string, any>[];
    customerId?: string;
    locationId?: string;
    orderId?: string;
    referenceId?: string;
    note?: string;
    autocomplete?: boolean;
    delayDuration?: string;
    delayAction?: 'CANCEL' | 'COMPLETE';
    verificationToken?: string;
    acceptPartialAuthorization?: boolean;
    buyerEmailAddress?: string;
    buyerPhoneNumber?: string;
    billingAddress?: Record<string, any>;
    shippingAddress?: Record<string, any>;
    statementDescriptionIdentifier?: string;
    cashDetails?: Record<string, any>;
    externalDetails?: Record<string, any>;
    customerDetails?: Record<string, any>;
  }): Promise<SquarePayment> {
    let response = await this.axios.post('/payments', {
      source_id: payment.sourceId,
      idempotency_key: payment.idempotencyKey,
      amount_money: payment.amountMoney,
      tip_money: payment.tipMoney,
      app_fee_money: payment.appFeeMoney,
      app_fee_allocations: payment.appFeeAllocations,
      customer_id: payment.customerId,
      location_id: payment.locationId,
      order_id: payment.orderId,
      reference_id: payment.referenceId,
      note: payment.note,
      autocomplete: payment.autocomplete,
      delay_duration: payment.delayDuration,
      delay_action: payment.delayAction,
      verification_token: payment.verificationToken,
      accept_partial_authorization: payment.acceptPartialAuthorization,
      buyer_email_address: payment.buyerEmailAddress,
      buyer_phone_number: payment.buyerPhoneNumber,
      billing_address: payment.billingAddress,
      shipping_address: payment.shippingAddress,
      statement_description_identifier: payment.statementDescriptionIdentifier,
      cash_details: payment.cashDetails,
      external_details: payment.externalDetails,
      customer_details: payment.customerDetails
    });
    return response.data.payment;
  }

  async completePayment(paymentId: string, versionToken?: string): Promise<SquarePayment> {
    let response = await this.axios.post(`/payments/${paymentId}/complete`, {
      version_token: versionToken
    });
    return response.data.payment;
  }

  async cancelPayment(paymentId: string): Promise<SquarePayment> {
    let response = await this.axios.post(`/payments/${paymentId}/cancel`);
    return response.data.payment;
  }

  async updatePayment(
    paymentId: string,
    params: {
      idempotencyKey: string;
      amountMoney?: { amount: number; currency: string };
      tipMoney?: { amount: number; currency: string };
      versionToken?: string;
    }
  ): Promise<SquarePayment> {
    let response = await this.axios.put(`/payments/${paymentId}`, {
      idempotency_key: params.idempotencyKey,
      payment: {
        amount_money: params.amountMoney,
        tip_money: params.tipMoney,
        version_token: params.versionToken
      }
    });
    return response.data.payment;
  }

  async cancelPaymentByIdempotencyKey(idempotencyKey: string): Promise<void> {
    await this.axios.post('/payments/cancel', { idempotency_key: idempotencyKey });
  }

  // ─── Refunds ───

  async listRefunds(params?: {
    beginTime?: string;
    endTime?: string;
    sortOrder?: string;
    cursor?: string;
    locationId?: string;
    status?: string;
    sourceType?: string;
    limit?: number;
    updatedAtBeginTime?: string;
    updatedAtEndTime?: string;
    sortField?: string;
  }): Promise<{ refunds: SquareRefund[]; cursor?: string }> {
    let response = await this.axios.get('/refunds', {
      params: {
        begin_time: params?.beginTime,
        end_time: params?.endTime,
        sort_order: params?.sortOrder,
        cursor: params?.cursor,
        location_id: params?.locationId,
        status: params?.status,
        source_type: params?.sourceType,
        limit: params?.limit,
        updated_at_begin_time: params?.updatedAtBeginTime,
        updated_at_end_time: params?.updatedAtEndTime,
        sort_field: params?.sortField
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
    appFeeMoney?: { amount: number; currency: string };
    appFeeAllocations?: Record<string, any>[];
    paymentVersionToken?: string;
  }): Promise<SquareRefund> {
    let response = await this.axios.post('/refunds', {
      idempotency_key: params.idempotencyKey,
      payment_id: params.paymentId,
      amount_money: params.amountMoney,
      reason: params.reason,
      app_fee_money: params.appFeeMoney,
      app_fee_allocations: params.appFeeAllocations,
      payment_version_token: params.paymentVersionToken
    });
    return response.data.refund;
  }

  // ─── Orders ───

  async createOrder(order: {
    locationId: string;
    state?: 'OPEN' | 'DRAFT';
    lineItems?: Record<string, any>[];
    taxes?: Record<string, any>[];
    discounts?: Record<string, any>[];
    fulfillments?: Record<string, any>[];
    serviceCharges?: Record<string, any>[];
    customerId?: string;
    referenceId?: string;
    idempotencyKey?: string;
  }): Promise<SquareOrder> {
    let response = await this.axios.post('/orders', {
      idempotency_key: order.idempotencyKey,
      order: {
        location_id: order.locationId,
        state: order.state,
        line_items: order.lineItems,
        taxes: order.taxes,
        discounts: order.discounts,
        fulfillments: order.fulfillments,
        service_charges: order.serviceCharges,
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
      order: params.order,
      fields_to_clear: params.fieldsToClear,
      idempotency_key: params.idempotencyKey
    });
    return response.data.order;
  }

  async payOrder(
    orderId: string,
    params: {
      idempotencyKey: string;
      paymentIds?: string[];
      orderVersion?: number;
    }
  ): Promise<SquareOrder> {
    let response = await this.axios.post(`/orders/${orderId}/pay`, {
      idempotency_key: params.idempotencyKey,
      payment_ids: params.paymentIds,
      order_version: params.orderVersion
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
      givenName?: string | null;
      familyName?: string | null;
      companyName?: string | null;
      nickname?: string | null;
      emailAddress?: string | null;
      phoneNumber?: string | null;
      address?: Record<string, any> | null;
      note?: string | null;
      referenceId?: string | null;
      birthday?: string | null;
      version?: number;
    }
  ): Promise<SquareCustomer> {
    let response = await this.axios.put(
      `/customers/${customerId}`,
      {
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
      },
      { headers: { 'X-Clear-Null': 'true' } }
    );
    return response.data.customer;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.axios.delete(`/customers/${customerId}`);
  }

  async searchCustomers(params: {
    cursor?: string;
    limit?: number;
    query?: Record<string, any>;
    count?: boolean;
  }): Promise<{ customers: SquareCustomer[]; cursor?: string; count?: number }> {
    let response = await this.axios.post('/customers/search', {
      cursor: params.cursor,
      limit: params.limit,
      query: params.query,
      count: params.count
    });
    return {
      customers: response.data.customers || [],
      cursor: response.data.cursor,
      count: response.data.count
    };
  }

  // ─── Catalog ───

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
  }): Promise<{
    object: SquareCatalogObject;
    idMappings: { clientObjectId?: string; objectId?: string }[];
  }> {
    let response = await this.axios.post('/catalog/object', {
      idempotency_key: params.idempotencyKey,
      object: params.object
    });
    return {
      object: response.data.catalog_object,
      idMappings: (response.data.id_mappings || []).map(
        (mapping: { client_object_id?: string; object_id?: string }) => ({
          clientObjectId: mapping.client_object_id,
          objectId: mapping.object_id
        })
      )
    };
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
  }): Promise<{
    objects: SquareCatalogObject[];
    relatedObjects: SquareCatalogObject[];
    cursor?: string;
  }> {
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
      relatedObjects: response.data.related_objects || [],
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
  }): Promise<{
    items: SquareCatalogObject[];
    matchedVariationIds: string[];
    cursor?: string;
  }> {
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
      matchedVariationIds: response.data.matched_variation_ids || [],
      cursor: response.data.cursor
    };
  }

  // ─── Inventory ───

  async batchChangeInventory(params: {
    idempotencyKey: string;
    ignoreUnchangedCounts?: boolean;
    changes: {
      type: string;
      physical_count?: Record<string, any>;
      adjustment?: Record<string, any>;
    }[];
  }): Promise<{ counts: SquareInventoryCount[] }> {
    let response = await this.axios.post('/inventory/changes/batch-create', {
      idempotency_key: params.idempotencyKey,
      changes: params.changes,
      ignore_unchanged_counts: params.ignoreUnchangedCounts
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
    limit?: number;
  }): Promise<{ counts: SquareInventoryCount[]; cursor?: string }> {
    let response = await this.axios.post('/inventory/counts/batch-retrieve', {
      catalog_object_ids: params.catalogObjectIds,
      location_ids: params.locationIds,
      cursor: params.cursor,
      states: params.states,
      updated_after: params.updatedAfter,
      limit: params.limit
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

  async searchInvoices(params: {
    query: Record<string, any>;
    cursor?: string;
    limit?: number;
  }): Promise<{ invoices: SquareInvoice[]; cursor?: string }> {
    let response = await this.axios.post('/invoices/search', {
      query: params.query,
      cursor: params.cursor,
      limit: params.limit
    });
    return {
      invoices: response.data.invoices || [],
      cursor: response.data.cursor
    };
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

  // ─── Merchants ───

  async getMerchant(merchantId: string = 'me'): Promise<Record<string, any>> {
    let response = await this.axios.get(`/merchants/${merchantId}`);
    return response.data.merchant;
  }
}
