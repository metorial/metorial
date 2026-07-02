import { createAxios } from '@slates/provider';
import { paypalApiError } from './errors';

let getBaseUrl = (environment?: string) =>
  environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

let createPayPalAxios = (config: Parameters<typeof createAxios>[0]) => {
  let client = createAxios(config);
  client.interceptors.response.use(
    response => response,
    error => Promise.reject(paypalApiError(error))
  );
  return client;
};

export class PayPalClient {
  private axios: ReturnType<typeof createAxios>;
  private token: string;
  private clientId: string;
  private clientSecret: string;
  private environment: string;

  constructor(config: {
    token: string;
    clientId: string;
    clientSecret: string;
    environment?: string;
  }) {
    this.token = config.token;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.environment = config.environment || 'production';
    this.axios = createPayPalAxios({
      baseURL: getBaseUrl(this.environment),
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Token Refresh ──────────────────────────────────────────

  async refreshToken(): Promise<string> {
    let baseUrl = getBaseUrl(this.environment);
    let client = createPayPalAxios({ baseURL: baseUrl });
    let credentials = btoa(`${this.clientId}:${this.clientSecret}`);

    let response = await client.post('/v1/oauth2/token', 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    let data = response.data as { access_token: string };
    this.token = data.access_token;
    this.axios = createPayPalAxios({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return this.token;
  }

  // ─── Orders ─────────────────────────────────────────────────

  async createOrder(params: {
    intent: 'CAPTURE' | 'AUTHORIZE';
    purchaseUnits: Array<{
      reference_id?: string;
      amount: { currency_code: string; value: string; breakdown?: Record<string, any> };
      description?: string;
      items?: Record<string, any>[];
      shipping?: Record<string, any>;
      payee?: Record<string, any>;
    }>;
    paymentSource?: Record<string, any>;
    applicationContext?: Record<string, any>;
  }): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      intent: params.intent,
      purchase_units: params.purchaseUnits
    };
    if (params.paymentSource) body.payment_source = params.paymentSource;
    if (params.applicationContext) body.application_context = params.applicationContext;

    let response = await this.axios.post('/v2/checkout/orders', body);
    return response.data as Record<string, any>;
  }

  async getOrder(orderId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v2/checkout/orders/${orderId}`);
    return response.data as Record<string, any>;
  }

  async captureOrder(orderId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/v2/checkout/orders/${orderId}/capture`, {});
    return response.data as Record<string, any>;
  }

  async authorizeOrder(orderId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/v2/checkout/orders/${orderId}/authorize`, {});
    return response.data as Record<string, any>;
  }

  async addOrderTracking(
    orderId: string,
    params: {
      captureId: string;
      trackingNumber: string;
      carrier?: string;
      carrierNameOther?: string;
      notifyPayer?: boolean;
      items?: Record<string, any>[];
    }
  ): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      capture_id: params.captureId,
      tracking_number: params.trackingNumber
    };
    if (params.carrier) body.carrier = params.carrier;
    if (params.carrierNameOther) body.carrier_name_other = params.carrierNameOther;
    if (params.notifyPayer !== undefined) body.notify_payer = params.notifyPayer;
    if (params.items) body.items = params.items;

    let response = await this.axios.post(`/v2/checkout/orders/${orderId}/track`, body);
    return response.data as Record<string, any>;
  }

  // ─── Payments (Authorizations, Captures, Refunds) ───────────

  async getAuthorization(authorizationId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v2/payments/authorizations/${authorizationId}`);
    return response.data as Record<string, any>;
  }

  async captureAuthorization(
    authorizationId: string,
    params?: {
      amount?: { currency_code: string; value: string };
      finalCapture?: boolean;
      invoiceId?: string;
      noteToPayer?: string;
    }
  ): Promise<Record<string, any>> {
    let body: Record<string, any> = {};
    if (params?.amount) body.amount = params.amount;
    if (params?.finalCapture !== undefined) body.final_capture = params.finalCapture;
    if (params?.invoiceId) body.invoice_id = params.invoiceId;
    if (params?.noteToPayer) body.note_to_payer = params.noteToPayer;

    let response = await this.axios.post(
      `/v2/payments/authorizations/${authorizationId}/capture`,
      body
    );
    return response.data as Record<string, any>;
  }

  async voidAuthorization(authorizationId: string): Promise<void> {
    await this.axios.post(`/v2/payments/authorizations/${authorizationId}/void`, {});
  }

  async reauthorize(
    authorizationId: string,
    amount: { currency_code: string; value: string }
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/v2/payments/authorizations/${authorizationId}/reauthorize`,
      { amount }
    );
    return response.data as Record<string, any>;
  }

  async getCapture(captureId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v2/payments/captures/${captureId}`);
    return response.data as Record<string, any>;
  }

  async refundCapture(
    captureId: string,
    params?: {
      amount?: { currency_code: string; value: string };
      invoiceId?: string;
      noteToPayer?: string;
    }
  ): Promise<Record<string, any>> {
    let body: Record<string, any> = {};
    if (params?.amount) body.amount = params.amount;
    if (params?.invoiceId) body.invoice_id = params.invoiceId;
    if (params?.noteToPayer) body.note_to_payer = params.noteToPayer;

    let response = await this.axios.post(`/v2/payments/captures/${captureId}/refund`, body);
    return response.data as Record<string, any>;
  }

  async getRefund(refundId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v2/payments/refunds/${refundId}`);
    return response.data as Record<string, any>;
  }

  // ─── Subscriptions ──────────────────────────────────────────

  async createProduct(params: {
    name: string;
    description?: string;
    type: 'PHYSICAL' | 'DIGITAL' | 'SERVICE';
    category?: string;
    imageUrl?: string;
    homeUrl?: string;
  }): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      name: params.name,
      type: params.type
    };
    if (params.description) body.description = params.description;
    if (params.category) body.category = params.category;
    if (params.imageUrl) body.image_url = params.imageUrl;
    if (params.homeUrl) body.home_url = params.homeUrl;

    let response = await this.axios.post('/v1/catalogs/products', body);
    return response.data as Record<string, any>;
  }

  async listProducts(params?: {
    page?: number;
    pageSize?: number;
    totalRequired?: boolean;
  }): Promise<Record<string, any>> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.totalRequired) query.total_required = params.totalRequired;

    let response = await this.axios.get('/v1/catalogs/products', { params: query });
    return response.data as Record<string, any>;
  }

  async getProduct(productId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v1/catalogs/products/${productId}`);
    return response.data as Record<string, any>;
  }

