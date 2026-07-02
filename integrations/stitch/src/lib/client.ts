import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.stitchdata.com',
  eu: 'https://api.eu-central-1.stitchdata.com'
};

export class StitchConnectClient {
  private axios: ReturnType<typeof createAxios>;
  private clientId?: string;

  constructor(params: { token: string; region: string; clientId?: string }) {
    this.clientId = params.clientId;
    this.axios = createAxios({
      baseURL: BASE_URLS[params.region] || BASE_URLS.us,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ===== Sources =====

  async listSources(): Promise<any[]> {
    let res = await this.axios.get('/v4/sources');
    return res.data;
  }

  async getSource(sourceId: number): Promise<any> {
    let res = await this.axios.get(`/v4/sources/${sourceId}`);
    return res.data;
  }

  async createSource(body: {
    type: string;
    display_name: string;
    properties?: Record<string, any>;
  }): Promise<any> {
    let res = await this.axios.post('/v4/sources', body);
    return res.data;
  }

  async updateSource(sourceId: number, body: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/v4/sources/${sourceId}`, body);
    return res.data;
  }

  async deleteSource(sourceId: number): Promise<any> {
    let res = await this.axios.delete(`/v4/sources/${sourceId}`);
    return res.data;
  }

  async getLastConnectionCheck(sourceId: number): Promise<any> {
    let res = await this.axios.get(`/v4/sources/${sourceId}/last-connection-check`);
    return res.data;
  }

  // ===== Source Types =====

  async listSourceTypes(): Promise<any> {
    let res = await this.axios.get('/v4/source-types');
    return res.data;
  }

  async getSourceType(sourceType: string): Promise<any> {
    let res = await this.axios.get(`/v4/source-types/${sourceType}`);
    return res.data;
  }

  // ===== Destinations =====

  async listDestinations(): Promise<any[]> {
    let res = await this.axios.get('/v4/destinations');
    return res.data;
  }

  async createDestination(body: {
    type: string;
    properties: Record<string, any>;
    name?: string;
  }): Promise<any> {
    let res = await this.axios.post('/v4/destinations', body);
    return res.data;
  }

  async updateDestination(destinationId: number, body: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/v4/destinations/${destinationId}`, body);
    return res.data;
  }

  async deleteDestination(destinationId: number): Promise<any> {
    let res = await this.axios.delete(`/v4/destinations/${destinationId}`);
    return res.data;
  }

  async listDestinationTypes(): Promise<any> {
    let res = await this.axios.get('/v4/destination-types');
    return res.data;
  }

  async getDestinationType(destinationType: string): Promise<any> {
    let res = await this.axios.get(`/v4/destination-types/${destinationType}`);
    return res.data;
  }

  // ===== Streams =====

  async listStreams(sourceId: number): Promise<any> {
    let res = await this.axios.get(`/v4/sources/${sourceId}/streams`);
    return res.data;
  }

  async getStream(sourceId: number, streamId: number): Promise<any> {
    let res = await this.axios.get(`/v4/sources/${sourceId}/streams/${streamId}`);
    return res.data;
  }

  async updateStreamMetadata(sourceId: number, streams: any[]): Promise<any> {
    let res = await this.axios.put(`/v4/sources/${sourceId}/streams/metadata`, { streams });
    return res.data;
  }

  // ===== Replication =====

  async startReplication(sourceId: number): Promise<any> {
    let res = await this.axios.post(`/v4/sources/${sourceId}/sync`);
    return res.data;
  }

  async stopReplication(sourceId: number): Promise<any> {
    let res = await this.axios.delete(`/v4/sources/${sourceId}/sync`);
    return res.data;
  }

  // ===== Extractions & Loads =====

  async listExtractions(page?: number): Promise<any> {
    let clientId = this.getClientIdOrThrow();
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let res = await this.axios.get(`/v4/${clientId}/extractions`, { params });
    return res.data;
  }

  async getExtractionLogs(jobName: string): Promise<any> {
    let clientId = this.getClientIdOrThrow();
    let res = await this.axios.get(`/v4/${clientId}/extractions/${jobName}`);
    return res.data;
  }

  async listLoads(page?: number): Promise<any> {
    let clientId = this.getClientIdOrThrow();
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let res = await this.axios.get(`/v4/${clientId}/loads`, { params });
    return res.data;
  }

  // ===== Notifications: Custom Emails =====

  async listCustomEmails(): Promise<any[]> {
    let res = await this.axios.get('/notifications/public/v1/api/custom-emails');
    return res.data;
  }

  async createCustomEmail(email: string): Promise<any> {
    let res = await this.axios.post('/notifications/public/v1/api/custom-emails', { email });
    return res.data;
  }

  async updateCustomEmail(emailId: number, disabled: boolean): Promise<any> {
    let res = await this.axios.put(`/notifications/public/v1/api/custom-emails/${emailId}`, {
      disabled
    });
    return res.data;
  }

  async deleteCustomEmail(emailId: number): Promise<any> {
    let res = await this.axios.delete(`/notifications/public/v1/api/custom-emails/${emailId}`);
    return res.data;
  }

  // ===== Notifications: Post-Load Hooks =====

  async listHooks(): Promise<any[]> {
    let res = await this.axios.get('/notifications/public/v1/api/hooks');
    return res.data;
  }

  async createHook(url: string): Promise<any> {
    let res = await this.axios.post('/notifications/public/v1/api/hooks', { url });
    return res.data;
  }

  async updateHook(hookId: number, disabled: boolean): Promise<any> {
    let res = await this.axios.put(`/notifications/public/v1/api/hooks/${hookId}`, {
      disabled
    });
    return res.data;
  }

  async deleteHook(hookId: number): Promise<any> {
    let res = await this.axios.delete(`/notifications/public/v1/api/hooks/${hookId}`);
    return res.data;
  }

  // ===== Helpers =====

  private getClientIdOrThrow(): string {
    if (!this.clientId) {
      throw new Error(
        'Stitch client ID is required for this operation. Set it in the configuration.'
      );
    }
    return this.clientId;
  }
}

export class StitchImportClient {
  private axios: ReturnType<typeof createAxios>;
  private clientId: string;

  constructor(params: { token: string; region: string; clientId: string }) {
    this.clientId = params.clientId;
    this.axios = createAxios({
      baseURL: BASE_URLS[params.region] || BASE_URLS.us,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getStatus(): Promise<any> {
    let res = await this.axios.get('/v2/import/status');
    return res.data;
  }

  async pushBatch(body: {
    table_name: string;
    schema: Record<string, any>;
    messages: Array<{
      action: string;
      sequence: number;
      data: Record<string, any>;
    }>;
    key_names?: string[];
  }): Promise<any> {
    let res = await this.axios.post('/v2/import/batch', body);
    return res.data;
  }

  async pushData(
    records: Array<{
      client_id: number;
      table_name: string;
      sequence: number;
      action: string;
      key_names?: string[];
      data: Record<string, any>;
    }>
  ): Promise<any> {
    let res = await this.axios.post('/v2/import/push', records);
    return res.data;
  }

  async validatePush(
    records: Array<{
      client_id: number;
      table_name: string;
      sequence: number;
      action: string;
      key_names?: string[];
      data: Record<string, any>;
    }>
  ): Promise<any> {
    let res = await this.axios.post('/v2/import/validate', records);
    return res.data;
  }

  getClientId(): string {
    return this.clientId;
  }
}
