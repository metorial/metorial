import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.hightouch.com/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Sources ──

  async listSources(params?: { limit?: number; offset?: number; orderBy?: string }) {
    let response = await this.axios.get('/sources', { params });
    return response.data as { data: any[]; hasMore: boolean };
  }

  async getSource(sourceId: number) {
    let response = await this.axios.get(`/sources/${sourceId}`);
    return response.data;
  }

  async createSource(data: {
    name: string;
    slug: string;
    type: string;
    configuration: Record<string, any>;
  }) {
    let response = await this.axios.post('/sources', data);
    return response.data;
  }

  async updateSource(
    sourceId: number,
    data: { name?: string; configuration?: Record<string, any> }
  ) {
    let response = await this.axios.patch(`/sources/${sourceId}`, data);
    return response.data;
  }

  // ── Destinations ──

  async listDestinations(params?: { limit?: number; offset?: number; orderBy?: string }) {
    let response = await this.axios.get('/destinations', { params });
    return response.data as { data: any[]; hasMore: boolean };
  }

  async getDestination(destinationId: number) {
    let response = await this.axios.get(`/destinations/${destinationId}`);
    return response.data;
  }

  async createDestination(data: {
    name: string;
    slug: string;
    type: string;
    configuration: Record<string, any>;
  }) {
    let response = await this.axios.post('/destinations', data);
    return response.data;
  }

  async updateDestination(
    destinationId: number,
    data: { name?: string; configuration?: Record<string, any> }
  ) {
    let response = await this.axios.patch(`/destinations/${destinationId}`, data);
    return response.data;
  }

  // ── Models ──

  async listModels(params?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    name?: string;
    slug?: string;
  }) {
    let response = await this.axios.get('/models', { params });
    return response.data as { data: any[]; hasMore: boolean };
  }

  async getModel(modelId: number) {
    let response = await this.axios.get(`/models/${modelId}`);
    return response.data;
  }

  async createModel(data: {
    name: string;
    slug: string;
    sourceId: number;
    primaryKey: string;
    queryType: string;
    isSchema: boolean;
    custom?: { query: string };
    dbt?: { modelId: string };
    raw?: { sql: string };
    table?: { name: string };
    visual?: { filter: string; parentId: string; label: string };
    folderId?: string;
  }) {
    let response = await this.axios.post('/models', data);
    return response.data;
  }

  async updateModel(
    modelId: number,
    data: {
      name?: string;
      primaryKey?: string;
      isSchema?: boolean;
      custom?: { query: string };
      dbt?: { modelId: string };
      raw?: { sql: string };
      table?: { name: string };
      visual?: { filter: string; parentId: string; label: string };
      folderId?: string;
    }
  ) {
    let response = await this.axios.patch(`/models/${modelId}`, data);
    return response.data;
  }

  // ── Syncs ──

  async listSyncs(params?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    modelId?: number;
    slug?: string;
    after?: string;
    before?: string;
  }) {
    let response = await this.axios.get('/syncs', { params });
    return response.data as { data: any[]; hasMore: boolean };
  }

  async getSync(syncId: number) {
    let response = await this.axios.get(`/syncs/${syncId}`);
    return response.data;
  }

  async createSync(data: {
    slug: string;
    destinationId: number;
    modelId: number;
    configuration: Record<string, any>;
    disabled: boolean;
    schedule?: {
      type: string;
      schedule: Record<string, any>;
    };
  }) {
    let response = await this.axios.post('/syncs', data);
    return response.data;
  }

  async updateSync(
    syncId: number,
    data: {
      configuration?: Record<string, any>;
      disabled?: boolean;
      schedule?: {
        type: string;
        schedule: Record<string, any>;
      };
    }
  ) {
    let response = await this.axios.patch(`/syncs/${syncId}`, data);
    return response.data;
  }

  // ── Sync Triggering ──

  async triggerSync(syncId: number, options?: { fullResync?: boolean; resetCDC?: boolean }) {
    let response = await this.axios.post(`/syncs/${syncId}/trigger`, options ?? {});
    return response.data as { id: string };
  }

  async triggerSyncByIdOrSlug(options: {
    syncId?: string;
    syncSlug?: string;
    fullResync?: boolean;
    resetCDC?: boolean;
  }) {
    let response = await this.axios.post('/syncs/trigger', options);
    return response.data as { id: string };
  }

  async triggerSyncSequence(syncSequenceId: string) {
    let response = await this.axios.post(`/sync-sequences/${syncSequenceId}/trigger`);
    return response.data;
  }

  // ── Sync Runs ──

  async listSyncRuns(
    syncId: number,
    params?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      runId?: number;
      after?: string;
      before?: string;
      within?: number;
    }
  ) {
    let response = await this.axios.get(`/syncs/${syncId}/runs`, { params });
    return response.data as { data: any[]; hasMore: boolean };
  }

  async getSyncSequenceRun(syncSequenceRunId: string) {
    let response = await this.axios.get(`/sync-sequences/runs/${syncSequenceRunId}`);
    return response.data;
  }
}
