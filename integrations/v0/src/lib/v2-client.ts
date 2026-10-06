import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

export const privacySchema = z.enum(['public', 'private', 'team', 'team-edit', 'unlisted']);
export const metadataSchema = z.record(z.string().min(1).max(40), z.string().max(500));
export const currentChatSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  privacy: privacySchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  authorId: z.string(),
  vercelProjectId: z.string().optional(),
  metadata: z.record(z.string(), z.string()),
  writePermission: z.boolean()
});
const usageValues = z.object({
  input: z.number(),
  output: z.number(),
  cacheRead: z.number(),
  cacheWrite: z.number(),
  total: z.number()
});
export const usageSchema = z.object({
  model: z.string().nullable(),
  tokens: usageValues,
  creditsCost: usageValues
});
export const currentMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(['user', 'assistant']),
  createdAt: z.string(),
  updatedAt: z.string(),
  content: z.string(),
  finishReason: z.string().nullable(),
  restorable: z.boolean(),
  authorId: z.string().nullable(),
  usage: usageSchema
});
export const modelSchema = z.object({
  modelId: z
    .enum(['v0-mini', 'v0-pro', 'v0-max', 'v0-max-fast'])
    .describe('Model used for generation'),
  imageGenerations: z.boolean().describe('Allow billed image generation')
});
export const generationSchema = z.object({
  message: z.string().min(1).describe('Prompt or instruction for the agent'),
  systemPrompt: z.string().optional().describe('Framework and development context'),
  modelConfiguration: modelSchema.optional(),
  responseMode: z
    .enum(['sync', 'async'])
    .optional()
    .describe('Defaults to async; poll get_current_message until finishReason is non-null')
});
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError('v0 returned an unexpected API v2 response.');
  return result.data;
};

export class V0CurrentClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(token: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.v0.dev/v2',
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'v0',
          reason: 'v0_api_error',
          extractMessage: () =>
            'The request was rejected. Check account access, resource IDs, and API limits.'
        })
    });
  }
  async create(
    input: z.infer<typeof generationSchema> & {
      title?: string;
      privacy?: z.infer<typeof privacySchema>;
      metadata?: Record<string, string>;
    }
  ) {
    const { responseMode, ...body } = input;
    const async = responseMode !== 'sync';
    const result = (
      await this.http.post<unknown>(async ? '/chats/async' : '/chats', {
        ...body,
        privacy: input.privacy ?? 'private',
        mcpServerIds: [],
        credentialAccess: { sharedNpm: false, github: false, vercel: false }
      })
    ).data;
    return async
      ? parse(z.object({ chatId: z.string(), messageId: z.string() }), result)
      : {
          ...parse(z.object({ chat: currentChatSchema, usage: usageSchema }), result),
          chatId: parse(z.object({ chat: currentChatSchema }), result).chat.id
        };
  }
  async importFiles(input: {
    files: Array<{ name: string; content: string; encoding?: 'utf8' | 'base64' }>;
    title?: string;
    privacy?: z.infer<typeof privacySchema>;
    metadata?: Record<string, string>;
  }) {
    return parse(
      z.object({ chat: currentChatSchema, usage: usageSchema }),
      (
        await this.http.post<unknown>('/chats/from-files', {
          ...input,
          privacy: input.privacy ?? 'private'
        })
      ).data
    );
  }
  async list(params: {
    limit?: number;
    cursor?: string;
    authorId?: string;
    vercelProjectId?: string;
    metadata?: Record<string, string>;
  }) {
    const { metadata, ...query } = params;
    return parse(
      z.object({ chats: z.array(currentChatSchema), cursor: z.string().nullable() }),
      (
        await this.http.get<unknown>('/chats', {
          params: {
            ...query,
            ...Object.fromEntries(
              Object.entries(metadata ?? {}).map(([key, value]) => [`metadata[${key}]`, value])
            )
          }
        })
      ).data
    );
  }
  async get(chatId: string) {
    return parse(
      currentChatSchema,
      (await this.http.get<unknown>(`/chats/${encodeURIComponent(chatId)}`)).data
    );
  }
  async update(
    chatId: string,
    body: {
      title?: string;
      privacy?: z.infer<typeof privacySchema>;
      metadata?: Record<string, string>;
    }
  ) {
    if (!Object.values(body).some(value => value !== undefined))
      throw createApiServiceError('Provide title, privacy, or metadata to update.');
    return parse(
      currentChatSchema,
      (await this.http.patch<unknown>(`/chats/${encodeURIComponent(chatId)}`, body)).data
    );
  }
  async delete(chatId: string) {
    return parse(
      z.object({ chatId: z.string() }),
      (await this.http.delete<unknown>(`/chats/${encodeURIComponent(chatId)}`)).data
    );
  }
  async send(chatId: string, input: z.infer<typeof generationSchema>) {
    const { responseMode, ...body } = input;
    const async = responseMode !== 'sync';
    const result = (
      await this.http.post<unknown>(
        `/chats/${encodeURIComponent(chatId)}/messages${async ? '/async' : ''}`,
        { ...body, mcpServerIds: [] }
      )
    ).data;
    return async
      ? parse(z.object({ messageId: z.string() }), result)
      : {
          messageId: parse(currentMessageSchema, result).id,
          message: parse(currentMessageSchema, result)
        };
  }
  async listMessages(chatId: string, params: { limit?: number; cursor?: string }) {
    return parse(
      z.object({ messages: z.array(currentMessageSchema), cursor: z.string().nullable() }),
      (
        await this.http.get<unknown>(`/chats/${encodeURIComponent(chatId)}/messages`, {
          params
        })
      ).data
    );
  }
  async getMessage(chatId: string, messageId: string) {
    return parse(
      currentMessageSchema,
      (
        await this.http.get<unknown>(
          `/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`
        )
      ).data
    );
  }
}
