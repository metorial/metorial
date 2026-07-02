import { createAxios } from 'slates';

export interface LogLine {
  timestamp?: number;
  line: string;
  app?: string;
  level?: string;
  env?: string;
  meta?: Record<string, any>;
  file?: string;
}

export interface IngestOptions {
  hostname: string;
  tags?: string;
  ip?: string;
  mac?: string;
  now?: number;
}

export interface ExportOptions {
  from: number;
  to: number;
  query?: string;
  hosts?: string;
  apps?: string;
  levels?: string;
  tags?: string;
  prefer?: string;
  size?: number;
  paginationId?: string;
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
  presetId?: string;
}

export interface ChannelConfig {
  integration: string;
  emails?: string[];
  url?: string;
  method?: string;
  headers?: Record<string, any>;
  bodyTemplate?: string;
  key?: string;
  triggerlimit?: number;
  triggerinterval?: string;
  operator?: string;
  immediate?: boolean;
  terminal?: boolean;
  timezone?: string;
  autoresolve?: boolean;
  autoresolveinterval?: string;
  autoresolvelimit?: number;
}

export interface AlertRequest {
  name: string;
  channels: ChannelConfig[];
}

export interface CategoryRequest {
  name: string;
}

export interface ExclusionRuleRequest {
  title: string;
  active?: boolean;
  apps?: string[];
  hosts?: string[];
  query?: string;
  indexonly?: boolean;
}

export interface ArchiveConfig {
  integration: string;
  bucket?: string;
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
  expires?: string;
  username?: string;
  password?: string;
  tenantname?: string;
}

export interface BoardRequest {
  title: string;
  widgets?: BoardWidget[];
}

export interface BoardWidget {
  title?: string;
  query?: string;
  type?: string;
  description?: string;
}

export class Client {
  private api: ReturnType<typeof createAxios>;
  private ingestionApi: ReturnType<typeof createAxios>;

  constructor(
    private options: {
      serviceKey: string;
      ingestionKey?: string;
    }
  ) {
    this.api = createAxios({
      baseURL: 'https://api.logdna.com'
    });

    this.ingestionApi = createAxios({
      baseURL: 'https://logs.logdna.com'
    });
  }

  private serviceHeaders() {
    return { servicekey: this.options.serviceKey };
  }

  private ingestionHeaders() {
    let key = this.options.ingestionKey || this.options.serviceKey;
    return { apikey: key };
  }

  // ---- Log Ingestion ----

