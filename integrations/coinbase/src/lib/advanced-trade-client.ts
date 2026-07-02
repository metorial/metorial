import { createAxios } from 'slates';
import { coinbaseApiError, coinbaseServiceError } from './errors';

export interface AdvancedTradeClientConfig {
  token: string;
}

export class AdvancedTradeClient {
  private api: ReturnType<typeof createAxios>;

  constructor(config: AdvancedTradeClientConfig) {
    if (!config.token?.trim()) {
      throw coinbaseServiceError('Coinbase OAuth access token is required.');
    }

    this.api = createAxios({
      baseURL: 'https://api.coinbase.com/api/v3/brokerage',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });

    this.api.interceptors.response.use(
      response => response,
      error => {
        throw coinbaseApiError(error, 'Advanced Trade request');
      }
    );
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

  async previewOrder(params: {
    productId: string;
    side: 'BUY' | 'SELL';
    orderConfiguration: Record<string, any>;
  }): Promise<any> {
    let response = await this.api.post('/orders/preview', {
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

  async listFills(params?: {
    orderIds?: string[];
    tradeIds?: string[];
    productIds?: string[];
    startSequenceTimestamp?: string;
    endSequenceTimestamp?: string;
    retailPortfolioId?: string;
    limit?: number;
    cursor?: string;
    sortBy?: string;
    assetFilters?: string[];
    orderTypes?: string[];
    orderSide?: string;
    productTypes?: string[];
    proofToken?: string;
  }): Promise<any> {
    let query = new URLSearchParams();
    for (let orderId of params?.orderIds ?? []) query.append('order_ids', orderId);
    for (let tradeId of params?.tradeIds ?? []) query.append('trade_ids', tradeId);
    for (let productId of params?.productIds ?? []) query.append('product_ids', productId);
    if (params?.startSequenceTimestamp) {
      query.set('start_sequence_timestamp', params.startSequenceTimestamp);
    }
    if (params?.endSequenceTimestamp) {
      query.set('end_sequence_timestamp', params.endSequenceTimestamp);
    }
    if (params?.retailPortfolioId) query.set('retail_portfolio_id', params.retailPortfolioId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.sortBy) query.set('sort_by', params.sortBy);
    for (let asset of params?.assetFilters ?? []) query.append('asset_filters', asset);
    for (let orderType of params?.orderTypes ?? []) query.append('order_types', orderType);
    if (params?.orderSide) query.set('order_side', params.orderSide);
    for (let productType of params?.productTypes ?? []) {
      query.append('product_types', productType);
    }
    if (params?.proofToken) query.set('proof_token', params.proofToken);

    let qs = query.toString();
    let url = qs ? `/orders/historical/fills?${qs}` : '/orders/historical/fills';
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

  async getProductTicker(
    productId: string,
    params?: { limit?: number; start?: string; end?: string }
  ): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.start) query.start = params.start;
    if (params?.end) query.end = params.end;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/products/${productId}/ticker?${qs}` : `/products/${productId}/ticker`;
    let response = await this.api.get(url);
    return response.data;
  }

  async getProductBook(
    productId: string,
    params?: { limit?: number; aggregationPriceIncrement?: string }
  ): Promise<any> {
    let query: Record<string, string> = { product_id: productId };
    if (params?.limit) query.limit = String(params.limit);
    if (params?.aggregationPriceIncrement) {
      query.aggregation_price_increment = params.aggregationPriceIncrement;
    }
    let qs = new URLSearchParams(query).toString();
    let response = await this.api.get(`/product_book?${qs}`);
    return response.data;
  }

  // --- Payment Methods ---

  async listPaymentMethods(): Promise<any> {
    let response = await this.api.get('/payment_methods');
    return response.data;
  }

  async getPaymentMethod(paymentMethodId: string): Promise<any> {
    let response = await this.api.get(`/payment_methods/${paymentMethodId}`);
    return response.data.payment_method || response.data;
  }

  // --- Portfolios ---

  async listPortfolios(params?: { portfolioType?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.portfolioType) query.portfolio_type = params.portfolioType;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/portfolios?${qs}` : '/portfolios';
    let response = await this.api.get(url);
    return response.data;
  }

  async getPortfolioBreakdown(portfolioUuid: string): Promise<any> {
    let response = await this.api.get(`/portfolios/${portfolioUuid}`);
    return response.data;
  }

  // --- Transaction Summary ---

  async getTransactionSummary(params?: {
    productType?: string;
    contractExpiryType?: string;
    productVenue?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.productType) query.product_type = params.productType;
    if (params?.contractExpiryType) query.contract_expiry_type = params.contractExpiryType;
    if (params?.productVenue) query.product_venue = params.productVenue;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/transaction_summary?${qs}` : '/transaction_summary';
    let response = await this.api.get(url);
    return response.data;
  }
}
