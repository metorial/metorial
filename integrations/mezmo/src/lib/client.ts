import { createAxios } from 'slates';

export class MezmoClient {
  private api: ReturnType<typeof createAxios>;
  private ingestionApi: ReturnType<typeof createAxios>;

  constructor(options: { token: string; ingestionKey?: string }) {
    this.api = createAxios({
      baseURL: 'https://api.mezmo.com',
      headers: {
        Authorization: `Token ${options.token}`,
        'Content-Type': 'application/json'
      }
    });

    this.ingestionApi = createAxios({
      baseURL: 'https://logs.mezmo.com',
      headers: {
        'Content-Type': 'application/json',
        ...(options.ingestionKey ? { apikey: options.ingestionKey } : {})
      }
    });
  }

  // --- Log Ingestion ---

  async ingestLogs(params: {
    hostname: string;
    lines: Array<{
      line: string;
      timestamp?: number;
      app?: string;
      level?: string;
      env?: string;
      meta?: Record<string, unknown>;
      tags?: string;
    }>;
    tags?: string;
    now?: number;
  }) {
    let queryParams: Record<string, string> = { hostname: params.hostname };
    if (params.tags) queryParams.tags = params.tags;
    if (params.now) queryParams.now = String(params.now);

    let response = await this.ingestionApi.post(
      '/logs/ingest',
      { lines: params.lines },
      {
        params: queryParams
      }
    );
    return response.data;
  }

  // --- Export / Search ---

  async exportLogs(params: {
    from: number;
    to: number;
    query?: string;
    levels?: string;
    apps?: string;
    hosts?: string;
    prefer?: 'head' | 'tail';
    size?: number;
    paginationId?: string | null;
  }) {
    let queryParams: Record<string, string | number> = {
      from: params.from,
      to: params.to
    };
    if (params.query) queryParams.query = params.query;
    if (params.levels) queryParams.levels = params.levels;
    if (params.apps) queryParams.apps = params.apps;
    if (params.hosts) queryParams.hosts = params.hosts;
    if (params.prefer) queryParams.prefer = params.prefer;
    if (params.size) queryParams.size = params.size;
    if (params.paginationId !== undefined && params.paginationId !== null) {
      queryParams.pagination_id = params.paginationId;
    }

    let response = await this.api.get('/v2/export', { params: queryParams });
    return response.data as {
      lines: Record<string, unknown>[];
      pagination_id: string | null;
    };
  }

  // --- Views ---

  async listViews() {
    let response = await this.api.get('/v1/config/view');
    return response.data as ViewResponse[];
  }

  async getView(viewId: string) {
    let response = await this.api.get(`/v1/config/view/${viewId}`);
    return response.data as ViewResponse;
  }

  async createView(params: ViewRequest) {
    let response = await this.api.post('/v1/config/view', params);
    return response.data as ViewResponse;
  }

  async updateView(viewId: string, params: Partial<ViewRequest>) {
    let response = await this.api.put(`/v1/config/view/${viewId}`, params);
    return response.data as ViewResponse;
  }

  async deleteView(viewId: string) {
    let response = await this.api.delete(`/v1/config/view/${viewId}`);
    return response.data;
  }

  // --- Preset Alerts ---

  async listPresetAlerts() {
    let response = await this.api.get('/v1/config/presetalert');
    return response.data as PresetAlertResponse[];
  }

  async getPresetAlert(presetId: string) {
    let response = await this.api.get(`/v1/config/presetalert/${presetId}`);
    return response.data as PresetAlertResponse;
  }

  async createPresetAlert(params: PresetAlertRequest) {
    let response = await this.api.post('/v1/config/presetalert', params);
    return response.data as PresetAlertResponse;
  }

  async updatePresetAlert(presetId: string, params: Partial<PresetAlertRequest>) {
    let response = await this.api.put(`/v1/config/presetalert/${presetId}`, params);
    return response.data as PresetAlertResponse;
  }

