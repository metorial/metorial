import {
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxios
} from 'slates';
import {
  assertPrecisionRuntime,
  exactId,
  fail,
  parseEnvelope,
  parseProviderJson,
  pathValue,
  record,
  safePaystackError,
  sanitizeMetadata,
  validateRequest,
  validateToken
} from './transport';

export class PaystackClient {
  private axios;
  private token: string;
  constructor(config: { token: string }) {
    validateToken(config.token);
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.paystack.co',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30_000,
      maxRedirects: 0
    });
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options: Record<string, unknown> = {}
  ) {
    let params =
      method === 'GET' && typeof options.params === 'object' && options.params !== null
        ? options.params
        : undefined;
    let data = method === 'GET' ? undefined : pickDefined(options);
    validateRequest(url, params ?? data ?? {});
    assertPrecisionRuntime();
    let response = await requestAxios(
      'request',
      () =>
        this.axios.request<unknown>({
          method,
          url,
          params,
          data,
          transformResponse: [parseProviderJson]
        }),
      safePaystackError
    );
    return parseEnvelope(sanitizeMetadata(response.data, this.token), response.status);
  }

  private listParams(
    params:
      | { useCursor?: boolean; next?: string; previous?: string; [key: string]: unknown }
      | undefined
  ) {
    if (!params) return {};
    const { useCursor, ...rest } = params;
    return {
      ...rest,
      use_cursor:
        useCursor ??
        (params.next !== undefined || params.previous !== undefined ? true : undefined)
    };
  }

  async updateCustomerProfile(
    customerCode: string,
    params: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      metadata?: Record<string, unknown>;
      riskAction?: 'default' | 'allow' | 'deny';
    }
  ) {
    const profile = pickDefined({
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      metadata: params.metadata
    });
    if (!Object.keys(profile).length && params.riskAction === undefined)
      throw fail('Provide a profile change or riskAction.');
    let result = Object.keys(profile).length
      ? await this.updateCustomer(customerCode, profile)
      : await this.getCustomer(customerCode);
    if (params.riskAction !== undefined) {
      try {
        await this.setCustomerRiskAction(customerCode, params.riskAction);
      } catch (error) {
        throw createApiServiceError(
          'Customer profile changes may have succeeded, but the risk action could not be confirmed. Read the customer and reconcile before retrying.',
          {
            reason: 'paystack.partial_customer_update',
            upstreamStatus: safePaystackError(error, 'customer risk action').data
              .upstreamStatus
          }
        );
      }
      result = await this.getCustomer(customerCode);
    }
    return result;
  }

  async getBalance() {
    return this.request('GET', '/balance');
  }
  async archivePaymentRequest(code: string) {
    return this.request('POST', `/paymentrequest/archive/${pathValue(code)}`);
  }

  // ── Transactions ──────────────────────────────────────────────

  async initializeTransaction(params: {
    email: string;
    amount: number;
    currency?: string;
    reference?: string;
    callbackUrl?: string;
    plan?: string;
    invoiceLimit?: number;
    metadata?: Record<string, unknown>;
    channels?: string[];
    splitCode?: string;
    subaccount?: string;
    transactionCharge?: number;
    bearer?: string;
  }) {
    return this.request('POST', '/transaction/initialize', {
      email: params.email,
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      plan: params.plan,
      invoice_limit: params.invoiceLimit,
      metadata: params.metadata === undefined ? undefined : JSON.stringify(params.metadata),
      channels: params.channels,
      split_code: params.splitCode,
      subaccount: params.subaccount,
      transaction_charge: params.transactionCharge,
      bearer: params.bearer
    });
  }

  async verifyTransaction(reference: string) {
    return this.request('GET', `/transaction/verify/${pathValue(reference)}`);
  }

  async getTransaction(transactionId: string) {
    return this.request('GET', `/transaction/${pathValue(transactionId)}`);
  }

  async listTransactions(params?: {
    useCursor?: boolean;
    next?: string;
    previous?: string;
    perPage?: number;
    page?: number;
    customer?: string;
    status?: string;
    from?: string;
    to?: string;
    amount?: number;
  }) {
    return this.request('GET', '/transaction', { params: this.listParams(params) });
  }

  async chargeAuthorization(params: {
    email: string;
    amount: number;
    authorizationCode: string;
    currency?: string;
    reference?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request('POST', '/transaction/charge_authorization', {
      email: params.email,
      amount: params.amount,
      authorization_code: params.authorizationCode,
      currency: params.currency,
      reference: params.reference,
      metadata: params.metadata === undefined ? undefined : JSON.stringify(params.metadata)
    });
  }

  // ── Customers ─────────────────────────────────────────────────

  async createCustomer(params: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request('POST', '/customer', {
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone,
      metadata: params.metadata
    });
  }

  async listCustomers(params?: {
    useCursor?: boolean;
    next?: string;
    previous?: string;
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    return this.request('GET', '/customer', { params: this.listParams(params) });
  }

  async getCustomer(emailOrCode: string) {
    return this.request('GET', `/customer/${pathValue(emailOrCode)}`);
  }

  async updateCustomer(
    customerCode: string,
    params: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.request('PUT', `/customer/${pathValue(customerCode)}`, {
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone,
      metadata: params.metadata
    });
  }

  async setCustomerRiskAction(customerCode: string, riskAction: 'default' | 'allow' | 'deny') {
    return this.request('POST', '/customer/set_risk_action', {
      customer: customerCode,
      risk_action: riskAction
    });
  }

  // ── Plans ─────────────────────────────────────────────────────

  async createPlan(params: {
    name: string;
    amount: number;
    interval: string;
    description?: string;
    currency?: string;
    invoiceLimit?: number;
    sendInvoices?: boolean;
    sendSms?: boolean;
  }) {
    return this.request('POST', '/plan', {
      name: params.name,
      amount: params.amount,
      interval: params.interval,
      description: params.description,
      currency: params.currency,
      invoice_limit: params.invoiceLimit,
      send_invoices: params.sendInvoices,
      send_sms: params.sendSms
    });
  }

  async listPlans(params?: {
    perPage?: number;
    page?: number;
    status?: string;
    interval?: string;
    amount?: number;
  }) {
    return this.request('GET', '/plan', { params });
  }

  async getPlan(planIdOrCode: string) {
    return this.request('GET', `/plan/${pathValue(planIdOrCode)}`);
  }

  async updatePlan(
    planIdOrCode: string,
    params: {
      updateExistingSubscriptions?: boolean;
      name?: string;
      amount?: number;
      interval?: string;
      description?: string;
      currency?: string;
      invoiceLimit?: number;
      sendInvoices?: boolean;
      sendSms?: boolean;
    }
  ) {
    return this.request('PUT', `/plan/${pathValue(planIdOrCode)}`, {
      update_existing_subscriptions: params.updateExistingSubscriptions,
      name: params.name,
      amount: params.amount,
      interval: params.interval,
      description: params.description,
      currency: params.currency,
      invoice_limit: params.invoiceLimit,
      send_invoices: params.sendInvoices,
      send_sms: params.sendSms
    });
  }

  // ── Subscriptions ─────────────────────────────────────────────

  async createSubscription(params: {
    customer: string;
    plan: string;
    authorization?: string;
    startDate?: string;
  }) {
    return this.request('POST', '/subscription', {
      customer: params.customer,
      plan: params.plan,
      authorization: params.authorization,
      start_date: params.startDate
    });
  }

  async listSubscriptions(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    plan?: string;
  }) {
    return this.request('GET', '/subscription', { params });
  }

  async getSubscription(subscriptionIdOrCode: string) {
    return this.request('GET', `/subscription/${pathValue(subscriptionIdOrCode)}`);
  }

  async enableSubscription(params: { code: string; token: string }) {
    return this.request('POST', '/subscription/enable', {
      code: params.code,
      token: params.token
    });
  }

  async disableSubscription(params: { code: string; token: string }) {
    return this.request('POST', '/subscription/disable', {
      code: params.code,
      token: params.token
    });
  }

  // ── Transfer Recipients ───────────────────────────────────────

  async createTransferRecipient(params: {
    type: string;
    name: string;
    accountNumber?: string;
    bankCode?: string;
    authorizationCode?: string;
    email?: string;
    currency?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (params.type === 'authorization') {
      if (!params.authorizationCode?.trim() || !params.email?.trim())
        throw fail(
          'authorization recipients require authorizationCode and its bound email from a reusable payment authorization.'
        );
    } else if (!params.accountNumber?.trim() || !params.bankCode?.trim())
      throw fail('Bank and mobile-money recipients require accountNumber and bankCode.');
    return this.request('POST', '/transferrecipient', {
      type: params.type,
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      authorization_code: params.authorizationCode,
      email: params.email,
      currency: params.currency,
      description: params.description,
      metadata: params.metadata
    });
  }

  async listTransferRecipients(params?: {
    useCursor?: boolean;
    next?: string;
    previous?: string;
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    return this.request('GET', '/transferrecipient', { params: this.listParams(params) });
  }

  async getTransferRecipient(recipientIdOrCode: string) {
    return this.request('GET', `/transferrecipient/${pathValue(recipientIdOrCode)}`);
  }

  async deleteTransferRecipient(recipientIdOrCode: string) {
    return this.request('DELETE', `/transferrecipient/${pathValue(recipientIdOrCode)}`);
  }

  // ── Transfers ─────────────────────────────────────────────────

  async initiateTransfer(params: {
    source: string;
    amount: number;
    recipient: string;
    reason?: string;
    currency?: string;
    reference?: string;
  }) {
    return this.request('POST', '/transfer', {
      source: params.source,
      amount: params.amount,
      recipient: params.recipient,
      reason: params.reason,
      currency: params.currency,
      reference: params.reference
    });
  }

  async listTransfers(params?: {
    useCursor?: boolean;
    next?: string;
    previous?: string;
    perPage?: number;
    page?: number;
    customer?: string;
    from?: string;
    to?: string;
  }) {
    return this.request('GET', '/transfer', { params: this.listParams(params) });
  }

  async getTransfer(transferIdOrCode: string) {
    return this.request('GET', `/transfer/${pathValue(transferIdOrCode)}`);
  }

  async verifyTransfer(reference: string) {
    return this.request('GET', `/transfer/verify/${pathValue(reference)}`);
  }

  // ── Refunds ───────────────────────────────────────────────────

  async createRefund(params: {
    transaction: string;
    amount?: number;
    currency?: string;
    customerNote?: string;
    merchantNote?: string;
  }) {
    return this.request('POST', '/refund', {
      transaction: params.transaction,
      amount: params.amount,
      currency: params.currency,
      customer_note: params.customerNote,
      merchant_note: params.merchantNote
    });
  }

  async listRefunds(params?: {
    perPage?: number;
    page?: number;
    reference?: string;
    currency?: string;
    from?: string;
    to?: string;
  }) {
    let transaction: string | undefined;
    if (params?.reference !== undefined) {
      validateRequest('/refund', { reference: params.reference });
      const tx = record((await this.verifyTransaction(params.reference)).data);
      if (tx.reference !== params.reference)
        throw createApiServiceError('Paystack returned a different transaction reference.', {
          reason: 'paystack.invalid_response'
        });
      transaction = exactId(tx.id);
    }
    return this.request('GET', '/refund', {
      params: {
        perPage: params?.perPage,
        page: params?.page,
        transaction,
        currency: params?.currency,
        from: params?.from,
        to: params?.to
      }
    });
  }

  // ── Settlements ───────────────────────────────────────────────

  async listSettlements(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
    subaccount?: string;
  }) {
    return this.request('GET', '/settlement', { params });
  }

  // ── Payment Pages ─────────────────────────────────────────────

  async createPaymentPage(params: {
    name: string;
    description?: string;
    amount?: number;
    slug?: string;
    metadata?: Record<string, unknown>;
    redirectUrl?: string;
    customFields?: Record<string, unknown>[];
  }) {
    return this.request('POST', '/page', {
      name: params.name,
      description: params.description,
      amount: params.amount,
      slug: params.slug,
      metadata: params.metadata,
      redirect_url: params.redirectUrl,
      custom_fields: params.customFields
    });
  }

  async listPaymentPages(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    return this.request('GET', '/page', { params });
  }

  async getPaymentPage(pageIdOrSlug: string) {
    return this.request('GET', `/page/${pathValue(pageIdOrSlug)}`);
  }

  async updatePaymentPage(
    pageIdOrSlug: string,
    params: {
      name?: string;
      description?: string;
      amount?: number;
      active?: boolean;
    }
  ) {
    return this.request('PUT', `/page/${pathValue(pageIdOrSlug)}`, {
      name: params.name,
      description: params.description,
      amount: params.amount,
      active: params.active
    });
  }

  // ── Subaccounts ───────────────────────────────────────────────

  async createSubaccount(params: {
    businessName: string;
    settlementBank: string;
    accountNumber: string;
    percentageCharge: number;
    description?: string;
    primaryContactEmail?: string;
    primaryContactName?: string;
    primaryContactPhone?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request('POST', '/subaccount', {
      business_name: params.businessName,
      settlement_bank: params.settlementBank,
      account_number: params.accountNumber,
      percentage_charge: params.percentageCharge,
      description: params.description,
      primary_contact_email: params.primaryContactEmail,
      primary_contact_name: params.primaryContactName,
      primary_contact_phone: params.primaryContactPhone,
      metadata: params.metadata
    });
  }

  async listSubaccounts(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    return this.request('GET', '/subaccount', { params });
  }

  async getSubaccount(subaccountIdOrCode: string) {
    return this.request('GET', `/subaccount/${pathValue(subaccountIdOrCode)}`);
  }

  // ── Dedicated Virtual Accounts ────────────────────────────────

  async createDedicatedVirtualAccount(params: {
    customer: string;
    preferredBank?: string;
    subaccount?: string;
    splitCode?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    return this.request('POST', '/dedicated_account', {
      customer: params.customer,
      preferred_bank: params.preferredBank,
      subaccount: params.subaccount,
      split_code: params.splitCode,
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone
    });
  }

  async listDedicatedVirtualAccounts(params?: {
    useCursor?: boolean;
    next?: string;
    previous?: string;
    perPage?: number;
    page?: number;
    active?: boolean;
    currency?: string;
    providerSlug?: string;
    bankId?: string;
    customer?: string;
  }) {
    return this.request('GET', '/dedicated_account', {
      params: {
        use_cursor:
          params?.useCursor ??
          (params?.next !== undefined || params?.previous !== undefined ? true : undefined),
        next: params?.next,
        previous: params?.previous,
        perPage: params?.perPage,
        page: params?.page,
        active: params?.active,
        currency: params?.currency,
        provider_slug: params?.providerSlug,
        bank_id: params?.bankId,
        customer: params?.customer
      }
    });
  }

  async getDedicatedVirtualAccount(dedicatedAccountId: string) {
    return this.request('GET', `/dedicated_account/${pathValue(dedicatedAccountId)}`);
  }

  async deactivateDedicatedVirtualAccount(dedicatedAccountId: string) {
    return this.request('DELETE', `/dedicated_account/${pathValue(dedicatedAccountId)}`);
  }

  // ── Disputes ──────────────────────────────────────────────────

  async listDisputes(params?: {
    useCursor?: boolean;
    next?: string;
    previous?: string;
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
    transaction?: string;
    status?: string;
  }) {
    return this.request('GET', '/dispute', { params: this.listParams(params) });
  }

  async getDispute(disputeId: string) {
    return this.request('GET', `/dispute/${pathValue(disputeId)}`);
  }

  async resolveDispute(
    disputeId: string,
    params: {
      resolution: string;
      message: string;
      refundAmount?: number;
      uploadedFilename?: string;
      evidence?: number;
    }
  ) {
    if (params.refundAmount === undefined || !params.uploadedFilename?.trim())
      throw fail(
        'Provide refundAmount and uploadedFilename from the documented dispute evidence upload flow.'
      );
    return this.request('PUT', `/dispute/${pathValue(disputeId)}/resolve`, {
      resolution: params.resolution,
      message: params.message,
      refund_amount: params.refundAmount,
      uploaded_filename: params.uploadedFilename,
      evidence: params.evidence
    });
  }

  // ── Invoices / Payment Requests ───────────────────────────────

  async createPaymentRequest(params: {
    customer: string;
    amount: number;
    dueDate?: string;
    description?: string;
    currency?: string;
    lineItems?: Array<{ name: string; amount: number; quantity: number }>;
    tax?: Array<{ name: string; amount: number }>;
    sendNotification?: boolean;
    draft?: boolean;
    hasInvoice?: boolean;
    invoiceNumber?: number;
    splitCode?: string;
  }) {
    validateRequest('/paymentrequest', { amount: params.amount });
    return this.request('POST', '/paymentrequest', {
      customer: params.customer,
      amount: params.lineItems?.length || params.tax?.length ? undefined : params.amount,
      due_date: params.dueDate,
      description: params.description,
      currency: params.currency,
      line_items: params.lineItems,
      tax: params.tax,
      send_notification: params.sendNotification,
      draft: params.draft,
      has_invoice: params.hasInvoice,
      invoice_number: params.invoiceNumber,
      split_code: params.splitCode
    });
  }

  async listPaymentRequests(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    status?: string;
    currency?: string;
    from?: string;
    to?: string;
    includeArchive?: boolean;
  }) {
    let customer = params?.customer;
    if (customer?.startsWith('CUS_'))
      customer = exactId(record((await this.getCustomer(customer)).data).id);
    return this.request('GET', '/paymentrequest', {
      params: {
        ...params,
        customer,
        include_archive:
          params?.includeArchive === undefined ? undefined : String(params.includeArchive),
        includeArchive: undefined
      }
    });
  }

  async getPaymentRequest(paymentRequestIdOrCode: string) {
    return this.request('GET', `/paymentrequest/${pathValue(paymentRequestIdOrCode)}`);
  }

  // ── Verification ──────────────────────────────────────────────

  async resolveAccountNumber(params: { accountNumber: string; bankCode: string }) {
    return this.request('GET', '/bank/resolve', {
      params: {
        account_number: params.accountNumber,
        bank_code: params.bankCode
      }
    });
  }

  async resolveBin(bin: string) {
    if (!/^\d{6}$/.test(bin))
      throw fail(
        'Provide exactly the first six digits of a card number; never send the full card number.'
      );
    return this.request('GET', `/decision/bin/${pathValue(bin)}`);
  }

  async listBanks(params?: {
    country?: string;
    useCursor?: boolean;
    perPage?: number;
    next?: string;
    previous?: string;
    gateway?: string;
    type?: string;
    currency?: string;
  }) {
    return this.request('GET', '/bank', {
      params: {
        country: params?.country === 'south-africa' ? 'south africa' : params?.country,
        use_cursor:
          params?.useCursor ??
          (params?.next !== undefined || params?.previous !== undefined ? true : undefined),
        perPage: params?.perPage,
        next: params?.next,
        previous: params?.previous,
        gateway: params?.gateway,
        type: params?.type,
        currency: params?.currency
      }
    });
  }
}
