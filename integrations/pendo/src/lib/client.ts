import { createAxios } from 'slates';
import { pendoApiError, pendoServiceError } from './errors';

export type PendoRegion = 'us' | 'eu' | 'us1' | 'jpn' | 'au';

let API_BASE_URLS: Record<PendoRegion, string> = {
  us: 'https://app.pendo.io/api/v1',
  eu: 'https://app.eu.pendo.io/api/v1',
  us1: 'https://us1.app.pendo.io/api/v1',
  jpn: 'https://app.jpn.pendo.io/api/v1',
  au: 'https://app.au.pendo.io/api/v1'
};

let DATA_BASE_URLS: Record<PendoRegion, string> = {
  us: 'https://data.pendo.io',
  eu: 'https://data.eu.pendo.io',
  us1: 'https://us1.data.pendo.io',
  jpn: 'https://data.jpn.pendo.io',
  au: 'https://data.au.pendo.io'
};

export class PendoClient {
  private axios: ReturnType<typeof createAxios>;
  private region: PendoRegion;
  private trackEventSharedSecret?: string;

  constructor(params: {
    token: string;
    region: PendoRegion;
    trackEventSharedSecret?: string;
  }) {
    let baseURL = API_BASE_URLS[params.region] || API_BASE_URLS.us;
    this.region = params.region;
    this.trackEventSharedSecret = params.trackEventSharedSecret;
    this.axios = createAxios({
      baseURL,
      headers: {
        'x-pendo-integration-key': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw pendoApiError(error, operation);
    }
  }

  private listParams(options: { appId?: string; expandAll?: boolean } = {}) {
    let params: Record<string, string> = {};
    if (options.appId) params.appId = options.appId;
    if (options.expandAll) params.expand = '*';
    return params;
  }

  // --- Visitors ---

  async getVisitor(visitorId: string): Promise<any> {
    return this.request('get visitor', () =>
      this.axios.get(`/visitor/${encodeURIComponent(visitorId)}`)
    );
  }

  async listVisitors(appId?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (appId) params.appId = appId;
    return this.request('list visitors', () => this.axios.get('/visitor', { params }));
  }

  async updateVisitorMetadata(visitorId: string, metadata: Record<string, any>): Promise<any> {
    return this.request('update visitor metadata', () =>
      this.axios.post(
        '/metadata/visitor/custom/value',
        [
          {
            visitorId,
            values: metadata
          }
        ],
        { params: { create: true } }
      )
    );
  }

  async bulkDeleteVisitors(visitorIds: string[]): Promise<any> {
    return this.request('bulk delete visitors', () =>
      this.axios.post('/bulkdelete/visitor', { visitors: visitorIds })
    );
  }

  // --- Accounts ---

  async getAccount(accountId: string): Promise<any> {
    return this.request('get account', () =>
      this.axios.get(`/account/${encodeURIComponent(accountId)}`)
    );
  }

  async listAccounts(appId?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (appId) params.appId = appId;
    return this.request('list accounts', () => this.axios.get('/account', { params }));
  }

  async updateAccountMetadata(accountId: string, metadata: Record<string, any>): Promise<any> {
    return this.request('update account metadata', () =>
      this.axios.post(
        '/metadata/account/custom/value',
        [
          {
            accountId,
            values: metadata
          }
        ],
        { params: { create: true } }
      )
    );
  }

  async bulkDeleteAccounts(accountIds: string[]): Promise<any> {
    return this.request('bulk delete accounts', () =>
      this.axios.post('/bulkdelete/account', { accounts: accountIds })
    );
  }

  async getBulkDeleteStatus(requestId?: string): Promise<any> {
    if (requestId) {
      return this.request('get bulk deletion status', () =>
        this.axios.get(`/bulkdelete/${encodeURIComponent(requestId)}`)
      );
    }

    return this.request('list outstanding bulk deletion requests', () =>
      this.axios.get('/bulkdelete')
    );
  }

  // --- Guides ---

  async getGuide(guideId: string): Promise<any> {
    return this.request('get guide', () =>
      this.axios.get('/guide', { params: { id: guideId } })
    );
  }

  async listGuides(
    options: { appId?: string; expandAll?: boolean; summarizeContent?: boolean } = {}
  ): Promise<any[]> {
    let params = this.listParams(options);
    if (options.summarizeContent) params.summarizeContent = 'true';
    return this.request('list guides', () => this.axios.get('/guide', { params }));
  }

  // --- Pages ---

  async getPage(pageId: string): Promise<any> {
    return this.request('get page', () => this.axios.get('/page', { params: { id: pageId } }));
  }

  async listPages(options: { appId?: string; expandAll?: boolean } = {}): Promise<any[]> {
    return this.request('list pages', () =>
      this.axios.get('/page', { params: this.listParams(options) })
    );
  }

  // --- Features ---

  async getFeature(featureId: string): Promise<any> {
    return this.request('get feature', () =>
      this.axios.get('/feature', { params: { id: featureId } })
    );
  }

  async listFeatures(options: { appId?: string; expandAll?: boolean } = {}): Promise<any[]> {
    return this.request('list features', () =>
      this.axios.get('/feature', { params: this.listParams(options) })
    );
  }

  // --- Track Types and Events ---

  async listTrackTypes(options: { appId?: string; expandAll?: boolean } = {}): Promise<any[]> {
    return this.request('list track types', () =>
      this.axios.get('/tracktype', { params: this.listParams(options) })
    );
  }

  async getTrackType(trackTypeId: string): Promise<any> {
    return this.request('get track type', () =>
      this.axios.get('/tracktype', { params: { id: trackTypeId } })
    );
  }

  async sendTrackEvent(event: {
    event: string;
    visitorId: string;
    accountId?: string;
    timestamp: number;
    properties?: Record<string, any>;
    context?: {
      ip?: string;
      userAgent?: string;
      url?: string;
      title?: string;
    };
  }): Promise<any> {
    if (!this.trackEventSharedSecret) {
      throw pendoServiceError(
        'A Pendo Track Event shared secret is required to send track events.'
      );
    }

    let dataAxios = createAxios({
      baseURL: DATA_BASE_URLS[this.region] || DATA_BASE_URLS.us,
      headers: {
        'x-pendo-integration-key': this.trackEventSharedSecret,
        'Content-Type': 'application/json'
      }
    });

    return this.request('send track event', () =>
      dataAxios.post('/data/track', {
        type: 'track',
        ...event
      })
    );
  }

  // --- Segments ---

  async getSegment(segmentId: string): Promise<any> {
    return this.request('get segment', () =>
      this.axios.get(`/segment/${encodeURIComponent(segmentId)}`)
    );
  }

  async listSegments(): Promise<any[]> {
    return this.request('list segments', () => this.axios.get('/segment'));
  }

  async createSegment(segment: { name: string; visitorIds: string[] }): Promise<any> {
    return this.request('create segment', () =>
      this.axios.post('/segment/upload', {
        name: segment.name,
        visitors: segment.visitorIds
      })
    );
  }

  async updateSegment(
    segmentId: string,
    updates: {
      name?: string;
      visitorIds?: string[];
    }
  ): Promise<any> {
    let body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.visitorIds !== undefined) body.visitors = updates.visitorIds;

    return this.request('update segment', () =>
      this.axios.put(`/segment/${encodeURIComponent(segmentId)}`, body)
    );
  }

  async patchSegmentVisitors(
    segmentId: string,
    operations: Array<{ op: 'add' | 'remove'; visitorIds: string[] }>
  ): Promise<any> {
    return this.request('patch segment visitors', () =>
      this.axios.patch(`/segment/${encodeURIComponent(segmentId)}/visitor`, {
        patch: operations.map(operation => ({
          op: operation.op,
          path: '/visitors',
          value: operation.visitorIds
        }))
      })
    );
  }

  async startSegmentVisitorExport(segmentId: string): Promise<any> {
    return this.request('start segment visitor export', () =>
      this.axios.post(`/segment/${encodeURIComponent(segmentId)}/visitors`)
    );
  }

  async getSegmentVisitorExportStatus(segmentId: string, jobId: string): Promise<any> {
    return this.request('get segment visitor export status', () =>
      this.axios.get(
        `/segment/${encodeURIComponent(segmentId)}/visitors/${encodeURIComponent(jobId)}/status`
      )
    );
  }

  async getSegmentVisitorExportResults(
    segmentId: string,
    jobId: string,
    contentType: 'csv' = 'csv'
  ): Promise<string> {
    return this.request('get segment visitor export results', () =>
      this.axios.get(
        `/segment/${encodeURIComponent(segmentId)}/visitors/${encodeURIComponent(jobId)}/results/${contentType}`,
        { responseType: 'text' }
      )
    );
  }

  async deleteSegment(segmentId: string): Promise<void> {
    await this.request('delete segment', () =>
      this.axios.delete(`/segment/${encodeURIComponent(segmentId)}`)
    );
  }

  // --- Reports ---

  async getReport(reportId: string, format: 'json' | 'csv' = 'json'): Promise<any> {
    return this.request('get report', () =>
      this.axios.get(`/report/${encodeURIComponent(reportId)}/results.${format}`, {
        responseType: format === 'csv' ? 'text' : 'json'
      })
    );
  }

  async listReports(): Promise<any[]> {
    return this.request('list reports', () => this.axios.get('/report'));
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
    return this.request('run aggregation', () => this.axios.post('/aggregation', body));
  }

  // --- Metadata Schema ---

  async getMetadataSchema(kind: 'visitor' | 'account'): Promise<any> {
    return this.request('get metadata schema', () =>
      this.axios.get(`/metadata/schema/${kind}`)
    );
  }

  // --- Admin ---

  async verifyIntegrationKey(): Promise<any> {
    return this.request('verify integration key', () => this.axios.get('/token/verify'));
  }
}
