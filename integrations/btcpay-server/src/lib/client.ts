import { buildApiServiceError, createAuthenticatedAxios } from 'slates';
import { providerTimestamp } from './values';

export class BTCPayClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string; instanceUrl: string }) {
    let baseUrl = params.instanceUrl.replace(/\/+$/, '');
    this.axios = createAuthenticatedAxios({
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BTCPay Server',
          reason: 'btcpay_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['message', 'code', 'path'],
          extractUpstreamCode: (_input, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.code === 'string'
              ? response.data.code
              : undefined
        }),
      paramsSerializer: { indexes: null },
      baseURL: baseUrl,
      headers: {
        Authorization: `token ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Stores ----

  async getStores(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/api/v1/stores');
    return response.data;
  }

  async getStore(storeId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/v1/stores/${encodeURIComponent(storeId)}`);
    return response.data;
  }

  async createStore(params: {
    name: string;
    defaultCurrency?: string;
    networkFeeMode?: string;
    speedPolicy?: string;
    website?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { name: params.name };
    if (params.defaultCurrency !== undefined) body.defaultCurrency = params.defaultCurrency;
    if (params.networkFeeMode !== undefined) body.networkFeeMode = params.networkFeeMode;
    if (params.speedPolicy !== undefined) body.speedPolicy = params.speedPolicy;
    if (params.website !== undefined) body.website = params.website;
    let response = await this.axios.post('/api/v1/stores', body);
    return response.data;
  }

  async updateStore(
    storeId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/api/v1/stores/${encodeURIComponent(storeId)}`,
      params
    );
    return response.data;
  }

  async deleteStore(storeId: string): Promise<void> {
    await this.axios.delete(`/api/v1/stores/${encodeURIComponent(storeId)}`);
  }

  // ---- Invoices ----

  async getInvoices(
    storeId: string,
    params?: {
      status?: string[];
      orderId?: string[];
      textSearch?: string;
      startDate?: string;
      endDate?: string;
      take?: number;
      skip?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    let query: Record<string, unknown> = {};
    if (params?.status) query.status = params.status;
    if (params?.orderId) query.orderId = params.orderId;
    if (params?.textSearch) query.textSearch = params.textSearch;
    if (params?.startDate) query.startDate = providerTimestamp(params.startDate);
    if (params?.endDate) query.endDate = providerTimestamp(params.endDate);
    if (params?.take !== undefined) query.take = params.take;
    if (params?.skip !== undefined) query.skip = params.skip;
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/invoices`,
      {
        params: query
      }
    );
    return response.data;
  }

