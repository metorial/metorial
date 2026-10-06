import { randomBytes } from 'node:crypto';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios
} from 'slates';
import { z } from 'zod';

const createdSandboxSchema = z.object({ sandboxID: z.string().min(1) });
const sandboxSchema = z.object({
  sandboxID: z.string().min(1),
  templateID: z.string().min(1),
  clientID: z.string(),
  alias: z.string().optional(),
  startedAt: z.string().min(1),
  endAt: z.string().min(1),
  cpuCount: z.number(),
  memoryMB: z.number(),
  metadata: z.record(z.string(), z.string()).optional(),
  state: z.enum(['running', 'paused']),
  volumeMounts: z.array(z.object({ name: z.string(), path: z.string() })).optional()
});
const snapshotSchema = z.object({
  snapshotID: z.string().min(1),
  names: z.array(z.string())
});
const templateSchema = z.object({
  templateID: z.string().min(1),
  buildID: z.string(),
  cpuCount: z.number(),
  memoryMB: z.number(),
  diskSizeMB: z.number().optional(),
  public: z.boolean(),
  aliases: z.array(z.string()),
  names: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  buildStatus: z.string().optional()
});
const webhookSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string(),
  createdAt: z.string(),
  enabled: z.boolean(),
  url: z.string(),
  events: z.array(z.string())
});
const volumeSchema = z.object({ volumeID: z.string().min(1), name: z.string() });
const lifecycleEventSchema = z.object({
  id: z.string().min(1),
  version: z.string(),
  type: z.string(),
  timestamp: z.string(),
  eventData: z.record(z.string(), z.unknown()).nullish(),
  sandboxId: z.string(),
  sandboxBuildId: z.string(),
  sandboxExecutionId: z.string(),
  sandboxTeamId: z.string(),
  sandboxTemplateId: z.string()
});

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw createApiServiceError('E2B returned an unexpected response. Please try again.', {
      reason: 'e2b_invalid_response'
    });
  }
  return parsed.data;
}

const mapSandbox = (data: z.infer<typeof sandboxSchema>) => ({
  sandboxId: data.sandboxID,
  templateId: data.templateID,
  name: data.alias ?? '',
  clientId: data.clientID,
  startedAt: data.startedAt,
  endAt: data.endAt,
  cpuCount: data.cpuCount,
  memoryMb: data.memoryMB,
  metadata: data.metadata,
  state: data.state,
  volumeMounts: data.volumeMounts
});
const mapSnapshot = (data: z.infer<typeof snapshotSchema>, sandboxId = '') => ({
  snapshotId: data.snapshotID,
  names: data.names,
  sandboxId,
  // These legacy output fields are retained for compatibility; the API does not return them.
  templateId: '',
  createdAt: ''
});
const mapWebhook = ({ id, ...data }: z.infer<typeof webhookSchema>) => ({
  webhookId: id,
  ...data
});
const mapVolume = ({ volumeID, ...data }: z.infer<typeof volumeSchema>) => ({
  volumeId: volumeID,
  ...data
});

export type SandboxInfo = ReturnType<typeof mapSandbox>;
export type SandboxListItem = SandboxInfo;
export type SnapshotInfo = ReturnType<typeof mapSnapshot>;
export type WebhookConfig = ReturnType<typeof mapWebhook>;
export type VolumeInfo = ReturnType<typeof mapVolume>;
export interface CreateSandboxParams {
  templateId?: string;
  timeout?: number;
  autoPause?: boolean;
  metadata?: Record<string, string>;
  envVars?: Record<string, string>;
  volumeMounts?: { name: string; path: string }[];
}
export interface CreateWebhookParams {
  name: string;
  url: string;
  enabled?: boolean;
  events: string[];
  signatureSecret?: string;
}
export type UpdateWebhookParams = Partial<CreateWebhookParams>;

