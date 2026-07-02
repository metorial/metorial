import { createAxios } from 'slates';

export interface PaginationParams {
  page?: number;
  perPage?: number;
  order?: 'asc' | 'desc';
}

export interface PaginationInfo {
  totalRecords: number;
  perPage: number;
  prevPage: number | null;
  page: number;
  nextPage: number | null;
  lastPage: number;
}

export interface CensusListResponse<T> {
  status: string;
  pagination?: PaginationInfo;
  data: T[];
}

export interface CensusSingleResponse<T> {
  status: string;
  data: T;
}

export interface SyncSourceAttributes {
  connectionId: number;
  object: {
    type: string;
    name: string;
    tableCatalog?: string;
    tableSchema?: string;
    tableName?: string;
  };
}

export interface SyncDestinationAttributes {
  connectionId: number;
  object: string;
  leadUnionInsertTo?: string;
}

export interface SyncMapping {
  from: {
    type: string;
    data: string | { value: string; basicType: string };
  };
  to: string;
  isPrimaryIdentifier: boolean;
  generateField: boolean;
  preserveValues: boolean;
  syncNullValues: boolean;
  operation?: string | null;
}

export interface Sync {
  id: number;
  label: string | null;
  status: string;
  operation: string;
  paused: boolean;
  createdAt: string;
  updatedAt: string;
  sourceAttributes: SyncSourceAttributes;
  destinationAttributes: SyncDestinationAttributes;
  mappings: SyncMapping[];
  scheduleFrequency: string;
  scheduleDayOfWeek: string | null;
  scheduleHour: number | null;
  scheduleMinute: number | null;
  cronExpression: string | null;
  fieldBehavior: string | null;
  failedRunNotificationsEnabled: boolean;
  failedRecordNotificationsEnabled: boolean;
}

export interface SyncRun {
  id: number;
  syncId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  scheduledExecutionTime: string | null;
  fullSync: boolean;
  canceled: boolean;
  currentStep: string | null;
  sourceRecordCount: number | null;
  recordsProcessed: number | null;
  recordsUpdated: number | null;
  recordsFailed: number | null;
  recordsInvalid: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorDetail: string | null;
}

export interface Source {
  id: number;
  name: string;
  label: string | null;
  type: string;
  connectionDetails: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Destination {
  id: number;
  name: string;
  label: string | null;
  type: string;
  connectionDetails: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Webhook {
  id: number;
  name: string;
  description: string | null;
  endpoint: string;
  events: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Dataset {
  id: number;
  name: string;
  libraryId: number;
}

let BASE_URLS: Record<string, string> = {
  us: 'https://app.getcensus.com',
  eu: 'https://app-eu.getcensus.com'
};

// Helper to convert snake_case API responses to camelCase
let toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

let convertKeysToCamel = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    let result: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamelCase(key)] = convertKeysToCamel(value);
    }
    return result;
  }
  return obj;
};

// Helper to convert camelCase input to snake_case for API requests
let toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

