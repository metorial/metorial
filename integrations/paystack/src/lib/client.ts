import { createAxios } from 'slates';

export class PaystackClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
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
    metadata?: Record<string, any>;
    channels?: string[];
    splitCode?: string;
    subaccount?: string;
    transactionCharge?: number;
    bearer?: string;
  }) {
    let { data } = await this.axios.post('/transaction/initialize', {
      email: params.email,
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      plan: params.plan,
      invoice_limit: params.invoiceLimit,
      metadata: params.metadata,
      channels: params.channels,
      split_code: params.splitCode,
      subaccount: params.subaccount,
      transaction_charge: params.transactionCharge,
      bearer: params.bearer
    });
    return data;
  }

  async verifyTransaction(reference: string) {
    let { data } = await this.axios.get(
      `/transaction/verify/${encodeURIComponent(reference)}`
    );
    return data;
  }

  async getTransaction(transactionId: string) {
    let { data } = await this.axios.get(`/transaction/${encodeURIComponent(transactionId)}`);
    return data;
  }

  async listTransactions(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    status?: string;
    from?: string;
    to?: string;
    amount?: number;
  }) {
    let { data } = await this.axios.get('/transaction', { params });
    return data;
  }

  async chargeAuthorization(params: {
    email: string;
    amount: number;
    authorizationCode: string;
    currency?: string;
    reference?: string;
    metadata?: Record<string, any>;
  }) {
    let { data } = await this.axios.post('/transaction/charge_authorization', {
      email: params.email,
      amount: params.amount,
      authorization_code: params.authorizationCode,
      currency: params.currency,
      reference: params.reference,
      metadata: params.metadata
    });
    return data;
  }

  async exportTransactions(params?: {
    from?: string;
    to?: string;
    customer?: string;
    status?: string;
    currency?: string;
    amount?: number;
    settled?: boolean;
    settlement?: string;
    paymentPage?: string;
  }) {
    let { data } = await this.axios.get('/transaction/export', {
      params: {
        from: params?.from,
        to: params?.to,
        customer: params?.customer,
        status: params?.status,
        currency: params?.currency,
        amount: params?.amount,
        settled: params?.settled,
        settlement: params?.settlement,
        payment_page: params?.paymentPage
      }
    });
    return data;
  }

  async getTransactionTotals(params?: { from?: string; to?: string }) {
    let { data } = await this.axios.get('/transaction/totals', { params });
    return data;
  }

  // ── Customers ─────────────────────────────────────────────────

  async createCustomer(params: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    metadata?: Record<string, any>;
  }) {
    let { data } = await this.axios.post('/customer', {
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone,
      metadata: params.metadata
    });
    return data;
  }

  async listCustomers(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/customer', { params });
    return data;
  }

  async getCustomer(emailOrCode: string) {
    let { data } = await this.axios.get(`/customer/${encodeURIComponent(emailOrCode)}`);
    return data;
  }

  async updateCustomer(
    customerCode: string,
    params: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      metadata?: Record<string, any>;
    }
  ) {
    let { data } = await this.axios.put(`/customer/${encodeURIComponent(customerCode)}`, {
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone,
      metadata: params.metadata
    });
    return data;
  }

  async validateCustomer(
    customerCode: string,
    params: {
      country: string;
      type: string;
      accountNumber: string;
      bvn: string;
      bankCode: string;
      firstName: string;
      lastName: string;
    }
  ) {
    let { data } = await this.axios.post(
      `/customer/${encodeURIComponent(customerCode)}/identification`,
      {
        country: params.country,
        type: params.type,
        account_number: params.accountNumber,
        bvn: params.bvn,
        bank_code: params.bankCode,
        first_name: params.firstName,
        last_name: params.lastName
      }
    );
    return data;
  }

  async setCustomerRiskAction(customerCode: string, riskAction: 'default' | 'allow' | 'deny') {
    let { data } = await this.axios.post('/customer/set_risk_action', {
      customer: customerCode,
      risk_action: riskAction
    });
    return data;
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
    let { data } = await this.axios.post('/plan', {
      name: params.name,
      amount: params.amount,
      interval: params.interval,
      description: params.description,
      currency: params.currency,
      invoice_limit: params.invoiceLimit,
      send_invoices: params.sendInvoices,
      send_sms: params.sendSms
    });
    return data;
  }

  async listPlans(params?: {
    perPage?: number;
    page?: number;
    status?: string;
    interval?: string;
    amount?: number;
  }) {
    let { data } = await this.axios.get('/plan', { params });
    return data;
  }

  async getPlan(planIdOrCode: string) {
    let { data } = await this.axios.get(`/plan/${encodeURIComponent(planIdOrCode)}`);
    return data;
  }

  async updatePlan(
    planIdOrCode: string,
    params: {
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
    let { data } = await this.axios.put(`/plan/${encodeURIComponent(planIdOrCode)}`, {
      name: params.name,
      amount: params.amount,
      interval: params.interval,
      description: params.description,
      currency: params.currency,
      invoice_limit: params.invoiceLimit,
      send_invoices: params.sendInvoices,
      send_sms: params.sendSms
    });
    return data;
  }

  // ── Subscriptions ─────────────────────────────────────────────

  async createSubscription(params: {
    customer: string;
    plan: string;
    authorization?: string;
    startDate?: string;
  }) {
    let { data } = await this.axios.post('/subscription', {
      customer: params.customer,
      plan: params.plan,
      authorization: params.authorization,
      start_date: params.startDate
    });
    return data;
  }

  async listSubscriptions(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    plan?: string;
  }) {
    let { data } = await this.axios.get('/subscription', { params });
    return data;
  }

  async getSubscription(subscriptionIdOrCode: string) {
    let { data } = await this.axios.get(
      `/subscription/${encodeURIComponent(subscriptionIdOrCode)}`
    );
    return data;
  }

  async enableSubscription(params: { code: string; token: string }) {
    let { data } = await this.axios.post('/subscription/enable', {
      code: params.code,
      token: params.token
    });
    return data;
  }

  async disableSubscription(params: { code: string; token: string }) {
    let { data } = await this.axios.post('/subscription/disable', {
      code: params.code,
      token: params.token
    });
    return data;
  }

  // ── Transfer Recipients ───────────────────────────────────────

  async createTransferRecipient(params: {
    type: string;
    name: string;
    accountNumber: string;
    bankCode: string;
    currency?: string;
    description?: string;
    metadata?: Record<string, any>;
  }) {
    let { data } = await this.axios.post('/transferrecipient', {
      type: params.type,
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: params.currency,
      description: params.description,
      metadata: params.metadata
    });
    return data;
  }

  async listTransferRecipients(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/transferrecipient', { params });
    return data;
  }

  async getTransferRecipient(recipientIdOrCode: string) {
    let { data } = await this.axios.get(
      `/transferrecipient/${encodeURIComponent(recipientIdOrCode)}`
    );
    return data;
  }

  async deleteTransferRecipient(recipientIdOrCode: string) {
    let { data } = await this.axios.delete(
      `/transferrecipient/${encodeURIComponent(recipientIdOrCode)}`
    );
    return data;
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
    let { data } = await this.axios.post('/transfer', {
      source: params.source,
      amount: params.amount,
      recipient: params.recipient,
      reason: params.reason,
      currency: params.currency,
      reference: params.reference
    });
    return data;
  }

  async initiateBulkTransfer(params: {
    source: string;
    transfers: Array<{
      amount: number;
      recipient: string;
      reason?: string;
      reference?: string;
    }>;
  }) {
    let { data } = await this.axios.post('/transfer/bulk', {
      source: params.source,
      transfers: params.transfers
    });
    return data;
  }

  async listTransfers(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/transfer', { params });
    return data;
  }

  async getTransfer(transferIdOrCode: string) {
    let { data } = await this.axios.get(`/transfer/${encodeURIComponent(transferIdOrCode)}`);
    return data;
  }

  async verifyTransfer(reference: string) {
    let { data } = await this.axios.get(`/transfer/verify/${encodeURIComponent(reference)}`);
    return data;
  }

  // ── Refunds ───────────────────────────────────────────────────

  async createRefund(params: {
    transaction: string;
    amount?: number;
    currency?: string;
    customerNote?: string;
    merchantNote?: string;
  }) {
    let { data } = await this.axios.post('/refund', {
      transaction: params.transaction,
      amount: params.amount,
      currency: params.currency,
      customer_note: params.customerNote,
      merchant_note: params.merchantNote
    });
    return data;
  }

  async listRefunds(params?: {
    perPage?: number;
    page?: number;
    reference?: string;
    currency?: string;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/refund', { params });
    return data;
  }

  async getRefund(refundId: string) {
    let { data } = await this.axios.get(`/refund/${encodeURIComponent(refundId)}`);
    return data;
  }

  // ── Settlements ───────────────────────────────────────────────

  async listSettlements(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
    subaccount?: string;
  }) {
    let { data } = await this.axios.get('/settlement', { params });
    return data;
  }

  async getSettlementTransactions(
    settlementId: string,
    params?: {
      perPage?: number;
      page?: number;
      from?: string;
      to?: string;
    }
  ) {
    let { data } = await this.axios.get(
      `/settlement/${encodeURIComponent(settlementId)}/transactions`,
      { params }
    );
    return data;
  }

  // ── Payment Pages ─────────────────────────────────────────────

  async createPaymentPage(params: {
    name: string;
    description?: string;
    amount?: number;
    slug?: string;
    metadata?: Record<string, any>;
    redirectUrl?: string;
    customFields?: Record<string, any>[];
  }) {
    let { data } = await this.axios.post('/page', {
      name: params.name,
      description: params.description,
      amount: params.amount,
      slug: params.slug,
      metadata: params.metadata,
      redirect_url: params.redirectUrl,
      custom_fields: params.customFields
    });
    return data;
  }

  async listPaymentPages(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/page', { params });
    return data;
  }

  async getPaymentPage(pageIdOrSlug: string) {
    let { data } = await this.axios.get(`/page/${encodeURIComponent(pageIdOrSlug)}`);
    return data;
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
    let { data } = await this.axios.put(`/page/${encodeURIComponent(pageIdOrSlug)}`, {
      name: params.name,
      description: params.description,
      amount: params.amount,
      active: params.active
    });
    return data;
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
    metadata?: Record<string, any>;
  }) {
    let { data } = await this.axios.post('/subaccount', {
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
    return data;
  }

  async listSubaccounts(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/subaccount', { params });
    return data;
  }

  async getSubaccount(subaccountIdOrCode: string) {
    let { data } = await this.axios.get(
      `/subaccount/${encodeURIComponent(subaccountIdOrCode)}`
    );
    return data;
  }

  async updateSubaccount(
    subaccountIdOrCode: string,
    params: {
      businessName?: string;
      settlementBank?: string;
      accountNumber?: string;
      percentageCharge?: number;
      description?: string;
      primaryContactEmail?: string;
      primaryContactName?: string;
      primaryContactPhone?: string;
      active?: boolean;
      settlementSchedule?: string;
      metadata?: Record<string, any>;
    }
  ) {
    let { data } = await this.axios.put(
      `/subaccount/${encodeURIComponent(subaccountIdOrCode)}`,
      {
        business_name: params.businessName,
        settlement_bank: params.settlementBank,
        account_number: params.accountNumber,
        percentage_charge: params.percentageCharge,
        description: params.description,
        primary_contact_email: params.primaryContactEmail,
        primary_contact_name: params.primaryContactName,
        primary_contact_phone: params.primaryContactPhone,
        active: params.active,
        settlement_schedule: params.settlementSchedule,
        metadata: params.metadata
      }
    );
    return data;
  }

  // ── Transaction Splits ────────────────────────────────────────

  async createTransactionSplit(params: {
    name: string;
    type: string;
    currency: string;
    subaccounts: Array<{
      subaccount: string;
      share: number;
    }>;
    bearerType: string;
    bearerSubaccount?: string;
  }) {
    let { data } = await this.axios.post('/split', {
      name: params.name,
      type: params.type,
      currency: params.currency,
      subaccounts: params.subaccounts,
      bearer_type: params.bearerType,
      bearer_subaccount: params.bearerSubaccount
    });
    return data;
  }

  async listTransactionSplits(params?: {
    name?: string;
    active?: boolean;
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/split', { params });
    return data;
  }

  async getTransactionSplit(splitId: string) {
    let { data } = await this.axios.get(`/split/${encodeURIComponent(splitId)}`);
    return data;
  }

  async updateTransactionSplit(
    splitId: string,
    params: {
      name?: string;
      active?: boolean;
      bearerType?: string;
      bearerSubaccount?: string;
    }
  ) {
    let { data } = await this.axios.put(`/split/${encodeURIComponent(splitId)}`, {
      name: params.name,
      active: params.active,
      bearer_type: params.bearerType,
      bearer_subaccount: params.bearerSubaccount
    });
    return data;
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
    let { data } = await this.axios.post('/dedicated_account', {
      customer: params.customer,
      preferred_bank: params.preferredBank,
      subaccount: params.subaccount,
      split_code: params.splitCode,
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone
    });
    return data;
  }

  async listDedicatedVirtualAccounts(params?: {
    active?: boolean;
    currency?: string;
    providerSlug?: string;
    bankId?: string;
    customer?: string;
  }) {
    let { data } = await this.axios.get('/dedicated_account', {
      params: {
        active: params?.active,
        currency: params?.currency,
        provider_slug: params?.providerSlug,
        bank_id: params?.bankId,
        customer: params?.customer
      }
    });
    return data;
  }

  async getDedicatedVirtualAccount(dedicatedAccountId: string) {
    let { data } = await this.axios.get(
      `/dedicated_account/${encodeURIComponent(dedicatedAccountId)}`
    );
    return data;
  }

  async deactivateDedicatedVirtualAccount(dedicatedAccountId: string) {
    let { data } = await this.axios.delete(
      `/dedicated_account/${encodeURIComponent(dedicatedAccountId)}`
    );
    return data;
  }

  // ── Disputes ──────────────────────────────────────────────────

  async listDisputes(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
    transaction?: string;
    status?: string;
  }) {
    let { data } = await this.axios.get('/dispute', { params });
    return data;
  }

  async getDispute(disputeId: string) {
    let { data } = await this.axios.get(`/dispute/${encodeURIComponent(disputeId)}`);
    return data;
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
    let { data } = await this.axios.put(`/dispute/${encodeURIComponent(disputeId)}/resolve`, {
      resolution: params.resolution,
      message: params.message,
      refund_amount: params.refundAmount,
      uploaded_filename: params.uploadedFilename,
      evidence: params.evidence
    });
    return data;
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
    let { data } = await this.axios.post('/paymentrequest', {
      customer: params.customer,
      amount: params.amount,
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
    return data;
  }

  async listPaymentRequests(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    status?: string;
    currency?: string;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/paymentrequest', { params });
    return data;
  }

  async getPaymentRequest(paymentRequestIdOrCode: string) {
    let { data } = await this.axios.get(
      `/paymentrequest/${encodeURIComponent(paymentRequestIdOrCode)}`
    );
    return data;
  }

  async updatePaymentRequest(
    paymentRequestIdOrCode: string,
    params: {
      customer?: string;
      amount?: number;
      dueDate?: string;
      description?: string;
      currency?: string;
      lineItems?: Array<{ name: string; amount: number; quantity: number }>;
      tax?: Array<{ name: string; amount: number }>;
      sendNotification?: boolean;
      draft?: boolean;
    }
  ) {
    let { data } = await this.axios.put(
      `/paymentrequest/${encodeURIComponent(paymentRequestIdOrCode)}`,
      {
        customer: params.customer,
        amount: params.amount,
        due_date: params.dueDate,
        description: params.description,
        currency: params.currency,
        line_items: params.lineItems,
        tax: params.tax,
        send_notification: params.sendNotification,
        draft: params.draft
      }
    );
    return data;
  }

  async finalizePaymentRequest(paymentRequestIdOrCode: string, sendNotification?: boolean) {
    let { data } = await this.axios.post(
      `/paymentrequest/finalize/${encodeURIComponent(paymentRequestIdOrCode)}`,
      {
        send_notification: sendNotification
      }
    );
    return data;
  }

  // ── Verification ──────────────────────────────────────────────

  async resolveAccountNumber(params: { accountNumber: string; bankCode: string }) {
    let { data } = await this.axios.get('/bank/resolve', {
      params: {
        account_number: params.accountNumber,
        bank_code: params.bankCode
      }
    });
    return data;
  }

  async resolveBin(bin: string) {
    let { data } = await this.axios.get(`/decision/bin/${encodeURIComponent(bin)}`);
    return data;
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
    let { data } = await this.axios.get('/bank', {
      params: {
        country: params?.country,
        use_cursor: params?.useCursor,
        perPage: params?.perPage,
        next: params?.next,
        previous: params?.previous,
        gateway: params?.gateway,
        type: params?.type,
        currency: params?.currency
      }
    });
    return data;
  }

  // ── Bulk Charges ──────────────────────────────────────────────

  async initiateBulkCharge(
    charges: Array<{
      authorization: string;
      amount: number;
      reference?: string;
    }>
  ) {
    let { data } = await this.axios.post('/bulkcharge', charges);
    return data;
  }

  async listBulkChargeBatches(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/bulkcharge', { params });
    return data;
  }

  async getBulkChargeBatch(batchIdOrCode: string) {
    let { data } = await this.axios.get(`/bulkcharge/${encodeURIComponent(batchIdOrCode)}`);
    return data;
  }

  async getBulkChargeCharges(
    batchIdOrCode: string,
    params?: {
      status?: string;
      perPage?: number;
      page?: number;
    }
  ) {
    let { data } = await this.axios.get(
      `/bulkcharge/${encodeURIComponent(batchIdOrCode)}/charges`,
      { params }
    );
    return data;
  }

  // ── Products ──────────────────────────────────────────────────

  async createProduct(params: {
    name: string;
    description: string;
    price: number;
    currency: string;
    unlimited?: boolean;
    quantity?: number;
  }) {
    let { data } = await this.axios.post('/product', params);
    return data;
  }

  async listProducts(params?: {
    perPage?: number;
    page?: number;
    from?: string;
    to?: string;
  }) {
    let { data } = await this.axios.get('/product', { params });
    return data;
  }

  async getProduct(productId: string) {
    let { data } = await this.axios.get(`/product/${encodeURIComponent(productId)}`);
    return data;
  }

  async updateProduct(
    productId: string,
    params: {
      name?: string;
      description?: string;
      price?: number;
      currency?: string;
      unlimited?: boolean;
      quantity?: number;
    }
  ) {
    let { data } = await this.axios.put(`/product/${encodeURIComponent(productId)}`, params);
    return data;
  }
}
