import { createAxios } from 'slates';

export interface NangoClientConfig {
  token: string;
  baseUrl: string;
}

export class NangoClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: NangoClientConfig) {
    this.http = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Integrations ---

  async listIntegrations(): Promise<{ data: NangoIntegration[] }> {
    let response = await this.http.get('/integrations');
    return response.data;
  }

  async getIntegration(
    uniqueKey: string,
    include?: string[]
  ): Promise<{ data: NangoIntegration }> {
    let params: Record<string, any> = {};
    if (include && include.length > 0) {
      params.include = include;
    }
    let response = await this.http.get(`/integrations/${uniqueKey}`, { params });
    return response.data;
  }

  async createIntegration(body: {
    unique_key: string;
    provider: string;
    display_name?: string;
    credentials?: Record<string, any>;
  }): Promise<{ data: NangoIntegration }> {
    let response = await this.http.post('/integrations', body);
    return response.data;
  }

  async updateIntegration(
    uniqueKey: string,
    body: {
      unique_key?: string;
      display_name?: string;
      credentials?: Record<string, any>;
    }
  ): Promise<{ data: NangoIntegration }> {
    let response = await this.http.patch(`/integrations/${uniqueKey}`, body);
    return response.data;
  }

  async deleteIntegration(uniqueKey: string): Promise<{ success: boolean }> {
    let response = await this.http.delete(`/integrations/${uniqueKey}`);
    return response.data;
  }

  // --- Connections ---