let convertKeysToSnake = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnake);
  }
  if (obj !== null && typeof obj === 'object') {
    let result: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toSnakeCase(key)] = convertKeysToSnake(value);
    }
    return result;
  }
  return obj;
};

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; region: string }) {
    let baseURL = BASE_URLS[config.region] || BASE_URLS.us;
    this.http = createAxios({
      baseURL: `${baseURL}/api/v1`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Syncs ---

  async listSyncs(
    params?: PaginationParams
  ): Promise<{ syncs: Sync[]; pagination?: PaginationInfo }> {
    let response = await this.http.get('/syncs', {
      params: params ? convertKeysToSnake(params) : undefined
    });
    let data = convertKeysToCamel(response.data) as CensusListResponse<Sync>;
    return { syncs: data.data, pagination: data.pagination };
  }

  async getSync(syncId: number): Promise<Sync> {
    let response = await this.http.get(`/syncs/${syncId}`);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<Sync>;
    return data.data;
  }

  async createSync(syncConfig: Record<string, unknown>): Promise<Sync> {
    let body = convertKeysToSnake(syncConfig);
    let response = await this.http.post('/syncs', body);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<Sync>;
    return data.data;
  }

  async updateSync(syncId: number, updates: Record<string, unknown>): Promise<Sync> {
    let body = convertKeysToSnake(updates);
    let response = await this.http.patch(`/syncs/${syncId}`, body);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<Sync>;
    return data.data;
  }

  async deleteSync(syncId: number): Promise<void> {
    await this.http.delete(`/syncs/${syncId}`);
  }

  async triggerSync(syncId: number, forceFullSync?: boolean): Promise<{ syncRunId: number }> {
    let body = forceFullSync ? { force_full_sync: true } : {};
    let response = await this.http.post(`/syncs/${syncId}/trigger`, body);
    let data = convertKeysToCamel(response.data) as Record<string, unknown>;
    return {
      syncRunId:
        ((data.data as Record<string, unknown>)?.syncRunId as number) ??
        (data.syncRunId as number)
    };
  }

  // --- Sync Runs ---

  async listSyncRuns(
    syncId: number,
    params?: PaginationParams
  ): Promise<{ syncRuns: SyncRun[]; pagination?: PaginationInfo }> {
    let response = await this.http.get(`/syncs/${syncId}/sync_runs`, {
      params: params ? convertKeysToSnake(params) : undefined
    });
    let data = convertKeysToCamel(response.data) as CensusListResponse<SyncRun>;
    return { syncRuns: data.data, pagination: data.pagination };
  }

  async getSyncRun(syncRunId: number): Promise<SyncRun> {
    let response = await this.http.get(`/sync_runs/${syncRunId}`);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<SyncRun>;
    return data.data;
  }

  // --- Sources ---

  async listSources(
    params?: PaginationParams
  ): Promise<{ sources: Source[]; pagination?: PaginationInfo }> {
    let response = await this.http.get('/sources', {
      params: params ? convertKeysToSnake(params) : undefined
    });
    let data = convertKeysToCamel(response.data) as CensusListResponse<Source>;
    return { sources: data.data, pagination: data.pagination };
  }

  async getSource(sourceId: number): Promise<Source> {
    let response = await this.http.get(`/sources/${sourceId}`);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<Source>;
    return data.data;
  }

  // --- Destinations ---

  async listDestinations(
    params?: PaginationParams
  ): Promise<{ destinations: Destination[]; pagination?: PaginationInfo }> {
    let response = await this.http.get('/destinations', {
      params: params ? convertKeysToSnake(params) : undefined
    });
    let data = convertKeysToCamel(response.data) as CensusListResponse<Destination>;
    return { destinations: data.data, pagination: data.pagination };
  }

  async getDestination(destinationId: number): Promise<Destination> {
    let response = await this.http.get(`/destinations/${destinationId}`);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<Destination>;
    return data.data;
  }

  // --- Webhooks ---

  async listWebhooks(): Promise<Webhook[]> {
    let response = await this.http.get('/webhooks');
    let data = convertKeysToCamel(response.data) as CensusListResponse<Webhook>;
    return data.data;
  }

  async getWebhook(webhookId: number): Promise<Webhook> {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<Webhook>;
    return data.data;
  }

  async createWebhook(webhook: {
    name: string;
    endpoint: string;
    description?: string;
    events?: string[];
  }): Promise<Webhook> {
    let body = convertKeysToSnake(webhook);
    let response = await this.http.post('/webhooks', body);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<Webhook>;
    return data.data;
  }

  async updateWebhook(
    webhookId: number,
    updates: { name?: string; endpoint?: string; description?: string; events?: string[] }
  ): Promise<Webhook> {
    let body = convertKeysToSnake(updates);
    let response = await this.http.patch(`/webhooks/${webhookId}`, body);
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<Webhook>;
    return data.data;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  // --- Datasets ---

  async listDatasets(): Promise<Dataset[]> {
    let response = await this.http.get('/entities');
    let data = convertKeysToCamel(response.data) as CensusListResponse<Dataset>;
    return data.data;
  }

  async getDatasetRecord(
    datasetId: number,
    recordId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.http.get(`/entities/${datasetId}/record`, {
      params: { record_id: recordId }
    });
    let data = convertKeysToCamel(response.data) as CensusSingleResponse<
      Record<string, unknown>
    >;
    return data.data;
  }
}
