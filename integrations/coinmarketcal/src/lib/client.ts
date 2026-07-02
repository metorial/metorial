import { createAxios } from 'slates';

export interface EventsParams {
  page?: number;
  max?: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  coins?: string;
  categories?: string;
  sortBy?: string;
  showOnly?: string;
  showViews?: boolean;
}

export interface CoinMarketCalCoin {
  id: string;
  name: string;
  symbol: string;
  rank?: number;
}

export interface CoinMarketCalCategory {
  id: number;
  name: string;
}

export interface CoinMarketCalEvent {
  id: number;
  title: Record<string, string>;
  coins: CoinMarketCalCoin[];
  date_event: string;
  created_date: string;
  categories: CoinMarketCalCategory[];
  proof: string;
  source: string;
  is_hot: boolean;
  vote_count: number;
  positive_vote_count: number;
  percentage: number;
  can_occur_before: boolean;
  description: Record<string, string>;
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://developers.coinmarketcal.com/v1',
      headers: {
        'x-api-key': config.token,
        Accept: 'application/json',
        'Accept-Encoding': 'deflate, gzip'
      }
    });
  }

  async getEvents(
    params: EventsParams = {}
  ): Promise<{ events: CoinMarketCalEvent[]; pageCount: number }> {
    let queryParams: Record<string, string> = {};

    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.max !== undefined) queryParams.max = String(params.max);
    if (params.dateRangeStart) queryParams.dateRangeStart = params.dateRangeStart;
    if (params.dateRangeEnd) queryParams.dateRangeEnd = params.dateRangeEnd;
    if (params.coins) queryParams.coins = params.coins;
    if (params.categories) queryParams.categories = params.categories;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.showOnly) queryParams.showOnly = params.showOnly;
    if (params.showViews !== undefined) queryParams.showViews = String(params.showViews);

    let response = await this.http.get('/events', { params: queryParams });
    let body = response.data?.body ?? response.data ?? [];

    return {
      events: Array.isArray(body) ? body : [],
      pageCount: response.data?._metadata?.page_count ?? 1
    };
  }

  async getCoins(): Promise<CoinMarketCalCoin[]> {
    let response = await this.http.get('/coins');
    let body = response.data?.body ?? response.data ?? [];
    return Array.isArray(body) ? body : [];
  }

  async getCategories(): Promise<CoinMarketCalCategory[]> {
    let response = await this.http.get('/categories');
    let body = response.data?.body ?? response.data ?? [];
    return Array.isArray(body) ? body : [];
  }
}