  async deletePresetAlert(presetId: string) {
    let response = await this.api.delete(`/v1/config/presetalert/${presetId}`);
    return response.data;
  }

  // --- Categories ---

  async listCategories(type: string) {
    let response = await this.api.get(`/v1/config/categories/${type}`);
    return response.data as CategoryResponse[];
  }

  async createCategory(type: string, name: string) {
    let response = await this.api.post(`/v1/config/categories/${type}`, { name });
    return response.data as CategoryResponse;
  }

  async updateCategory(type: string, categoryId: string, name: string) {
    let response = await this.api.put(`/v1/config/categories/${type}/${categoryId}`, { name });
    return response.data as CategoryResponse;
  }

  async deleteCategory(type: string, categoryId: string) {
    let response = await this.api.delete(`/v1/config/categories/${type}/${categoryId}`);
    return response.data;
  }

  // --- Boards ---

  async listBoards() {
    let response = await this.api.get('/v1/config/boards');
    return response.data as BoardResponse[];
  }

  async getBoard(boardId: string) {
    let response = await this.api.get(`/v1/config/boards/${boardId}`);
    return response.data as BoardResponse;
  }

  async createBoard(params: BoardRequest) {
    let response = await this.api.post('/v1/config/boards', params);
    return response.data as BoardResponse;
  }

  async deleteBoard(boardId: string) {
    let response = await this.api.delete(`/v1/config/boards/${boardId}`);
    return response.data;
  }

  // --- Exclusion Rules ---

  async listExclusionRules() {
    let response = await this.api.get('/v1/config/ingestion/exclusions');
    return response.data as ExclusionRuleResponse[];
  }

  async getExclusionRule(ruleId: string) {
    let response = await this.api.get(`/v1/config/ingestion/exclusions/${ruleId}`);
    return response.data as ExclusionRuleResponse;
  }

  async createExclusionRule(params: ExclusionRuleRequest) {
    let response = await this.api.post('/v1/config/ingestion/exclusions', params);
    return response.data as ExclusionRuleResponse;
  }

  async updateExclusionRule(ruleId: string, params: Partial<ExclusionRuleRequest>) {
    let response = await this.api.patch(`/v1/config/ingestion/exclusions/${ruleId}`, params);
    return response.data as ExclusionRuleResponse;
  }

  async deleteExclusionRule(ruleId: string) {
    let response = await this.api.delete(`/v1/config/ingestion/exclusions/${ruleId}`);
    return response.data;
  }

  // --- Ingestion Control ---

  async getIngestionStatus() {
    let response = await this.api.get('/v1/config/ingestion/status');
    return response.data as { status: string };
  }

  async suspendIngestion() {
    let response = await this.api.post('/v1/config/ingestion/suspend');
    return response.data as { token: string };
  }

  async confirmSuspendIngestion(suspendToken: string) {
    let response = await this.api.post('/v1/config/ingestion/suspend/confirm', {
      token: suspendToken
    });
    return response.data;
  }

  async resumeIngestion() {
    let response = await this.api.post('/v1/config/ingestion/resume');
    return response.data;
  }

  // --- Usage ---

  async getUsage(params: { from: number; to: number }) {
    let response = await this.api.get('/v1/usage', {
      params: { from: params.from, to: params.to }
    });
    return response.data;
  }

  async getUsageByApps(params: { from: number; to: number }) {
    let response = await this.api.get('/v1/usage/apps', {
      params: { from: params.from, to: params.to }
    });
    return response.data;
  }

  async getUsageByApp(appName: string, params: { from: number; to: number }) {
    let response = await this.api.get(`/v1/usage/apps/${encodeURIComponent(appName)}`, {
      params: { from: params.from, to: params.to }
    });
    return response.data;
  }

  async getUsageByHosts(params: { from: number; to: number }) {
    let response = await this.api.get('/v1/usage/hosts', {
      params: { from: params.from, to: params.to }
    });
    return response.data;
  }