  async ingestLogs(lines: LogLine[], opts: IngestOptions): Promise<any> {
    let params: Record<string, any> = {
      hostname: opts.hostname,
      now: opts.now || Date.now()
    };
    if (opts.tags) params.tags = opts.tags;
    if (opts.ip) params.ip = opts.ip;
    if (opts.mac) params.mac = opts.mac;

    let response = await this.ingestionApi.post(
      '/logs/ingest',
      { lines },
      {
        params,
        headers: {
          ...this.ingestionHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  // ---- Log Export ----

  async exportLogs(opts: ExportOptions): Promise<string> {
    let params: Record<string, any> = {
      from: opts.from,
      to: opts.to
    };
    if (opts.query) params.query = opts.query;
    if (opts.hosts) params.hosts = opts.hosts;
    if (opts.apps) params.apps = opts.apps;
    if (opts.levels) params.levels = opts.levels;
    if (opts.tags) params.tags = opts.tags;
    if (opts.prefer) params.prefer = opts.prefer;
    if (opts.size) params.size = opts.size;

    let response = await this.api.get('/v1/export', {
      params,
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async exportLogsV2(opts: ExportOptions): Promise<{ lines: string; paginationId?: string }> {
    let params: Record<string, any> = {
      from: opts.from,
      to: opts.to
    };
    if (opts.query) params.query = opts.query;
    if (opts.hosts) params.hosts = opts.hosts;
    if (opts.apps) params.apps = opts.apps;
    if (opts.levels) params.levels = opts.levels;
    if (opts.tags) params.tags = opts.tags;
    if (opts.prefer) params.prefer = opts.prefer;
    if (opts.size) params.size = opts.size;
    if (opts.paginationId) params.pagination_id = opts.paginationId;

    let response = await this.api.get('/v2/export', {
      params,
      headers: this.serviceHeaders()
    });
    return {
      lines: response.data,
      paginationId: response.headers?.pagination_id || undefined
    };
  }

  // ---- Views ----

  async listViews(): Promise<any[]> {
    let response = await this.api.get('/v1/config/view', {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getView(viewId: string): Promise<any> {
    let response = await this.api.get(`/v1/config/view/${viewId}`, {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async createView(view: ViewRequest): Promise<any> {
    let response = await this.api.post('/v1/config/view', view, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async updateView(viewId: string, view: Partial<ViewRequest>): Promise<any> {
    let response = await this.api.put(`/v1/config/view/${viewId}`, view, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async deleteView(viewId: string): Promise<void> {
    await this.api.delete(`/v1/config/view/${viewId}`, {
      headers: this.serviceHeaders()
    });
  }

  // ---- Preset Alerts ----

  async listPresetAlerts(): Promise<any[]> {
    let response = await this.api.get('/v1/config/presetalert', {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getPresetAlert(alertId: string): Promise<any> {
    let response = await this.api.get(`/v1/config/presetalert/${alertId}`, {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async createPresetAlert(alert: AlertRequest): Promise<any> {
    let response = await this.api.post('/v1/config/presetalert', alert, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async updatePresetAlert(alertId: string, alert: Partial<AlertRequest>): Promise<any> {
    let response = await this.api.put(`/v1/config/presetalert/${alertId}`, alert, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async deletePresetAlert(alertId: string): Promise<void> {
    await this.api.delete(`/v1/config/presetalert/${alertId}`, {
      headers: this.serviceHeaders()
    });
  }

  // ---- Categories ----

  async listCategories(type: string): Promise<any[]> {
    let response = await this.api.get(`/v1/config/categories/${type}`, {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getCategory(type: string, categoryId: string): Promise<any> {
    let response = await this.api.get(`/v1/config/categories/${type}/${categoryId}`, {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async createCategory(type: string, category: CategoryRequest): Promise<any> {
    let response = await this.api.post(`/v1/config/categories/${type}`, category, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async updateCategory(
    type: string,
    categoryId: string,
    category: CategoryRequest
  ): Promise<any> {
    let response = await this.api.put(
      `/v1/config/categories/${type}/${categoryId}`,
      category,
      {
        headers: {
          ...this.serviceHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async deleteCategory(type: string, categoryId: string): Promise<void> {
    await this.api.delete(`/v1/config/categories/${type}/${categoryId}`, {
      headers: this.serviceHeaders()
    });
  }

  // ---- Boards ----

  async listBoards(): Promise<any[]> {
    let response = await this.api.get('/v1/config/boards', {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getBoard(boardId: string): Promise<any> {
    let response = await this.api.get(`/v1/config/boards/${boardId}`, {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async createBoard(board: BoardRequest): Promise<any> {
    let response = await this.api.post('/v1/config/boards', board, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.api.delete(`/v1/config/boards/${boardId}`, {
      headers: this.serviceHeaders()
    });
  }

  // ---- Exclusion Rules ----

  async listExclusionRules(): Promise<any[]> {
    let response = await this.api.get('/v1/config/ingestion/exclusions', {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getExclusionRule(ruleId: string): Promise<any> {
    let response = await this.api.get(`/v1/config/ingestion/exclusions/${ruleId}`, {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async createExclusionRule(rule: ExclusionRuleRequest): Promise<any> {
    let response = await this.api.post('/v1/config/ingestion/exclusions', rule, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async updateExclusionRule(
    ruleId: string,
    rule: Partial<ExclusionRuleRequest>
  ): Promise<any> {
    let response = await this.api.patch(`/v1/config/ingestion/exclusions/${ruleId}`, rule, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async deleteExclusionRule(ruleId: string): Promise<void> {
    await this.api.delete(`/v1/config/ingestion/exclusions/${ruleId}`, {
      headers: this.serviceHeaders()
    });
  }

  // ---- Archiving ----

  async getArchiveConfig(): Promise<any> {
    let response = await this.api.get('/v1/config/archiving', {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async createArchiveConfig(archive: ArchiveConfig): Promise<any> {
    let response = await this.api.post('/v1/config/archiving', archive, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async updateArchiveConfig(archive: ArchiveConfig): Promise<any> {
    let response = await this.api.put('/v1/config/archiving', archive, {
      headers: {
        ...this.serviceHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async deleteArchiveConfig(): Promise<void> {
    await this.api.delete('/v1/config/archiving', {
      headers: this.serviceHeaders()
    });
  }

  // ---- Ingestion Control ----

  async getIngestionStatus(): Promise<any> {
    let response = await this.api.get('/v1/config/ingestion', {
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async suspendIngestion(): Promise<any> {
    let response = await this.api.post(
      '/v1/config/ingestion/suspend',
      {},
      {
        headers: this.serviceHeaders()
      }
    );
    return response.data;
  }

  async confirmSuspendIngestion(suspendToken: string): Promise<any> {
    let response = await this.api.post(
      '/v1/config/ingestion/suspend/confirm',
      { token: suspendToken },
      {
        headers: {
          ...this.serviceHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async resumeIngestion(): Promise<any> {
    let response = await this.api.post(
      '/v1/config/ingestion/resume',
      {},
      {
        headers: this.serviceHeaders()
      }
    );
    return response.data;
  }

  // ---- Usage ----

  async getUsage(from: number, to: number): Promise<any> {
    let response = await this.api.get('/v1/usage', {
      params: { from, to },
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getUsageByApps(from: number, to: number): Promise<any> {
    let response = await this.api.get('/v1/usage/apps', {
      params: { from, to },
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getUsageByHosts(from: number, to: number): Promise<any> {
    let response = await this.api.get('/v1/usage/hosts', {
      params: { from, to },
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getUsageByTags(from: number, to: number): Promise<any> {
    let response = await this.api.get('/v1/usage/tags', {
      params: { from, to },
      headers: this.serviceHeaders()
    });
    return response.data;
  }

  async getUsageForApp(appName: string, from: number, to: number): Promise<any> {
    let response = await this.api.get(`/v1/usage/apps/${encodeURIComponent(appName)}`, {
      params: { from, to },
      headers: this.serviceHeaders()
    });
    return response.data;
  }
}