export class E2BClient {
  private api;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('An E2B API key is required. Reconnect with your API key.');
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.e2b.app',
      authHeader: { name: 'X-API-Key', value: config.token },
      timeout: 120000
    });
  }

  private request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    return requestAxios(
      `${method} ${path}`,
      () =>
        this.api.request<unknown>({
          method,
          url: path,
          data,
          params
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'E2B',
          reason: 'e2b_api_error',
          operation
        })
    );
  }

  async createSandbox(params: CreateSandboxParams): Promise<SandboxInfo> {
    const response = await this.request(
      'POST',
      '/v2/sandboxes',
      pickDefined({
        templateID: params.templateId ?? 'base',
        timeout: params.timeout,
        autoPause: params.autoPause,
        metadata: params.metadata,
        envVars: params.envVars,
        volumeMounts: params.volumeMounts
      })
    );
    const sandbox = parseResponse(createdSandboxSchema, response.data);
    // The creation response has no timestamps or resource sizes; read the detail endpoint.
    try {
      return await this.getSandbox(sandbox.sandboxID);
    } catch (error) {
      try {
        await this.killSandbox(sandbox.sandboxID);
      } catch {
        throw createApiServiceError(
          `Sandbox ${sandbox.sandboxID} was created, but its details could not be read or its cleanup confirmed. Use kill_sandbox to remove it.`,
          { reason: 'e2b_create_readback_failed', parent: error }
        );
      }
      throw error;
    }
  }

  async listSandboxes(
    opts: {
      state?: string[];
      metadata?: Record<string, string>;
      limit?: number;
      nextToken?: string;
    } = {}
  ) {
    // Match the SDK's nested query encoding: metadata pairs are decoded separately.
    const metadata = opts.metadata
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(opts.metadata).map(([key, value]) => [
              encodeURIComponent(key),
              encodeURIComponent(value)
            ])
          )
        ).toString()
      : undefined;
    const response = await this.request(
      'GET',
      '/v2/sandboxes',
      undefined,
      pickDefined({
        limit: opts.limit,
        nextToken: opts.nextToken,
        state: opts.state?.join(','),
        metadata
      })
    );
    return {
      sandboxes: parseResponse(z.array(sandboxSchema), response.data).map(mapSandbox),
      nextToken: getResponseHeaderValue(response.headers, 'X-Next-Token') || undefined
    };
  }

  async getSandbox(sandboxId: string): Promise<SandboxInfo> {
    const response = await this.request('GET', `/sandboxes/${encodeURIComponent(sandboxId)}`);
    return mapSandbox(parseResponse(sandboxSchema, response.data));
  }
  async killSandbox(sandboxId: string): Promise<void> {
    await this.request('DELETE', `/sandboxes/${encodeURIComponent(sandboxId)}`);
  }
  async pauseSandbox(sandboxId: string): Promise<void> {
    await this.request('POST', `/sandboxes/${encodeURIComponent(sandboxId)}/pause`, {});
  }
  async resumeSandbox(sandboxId: string, timeout?: number): Promise<SandboxInfo> {
    await this.request(
      'POST',
      `/v2/sandboxes/${encodeURIComponent(sandboxId)}/connect`,
      pickDefined({ timeout })
    );
    return this.getSandbox(sandboxId);
  }
  async setSandboxTimeout(sandboxId: string, timeout: number): Promise<void> {
    await this.request('POST', `/sandboxes/${encodeURIComponent(sandboxId)}/timeout`, {
      timeout
    });
  }
  async createSnapshot(sandboxId: string, name?: string): Promise<SnapshotInfo> {
    const response = await this.request(
      'POST',
      `/sandboxes/${encodeURIComponent(sandboxId)}/snapshots`,
      pickDefined({ name })
    );
    return mapSnapshot(parseResponse(snapshotSchema, response.data), sandboxId);
  }
  async listSnapshots(
    opts: {
      sandboxId?: string;
      templateId?: string;
      name?: string;
      limit?: number;
      nextToken?: string;
    } = {}
  ) {
    if (opts.templateId !== undefined) {
      throw createApiServiceError(
        'E2B does not support filtering snapshots by source template ID. Use sandboxId for the source sandbox, or name for the snapshot name or ID.'
      );
    }
    const response = await this.request(
      'GET',
      '/snapshots',
      undefined,
      pickDefined({
        sandboxID: opts.sandboxId,
        name: opts.name,
        limit: opts.limit,
        nextToken: opts.nextToken
      })
    );
    return {
      snapshots: parseResponse(z.array(snapshotSchema), response.data).map(data =>
        mapSnapshot(data, opts.sandboxId)
      ),
      nextToken: getResponseHeaderValue(response.headers, 'X-Next-Token') || undefined
    };
  }
  async listTemplates(opts: { limit?: number; nextToken?: string } = {}) {
    const response = await this.request('GET', '/v2/templates', undefined, pickDefined(opts));
    return {
      templates: parseResponse(z.array(templateSchema), response.data).map(
        ({ templateID, buildID, memoryMB, diskSizeMB, ...data }) => ({
          templateId: templateID,
          buildId: buildID,
          memoryMb: memoryMB,
          diskSizeMb: diskSizeMB,
          ...data
        })
      ),
      nextToken: getResponseHeaderValue(response.headers, 'X-Next-Token') || undefined
    };
  }
  async deleteTemplate(templateId: string): Promise<void> {
    await this.request('DELETE', `/templates/${encodeURIComponent(templateId)}`);
  }
  async getLifecycleEvents(
    opts: { sandboxId?: string; offset?: number; limit?: number; orderAsc?: boolean } = {}
  ) {
    const path = opts.sandboxId
      ? `/events/sandboxes/${encodeURIComponent(opts.sandboxId)}`
      : '/events/sandboxes';
    const response = await this.request(
      'GET',
      path,
      undefined,
      pickDefined({
        offset: opts.offset,
        limit: opts.limit,
        orderAsc: opts.orderAsc
      })
    );
    return parseResponse(z.array(lifecycleEventSchema), response.data).map(
      ({ id, ...data }) => ({ eventId: id, ...data })
    );
  }
  async createWebhook(params: CreateWebhookParams): Promise<WebhookConfig> {
    const response = await this.request(
      'POST',
      '/events/webhooks',
      pickDefined({
        ...params,
        signatureSecret: params.signatureSecret ?? randomBytes(32).toString('hex')
      })
    );
    return mapWebhook(parseResponse(webhookSchema, response.data));
  }
  async listWebhooks(): Promise<WebhookConfig[]> {
    const response = await this.request('GET', '/events/webhooks');
    return parseResponse(z.array(webhookSchema), response.data).map(mapWebhook);
  }
  async getWebhook(webhookId: string): Promise<WebhookConfig> {
    const response = await this.request(
      'GET',
      `/events/webhooks/${encodeURIComponent(webhookId)}`
    );
    return mapWebhook(parseResponse(webhookSchema, response.data));
  }
  async updateWebhook(webhookId: string, params: UpdateWebhookParams): Promise<WebhookConfig> {
    const data = pickDefined(params);
    if (Object.keys(data).length === 0)
      throw createApiServiceError('Provide at least one webhook field to update.');
    const response = await this.request(
      'PATCH',
      `/events/webhooks/${encodeURIComponent(webhookId)}`,
      data
    );
    return mapWebhook(parseResponse(webhookSchema, response.data));
  }
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request('DELETE', `/events/webhooks/${encodeURIComponent(webhookId)}`);
  }
  async listVolumes(): Promise<VolumeInfo[]> {
    const response = await this.request('GET', '/volumes');
    return parseResponse(z.array(volumeSchema), response.data).map(mapVolume);
  }
  async createVolume(name: string): Promise<VolumeInfo> {
    const response = await this.request('POST', '/volumes', { name });
    return mapVolume(parseResponse(volumeSchema, response.data));
  }
  async deleteVolume(volumeId: string): Promise<void> {
    await this.request('DELETE', `/volumes/${encodeURIComponent(volumeId)}`);
  }
}