  async getInvoice(storeId: string, invoiceId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/invoices/${encodeURIComponent(invoiceId)}`
    );
    return response.data;
  }

  async createInvoice(
    storeId: string,
    params: {
      amount?: number | string;
      currency?: string;
      orderId?: string;
      buyerEmail?: string;
      metadata?: Record<string, unknown>;
      checkout?: Record<string, unknown>;
      expirationMinutes?: number;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.amount !== undefined) body.amount = String(params.amount);
    if (params.currency !== undefined) body.currency = params.currency;
    if (params.orderId !== undefined) {
      body.metadata = { ...(params.metadata || {}), orderId: params.orderId };
    } else if (params.metadata !== undefined) {
      body.metadata = params.metadata;
    }
    if (params.buyerEmail !== undefined) {
      body.metadata = {
        ...((body.metadata as Record<string, unknown>) || {}),
        buyerEmail: params.buyerEmail
      };
    }
    if (params.checkout !== undefined) body.checkout = params.checkout;
    if (params.expirationMinutes !== undefined)
      body.checkout = {
        ...((body.checkout as Record<string, unknown>) || {}),
        expirationMinutes: params.expirationMinutes
      };
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/invoices`,
      body
    );
    return response.data;
  }

  async markInvoiceStatus(
    storeId: string,
    invoiceId: string,
    status: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/invoices/${encodeURIComponent(invoiceId)}/status`,
      { status }
    );
    return response.data;
  }

  async getInvoicePaymentMethods(
    storeId: string,
    invoiceId: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/invoices/${encodeURIComponent(invoiceId)}/payment-methods`
    );
    return response.data;
  }

  async refundInvoice(
    storeId: string,
    invoiceId: string,
    params?: {
      refundVariant?: string;
      paymentMethod?: string;
      name?: string;
      description?: string;
      subtractPercentage?: number;
      customAmount?: number;
      customCurrency?: string;
      payoutMethods?: string[];
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params?.refundVariant !== undefined) body.refundVariant = params.refundVariant;
    if (params?.paymentMethod !== undefined) body.paymentMethod = params.paymentMethod;
    if (params?.name !== undefined) body.name = params.name;
    if (params?.description !== undefined) body.description = params.description;
    if (params?.subtractPercentage !== undefined)
      body.subtractPercentage = String(params.subtractPercentage);
    if (params?.customAmount !== undefined) body.customAmount = String(params.customAmount);
    if (params?.customCurrency !== undefined) body.customCurrency = params.customCurrency;
    if (params?.payoutMethods !== undefined) body.payoutMethods = params.payoutMethods;
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/invoices/${encodeURIComponent(invoiceId)}/refund`,
      body
    );
    return response.data;
  }

  // ---- On-Chain Wallet ----

  async getWalletBalance(
    storeId: string,
    cryptoCode: string = 'BTC'
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-methods/${encodeURIComponent(`${cryptoCode}-CHAIN`)}/wallet`
    );
    return response.data;
  }

  async getWalletTransactions(
    storeId: string,
    cryptoCode: string = 'BTC',
    params?: {
      statusFilter?: string[];
      labelFilter?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<Record<string, unknown>[]> {
    let query: Record<string, unknown> = {};
    if (params?.statusFilter) query.statusFilter = params.statusFilter;
    if (params?.labelFilter) query.labelFilter = params.labelFilter;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.skip !== undefined) query.skip = params.skip;
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-methods/${encodeURIComponent(`${cryptoCode}-CHAIN`)}/wallet/transactions`,
      { params: query }
    );
    return response.data;
  }

  async createWalletAddress(
    storeId: string,
    cryptoCode: string = 'BTC'
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-methods/${encodeURIComponent(`${cryptoCode}-CHAIN`)}/wallet/address`
    );
    return response.data;
  }

  async createWalletTransaction(
    storeId: string,
    cryptoCode: string,
    params: {
      destination: string;
      amount: string;
      feeRate?: number;
      subtractFeeFromAmount?: boolean;
      noChange?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      destinations: [
        {
          destination: params.destination,
          amount: params.amount,
          ...(params.subtractFeeFromAmount !== undefined
            ? { subtractFromAmount: params.subtractFeeFromAmount }
            : {})
        }
      ]
    };
    if (params.feeRate !== undefined) body.feerate = params.feeRate;
    if (params.noChange !== undefined) body.noChange = params.noChange;
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-methods/${encodeURIComponent(`${cryptoCode}-CHAIN`)}/wallet/transactions`,
      body
    );
    return response.data;
  }

  // ---- Lightning ----

  async getLightningBalance(
    storeId: string,
    cryptoCode: string = 'BTC'
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/lightning/${encodeURIComponent(cryptoCode)}/balance`
    );
    return response.data;
  }

  async createLightningInvoice(
    storeId: string,
    cryptoCode: string,
    params: {
      amount: string;
      description?: string;
      expiry?: number;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { amount: params.amount };
    if (params.description !== undefined) body.description = params.description;
    if (params.expiry !== undefined) body.expiry = params.expiry;
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/lightning/${encodeURIComponent(cryptoCode)}/invoices`,
      body
    );
    return response.data;
  }

  async getLightningInvoice(
    storeId: string,
    cryptoCode: string,
    lightningInvoiceId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/lightning/${encodeURIComponent(cryptoCode)}/invoices/${encodeURIComponent(lightningInvoiceId)}`
    );
    return response.data;
  }

  async payLightningInvoice(
    storeId: string,
    cryptoCode: string,
    bolt11: string,
    params?: {
      maxFeePercent?: number;
      maxFeeFlat?: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { BOLT11: bolt11 };
    if (params?.maxFeePercent !== undefined) body.maxFeePercent = String(params.maxFeePercent);
    if (params?.maxFeeFlat !== undefined) body.maxFeeFlat = params.maxFeeFlat;
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/lightning/${encodeURIComponent(cryptoCode)}/invoices/pay`,
      body
    );
    return response.data;
  }

  async getLightningChannels(
    storeId: string,
    cryptoCode: string = 'BTC'
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/lightning/${encodeURIComponent(cryptoCode)}/channels`
    );
    return response.data;
  }

  // ---- Payment Requests ----

  async getPaymentRequests(storeId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-requests`
    );
    return response.data;
  }

  async getPaymentRequest(
    storeId: string,
    paymentRequestId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-requests/${encodeURIComponent(paymentRequestId)}`
    );
    return response.data;
  }

  async createPaymentRequest(
    storeId: string,
    params: {
      title: string;
      amount: number;
      currency?: string;
      description?: string;
      email?: string;
      expiryDate?: string;
      allowCustomPaymentAmounts?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      title: params.title,
      amount: String(params.amount)
    };
    if (params.currency !== undefined) body.currency = params.currency;
    if (params.description !== undefined) body.description = params.description;
    if (params.email !== undefined) body.email = params.email;
    if (params.expiryDate !== undefined)
      body.expiryDate = providerTimestamp(params.expiryDate);
    if (params.allowCustomPaymentAmounts !== undefined)
      body.allowCustomPaymentAmounts = params.allowCustomPaymentAmounts;
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-requests`,
      body
    );
    return response.data;
  }

  async updatePaymentRequest(
    storeId: string,
    paymentRequestId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-requests/${encodeURIComponent(paymentRequestId)}`,
      params
    );
    return response.data;
  }

  async archivePaymentRequest(storeId: string, paymentRequestId: string): Promise<void> {
    await this.axios.delete(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-requests/${encodeURIComponent(paymentRequestId)}`
    );
  }

  // ---- Pull Payments ----

  async getPullPayments(
    storeId: string,
    params?: {
      includeArchived?: boolean;
    }
  ): Promise<Record<string, unknown>[]> {
    let query: Record<string, unknown> = {};
    if (params?.includeArchived !== undefined) query.includeArchived = params.includeArchived;
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/pull-payments`,
      {
        params: query
      }
    );
    return response.data;
  }

  async createPullPayment(
    storeId: string,
    params: {
      name: string;
      amount: string;
      currency: string;
      paymentMethods?: string[];
      period?: number;
      startsAt?: string;
      expiresAt?: string;
      autoApproveClaims?: boolean;
      payoutMethods?: string[];
      description?: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name,
      amount: params.amount,
      currency: params.currency
    };
    if (params.paymentMethods !== undefined) body.paymentMethods = params.paymentMethods;
    if (params.payoutMethods !== undefined) body.payoutMethods = params.payoutMethods;
    if (params.description !== undefined) body.description = params.description;
    if (params.period !== undefined) body.period = params.period;
    if (params.startsAt !== undefined) body.startsAt = providerTimestamp(params.startsAt);
    if (params.expiresAt !== undefined) body.expiresAt = providerTimestamp(params.expiresAt);
    if (params.autoApproveClaims !== undefined)
      body.autoApproveClaims = params.autoApproveClaims;
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/pull-payments`,
      body
    );
    return response.data;
  }

  async archivePullPayment(storeId: string, pullPaymentId: string): Promise<void> {
    await this.axios.delete(
      `/api/v1/stores/${encodeURIComponent(storeId)}/pull-payments/${encodeURIComponent(pullPaymentId)}`
    );
  }

  // ---- Payouts ----

  async getPayouts(
    storeId: string,
    params?: {
      includeCancelled?: boolean;
      paymentMethodId?: string;
    }
  ): Promise<Record<string, unknown>[]> {
    let query: Record<string, unknown> = {};
    if (params?.includeCancelled !== undefined)
      query.includeCancelled = params.includeCancelled;
    if (params?.paymentMethodId !== undefined) query.paymentMethodId = params.paymentMethodId;
    let response = await this.axios.get(`/api/v1/stores/${storeId}/payouts`, {
      params: query
    });
    return response.data;
  }

  async approvePayout(storeId: string, payoutId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/api/v1/stores/${storeId}/payouts/${payoutId}`, {
      approved: true
    });
    return response.data;
  }

  async cancelPayout(storeId: string, payoutId: string): Promise<void> {
    await this.axios.delete(`/api/v1/stores/${storeId}/payouts/${payoutId}`);
  }

  async markPayoutPaid(storeId: string, payoutId: string): Promise<void> {
    await this.axios.post(`/api/v1/stores/${storeId}/payouts/${payoutId}/mark-paid`);
  }

  // ---- Webhooks ----

  async getWebhooks(storeId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/webhooks`
    );
    return response.data;
  }

  async createWebhook(
    storeId: string,
    params: {
      url: string;
      authorizedEvents?: {
        everything?: boolean;
        specificEvents?: string[];
      };
      secret?: string;
      enabled?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { url: params.url };
    if (params.authorizedEvents !== undefined) body.authorizedEvents = params.authorizedEvents;
    if (params.secret !== undefined) body.secret = params.secret;
    if (params.enabled !== undefined) body.enabled = params.enabled;
    let response = await this.axios.post(
      `/api/v1/stores/${encodeURIComponent(storeId)}/webhooks`,
      body
    );
    return response.data;
  }

  async updateWebhook(
    storeId: string,
    webhookId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/api/v1/stores/${encodeURIComponent(storeId)}/webhooks/${encodeURIComponent(webhookId)}`,
      params
    );
    return response.data;
  }

  async deleteWebhook(storeId: string, webhookId: string): Promise<void> {
    await this.axios.delete(
      `/api/v1/stores/${encodeURIComponent(storeId)}/webhooks/${encodeURIComponent(webhookId)}`
    );
  }

  // ---- Notifications ----

  async getNotifications(params?: {
    seen?: boolean;
    skip?: number;
    take?: number;
  }): Promise<Record<string, unknown>[]> {
    let query: Record<string, unknown> = {};
    if (params?.seen !== undefined) query.seen = params.seen;
    if (params?.skip !== undefined) query.skip = params.skip;
    if (params?.take !== undefined) query.take = params.take;
    let response = await this.axios.get('/api/v1/users/me/notifications', { params: query });
    return response.data;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.axios.put(
      `/api/v1/users/me/notifications/${encodeURIComponent(notificationId)}`,
      { seen: true }
    );
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.axios.delete(
      `/api/v1/users/me/notifications/${encodeURIComponent(notificationId)}`
    );
  }

  // ---- Server Info ----

  async getServerInfo(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/v1/server/info');
    return response.data;
  }

  // ---- Users ----

  async getCurrentUser(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/v1/users/me');
    return response.data;
  }

  // ---- Store Payment Methods ----

  async getStorePaymentMethods(storeId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/api/v1/stores/${encodeURIComponent(storeId)}/payment-methods`
    );
    return response.data;
  }

  async manageInvoice(
    storeId: string,
    invoiceId: string,
    action: string,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown> | undefined> {
    let path = `/api/v1/stores/${encodeURIComponent(storeId)}/invoices/${encodeURIComponent(invoiceId)}`;
    if (action === 'archive') {
      await this.axios.delete(path);
      return;
    }
    if (action === 'update') return (await this.axios.put(path, body)).data;
    return (
      await this.axios.post(
        `${path}/${action === 'mark_status' ? 'status' : 'unarchive'}`,
        body
      )
    ).data;
  }

  async payoutClaim(
    storeId: string,
    action: string,
    payoutId?: string,
    body?: Record<string, unknown>,
    includeCancelled?: boolean
  ): Promise<unknown> {
    let path = `/api/v1/stores/${encodeURIComponent(storeId)}/payouts`;
    if (action === 'list')
      return (await this.axios.get(path, { params: { includeCancelled } })).data;
    if (action === 'create') return (await this.axios.post(path, body)).data;
    path += `/${encodeURIComponent(payoutId!)}`;
    if (action === 'get') return (await this.axios.get(path)).data;
    if (action === 'cancel') {
      await this.axios.delete(path);
      return;
    }
    return (await this.axios.post(action === 'mark_paid' ? `${path}/mark-paid` : path, body))
      .data;
  }

  async getWalletDetails(
    storeId: string,
    cryptoCode: string,
    action: string,
    transactionId?: string,
    blockTarget?: number
  ): Promise<unknown> {
    let path = `/api/v1/stores/${encodeURIComponent(storeId)}/payment-methods/${encodeURIComponent(`${cryptoCode}-CHAIN`)}/wallet`;
    if (action === 'get_transaction')
      path += `/transactions/${encodeURIComponent(transactionId!)}`;
    else path += action === 'fee_rate' ? '/feerate' : '/utxos';
    return (await this.axios.get(path, { params: { blockTarget } })).data;
  }

  async getLightningDetails(
    storeId: string,
    cryptoCode: string,
    action: string,
    params: {
      paymentHash?: string;
      pendingOnly?: boolean;
      includePending?: boolean;
      offsetIndex?: number;
    }
  ): Promise<unknown> {
    let path = `/api/v1/stores/${encodeURIComponent(storeId)}/lightning/${encodeURIComponent(cryptoCode)}`;
    if (action === 'get_payment')
      path += `/payments/${encodeURIComponent(params.paymentHash!)}`;
    else
      path +=
        action === 'list_invoices'
          ? '/invoices'
          : action === 'list_payments'
            ? '/payments'
            : '/info';
    let { paymentHash: _paymentHash, ...query } = params;
    return (await this.axios.get(path, { params: query })).data;
  }
}