  async getUsageByTags(params: { from: number; to: number }) {
    let response = await this.api.get('/v1/usage/tags', {
      params: { from: params.from, to: params.to }
    });
    return response.data;
  }

  // --- Archiving ---

  async getArchiveConfig() {
    let response = await this.api.get('/v1/config/archiving');
    return response.data as ArchiveResponse;
  }

  async createArchiveConfig(params: ArchiveRequest) {
    let response = await this.api.post('/v1/config/archiving', params);
    return response.data as ArchiveResponse;
  }

  async updateArchiveConfig(params: ArchiveRequest) {
    let response = await this.api.put('/v1/config/archiving', params);
    return response.data as ArchiveResponse;
  }

  async deleteArchiveConfig() {
    let response = await this.api.delete('/v1/config/archiving');
    return response.data;
  }

  // --- Keys ---

  async listKeys(type?: 'ingestion' | 'service') {
    let response = await this.api.get('/v1/config/keys', {
      params: type ? { type } : undefined
    });
    return response.data as KeyResponse[];
  }

  async createKey(params: { name?: string; type: 'ingestion' | 'service' }) {
    let response = await this.api.post(
      '/v1/config/keys',
      { name: params.name },
      {
        params: { type: params.type }
      }
    );
    return response.data as KeyResponse;
  }

  async deleteKey(keyId: string) {
    let response = await this.api.delete(`/v1/config/keys/${keyId}`);
    return response.data;
  }
}

// --- Types ---

export interface ChannelConfig {
  integration: string;
  emails?: string[];
  url?: string;
  key?: string;
  method?: string;
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, unknown>;
  triggerlimit?: number;
  triggerinterval?: string;
  operator?: string;
  immediate?: string;
  terminal?: string;
  timezone?: string;
  autoresolve?: boolean;
  autoresolveinterval?: string;
  autoresolvelimit?: number;
}

export interface ViewRequest {
  name: string;
  query?: string;
  apps?: string[];
  hosts?: string[];
  levels?: string[];
  tags?: string[];
  category?: string[];
  channels?: ChannelConfig[];
  presetid?: string;
}

export interface ViewResponse {
  viewID: string;
  name: string;
  query: string;
  apps: string[];
  hosts: string[];
  levels: string[];
  tags: string[];
  category: string[];
  channels: ChannelConfig[];
  presetids: string[];
}

export interface PresetAlertRequest {
  name: string;
  channels: ChannelConfig[];
}

export interface PresetAlertResponse {
  presetid: string;
  name: string;
  channels: ChannelConfig[];
}

export interface CategoryResponse {
  id: string;
  name: string;
  type: string;
}

export interface BoardRequest {
  title: string;
}

export interface BoardResponse {
  boardID?: string;
  id?: string;
  title: string;
}

export interface ExclusionRuleRequest {
  title: string;
  active?: boolean;
  apps?: string[];
  hosts?: string[];
  query?: string;
  indexonly?: boolean;
}

export interface ExclusionRuleResponse {
  id: string;
  title: string;
  active: boolean;
  apps?: string[];
  hosts?: string[];
  query?: string;
  indexonly?: boolean;
}

export interface ArchiveRequest {
  integration: string;
  bucket: string;
  endpoint?: string;
  apikey?: string;
  resourceinstanceid?: string;
  accountname?: string;
  accountkey?: string;
  projectid?: string;
  space?: string;
  accesskey?: string;
  secretkey?: string;
  authurl?: string;
  username?: string;
  password?: string;
  tenantname?: string;
}

export interface ArchiveResponse {
  integration: string;
  bucket: string;
  endpoint?: string;
  apikey?: string;
  resourceinstanceid?: string;
  accountname?: string;
  accountkey?: string;
  projectid?: string;
  space?: string;
  accesskey?: string;
  secretkey?: string;
  authurl?: string;
  expires?: number;
  username?: string;
  password?: string;
  tenantname?: string;
}

export interface KeyResponse {
  id: string;
  key: string;
  name: string;
  type: string;
  created: number;
}