  async createPlan(params: {
    productId: string;
    name: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    billingCycles: Array<{
      frequency: { interval_unit: string; interval_count: number };
      tenure_type: 'REGULAR' | 'TRIAL';
      sequence: number;
      total_cycles?: number;
      pricing_scheme: { fixed_price: { currency_code: string; value: string } };
    }>;
    paymentPreferences?: Record<string, any>;
    taxes?: Record<string, any>;
  }): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      product_id: params.productId,
      name: params.name,
      billing_cycles: params.billingCycles
    };
    if (params.description) body.description = params.description;
    if (params.status) body.status = params.status;
    if (params.paymentPreferences) body.payment_preferences = params.paymentPreferences;
    if (params.taxes) body.taxes = params.taxes;

    let response = await this.axios.post('/v1/billing/plans', body);
    return response.data as Record<string, any>;
  }

  async listPlans(params?: {
    productId?: string;
    page?: number;
    pageSize?: number;
    totalRequired?: boolean;
  }): Promise<Record<string, any>> {
    let query: Record<string, any> = {};
    if (params?.productId) query.product_id = params.productId;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.totalRequired) query.total_required = params.totalRequired;

    let response = await this.axios.get('/v1/billing/plans', { params: query });
    return response.data as Record<string, any>;
  }

  async getPlan(planId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v1/billing/plans/${planId}`);
    return response.data as Record<string, any>;
  }

  async activatePlan(planId: string): Promise<void> {
    await this.axios.post(`/v1/billing/plans/${planId}/activate`, {});
  }

  async deactivatePlan(planId: string): Promise<void> {
    await this.axios.post(`/v1/billing/plans/${planId}/deactivate`, {});
  }

  async createSubscription(params: {
    planId: string;
    startTime?: string;
    subscriber?: Record<string, any>;
    applicationContext?: Record<string, any>;
    customId?: string;
  }): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      plan_id: params.planId
    };
    if (params.startTime) body.start_time = params.startTime;
    if (params.subscriber) body.subscriber = params.subscriber;
    if (params.applicationContext) body.application_context = params.applicationContext;
    if (params.customId) body.custom_id = params.customId;

    let response = await this.axios.post('/v1/billing/subscriptions', body);
    return response.data as Record<string, any>;
  }

  async getSubscription(subscriptionId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v1/billing/subscriptions/${subscriptionId}`);
    return response.data as Record<string, any>;
  }

  async suspendSubscription(subscriptionId: string, reason: string): Promise<void> {
    await this.axios.post(`/v1/billing/subscriptions/${subscriptionId}/suspend`, { reason });
  }

  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    await this.axios.post(`/v1/billing/subscriptions/${subscriptionId}/cancel`, { reason });
  }

  async activateSubscription(subscriptionId: string, reason: string): Promise<void> {
    await this.axios.post(`/v1/billing/subscriptions/${subscriptionId}/activate`, { reason });
  }

  async listSubscriptionTransactions(
    subscriptionId: string,
    params: {
      startTime: string;
      endTime: string;
    }
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/v1/billing/subscriptions/${subscriptionId}/transactions`,
      {
        params: { start_time: params.startTime, end_time: params.endTime }
      }
    );
    return response.data as Record<string, any>;
  }

  async listSubscriptions(params?: {
    planIds?: string[];
    statuses?: string[];
    createdAfter?: string;
    createdBefore?: string;
    statusUpdatedAfter?: string;
    statusUpdatedBefore?: string;
    page?: number;
    pageSize?: number;
    totalRequired?: boolean;
  }): Promise<Record<string, any>> {
    let query: Record<string, any> = {};
    if (params?.planIds?.length) query.plan_ids = params.planIds.join(',');
    if (params?.statuses?.length) query.statuses = params.statuses.join(',');
    if (params?.createdAfter) query.created_after = params.createdAfter;
    if (params?.createdBefore) query.created_before = params.createdBefore;
    if (params?.statusUpdatedAfter) query.status_updated_after = params.statusUpdatedAfter;
    if (params?.statusUpdatedBefore) query.status_updated_before = params.statusUpdatedBefore;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.totalRequired) query.total_required = params.totalRequired;

    let response = await this.axios.get('/v1/billing/subscriptions', { params: query });
    return response.data as Record<string, any>;
  }

  // ─── Invoicing ──────────────────────────────────────────────

  async createInvoice(params: {
    detail: {
      invoice_number?: string;
      invoice_date?: string;
      currency_code: string;
      note?: string;
      term?: string;
      memo?: string;
      payment_term?: Record<string, any>;
    };
    invoicer?: Record<string, any>;
    primaryRecipients?: Record<string, any>[];
    items?: Array<{
      name: string;
      quantity: string;
      unit_amount: { currency_code: string; value: string };
      description?: string;
      tax?: Record<string, any>;
      unit_of_measure?: string;
    }>;
    configuration?: Record<string, any>;
    amount?: Record<string, any>;
  }): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      detail: params.detail
    };
    if (params.invoicer) body.invoicer = params.invoicer;
    if (params.primaryRecipients) body.primary_recipients = params.primaryRecipients;
    if (params.items) body.items = params.items;
    if (params.configuration) body.configuration = params.configuration;
    if (params.amount) body.amount = params.amount;

    let response = await this.axios.post('/v2/invoicing/invoices', body);
    return response.data as Record<string, any>;
  }

  async listInvoices(params?: {
    page?: number;
    pageSize?: number;
    totalRequired?: boolean;
    fields?: string;
  }): Promise<Record<string, any>> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.totalRequired) query.total_required = params.totalRequired;
    if (params?.fields) query.fields = params.fields;

    let response = await this.axios.get('/v2/invoicing/invoices', { params: query });
    return response.data as Record<string, any>;
  }

  async getInvoice(invoiceId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v2/invoicing/invoices/${invoiceId}`);
    return response.data as Record<string, any>;
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    await this.axios.delete(`/v2/invoicing/invoices/${invoiceId}`);
  }

  async searchInvoices(
    body: Record<string, any>,
    params?: {
      page?: number;
      pageSize?: number;
      totalRequired?: boolean;
    }
  ): Promise<Record<string, any>> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.totalRequired) query.total_required = params.totalRequired;

    let response = await this.axios.post('/v2/invoicing/search-invoices', body, {
      params: query
    });
    return response.data as Record<string, any>;
  }

  async sendInvoice(
    invoiceId: string,
    params?: {
      subject?: string;
      note?: string;
      sendToInvoicer?: boolean;
      sendToRecipient?: boolean;
      additionalRecipients?: string[];
    }
  ): Promise<void> {
    let body: Record<string, any> = {};
    if (params?.subject) body.subject = params.subject;
    if (params?.note) body.note = params.note;
    if (params?.sendToInvoicer !== undefined) body.send_to_invoicer = params.sendToInvoicer;
    if (params?.sendToRecipient !== undefined) body.send_to_recipient = params.sendToRecipient;
    if (params?.additionalRecipients) body.additional_recipients = params.additionalRecipients;

    await this.axios.post(`/v2/invoicing/invoices/${invoiceId}/send`, body);
  }

  async cancelInvoice(
    invoiceId: string,
    params?: {
      subject?: string;
      note?: string;
      sendToInvoicer?: boolean;
      sendToRecipient?: boolean;
    }
  ): Promise<void> {
    let body: Record<string, any> = {};
    if (params?.subject) body.subject = params.subject;
    if (params?.note) body.note = params.note;
    if (params?.sendToInvoicer !== undefined) body.send_to_invoicer = params.sendToInvoicer;
    if (params?.sendToRecipient !== undefined) body.send_to_recipient = params.sendToRecipient;

    await this.axios.post(`/v2/invoicing/invoices/${invoiceId}/cancel`, body);
  }

  async recordInvoicePayment(
    invoiceId: string,
    params: {
      method:
        | 'BANK_TRANSFER'
        | 'CASH'
        | 'CHECK'
        | 'CREDIT_CARD'
        | 'DEBIT_CARD'
        | 'PAYPAL'
        | 'WIRE_TRANSFER'
        | 'OTHER';
      date?: string;
      paymentId?: string;
      amount?: { currency_code: string; value: string };
      note?: string;
    }
  ): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      method: params.method
    };
    if (params.date) body.payment_date = params.date;
    if (params.paymentId) body.payment_id = params.paymentId;
    if (params.amount) body.amount = params.amount;
    if (params.note) body.note = params.note;

    let response = await this.axios.post(`/v2/invoicing/invoices/${invoiceId}/payments`, body);
    return response.data as Record<string, any>;
  }

  async deleteInvoicePayment(invoiceId: string, transactionId: string): Promise<void> {
    await this.axios.delete(`/v2/invoicing/invoices/${invoiceId}/payments/${transactionId}`);
  }

  async recordInvoiceRefund(
    invoiceId: string,
    params: {
      method:
        | 'BANK_TRANSFER'
        | 'CASH'
        | 'CHECK'
        | 'CREDIT_CARD'
        | 'DEBIT_CARD'
        | 'PAYPAL'
        | 'WIRE_TRANSFER'
        | 'OTHER';
      refundDate?: string;
      refundId?: string;
      amount?: { currency_code: string; value: string };
      note?: string;
    }
  ): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      method: params.method
    };
    if (params.refundDate) body.refund_date = params.refundDate;
    if (params.refundId) body.refund_id = params.refundId;
    if (params.amount) body.amount = params.amount;
    if (params.note) body.note = params.note;

    let response = await this.axios.post(`/v2/invoicing/invoices/${invoiceId}/refunds`, body);
    return response.data as Record<string, any>;
  }

  async deleteInvoiceRefund(invoiceId: string, transactionId: string): Promise<void> {
    await this.axios.delete(`/v2/invoicing/invoices/${invoiceId}/refunds/${transactionId}`);
  }

  async generateInvoiceNumber(): Promise<string> {
    let response = await this.axios.post('/v2/invoicing/generate-next-invoice-number', {});
    let data = response.data as { invoice_number: string };
    return data.invoice_number;
  }

  // ─── Payouts ────────────────────────────────────────────────

  async createBatchPayout(params: {
    senderBatchHeader: {
      sender_batch_id: string;
      email_subject?: string;
      email_message?: string;
      recipient_type?: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
    };
    items: Array<{
      recipient_type?: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
      amount: { currency: string; value: string };
      receiver: string;
      note?: string;
      sender_item_id?: string;
    }>;
  }): Promise<Record<string, any>> {
    let response = await this.axios.post('/v1/payments/payouts', {
      sender_batch_header: params.senderBatchHeader,
      items: params.items
    });
    return response.data as Record<string, any>;
  }

  async getPayoutBatch(
    payoutBatchId: string,
    params?: { page?: number; pageSize?: number; fields?: string }
  ): Promise<Record<string, any>> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.fields) query.fields = params.fields;

    let response = await this.axios.get(`/v1/payments/payouts/${payoutBatchId}`, {
      params: query
    });
    return response.data as Record<string, any>;
  }

  async getPayoutItem(payoutItemId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v1/payments/payouts-item/${payoutItemId}`);
    return response.data as Record<string, any>;
  }

  async cancelPayoutItem(payoutItemId: string): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/v1/payments/payouts-item/${payoutItemId}/cancel`,
      {}
    );
    return response.data as Record<string, any>;
  }

  // ─── Disputes ───────────────────────────────────────────────

  async listDisputes(params?: {
    startTime?: string;
    disputeState?: string;
    pageSize?: number;
    nextPageToken?: string;
    disputedTransactionId?: string;
  }): Promise<Record<string, any>> {
    let query: Record<string, any> = {};
    if (params?.startTime) query.start_time = params.startTime;
    if (params?.disputeState) query.dispute_state = params.disputeState;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.nextPageToken) query.next_page_token = params.nextPageToken;
    if (params?.disputedTransactionId)
      query.disputed_transaction_id = params.disputedTransactionId;

    let response = await this.axios.get('/v1/customer/disputes', { params: query });
    return response.data as Record<string, any>;
  }

  async getDispute(disputeId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v1/customer/disputes/${disputeId}`);
    return response.data as Record<string, any>;
  }

  async acceptDisputeClaim(
    disputeId: string,
    params?: {
      note?: string;
      acceptClaimReason?: string;
      invoiceId?: string;
      refundAmount?: { currency_code: string; value: string };
    }
  ): Promise<Record<string, any>> {
    let body: Record<string, any> = {};
    if (params?.note) body.note = params.note;
    if (params?.acceptClaimReason) body.accept_claim_reason = params.acceptClaimReason;
    if (params?.invoiceId) body.invoice_id = params.invoiceId;
    if (params?.refundAmount) body.refund_amount = params.refundAmount;

    let response = await this.axios.post(
      `/v1/customer/disputes/${disputeId}/accept-claim`,
      body
    );
    return response.data as Record<string, any>;
  }

  async provideDisputeEvidence(
    disputeId: string,
    params: {
      evidences: Array<{
        evidence_type: string;
        notes?: string;
        evidence_info?: Record<string, any>;
      }>;
    }
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/v1/customer/disputes/${disputeId}/provide-evidence`,
      params
    );
    return response.data as Record<string, any>;
  }

  async escalateDispute(disputeId: string, note: string): Promise<Record<string, any>> {
    let response = await this.axios.post(`/v1/customer/disputes/${disputeId}/escalate`, {
      note
    });
    return response.data as Record<string, any>;
  }

  // ─── Transaction Search ─────────────────────────────────────

  async searchTransactions(params: {
    startDate: string;
    endDate: string;
    transactionStatus?: string;
    transactionType?: string;
    transactionAmount?: string;
    transactionCurrency?: string;
    transactionId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Record<string, any>> {
    let query: Record<string, any> = {
      start_date: params.startDate,
      end_date: params.endDate
    };
    if (params.transactionStatus) query.transaction_status = params.transactionStatus;
    if (params.transactionType) query.transaction_type = params.transactionType;
    if (params.transactionAmount) query.transaction_amount = params.transactionAmount;
    if (params.transactionCurrency) query.transaction_currency = params.transactionCurrency;
    if (params.transactionId) query.transaction_id = params.transactionId;
    if (params.page) query.page = params.page;
    if (params.pageSize) query.page_size = params.pageSize;

    let response = await this.axios.get('/v1/reporting/transactions', { params: query });
    return response.data as Record<string, any>;
  }

  // ─── Shipment Tracking ──────────────────────────────────────

  async addTracking(
    captureId: string,
    params: {
      trackingNumber: string;
      carrier: string;
      notifyPayer?: boolean;
      status?: string;
    }
  ): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      trackers: [
        {
          transaction_id: captureId,
          tracking_number: params.trackingNumber,
          carrier: params.carrier,
          status: params.status || 'SHIPPED',
          notify_buyer: params.notifyPayer !== undefined ? params.notifyPayer : false
        }
      ]
    };

    let response = await this.axios.post('/v1/shipping/trackers-batch', body);
    return response.data as Record<string, any>;
  }

  async getTracking(trackerId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v1/shipping/trackers/${trackerId}`);
    return response.data as Record<string, any>;
  }

  // ─── Webhooks ───────────────────────────────────────────────

  async createWebhook(params: {
    url: string;
    eventTypes: string[];
  }): Promise<Record<string, any>> {
    let body = {
      url: params.url,
      event_types: params.eventTypes.map(t => ({ name: t }))
    };

    let response = await this.axios.post('/v1/notifications/webhooks', body);
    return response.data as Record<string, any>;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/v1/notifications/webhooks/${webhookId}`);
  }

  async listWebhooks(): Promise<Record<string, any>> {
    let response = await this.axios.get('/v1/notifications/webhooks');
    return response.data as Record<string, any>;
  }

  async getWebhook(webhookId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v1/notifications/webhooks/${webhookId}`);
    return response.data as Record<string, any>;
  }

  async verifyWebhookSignature(params: {
    authAlgo: string;
    certUrl: string;
    transmissionId: string;
    transmissionSig: string;
    transmissionTime: string;
    webhookId: string;
    webhookEvent: Record<string, any>;
  }): Promise<{ verificationStatus: string }> {
    let response = await this.axios.post('/v1/notifications/verify-webhook-signature', {
      auth_algo: params.authAlgo,
      cert_url: params.certUrl,
      transmission_id: params.transmissionId,
      transmission_sig: params.transmissionSig,
      transmission_time: params.transmissionTime,
      webhook_id: params.webhookId,
      webhook_event: params.webhookEvent
    });
    let data = response.data as { verification_status: string };
    return { verificationStatus: data.verification_status };
  }

  async listWebhookEventTypes(): Promise<Array<{ name: string; description: string }>> {
    let response = await this.axios.get('/v1/notifications/webhooks-event-types');
    let data = response.data as { event_types: Array<{ name: string; description: string }> };
    return data.event_types;
  }

  // ─── Payment Tokens (Vault) ─────────────────────────────────

  async createPaymentToken(params: {
    paymentSource: Record<string, any>;
    customer?: { id?: string };
  }): Promise<Record<string, any>> {
    let body: Record<string, any> = {
      payment_source: params.paymentSource
    };
    if (params.customer) body.customer = params.customer;

    let response = await this.axios.post('/v3/vault/payment-tokens', body);
    return response.data as Record<string, any>;
  }

  async listPaymentTokens(customerId: string): Promise<Record<string, any>> {
    let response = await this.axios.get('/v3/vault/payment-tokens', {
      params: { customer_id: customerId }
    });
    return response.data as Record<string, any>;
  }

  async getPaymentToken(tokenId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/v3/vault/payment-tokens/${tokenId}`);
    return response.data as Record<string, any>;
  }

  async deletePaymentToken(tokenId: string): Promise<void> {
    await this.axios.delete(`/v3/vault/payment-tokens/${tokenId}`);
  }
}
