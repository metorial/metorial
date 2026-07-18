import { createAxios } from 'slates';

let api = createAxios({ baseURL: 'https://api.scrapeunblocker.com' });

export interface ScrapeUrlParams {
  url: string;
  parsedData?: boolean;
  proxyCountry?: string;
  timeSleep?: number;
}

export interface ScrapeUrlResult {
  statusCode: number;
  content: string;
}

export interface SearchGoogleParams {
  keyword: string;
  pagesToCheck?: number;
  proxyCountry?: string;
}

export interface OrganicResult {
  title?: string;
  url?: string;
  description?: string;
  position?: string;
}

export interface SearchGoogleResult {
  organic: OrganicResult[];
  totalResults?: string | null;
  organicResultsCount?: number;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return { 'X-ScrapeUnblocker-Key': this.token };
  }

  async scrapeUrl(params: ScrapeUrlParams): Promise<ScrapeUrlResult> {
    let queryParams: Record<string, string | number | boolean> = { url: params.url };

    if (params.parsedData) queryParams.parsed_data = true;
    if (params.proxyCountry) queryParams.proxy_country = params.proxyCountry;
    if (params.timeSleep !== undefined) queryParams.time_sleep = params.timeSleep;

    // Keep the body as returned: it is HTML unless parsed_data was requested.
    let response = await api.post('/getPageSource', undefined, {
      params: queryParams,
      headers: this.headers(),
      transformResponse: [(data: unknown) => data]
    });

    return {
      statusCode: response.status,
      content: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    };
  }

  async searchGoogle(params: SearchGoogleParams): Promise<SearchGoogleResult> {
    let queryParams: Record<string, string | number> = { keyword: params.keyword };

    if (params.pagesToCheck !== undefined) queryParams.pages_to_check = params.pagesToCheck;
    if (params.proxyCountry) queryParams.proxy_country = params.proxyCountry;

    let response = await api.post('/serpApi', undefined, {
      params: queryParams,
      headers: this.headers()
    });

    let data = response.data as Record<string, unknown>;
    let organic = Array.isArray(data?.organic) ? (data.organic as OrganicResult[]) : [];

    return {
      organic,
      totalResults: (data?.totalResults as string | null | undefined) ?? null,
      organicResultsCount:
        typeof data?.organicResultsCount === 'number' ? data.organicResultsCount : organic.length
    };
  }
}