  async listConnections(params?: {
    connectionId?: string;
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<{ connections: NangoConnectionSummary[] }> {
    let response = await this.http.get('/connections', { params });
    return response.data;
  }

  async getConnection(
    connectionId: string,
    params: {
      provider_config_key: string;
      force_refresh?: boolean;
      refresh_token?: boolean;
    }
  ): Promise<NangoConnectionFull> {
    let response = await this.http.get(`/connections/${connectionId}`, { params });
    return response.data;
  }

  async createConnection(body: {
    provider_config_key: string;
    connection_id?: string;
    credentials: Record<string, any>;
    metadata?: Record<string, any>;
    connection_config?: Record<string, any>;
    tags?: Record<string, string>;
  }): Promise<NangoConnectionFull> {
    let response = await this.http.post('/connections', body);
    return response.data;
  }

  async deleteConnection(
    connectionId: string,
    providerConfigKey: string
  ): Promise<{ success: boolean }> {
    let response = await this.http.delete(`/connections/${connectionId}`, {
      params: { provider_config_key: providerConfigKey }
    });
    return response.data;
  }

  // --- Connection Metadata ---

  async setConnectionMetadata(body: {
    connection_id: string | string[];
    provider_config_key: string;
    metadata: Record<string, any>;
  }): Promise<any> {
    let response = await this.http.post('/connections/metadata', body);
    return response.data;
  }

  async updateConnectionMetadata(body: {
    connection_id: string | string[];
    provider_config_key: string;
    metadata: Record<string, any>;
  }): Promise<any> {
    let response = await this.http.patch('/connections/metadata', body);
    return response.data;
  }

  // --- Proxy ---

  async proxyRequest(params: {
    method: string;
    endpoint: string;
    connectionId: string;
    providerConfigKey: string;
    data?: any;
    queryParams?: Record<string, string>;
    retries?: number;
    baseUrlOverride?: string;
    headers?: Record<string, string>;
  }): Promise<any> {
    let requestHeaders: Record<string, string> = {
      'Connection-Id': params.connectionId,
      'Provider-Config-Key': params.providerConfigKey
    };

    if (params.retries !== undefined) {
      requestHeaders.Retries = String(params.retries);
    }
    if (params.baseUrlOverride) {
      requestHeaders['Base-Url-Override'] = params.baseUrlOverride;
    }
    if (params.headers) {
      Object.assign(requestHeaders, params.headers);
    }

    let response = await this.http.request({
      method: params.method as any,
      url: `/proxy/${params.endpoint}`,
      headers: requestHeaders,
      data: params.data,
      params: params.queryParams
    });
    return response.data;
  }

  // --- Syncs ---

  async triggerSync(body: {
    provider_config_key: string;
    syncs: (string | { name: string; variant?: string })[];
    connection_id?: string;
    opts?: { reset?: boolean; emptyCache?: boolean };
  }): Promise<{ success: boolean }> {
    let response = await this.http.post('/sync/trigger', body);
    return response.data;
  }

  async startSync(body: {
    provider_config_key: string;
    syncs: (string | { name: string; variant?: string })[];
    connection_id?: string;
  }): Promise<{ success: boolean }> {
    let response = await this.http.post('/sync/start', body);
    return response.data;
  }

  async pauseSync(body: {
    provider_config_key: string;
    syncs: (string | { name: string; variant?: string })[];
    connection_id?: string;
  }): Promise<{ success: boolean }> {
    let response = await this.http.post('/sync/pause', body);
    return response.data;
  }

  async getSyncStatus(params: {
    provider_config_key: string;
    syncs: string;
    connection_id?: string;
  }): Promise<{ syncs: NangoSyncStatus[] }> {
    let response = await this.http.get('/sync/status', { params });
    return response.data;
  }

  // --- Records ---

  async getRecords(params: {
    connectionId: string;
    providerConfigKey: string;
    model: string;
    cursor?: string;
    modifiedAfter?: string;
    ids?: string[];
    limit?: number;
  }): Promise<{ records: NangoRecord[]; next_cursor?: string }> {
    let requestHeaders: Record<string, string> = {
      'Connection-Id': params.connectionId,
      'Provider-Config-Key': params.providerConfigKey
    };

    let queryParams: Record<string, any> = {
      model: params.model
    };
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.modifiedAfter) queryParams.modified_after = params.modifiedAfter;
    if (params.ids) queryParams.ids = params.ids;
    if (params.limit) queryParams.limit = params.limit;

    let response = await this.http.get('/records', {
      headers: requestHeaders,
      params: queryParams
    });
    return response.data;
  }

  // --- Actions ---

  async triggerAction(params: {
    connectionId: string;
    providerConfigKey: string;
    actionName: string;
    input?: Record<string, any>;
  }): Promise<any> {
    let response = await this.http.post(
      '/action/trigger',
      {
        action_name: params.actionName,
        input: params.input
      },
      {
        headers: {
          'Connection-Id': params.connectionId,
          'Provider-Config-Key': params.providerConfigKey
        }
      }
    );
    return response.data;
  }

  // --- Connect Sessions ---

  async createConnectSession(body: {
    end_user: {
      id: string;
      email?: string;
      display_name?: string;
      tags?: Record<string, string>;
    };
    organization?: {
      id?: string;
      display_name?: string;
    };
    allowed_integrations?: string[];
    integrations_config_defaults?: Record<string, any>;
  }): Promise<{ data: { token: string; expires_at: string } }> {
    let response = await this.http.post('/connect/sessions', body);
    return response.data;
  }

  async getConnectSession(token: string): Promise<any> {
    let response = await this.http.get('/connect/sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async deleteConnectSession(token: string): Promise<any> {
    let response = await this.http.delete('/connect/sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
}

// --- Types ---

export interface NangoIntegration {
  unique_key: string;
  display_name: string;
  provider: string;
  logo: string;
  created_at: string;
  updated_at: string;
  webhook_url?: string;
  credentials?: Record<string, any>;
}

export interface NangoConnectionSummary {
  id: number;
  connection_id: string;
  provider: string;
  provider_config_key: string;
  created: string;
  metadata: Record<string, any> | null;
  tags: Record<string, string>;
  errors: { type: string; log_id: string }[];
}

export interface NangoConnectionFull {
  id: number;
  connection_id: string;
  provider: string;
  provider_config_key: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any> | null;
  credentials: Record<string, any>;
  connection_config: Record<string, any>;
  tags: Record<string, string>;
  errors: { type: string; log_id: string }[];
}

export interface NangoSyncStatus {
  id: string;
  status: string;
  checkpoint: string | null;
  finished_at: string | null;
  next_scheduled_sync_at: string | null;
  frequency: string;
  latest_result: {
    added: number;
    updated: number;
    deleted: number;
  };
  record_count: Record<string, number>;
}

export interface NangoRecord {
  [key: string]: any;
  _nango_metadata: {
    deleted_at: string | null;
    last_action: string;
    first_seen_at: string;
    last_modified_at: string;
    cursor: string;
  };
}
