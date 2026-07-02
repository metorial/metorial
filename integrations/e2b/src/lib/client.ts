import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.e2b.app'
});

export interface CreateSandboxParams {
  templateId?: string;
  timeout?: number;
  autoPause?: boolean;
  metadata?: Record<string, string>;
  envVars?: Record<string, string>;
}

export interface SandboxInfo {
  sandboxId: string;
  templateId: string;
  name: string;
  clientId: string;
  startedAt: string;
  endAt: string;
  cpuCount?: number;
  memoryMb?: number;
  metadata?: Record<string, string>;
  state?: string;
}

export interface SandboxListItem {
  sandboxId: string;
  templateId: string;
  name: string;
  clientId: string;
  startedAt: string;
  endAt: string;
  cpuCount?: number;
  memoryMb?: number;
  metadata?: Record<string, string>;
  state?: string;
}

export interface SnapshotInfo {
  snapshotId: string;
  sandboxId: string;
  templateId: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface TemplateInfo {
  templateId: string;
  buildId: string;
  cpuCount: number;
  memoryMb: number;
  diskSizeMb?: number;
  public: boolean;
  aliases: string[];
  createdAt?: string;
  updatedAt?: string;
  buildStatus?: string;
}

export interface LifecycleEvent {
  version: string;
  eventId: string;
  type: string;
  eventData: any;
  sandboxId: string;
  sandboxBuildId: string;
  sandboxExecutionId: string;
  sandboxTeamId: string;
  sandboxTemplateId: string;
  timestamp: string;
}

export interface WebhookConfig {
  webhookId: string;
  teamId: string;
  name: string;
  createdAt: string;
  enabled: boolean;
  url: string;
  events: string[];
}

export interface CreateWebhookParams {
  name: string;
  url: string;
  enabled?: boolean;
  events: string[];
  signatureSecret?: string;
}

export interface UpdateWebhookParams {
  name?: string;
  url?: string;
  enabled?: boolean;
  events?: string[];
  signatureSecret?: string;
}

export interface VolumeInfo {
  volumeId: string;
  name: string;
}

export class E2BClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      'X-API-Key': this.token,
      'Content-Type': 'application/json'
    };
  }

  // ─── Sandboxes ───

  async createSandbox(params: CreateSandboxParams): Promise<SandboxInfo> {
    let body: Record<string, any> = {};
    if (params.templateId) body.templateID = params.templateId;
    if (params.timeout !== undefined) body.timeout = params.timeout;
    if (params.autoPause !== undefined) body.autoPause = params.autoPause;
    if (params.metadata) body.metadata = params.metadata;
    if (params.envVars) body.envVars = params.envVars;

    let response = await api.post('/sandboxes', body, {
      headers: this.headers()
    });

    let data = response.data;
    return {
      sandboxId: data.sandboxID || data.sandboxId,
      templateId: data.templateID || data.templateId,
      name: data.name || data.alias || '',
      clientId: data.clientID || data.clientId || '',
      startedAt: data.startedAt || '',
      endAt: data.endAt || '',
      cpuCount: data.cpuCount,
      memoryMb: data.memoryMB || data.memoryMb,
      metadata: data.metadata,
      state: data.state
    };
  }

  async listSandboxes(opts?: {
    state?: string[];
    metadata?: Record<string, string>;
    limit?: number;
    nextToken?: string;
  }): Promise<{ sandboxes: SandboxListItem[]; nextToken?: string }> {
    let params: Record<string, any> = {};
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.nextToken) params.nextToken = opts.nextToken;
    if (opts?.state && opts.state.length > 0) {
      params.state = opts.state.join(',');
    }
    if (opts?.metadata) {
      for (let [key, value] of Object.entries(opts.metadata)) {
        params[`metadata[${key}]`] = value;
      }
    }

    let response = await api.get('/sandboxes', {
      headers: this.headers(),
      params
    });

    let items = Array.isArray(response.data)
      ? response.data
      : response.data?.sandboxes || response.data?.items || [];

    return {
      sandboxes: items.map((s: any) => ({
        sandboxId: s.sandboxID || s.sandboxId,
        templateId: s.templateID || s.templateId,
        name: s.name || s.alias || '',
        clientId: s.clientID || s.clientId || '',
        startedAt: s.startedAt || '',
        endAt: s.endAt || '',
        cpuCount: s.cpuCount,
        memoryMb: s.memoryMB || s.memoryMb,
        metadata: s.metadata,
        state: s.state
      })),
      nextToken: response.data?.nextToken
    };
  }

  async getSandbox(sandboxId: string): Promise<SandboxInfo> {
    let response = await api.get(`/sandboxes/${sandboxId}`, {
      headers: this.headers()
    });
    let s = response.data;
    return {
      sandboxId: s.sandboxID || s.sandboxId,
      templateId: s.templateID || s.templateId,
      name: s.name || s.alias || '',
      clientId: s.clientID || s.clientId || '',
      startedAt: s.startedAt || '',
      endAt: s.endAt || '',
      cpuCount: s.cpuCount,
      memoryMb: s.memoryMB || s.memoryMb,
      metadata: s.metadata,
      state: s.state
    };
  }

  async killSandbox(sandboxId: string): Promise<void> {
    await api.delete(`/sandboxes/${sandboxId}`, {
      headers: this.headers()
    });
  }

  async pauseSandbox(sandboxId: string): Promise<void> {
    await api.post(
      `/sandboxes/${sandboxId}/pause`,
      {},
      {
        headers: this.headers()
      }
    );
  }

  async resumeSandbox(sandboxId: string, timeout?: number): Promise<SandboxInfo> {
    let body: Record<string, any> = {};
    if (timeout !== undefined) body.timeout = timeout;

    let response = await api.post(`/sandboxes/${sandboxId}/connect`, body, {
      headers: this.headers()
    });
    let s = response.data;
    return {
      sandboxId: s.sandboxID || s.sandboxId || sandboxId,
      templateId: s.templateID || s.templateId || '',
      name: s.name || s.alias || '',
      clientId: s.clientID || s.clientId || '',
      startedAt: s.startedAt || '',
      endAt: s.endAt || '',
      cpuCount: s.cpuCount,
      memoryMb: s.memoryMB || s.memoryMb,
      metadata: s.metadata,
      state: s.state
    };
  }

  async setSandboxTimeout(sandboxId: string, timeout: number): Promise<void> {
    await api.post(
      `/sandboxes/${sandboxId}/timeout`,
      { timeout },
      {
        headers: this.headers()
      }
    );
  }

  // ─── Snapshots ───

  async createSnapshot(sandboxId: string): Promise<SnapshotInfo> {
    let response = await api.post(
      `/sandboxes/${sandboxId}/snapshots`,
      {},
      {
        headers: this.headers()
      }
    );
    let d = response.data;
    return {
      snapshotId: d.snapshotID || d.snapshotId || d.id,
      sandboxId: d.sandboxID || d.sandboxId || sandboxId,
      templateId: d.templateID || d.templateId || '',
      createdAt: d.createdAt || '',
      metadata: d.metadata
    };
  }

  async listSnapshots(opts?: {
    sandboxId?: string;
    templateId?: string;
    limit?: number;
    nextToken?: string;
  }): Promise<{ snapshots: SnapshotInfo[]; nextToken?: string }> {
    let params: Record<string, any> = {};
    if (opts?.sandboxId) params.sandboxId = opts.sandboxId;
    if (opts?.templateId) params.templateId = opts.templateId;
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.nextToken) params.nextToken = opts.nextToken;

    let response = await api.get('/snapshots', {
      headers: this.headers(),
      params
    });

    let items = Array.isArray(response.data)
      ? response.data
      : response.data?.snapshots || response.data?.items || [];

    return {
      snapshots: items.map((d: any) => ({
        snapshotId: d.snapshotID || d.snapshotId || d.id,
        sandboxId: d.sandboxID || d.sandboxId || '',
        templateId: d.templateID || d.templateId || '',
        createdAt: d.createdAt || '',
        metadata: d.metadata
      })),
      nextToken: response.data?.nextToken
    };
  }

  // ─── Templates ───

  async listTemplates(): Promise<TemplateInfo[]> {
    let response = await api.get('/templates', {
      headers: this.headers()
    });
    let items = Array.isArray(response.data)
      ? response.data
      : response.data?.templates || response.data?.items || [];
    return items.map((t: any) => ({
      templateId: t.templateID || t.templateId,
      buildId: t.buildID || t.buildId || '',
      cpuCount: t.cpuCount || 0,
      memoryMb: t.memoryMB || t.memoryMb || 0,
      diskSizeMb: t.diskSizeMB || t.diskSizeMb,
      public: t.public || false,
      aliases: t.aliases || [],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      buildStatus: t.buildStatus
    }));
  }

  async getTemplateBuildStatus(
    templateId: string,
    buildId: string
  ): Promise<{ status: string; logs?: string[] }> {
    let response = await api.get(`/templates/${templateId}/builds/${buildId}/status`, {
      headers: this.headers()
    });
    return {
      status: response.data.status,
      logs: response.data.logs
    };
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await api.delete(`/templates/${templateId}`, {
      headers: this.headers()
    });
  }

  // ─── Lifecycle Events ───

  async getLifecycleEvents(opts?: {
    sandboxId?: string;
    offset?: number;
    limit?: number;
    orderAsc?: boolean;
  }): Promise<LifecycleEvent[]> {
    let params: Record<string, any> = {};
    if (opts?.offset !== undefined) params.offset = opts.offset;
    if (opts?.limit !== undefined) params.limit = opts.limit;
    if (opts?.orderAsc !== undefined) params.orderAsc = opts.orderAsc;

    let path = opts?.sandboxId ? `/events/sandboxes/${opts.sandboxId}` : '/events/sandboxes';

    let response = await api.get(path, {
      headers: this.headers(),
      params
    });

    let items = Array.isArray(response.data) ? response.data : response.data?.events || [];
    return items.map((e: any) => ({
      version: e.version || '',
      eventId: e.id || '',
      type: e.type || '',
      eventData: e.eventData,
      sandboxId: e.sandboxId || e.sandboxID || '',
      sandboxBuildId: e.sandboxBuildId || e.sandboxBuildID || '',
      sandboxExecutionId: e.sandboxExecutionId || e.sandboxExecutionID || '',
      sandboxTeamId: e.sandboxTeamId || e.sandboxTeamID || '',
      sandboxTemplateId: e.sandboxTemplateId || e.sandboxTemplateID || '',
      timestamp: e.timestamp || ''
    }));
  }

  // ─── Webhooks ───

  async createWebhook(params: CreateWebhookParams): Promise<WebhookConfig> {
    let response = await api.post('/events/webhooks', params, {
      headers: this.headers()
    });
    let d = response.data;
    return {
      webhookId: d.id || d.webhookId || d.webhookID,
      teamId: d.teamID || d.teamId || '',
      name: d.name || '',
      createdAt: d.createdAt || '',
      enabled: d.enabled ?? true,
      url: d.url || '',
      events: d.events || []
    };
  }

  async listWebhooks(): Promise<WebhookConfig[]> {
    let response = await api.get('/events/webhooks', {
      headers: this.headers()
    });
    let items = Array.isArray(response.data) ? response.data : response.data?.webhooks || [];
    return items.map((d: any) => ({
      webhookId: d.id || d.webhookId || d.webhookID,
      teamId: d.teamID || d.teamId || '',
      name: d.name || '',
      createdAt: d.createdAt || '',
      enabled: d.enabled ?? true,
      url: d.url || '',
      events: d.events || []
    }));
  }

  async getWebhook(webhookId: string): Promise<WebhookConfig> {
    let response = await api.get(`/events/webhooks/${webhookId}`, {
      headers: this.headers()
    });
    let d = response.data;
    return {
      webhookId: d.id || d.webhookId || d.webhookID,
      teamId: d.teamID || d.teamId || '',
      name: d.name || '',
      createdAt: d.createdAt || '',
      enabled: d.enabled ?? true,
      url: d.url || '',
      events: d.events || []
    };
  }

  async updateWebhook(webhookId: string, params: UpdateWebhookParams): Promise<WebhookConfig> {
    let response = await api.patch(`/events/webhooks/${webhookId}`, params, {
      headers: this.headers()
    });
    let d = response.data;
    return {
      webhookId: d.id || d.webhookId || d.webhookID,
      teamId: d.teamID || d.teamId || '',
      name: d.name || '',
      createdAt: d.createdAt || '',
      enabled: d.enabled ?? true,
      url: d.url || '',
      events: d.events || []
    };
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await api.delete(`/events/webhooks/${webhookId}`, {
      headers: this.headers()
    });
  }

  // ─── Volumes ───

  async listVolumes(): Promise<VolumeInfo[]> {
    let response = await api.get('/volumes', {
      headers: this.headers()
    });
    let items = Array.isArray(response.data) ? response.data : response.data?.volumes || [];
    return items.map((v: any) => ({
      volumeId: v.volumeID || v.volumeId || v.id,
      name: v.name || ''
    }));
  }

  async createVolume(name: string): Promise<VolumeInfo> {
    let response = await api.post(
      '/volumes',
      { name },
      {
        headers: this.headers()
      }
    );
    let v = response.data;
    return {
      volumeId: v.volumeID || v.volumeId || v.id,
      name: v.name || ''
    };
  }

  async deleteVolume(volumeId: string): Promise<void> {
    await api.delete(`/volumes/${volumeId}`, {
      headers: this.headers()
    });
  }
}
