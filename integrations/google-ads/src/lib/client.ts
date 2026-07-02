import { createAxios } from 'slates';

let API_VERSION = 'v19';
let BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`;

export interface GoogleAdsClientConfig {
  token: string;
  developerToken: string;
  loginCustomerId?: string;
}

export interface MutateOperation {
  create?: Record<string, any>;
  update?: Record<string, any>;
  remove?: string;
  updateMask?: string;
}

export interface SearchResponse {
  results: Record<string, any>[];
  totalResultsCount?: string;
  nextPageToken?: string;
  fieldMask?: string;
}

export class GoogleAdsClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: GoogleAdsClientConfig) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      'developer-token': config.developerToken,
      'Content-Type': 'application/json'
    };

    if (config.loginCustomerId) {
      headers['login-customer-id'] = config.loginCustomerId.replace(/-/g, '');
    }

    this.http = createAxios({
      baseURL: BASE_URL,
      headers
    });
  }

  // Account Management

  async listAccessibleCustomers(): Promise<string[]> {
    let response = await this.http.get('/customers:listAccessibleCustomers');
    return response.data.resourceNames || [];
  }

  async getCustomer(customerId: string): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/googleAds:search`, {
      query: `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager, customer.status FROM customer LIMIT 1`
    });
    let results = response.data.results || [];
    return results[0]?.customer || {};
  }

  // GAQL Search

  async search(
    customerId: string,
    query: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<SearchResponse> {
    let cid = customerId.replace(/-/g, '');
    let body: Record<string, any> = { query };
    if (pageSize) body.pageSize = pageSize;
    if (pageToken) body.pageToken = pageToken;

    let response = await this.http.post(`/customers/${cid}/googleAds:search`, body);
    return response.data;
  }

  async searchStream(customerId: string, query: string): Promise<Record<string, any>[]> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/googleAds:searchStream`, { query });
    let results: Record<string, any>[] = [];
    if (Array.isArray(response.data)) {
      for (let batch of response.data) {
        if (batch.results) {
          results.push(...batch.results);
        }
      }
    }
    return results;
  }

  // Campaign Management

  async mutateCampaigns(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/campaigns:mutate`, {
      operations
    });
    return response.data;
  }

  // Campaign Budget Management

  async mutateCampaignBudgets(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/campaignBudgets:mutate`, {
      operations
    });
    return response.data;
  }

  // Ad Group Management

  async mutateAdGroups(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/adGroups:mutate`, {
      operations
    });
    return response.data;
  }

  // Ad Group Ad Management

  async mutateAdGroupAds(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/adGroupAds:mutate`, {
      operations
    });
    return response.data;
  }

  // Ad Group Criterion (Keywords) Management

  async mutateAdGroupCriteria(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/adGroupCriteria:mutate`, {
      operations
    });
    return response.data;
  }

  // Campaign Criterion (Negative Keywords, Targeting) Management

  async mutateCampaignCriteria(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/campaignCriteria:mutate`, {
      operations
    });
    return response.data;
  }

  // Bidding Strategy Management

  async mutateBiddingStrategies(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/biddingStrategies:mutate`, {
      operations
    });
    return response.data;
  }

  // Conversion Action Management

  async mutateConversionActions(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/conversionActions:mutate`, {
      operations
    });
    return response.data;
  }

  // Keyword Planning

  async generateKeywordIdeas(
    customerId: string,
    params: {
      language?: string;
      geoTargetConstants?: string[];
      keywordSeed?: { keywords: string[] };
      urlSeed?: { url: string };
      keywordAndUrlSeed?: { keywords: string[]; url: string };
      includeAdultKeywords?: boolean;
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}:generateKeywordIdeas`, params);
    return response.data;
  }

  // Offline Conversion Upload

  async uploadClickConversions(
    customerId: string,
    conversions: Record<string, any>[],
    partialFailure?: boolean
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}:uploadClickConversions`, {
      conversions,
      partialFailure: partialFailure ?? true
    });
    return response.data;
  }

  // Audience / User List Management

  async mutateUserLists(
    customerId: string,
    operations: MutateOperation[]
  ): Promise<Record<string, any>> {
    let cid = customerId.replace(/-/g, '');
    let response = await this.http.post(`/customers/${cid}/userLists:mutate`, {
      operations
    });
    return response.data;
  }
}
