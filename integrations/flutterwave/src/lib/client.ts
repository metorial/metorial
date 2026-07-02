import { createAxios } from 'slates';

export class Client {
  private token: string;
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.token = config.token;
    this.http = createAxios({
      baseURL: 'https://api.flutterwave.com/v3',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ==================== Transactions ====================

  async listTransactions(params?: {
    from?: string;
    to?: string;
    page?: number;
    status?: string;
    currency?: string;
    customerEmail?: string;
    paymentType?: string;
  }) {
    let response = await this.http.get('/transactions', {
      params: {
        from: params?.from,
        to: params?.to,
        page: params?.page,
        status: params?.status,
        currency: params?.currency,
        customer_email: params?.customerEmail,
        payment_type: params?.paymentType
      }
    });
    return response.data;
  }

  async verifyTransaction(transactionId: number) {
    let response = await this.http.get(`/transactions/${transactionId}/verify`);
    return response.data;
  }

  async verifyTransactionByReference(txRef: string) {
    let response = await this.http.get('/transactions/verify_by_reference', {
      params: { tx_ref: txRef }
    });
    return response.data;
  }

  async getTransactionFee(amount: number, currency: string) {
    let response = await this.http.get('/transactions/fee', {
      params: { amount, currency }
    });
    return response.data;
  }

  async getTransactionEvents(transactionId: number) {
    let response = await this.http.get(`/transactions/${transactionId}/events`);
    return response.data;
  }

  async resendTransactionWebhook(transactionId: number) {
    let response = await this.http.post(`/transactions/${transactionId}/resend-hook`);
    return response.data;
  }

  // ==================== Transfers ====================

  async createTransfer(data: {
    accountBank: string;
    accountNumber: string;
    amount: number;
    currency: string;
    narration: string;
    reference?: string;
    callbackUrl?: string;
    debitCurrency?: string;
    beneficiaryName?: string;
  }) {
    let response = await this.http.post('/transfers', {
      account_bank: data.accountBank,
      account_number: data.accountNumber,
      amount: data.amount,
      currency: data.currency,
      narration: data.narration,
      reference: data.reference,
      callback_url: data.callbackUrl,
      debit_currency: data.debitCurrency,
      beneficiary_name: data.beneficiaryName
    });
    return response.data;
  }

  async listTransfers(params?: {
    page?: number;
    status?: string;
    from?: string;
    to?: string;
  }) {
    let response = await this.http.get('/transfers', {
      params
    });
    return response.data;
  }

  async getTransfer(transferId: number) {
    let response = await this.http.get(`/transfers/${transferId}`);
    return response.data;
  }

  async getTransferFee(amount: number, currency: string) {
    let response = await this.http.get('/transfers/fee', {
      params: { amount, currency }
    });
    return response.data;
  }

  async getTransferRates(amount: number, destinationCurrency: string, sourceCurrency: string) {
    let response = await this.http.get('/transfers/rates', {
      params: {
        amount,
        destination_currency: destinationCurrency,
        source_currency: sourceCurrency
      }
    });
    return response.data;
  }

  // ==================== Payment Plans ====================

  async createPaymentPlan(data: {
    amount: number;
    name: string;
    interval: string;
    duration?: number;
  }) {
    let response = await this.http.post('/payment-plans', data);
    return response.data;
  }

  async listPaymentPlans() {
    let response = await this.http.get('/payment-plans');
    return response.data;
  }

  async getPaymentPlan(planId: number) {
    let response = await this.http.get(`/payment-plans/${planId}`);
    return response.data;
  }

  async updatePaymentPlan(planId: number, data: { name?: string; status?: string }) {
    let response = await this.http.put(`/payment-plans/${planId}`, data);
    return response.data;
  }

  // ==================== Subscriptions ====================

  async listSubscriptions(params?: { email?: string; plan?: number; status?: string }) {
    let response = await this.http.get('/subscriptions', { params });
    return response.data;
  }

  async cancelSubscription(subscriptionId: number) {
    let response = await this.http.put(`/subscriptions/${subscriptionId}/cancel`);
    return response.data;
  }

  async activateSubscription(subscriptionId: number) {
    let response = await this.http.put(`/subscriptions/${subscriptionId}/activate`);
    return response.data;
  }

  // ==================== Virtual Accounts ====================

  async createVirtualAccount(data: {
    email: string;
    isPermanent?: boolean;
    bvn?: string;
    txRef: string;
    amount?: number;
    currency?: string;
    firstname?: string;
    lastname?: string;
    phonenumber?: string;
    narration?: string;
  }) {
    let response = await this.http.post('/virtual-account-numbers', {
      email: data.email,
      is_permanent: data.isPermanent,
      bvn: data.bvn,
      tx_ref: data.txRef,
      amount: data.amount,
      currency: data.currency,
      firstname: data.firstname,
      lastname: data.lastname,
      phonenumber: data.phonenumber,
      narration: data.narration
    });
    return response.data;
  }

  async getVirtualAccount(orderRef: string) {
    let response = await this.http.get(`/virtual-account-numbers/${orderRef}`);
    return response.data;
  }

  // ==================== Bill Payments ====================

  async getBillCategories() {
    let response = await this.http.get('/top-bill-categories');
    return response.data;
  }

  async getBillers(category?: string, country?: string) {
    let response = await this.http.get('/billers', {
      params: { category, country }
    });
    return response.data;
  }

  async getBillItems(billerCode: string) {
    let response = await this.http.get(`/billers/${billerCode}/items`);
    return response.data;
  }

  async validateBillCustomer(itemCode: string, billerCode: string, customer: string) {
    let response = await this.http.get(`/bill-items/${itemCode}/validate`, {
      params: { code: billerCode, customer }
    });
    return response.data;
  }

  async createBillPayment(
    billerCode: string,
    itemCode: string,
    data: {
      country: string;
      customer: string;
      amount: number;
      recurrence?: string;
      type: string;
      reference?: string;
    }
  ) {
    let response = await this.http.post(
      `/billers/${billerCode}/items/${itemCode}/payment`,
      data
    );
    return response.data;
  }

  async getBillPaymentStatus(reference: string) {
    let response = await this.http.get(`/bills/${reference}`);
    return response.data;
  }

  // ==================== Refunds ====================

  async createRefund(transactionId: number, data?: { amount?: number; comments?: string }) {
    let response = await this.http.post(`/transactions/${transactionId}/refund`, data || {});
    return response.data;
  }

  async listRefunds(params?: { page?: number; from?: string; to?: string }) {
    let response = await this.http.get('/refunds', { params });
    return response.data;
  }

  async getRefund(refundId: number) {
    let response = await this.http.get(`/refunds/${refundId}`);
    return response.data;
  }

  // ==================== Settlements ====================

  async listSettlements(params?: {
    page?: number;
    from?: string;
    to?: string;
    subaccountId?: string;
  }) {
    let response = await this.http.get('/settlements', {
      params: {
        page: params?.page,
        from: params?.from,
        to: params?.to,
        subaccount_id: params?.subaccountId
      }
    });
    return response.data;
  }

  async getSettlement(settlementId: number) {
    let response = await this.http.get(`/settlements/${settlementId}`);
    return response.data;
  }

  // ==================== Identity Verification ====================

  async resolveBankAccount(accountNumber: string, accountBank: string) {
    let response = await this.http.post('/accounts/resolve', {
      account_number: accountNumber,
      account_bank: accountBank
    });
    return response.data;
  }

  async listBanks(countryCode: string) {
    let response = await this.http.get(`/banks/${countryCode}`);
    return response.data;
  }

  async getBankBranches(bankId: number) {
    let response = await this.http.get(`/banks/${bankId}/branches`);
    return response.data;
  }

  // ==================== Beneficiaries ====================

  async createBeneficiary(data: {
    accountNumber: string;
    accountBank: string;
    beneficiaryName: string;
  }) {
    let response = await this.http.post('/beneficiaries', {
      account_number: data.accountNumber,
      account_bank: data.accountBank,
      beneficiary_name: data.beneficiaryName
    });
    return response.data;
  }

  async listBeneficiaries() {
    let response = await this.http.get('/beneficiaries');
    return response.data;
  }

  async getBeneficiary(beneficiaryId: number) {
    let response = await this.http.get(`/beneficiaries/${beneficiaryId}`);
    return response.data;
  }

  async deleteBeneficiary(beneficiaryId: number) {
    let response = await this.http.delete(`/beneficiaries/${beneficiaryId}`);
    return response.data;
  }
}
