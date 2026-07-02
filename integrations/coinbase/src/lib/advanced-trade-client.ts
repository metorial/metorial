import { createAxios } from 'slates';

export interface AdvancedTradeClientConfig {
  token: string;
}

export class AdvancedTradeClient {
  private api: ReturnType<typeof createAxios>;

  constructor(config: AdvancedTradeClientConfig) {
    this.api = createAxios({
      baseURL: 'https://api.coinbase.com/api/v3/brokerage',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Accounts ---

  async listAccounts(params?: { limit?: number; cursor?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/accounts?${qs}` : '/accounts';
    let response = await this.api.get(url);
    return response.data;
  }

  async getAccount(accountUuid: string): Promise<any> {
    let response = await this.api.get(`/accounts/${accountUuid}`);
    return response.data.account;
  }

  // --- Orders ---

  async createOrder(params: {
    clientOrderId: string;
    productId: string;
    side: 'BUY' | 'SELL';
    orderConfiguration: Record<string, any>;
  }): Promise<any> {
    let response = await this.api.post('/orders', {
      client_order_id: params.clientOrderId,
      product_id: params.productId,
      side: params.side,
      order_configuration: params.orderConfiguration
    });
    return response.data;
  }

  async cancelOrders(orderIds: string[]): Promise<any> {
    let response = await this.api.post('/orders/batch_cancel', {
      order_ids: orderIds
    });
    return response.data;
  }

  async listOrders(params?: {
    productId?: string;
    orderStatus?: string[];
    limit?: number;
    startDate?: string;
    endDate?: string;
    orderSide?: string;
    cursor?: string;
    orderType?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.productId) query.product_id = params.productId;
    if (params?.orderStatus) query.order_status = params.orderStatus.join(',');
    if (params?.limit) query.limit = String(params.limit);
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;
    if (params?.orderSide) query.order_side = params.orderSide;
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.orderType) query.order_type = params.orderType;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/orders/historical/batch?${qs}` : '/orders/historical/batch';
    let response = await this.api.get(url);
    return response.data;
  }

  async getOrder(orderId: string): Promise<any> {
    let response = await this.api.get(`/orders/historical/${orderId}`);
    return response.data.order;
  }

  // --- Products ---

  async listProducts(params?: {
    limit?: number;
    offset?: number;
    productType?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    if (params?.productType) query.product_type = params.productType;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/products?${qs}` : '/products';
    let response = await this.api.get(url);
    return response.data;
  }

  async getProduct(productId: string): Promise<any> {
    let response = await this.api.get(`/products/${productId}`);
    return response.data;
  }

  async getProductCandles(
    productId: string,
    params: {
      start: string;
      end: string;
      granularity: string;
    }
  ): Promise<any> {
    let query = new URLSearchParams({
      start: params.start,
      end: params.end,
      granularity: params.granularity
    }).toString();
    let response = await this.api.get(`/products/${productId}/candles?${query}`);
    return response.data;
  }

  async getProductTicker(productId: string, params?: { limit?: number }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/products/${productId}/ticker?${qs}` : `/products/${productId}/ticker`;
    let response = await this.api.get(url);
    return response.data;
  }

  // --- Portfolios ---

  async listPortfolios(): Promise<any> {
    let response = await this.api.get('/portfolios');
    return response.data;
  }

  async getPortfolio(portfolioUuid: string): Promise<any> {
    let response = await this.api.get(`/portfolios/${portfolioUuid}`);
    return response.data;
  }

  // --- Transaction Summary ---

  async getTransactionSummary(params?: {
    startDate?: string;
    endDate?: string;
    userNativeCurrency?: string;
    productType?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;
    if (params?.userNativeCurrency) query.user_native_currency = params.userNativeCurrency;
    if (params?.productType) query.product_type = params.productType;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/transaction_summary?${qs}` : '/transaction_summary';
    let response = await this.api.get(url);
    return response.data;
  }
}
