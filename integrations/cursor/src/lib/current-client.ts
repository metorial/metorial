import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { createCursorAxios } from './http';

export const repositorySchema = z.object({
  url: z.string(),
  startingRef: z.string().optional(),
  prUrl: z.string().optional()
});
export const environmentSchema = z.object({
  type: z.enum(['cloud', 'pool', 'machine']),
  name: z.string().optional()
});
const gitSchema = z.object({
  branches: z.array(
    z.object({
      repoUrl: z.string(),
      branch: z.string().optional(),
      prUrl: z.string().optional()
    })
  )
});
export const cloudAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  env: environmentSchema,
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  latestRunId: z.string().optional(),
  repos: z.array(repositorySchema).optional(),
  workOnCurrentBranch: z.boolean().optional(),
  autoCreatePR: z.boolean().optional(),
  git: gitSchema.optional()
});
export const agentRunSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  durationMs: z.number().optional(),
  result: z.string().optional(),
  git: gitSchema.optional()
});
export const modelParameterSchema = z.object({ id: z.string(), value: z.string() });
export const cloudModelSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  parameters: z
    .array(
      z.object({
        id: z.string(),
        displayName: z.string().optional(),
        values: z.array(z.object({ value: z.string(), displayName: z.string().optional() }))
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        params: z.array(modelParameterSchema),
        displayName: z.string(),
        description: z.string().optional(),
        isDefault: z.boolean().optional()
      })
    )
    .optional()
});
const keySchema = z.object({
  apiKeyName: z.string(),
  createdAt: z.string(),
  userId: z.number().optional(),
  userEmail: z.string().optional(),
  userFirstName: z.string().optional(),
  userLastName: z.string().optional()
});
export const cloudArtifactSchema = z.object({
  path: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string()
});
const downloadSchema = z.object({ url: z.url(), expiresAt: z.iso.datetime() });

export interface CurrentPrompt {
  text: string;
  images?: { data?: string; mimeType?: string; url?: string }[];
}
export interface CreateCloudAgentInput {
  prompt: CurrentPrompt;
  name?: string;
  model?: { id: string; params?: { id: string; value: string }[] };
  repos?: z.infer<typeof repositorySchema>[];
  env?: z.infer<typeof environmentSchema>;
  workOnCurrentBranch?: boolean;
  autoCreatePR?: boolean;
  skipReviewerRequest?: boolean;
  mode?: 'agent' | 'plan';
}

export class CurrentAgentsClient {
  private axios: ReturnType<typeof createCursorAxios>;
  constructor(auth: { token: string }) {
    this.axios = createCursorAxios(auth.token);
  }

  private async request<S extends z.ZodType>(
    method: 'get' | 'post' | 'delete',
    path: string,
    schema: S,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<z.infer<S>> {
    const response = await this.axios.request({ method, url: path, data, params });
    const parsed = schema.safeParse(response.data);
    if (!parsed.success) {
      throw createApiServiceError(
        'Cursor returned an unexpected API response. Try again or contact support.',
        {
          reason: 'cursor_invalid_response'
        }
      );
    }
    return parsed.data;
  }
  getApiKeyInfo() {
    return this.request('get', '/v1/me', keySchema);
  }
  listModels() {
    return this.request('get', '/v1/models', z.object({ items: z.array(cloudModelSchema) }));
  }
  createAgent(input: CreateCloudAgentInput) {
    return this.request(
      'post',
      '/v1/agents',
      z.object({ agent: cloudAgentSchema, run: agentRunSchema }),
      input
    );
  }
  listAgents(params: {
    limit?: number;
    cursor?: string;
    prUrl?: string;
    includeArchived?: boolean;
  }) {
    return this.request(
      'get',
      '/v1/agents',
      z.object({ items: z.array(cloudAgentSchema), nextCursor: z.string().optional() }),
      undefined,
      params
    );
  }
  getAgent(agentId: string) {
    return this.request('get', `/v1/agents/${encodeURIComponent(agentId)}`, cloudAgentSchema);
  }
  createRun(agentId: string, prompt: CurrentPrompt, mode?: 'agent' | 'plan') {
    return this.request(
      'post',
      `/v1/agents/${encodeURIComponent(agentId)}/runs`,
      z.object({ run: agentRunSchema }),
      { prompt, mode }
    );
  }
  listRuns(agentId: string, params: { limit?: number; cursor?: string }) {
    return this.request(
      'get',
      `/v1/agents/${encodeURIComponent(agentId)}/runs`,
      z.object({ items: z.array(agentRunSchema), nextCursor: z.string().optional() }),
      undefined,
      params
    );
  }
  getRun(agentId: string, runId: string) {
    return this.request(
      'get',
      `/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
      agentRunSchema
    );
  }
  cancelRun(agentId: string, runId: string) {
    return this.request(
      'post',
      `/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}/cancel`,
      z.object({ id: z.string() })
    );
  }
  manageAgent(agentId: string, action: 'archive' | 'unarchive' | 'delete') {
    const path = `/v1/agents/${encodeURIComponent(agentId)}`;
    return this.request(
      action === 'delete' ? 'delete' : 'post',
      action === 'delete' ? path : `${path}/${action}`,
      z.object({ id: z.string() })
    );
  }
  listArtifacts(agentId: string) {
    return this.request(
      'get',
      `/v1/agents/${encodeURIComponent(agentId)}/artifacts`,
      z.object({ items: z.array(cloudArtifactSchema) })
    );
  }
  downloadArtifact(agentId: string, path: string) {
    return this.request(
      'get',
      `/v1/agents/${encodeURIComponent(agentId)}/artifacts/download`,
      downloadSchema,
      undefined,
      { path }
    );
  }
}
