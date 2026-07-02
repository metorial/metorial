import { createAxios } from 'slates';
import { coinbaseApiError, coinbaseServiceError } from './errors';

export interface CoinbaseClientConfig {
  token: string;
}

export class CoinbaseClient {
  private v2: ReturnType<typeof createAxios>;

  constructor(config: CoinbaseClientConfig) {
    if (!config.token?.trim()) {
      throw coinbaseServiceError('Coinbase OAuth access token is required.');
    }

    this.v2 = createAxios({
      baseURL: 'https://api.coinbase.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'CB-VERSION': '2024-01-01'
      }
    });

    this.v2.interceptors.response.use(
      response => response,
      error => {
        throw coinbaseApiError(error);
      }
    );
  }

  // --- User ---

  async getCurrentUser(): Promise<any> {
    let response = await this.v2.get('/user');
    return response.data.data;
  }

  // --- Accounts ---

  async listAccounts(params?: { limit?: number; startingAfter?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/accounts?${qs}` : '/accounts';
    let response = await this.v2.get(url);
    return response.data;
  }

  async getAccount(accountId: string): Promise<any> {
    let response = await this.v2.get(`/accounts/${accountId}`);
    return response.data.data;
  }

  async createAccount(name: string): Promise<any> {
    let response = await this.v2.post('/accounts', { name });
    return response.data.data;
  }

  async updateAccount(accountId: string, name: string): Promise<any> {
    let response = await this.v2.put(`/accounts/${accountId}`, { name });
    return response.data.data;
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.v2.delete(`/accounts/${accountId}`);
  }

  // --- Addresses ---

  async listAddresses(accountId: string): Promise<any> {
    let response = await this.v2.get(`/accounts/${accountId}/addresses`);
    return response.data;
  }

  async createAddress(accountId: string, name?: string): Promise<any> {
    let response = await this.v2.post(
      `/accounts/${accountId}/addresses`,
      name ? { name } : {}
    );
    return response.data.data;
  }

  // --- Transactions ---

  async listTransactions(
    accountId: string,
    params?: { limit?: number; startingAfter?: string }
  ): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    let qs = new URLSearchParams(query).toString();
    let url = qs
      ? `/accounts/${accountId}/transactions?${qs}`
      : `/accounts/${accountId}/transactions`;
    let response = await this.v2.get(url);
    return response.data;
  }

  async getTransaction(accountId: string, transactionId: string): Promise<any> {
    let response = await this.v2.get(`/accounts/${accountId}/transactions/${transactionId}`);
    return response.data.data;
  }

  async sendMoney(
    accountId: string,
    params: {
      to: string;
      amount: string;
      currency: string;
      description?: string;
      idem?: string;
    }
  ): Promise<any> {
    let response = await this.v2.post(`/accounts/${accountId}/transactions`, {
      type: 'send',
      ...params
    });
    return response.data.data;
  }

  // --- Buys ---

  async listBuys(accountId: string): Promise<any> {
    let response = await this.v2.get(`/accounts/${accountId}/buys`);
    return response.data;
  }

  async createBuy(
    accountId: string,
    params: {
      amount?: string;
      total?: string;
      currency: string;
      paymentMethod?: string;
      commit?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = { currency: params.currency };
    if (params.amount) body.amount = params.amount;
    if (params.total) body.total = params.total;
    if (params.paymentMethod) body.payment_method = params.paymentMethod;
    if (params.commit !== undefined) body.commit = params.commit;
    let response = await this.v2.post(`/accounts/${accountId}/buys`, body);
    return response.data.data;
  }

  // --- Sells ---

  async listSells(accountId: string): Promise<any> {
    let response = await this.v2.get(`/accounts/${accountId}/sells`);
    return response.data;
  }

  async createSell(
    accountId: string,
    params: {
      amount?: string;
      total?: string;
      currency: string;
      paymentMethod?: string;
      commit?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = { currency: params.currency };
    if (params.amount) body.amount = params.amount;
    if (params.total) body.total = params.total;
    if (params.paymentMethod) body.payment_method = params.paymentMethod;
    if (params.commit !== undefined) body.commit = params.commit;
    let response = await this.v2.post(`/accounts/${accountId}/sells`, body);
    return response.data.data;
  }

  // --- Deposits ---

  async listDeposits(accountId: string): Promise<any> {
    let response = await this.v2.get(`/accounts/${accountId}/deposits`);
    return response.data;
  }

  async createDeposit(
    accountId: string,
    params: {
      amount: string;
      currency: string;
      paymentMethod: string;
      commit?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      amount: params.amount,
      currency: params.currency,
      payment_method: params.paymentMethod
    };
    if (params.commit !== undefined) body.commit = params.commit;
    let response = await this.v2.post(`/accounts/${accountId}/deposits`, body);
    return response.data.data;
  }

  // --- Withdrawals ---

  async listWithdrawals(accountId: string): Promise<any> {
    let response = await this.v2.get(`/accounts/${accountId}/withdrawals`);
    return response.data;
  }

  async createWithdrawal(
    accountId: string,
    params: {
      amount: string;
      currency: string;
      paymentMethod: string;
      commit?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      amount: params.amount,
      currency: params.currency,
      payment_method: params.paymentMethod
    };
    if (params.commit !== undefined) body.commit = params.commit;
    let response = await this.v2.post(`/accounts/${accountId}/withdrawals`, body);
    return response.data.data;
  }

  // --- Payment Methods ---

  async listPaymentMethods(): Promise<any> {
    let response = await this.v2.get('/payment-methods');
    return response.data;
  }

  // --- Prices (Public) ---

  async getSpotPrice(currencyPair: string, params?: { date?: string }): Promise<any> {
    let qs = params?.date ? `?date=${params.date}` : '';
    let response = await this.v2.get(`/prices/${currencyPair}/spot${qs}`);
    return response.data.data;
  }

  async getBuyPrice(currencyPair: string): Promise<any> {
    let response = await this.v2.get(`/prices/${currencyPair}/buy`);
    return response.data.data;
  }

  async getSellPrice(currencyPair: string): Promise<any> {
    let response = await this.v2.get(`/prices/${currencyPair}/sell`);
    return response.data.data;
  }

  // --- Exchange Rates (Public) ---

  async getExchangeRates(currency?: string): Promise<any> {
    let qs = currency ? `?currency=${currency}` : '';
    let response = await this.v2.get(`/exchange-rates${qs}`);
    return response.data.data;
  }

  // --- Currencies (Public) ---

  async listCurrencies(): Promise<any> {
    let response = await this.v2.get('/currencies');
    return response.data;
  }
}
