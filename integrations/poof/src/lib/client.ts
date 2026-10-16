import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

let api = createAxios({
  baseURL: 'https://www.poof.io',
  timeout: 30000,
  validateStatus: () => true
});

export class PoofClient {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a Poof API key.');
    }
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: config.token
    };
  }

  private async post(path: string, body: Record<string, unknown>) {
    try {
      let response = await api.post(path, body, { headers: this.headers });
      let data: unknown = response.data;
      let bodyFailure =
        isApiErrorRecord(data) &&
        (data.success === false ||
          data.status === 'error' ||
          data.status === 'failed' ||
          (typeof data.status === 'string' && /^failure\b/i.test(data.status)) ||
          (typeof data.status === 'number' && data.status >= 400) ||
          (typeof data.error === 'string' && data.error.trim().length > 0) ||
          (isApiErrorRecord(data.error) && Object.keys(data.error).length > 0));
      if (response.status < 200 || response.status >= 300 || bodyFailure) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Poof',
            reason: 'poof_api_error',
            operation: path,
            detailKeys: ['message', 'detail', 'error', 'error_description', 'status'],
            nestedKeys: ['errors', 'error']
          }
        );
      }
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Poof',
        reason: 'poof_api_error',
        operation: path
      });
    }
  }

  // === Checkout & Payment Collection ===

  async createCheckout(params: {
    username: string;
    amount: string;
    fields?: string[];
    disablePayments?: string[];
    successUrl?: string;
    redirect?: string;
    productId?: string;
    instantPaymentNotification?: string;
    productQuantity?: string;
    defaultValues?: Record<string, string>;
    metadata?: Record<string, unknown>;
  }) {
    let body: Record<string, unknown> = {
      username: params.username,
      amount: params.amount
    };
    if (params.fields) body.fields = params.fields;
    if (params.disablePayments) body.disable_payments = params.disablePayments;
    if (params.successUrl) body.success_url = params.successUrl;
    if (params.redirect) body.redirect = params.redirect;
    if (params.productId) body.product_id = params.productId;
    if (params.instantPaymentNotification)
      body.instant_payment_notification = params.instantPaymentNotification;
    if (params.productQuantity) body.product_quantity = params.productQuantity;
    if (params.defaultValues) body.default = params.defaultValues;
    if (params.metadata) body.metadata = params.metadata;

    return this.post('/api/v1/checkout', body);
  }

  // === Crypto Invoices ===

  async createCryptoInvoice(params: {
    amount: string;
    crypto: string;
    currency: string;
    redirect: string;
  }) {
    return this.post('/api/v1/create_invoice', {
      amount: params.amount,
      crypto: params.crypto,
      currency: params.currency,
      redirect: params.redirect
    });
  }

  async createPaymentLink(params: {
    amount: string;
    crypto: string;
    metadata?: Record<string, unknown>;
  }) {
    let body: Record<string, unknown> = {
      amount: params.amount,
      crypto: params.crypto
    };
    if (params.metadata) body.metadata = params.metadata;

    return this.post('/api/v2/create_invoice', body);
  }

  // === Deposit Addresses / Charges ===

  async createDepositAddress(params: {
    amount: string;
    crypto: string;
    metadata?: Record<string, unknown>;
  }) {
    let body: Record<string, unknown> = {
      amount: params.amount,
      crypto: params.crypto
    };
    if (params.metadata) body.metadata = params.metadata;

    return this.post('/api/v2/create_charge', body);
  }

  async createCryptoCharge(params: { currency: string; amount: number; crypto: string }) {
    return this.post('/api/v1/create_charge', {
      currency: params.currency,
      amount: params.amount,
      crypto: params.crypto
    });
  }

  // === Wallet Management ===

  async createWallet(params: { currency: string }) {
    return this.post('/api/v2/create_wallet', {
      currency: params.currency
    });
  }

  async getBalance(params: { crypto: string }) {
    return this.post('/api/v1/balance', {
      crypto: params.crypto
    });
  }

  // === Payouts ===

  async sendPayout(params: { amount: number; crypto: string; address: string }) {
    return this.post('/api/v2/payouts', {
      amount: params.amount,
      crypto: params.crypto,
      address: params.address
    });
  }

  // === Fiat Payments ===

  async createFiatInvoice(params: {
    amount: string;
    payment: string;
    currency: string;
    redirectUrl: string;
    successUrl: string;
  }) {
    return this.post('/api/v1/create_fiat_invoice', {
      amount: params.amount,
      payment: params.payment,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      success_url: params.successUrl
    });
  }

  async createFiatCharge(params: {
    amount: string;
    payment: string;
    currency: string;
    redirectUrl: string;
    successUrl: string;
  }) {
    return this.post('/api/v1/create_fiat_charge', {
      amount: params.amount,
      payment: params.payment,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      success_url: params.successUrl
    });
  }

  // === Transactions ===

  async getTransaction(params: { transactionId: string }) {
    return this.post('/api/v1/transaction', {
      transaction: params.transactionId
    });
  }

  async listTransactions() {
    return this.post('/api/v1/fetch_transactions', {});
  }

  async queryTransactions(params: { filter: string; search: string }) {
    return this.post('/api/v2/transaction_query', {
      filter: params.filter,
      search: params.search
    });
  }

  // === Products ===

  async getProduct(params: { productId: string }) {
    return this.post('/api/v2/fetch_product', {
      product_id: params.productId
    });
  }

  // === Webhooks ===

  async createWebhook(params: { url: string }) {
    return this.post('/api/v1/create_webhook', {
      url: params.url
    });
  }

  // === Crypto Rates & Pricing ===

  async getCryptoRates(params: { base: string }) {
    return this.post('/api/v1/fetch_crypto_rates', {
      base: params.base
    });
  }

  async getPrice(params: { crypto: string }) {
    return this.post('/api/v2/price', {
      crypto: params.crypto
    });
  }

  async getGasPrice(params: { crypto: string }) {
    return this.post('/api/v2/gas_price', {
      crypto: params.crypto
    });
  }

  // === ERC-20 Contracts ===

  async getContractList() {
    return this.post('/api/v2/contract_list', {});
  }
}

export let getPoofPaymentUrl = (result: unknown, keys: string[]) => {
  let candidates =
    typeof result === 'string'
      ? [result]
      : isApiErrorRecord(result)
        ? keys.map(key => result[key])
        : [];
  for (let candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    try {
      let url = new URL(candidate);
      if (url.protocol === 'https:' || url.protocol === 'http:') return candidate;
    } catch {
      // Try other existing response aliases before reporting an invalid payment URL.
    }
  }
  throw createApiServiceError('Poof did not return a valid payment URL.', {
    reason: 'poof_invalid_response'
  });
};
