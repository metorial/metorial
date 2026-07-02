import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://plisio.net/api/v1'
});

export class PlisioClient {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
  }

  private async get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    let cleanParams: Record<string, string> = { api_key: this.apiKey };
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = String(value);
      }
    }

    let response = await http.get(path, { params: cleanParams });
    let body = response.data;

    if (body.status === 'error') {
      let message = body.data?.message || 'Unknown Plisio API error';
      let name = body.data?.name || 'Error';
      throw new Error(`Plisio API error: ${name} - ${message}`);
    }

    return body.data as T;
  }

  // --- Invoices ---

  async createInvoice(params: {
    currency?: string;
    orderName: string;
    orderNumber: string;
    amount?: number;
    sourceCurrency?: string;
    sourceAmount?: number;
    allowedPsysCids?: string;
    description?: string;
    callbackUrl?: string;
    successCallbackUrl?: string;
    failCallbackUrl?: string;
    successInvoiceUrl?: string;
    failInvoiceUrl?: string;
    email?: string;
    language?: string;
    expireMin?: number;
    redirectToInvoice?: boolean;
  }) {
    return this.get('/invoices/new', {
      currency: params.currency,
      order_name: params.orderName,
      order_number: params.orderNumber,
      amount: params.amount,
      source_currency: params.sourceCurrency,
      source_amount: params.sourceAmount,
      allowed_psys_cids: params.allowedPsysCids,
      description: params.description,
      callback_url: params.callbackUrl,
      success_callback_url: params.successCallbackUrl,
      fail_callback_url: params.failCallbackUrl,
      success_invoice_url: params.successInvoiceUrl,
      fail_invoice_url: params.failInvoiceUrl,
      email: params.email,
      language: params.language,
      expire_min: params.expireMin,
      redirect_to_invoice: params.redirectToInvoice
    });
  }

  async getInvoice(invoiceId: string) {
    return this.get(`/invoices/${encodeURIComponent(invoiceId)}`);
  }

  // --- Operations ---

  async withdraw(params: {
    currency: string;
    type: 'cash_out' | 'mass_cash_out';
    to: string;
    amount: string;
    feePlan?: string;
  }) {
    return this.get('/operations/withdraw', {
      currency: params.currency,
      type: params.type,
      to: params.to,
      amount: params.amount,
      feePlan: params.feePlan
    });
  }

  async listOperations(
    params: {
      page?: number;
      limit?: number;
      shopId?: string;
      type?: string;
      status?: string;
      currency?: string;
      search?: string;
    } = {}
  ) {
    return this.get('/operations', {
      page: params.page,
      limit: params.limit,
      shop_id: params.shopId,
      type: params.type,
      status: params.status,
      currency: params.currency,
      search: params.search
    });
  }

  async getOperation(operationId: string) {
    return this.get(`/operations/${encodeURIComponent(operationId)}`);
  }

  // --- Balance ---

  async getBalance(currency: string) {
    return this.get(`/balances/${encodeURIComponent(currency)}`);
  }

  // --- Currencies ---

  async getCurrencies(fiat?: string) {
    let path = fiat ? `/currencies/${encodeURIComponent(fiat)}` : '/currencies/USD';
    return this.get(path);
  }

  // --- Fee Estimation ---

  async estimateFee(params: {
    currency: string;
    addresses: string;
    amounts: string;
    feePlan?: string;
  }) {
    return this.get(`/operations/fee/${encodeURIComponent(params.currency)}`, {
      addresses: params.addresses,
      amounts: params.amounts,
      feePlan: params.feePlan
    });
  }

  async getCommission(params: {
    currency: string;
    addresses?: string;
    amounts?: string;
    type?: string;
    feePlan?: string;
  }) {
    return this.get(`/operations/commission/${encodeURIComponent(params.currency)}`, {
      addresses: params.addresses,
      amounts: params.amounts,
      type: params.type,
      feePlan: params.feePlan
    });
  }

  // --- Fee Plans ---

  async getFeePlans(currency: string) {
    return this.get(`/operations/fee-plan/${encodeURIComponent(currency)}`);
  }

  // --- Deposits ---

  async createDeposit(params: { currency: string; uid: string }) {
    return this.get('/shops/deposit/new', {
      psys_cid: params.currency,
      uid: params.uid
    });
  }
}
