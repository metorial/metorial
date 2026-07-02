import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://app.pendo.io/api/v1',
  eu: 'https://app.eu.pendo.io/api/v1'
};

export class PendoClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; region: string }) {
    let baseURL = BASE_URLS[params.region] || BASE_URLS.us;
    this.axios = createAxios({
      baseURL,
      headers: {
        'x-pendo-integration-key': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Visitors ---

  async getVisitor(visitorId: string): Promise<any> {
    let response = await this.axios.get(`/visitor/${encodeURIComponent(visitorId)}`);
    return response.data;
  }

  async listVisitors(appId?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (appId) params.appId = appId;
    let response = await this.axios.get('/visitor', { params });
    return response.data;
  }

  async updateVisitorMetadata(visitorId: string, metadata: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/metadata/visitor/custom/value?create=true`, {
      [visitorId]: { metadata: { custom: metadata } }
    });
    return response.data;
  }

  async bulkDeleteVisitors(visitorIds: string[]): Promise<any> {
    let response = await this.axios.post('/bulkdelete/visitor', { visitors: visitorIds });
    return response.data;
  }

  // --- Accounts ---

  async getAccount(accountId: string): Promise<any> {
    let response = await this.axios.get(`/account/${encodeURIComponent(accountId)}`);
    return response.data;
  }

  async listAccounts(appId?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (appId) params.appId = appId;
    let response = await this.axios.get('/account', { params });
    return response.data;
  }

  async updateAccountMetadata(accountId: string, metadata: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/metadata/account/custom/value?create=true`, {
      [accountId]: { metadata: { custom: metadata } }
    });
    return response.data;
  }

  async bulkDeleteAccounts(accountIds: string[]): Promise<any> {
    let response = await this.axios.post('/bulkdelete/account', { accounts: accountIds });
    return response.data;
  }

  // --- Guides ---

  async getGuide(guideId: string): Promise<any> {
    let response = await this.axios.get(`/guide/${encodeURIComponent(guideId)}`);
    return response.data;
  }

  async listGuides(appId?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (appId) params.appId = appId;
    let response = await this.axios.get('/guide', { params });
    return response.data;
  }

  // --- Pages ---

  async getPage(pageId: string): Promise<any> {
    let response = await this.axios.get(`/page/${encodeURIComponent(pageId)}`);
    return response.data;
  }

  async listPages(appId?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (appId) params.appId = appId;
    let response = await this.axios.get('/page', { params });
    return response.data;
  }

  // --- Features ---

  async getFeature(featureId: string): Promise<any> {
    let response = await this.axios.get(`/feature/${encodeURIComponent(featureId)}`);
    return response.data;
  }

  async listFeatures(appId?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (appId) params.appId = appId;
    let response = await this.axios.get('/feature', { params });
    return response.data;
  }

  // --- Segments ---

  async getSegment(segmentId: string): Promise<any> {
    let response = await this.axios.get(`/segment/${encodeURIComponent(segmentId)}`);
    return response.data;
  }

  async listSegments(): Promise<any[]> {
    let response = await this.axios.get('/segment');
    return response.data;
  }

  async createSegment(segment: {
    name: string;
    visitorIds?: string[];
    accountIds?: string[];
  }): Promise<any> {
    let response = await this.axios.post('/segment', segment);
    return response.data;
  }

  async deleteSegment(segmentId: string): Promise<void> {
    await this.axios.delete(`/segment/${encodeURIComponent(segmentId)}`);
  }

  // --- Reports ---

  async getReport(reportId: string, format: 'json' | 'csv' = 'json'): Promise<any> {
    let response = await this.axios.get(
      `/report/${encodeURIComponent(reportId)}/results.${format}`
    );
    return response.data;
  }

  async listReports(): Promise<any[]> {
    let response = await this.axios.get('/report');
    return response.data;
  }

  // --- Aggregation ---

  async runAggregation(pipeline: any[], requestId?: string): Promise<any> {
    let body = {
      response: { mimeType: 'application/json' },
      request: {
        requestId: requestId || 'slate-aggregation',
        pipeline
      }
    };
    let response = await this.axios.post('/aggregation', body);
    return response.data;
  }

  // --- Metadata Schema ---

  async getMetadataSchema(kind: 'visitor' | 'account'): Promise<any> {
    let response = await this.axios.get(`/metadata/schema/${kind}`);
    return response.data;
  }
}
