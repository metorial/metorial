import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://www.poof.io'
});

export class PoofClient {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: config.token
    };
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

    let response = await api.post('/api/v1/checkout', body, { headers: this.headers });
    return response.data;
  }

  // === Crypto Invoices ===

  async createCryptoInvoice(params: {
    amount: string;
    crypto: string;
    currency: string;
    redirect: string;
  }) {
    let response = await api.post(
      '/api/v1/create_invoice',
      {
        amount: params.amount,
        crypto: params.crypto,
        currency: params.currency,
        redirect: params.redirect
      },
      { headers: this.headers }
    );
    return response.data;
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

    let response = await api.post('/api/v2/create_invoice', body, { headers: this.headers });
    return response.data;
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

    let response = await api.post('/api/v2/create_charge', body, { headers: this.headers });
    return response.data;
  }

  async createCryptoCharge(params: { currency: string; amount: number; crypto: string }) {
    let response = await api.post(
      '/api/v1/create_charge',
      {
        currency: params.currency,
        amount: params.amount,
        crypto: params.crypto
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // === Wallet Management ===

  async createWallet(params: { currency: string }) {
    let response = await api.post(
      '/api/v2/create_wallet',
      {
        currency: params.currency
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getBalance(params: { crypto: string }) {
    let response = await api.post(
      '/api/v1/balance',
      {
        crypto: params.crypto
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // === Payouts ===

  async sendPayout(params: { amount: number; crypto: string; address: string }) {
    let response = await api.post(
      '/api/v2/payouts',
      {
        amount: params.amount,
        crypto: params.crypto,
        address: params.address
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // === Fiat Payments ===

  async createFiatInvoice(params: {
    amount: string;
    payment: string;
    currency: string;
    redirectUrl: string;
    successUrl: string;
  }) {
    let response = await api.post(
      '/api/v1/create_fiat_invoice',
      {
        amount: params.amount,
        payment: params.payment,
        currency: params.currency,
        redirect_url: params.redirectUrl,
        success_url: params.successUrl
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async createFiatCharge(params: {
    amount: string;
    payment: string;
    currency: string;
    redirectUrl: string;
    successUrl: string;
  }) {
    let response = await api.post(
      '/api/v1/create_fiat_charge',
      {
        amount: params.amount,
        payment: params.payment,
        currency: params.currency,
        redirect_url: params.redirectUrl,
        success_url: params.successUrl
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // === Transactions ===

  async getTransaction(params: { transactionId: string }) {
    let response = await api.post(
      '/api/v1/transaction',
      {
        transaction: params.transactionId
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async listTransactions() {
    let response = await api.post('/api/v1/fetch_transactions', {}, { headers: this.headers });
    return response.data;
  }

  async queryTransactions(params: { filter: string; search: string }) {
    let response = await api.post(
      '/api/v2/transaction_query',
      {
        filter: params.filter,
        search: params.search
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // === Products ===

  async getProduct(params: { productId: string }) {
    let response = await api.post(
      '/api/v2/fetch_product',
      {
        product_id: params.productId
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // === Webhooks ===

  async createWebhook(params: { url: string }) {
    let response = await api.post(
      '/api/v1/create_webhook',
      {
        url: params.url
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // === Crypto Rates & Pricing ===

  async getCryptoRates(params: { base: string }) {
    let response = await api.post(
      '/api/v1/fetch_crypto_rates',
      {
        base: params.base
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getPrice(params: { crypto: string }) {
    let response = await api.post(
      '/api/v2/price',
      {
        crypto: params.crypto
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getGasPrice(params: { crypto: string }) {
    let response = await api.post(
      '/api/v2/gas_price',
      {
        crypto: params.crypto
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // === ERC-20 Contracts ===

  async getContractList() {
    let response = await api.post('/api/v2/contract_list', {}, { headers: this.headers });
    return response.data;
  }
}
