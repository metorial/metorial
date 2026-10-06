import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

const rawBotSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string().optional(),
  created_at: z.number()
});
const rawFolderSchema = z.object({ id: z.string(), name: z.string(), created_at: z.number() });
const rawDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  content_url: z.string(),
  folder_id: z.string(),
  created_at: z.number()
});
const rawConversationSchema = z.object({
  id: z.string(),
  name: z.string(),
  bot_id: z.string(),
  created_at: z.number(),
  document_ids: z.array(z.string()).optional()
});
const rawMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  conversation_id: z.string(),
  machine: z.boolean(),
  failed_responding: z.boolean(),
  flagged: z.boolean(),
  created_at: z.number(),
  sources: z
    .object({
      data: z.array(
        z.object({
          type: z.string(),
          document_id: z.string(),
          document_name: z.string(),
          document_url: z.string(),
          file_name: z.string().optional(),
          webpage_url: z.string().optional(),
          created_at: z.number()
        })
      )
    })
    .optional(),
  usage: z.object({ tokens: z.number().optional(), credits: z.number().optional() }).optional()
});
const rawPaginationSchema = z.object({
  pagination: z.object({
    count: z.number(),
    total: z.number(),
    per_page: z.number(),
    total_pages: z.number(),
    next_page: z.number().nullish(),
    previous_page: z.number().nullish()
  })
});
const mapPagination = (raw: z.infer<typeof rawPaginationSchema>['pagination']) => ({
  count: raw.count,
  total: raw.total,
  perPage: raw.per_page,
  totalPages: raw.total_pages,
  nextPage: raw.next_page ?? null,
  previousPage: raw.previous_page ?? null
});
const mapBot = (raw: z.infer<typeof rawBotSchema>) => ({
  botId: raw.id,
  name: raw.name,
  model: raw.model,
  createdAt: raw.created_at
});
const mapFolder = (raw: z.infer<typeof rawFolderSchema>) => ({
  folderId: raw.id,
  name: raw.name,
  createdAt: raw.created_at
});
const mapDocument = (raw: z.infer<typeof rawDocumentSchema>) => ({
  documentId: raw.id,
  name: raw.name,
  status: raw.status,
  contentUrl: raw.content_url,
  folderId: raw.folder_id,
  createdAt: raw.created_at
});
const mapConversation = (raw: z.infer<typeof rawConversationSchema>) => ({
  conversationId: raw.id,
  name: raw.name,
  botId: raw.bot_id,
  documentIds: raw.document_ids,
  createdAt: raw.created_at
});
const mapMessage = (raw: z.infer<typeof rawMessageSchema>) => ({
  messageId: raw.id,
  content: raw.content,
  conversationId: raw.conversation_id,
  machine: raw.machine,
  failedResponding: raw.failed_responding,
  flagged: raw.flagged,
  createdAt: raw.created_at,
  sources: raw.sources?.data.map(source => ({
    type: source.type,
    documentId: source.document_id,
    documentName: source.document_name,
    documentUrl: source.document_url,
    fileName: source.file_name,
    webpageUrl: source.webpage_url,
    createdAt: source.created_at
  })),
  usage: raw.usage
});
const apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    parent: {},
    providerLabel: 'Cody',
    operation,
    reason: 'cody_api_error',
    nestedKeys: ['errors']
  });
const includes = (params?: { includeSources?: boolean; includeUsage?: boolean }) => {
  const values = [
    params?.includeSources ? 'sources' : undefined,
    params?.includeUsage ? 'usage' : undefined
  ].filter(Boolean);
  return values.length ? values.join(',') : undefined;
};

export class Client {
  private api;

  constructor(config: { token: string }) {
    if (!config.token?.trim())
      throw createApiServiceError(
        'A Cody API key is required. Reconnect with a valid API key.'
      );
    this.api = createAuthenticatedAxios({
      baseURL: 'https://getcody.ai/api/v1',
      authHeader: { value: `Bearer ${config.token.trim()}` },
      timeout: 180_000
    });
  }

  private parse<T>(schema: z.ZodType<T>, data: unknown, operation: string): T {
    const result = schema.safeParse(data);
    if (!result.success)
      throw createApiServiceError(
        `Cody returned an invalid response while attempting to ${operation}.`,
        { reason: 'cody_invalid_response' }
      );
    return result.data;
  }

  private async getOne<T>(
    path: string,
    schema: z.ZodType<T>,
    operation: string,
    params: Record<string, unknown> = {}
  ) {
    const data = await requestAxiosData(
      operation,
      () => this.api.get<unknown>(path, { params: pickDefined(params) }),
      apiError
    );
    return this.parse(z.object({ data: schema }), data, operation).data;
  }

  private async postOne<T>(
    path: string,
    body: Record<string, unknown>,
    schema: z.ZodType<T>,
    operation: string
  ) {
    const data = await requestAxiosData(
      operation,
      () => this.api.post<unknown>(path, pickDefined(body)),
      apiError
    );
    return this.parse(z.object({ data: schema }), data, operation).data;
  }

  private async list<T>(
    path: string,
    schema: z.ZodType<T>,
    operation: string,
    params: Record<string, unknown>
  ) {
    const data = await requestAxiosData(
      operation,
      () => this.api.get<unknown>(path, { params: pickDefined(params) }),
      apiError
    );
    const result = this.parse(
      z.object({ data: z.array(schema), meta: rawPaginationSchema }),
      data,
      operation
    );
    return { data: result.data, pagination: mapPagination(result.meta.pagination) };
  }

  async listBots(params?: { keyword?: string; page?: number }) {
    const result = await this.list('/bots', rawBotSchema, 'list bots', { ...params });
    return { bots: result.data.map(mapBot), pagination: result.pagination };
  }
  async listFolders(params?: { keyword?: string; page?: number }) {
    const result = await this.list('/folders', rawFolderSchema, 'list folders', { ...params });
    return { folders: result.data.map(mapFolder), pagination: result.pagination };
  }
  async createFolder(name: string) {
    return mapFolder(
      await this.postOne('/folders', { name }, rawFolderSchema, 'create folder')
    );
  }
  async getFolder(folderId: string) {
    return mapFolder(
      await this.getOne(
        `/folders/${encodeURIComponent(folderId)}`,
        rawFolderSchema,
        'get folder'
      )
    );
  }
  async updateFolder(folderId: string, name: string) {
    return mapFolder(
      await this.postOne(
        `/folders/${encodeURIComponent(folderId)}`,
        { name },
        rawFolderSchema,
        'update folder'
      )
    );
  }

  async listDocuments(params?: {
    folderId?: string;
    conversationId?: string;
    keyword?: string;
    page?: number;
  }) {
    const result = await this.list('/documents', rawDocumentSchema, 'list documents', {
      folder_id: params?.folderId,
      conversation_id: params?.conversationId,
      keyword: params?.keyword,
      page: params?.page
    });
    return { documents: result.data.map(mapDocument), pagination: result.pagination };
  }
  async getDocument(documentId: string) {
    return mapDocument(
      await this.getOne(
        `/documents/${encodeURIComponent(documentId)}`,
        rawDocumentSchema,
        'get document'
      )
    );
  }
  async createDocumentFromContent(params: {
    name: string;
    folderId?: string;
    content: string;
  }) {
    if (Buffer.byteLength(params.content, 'utf8') > 768 * 1024)
      throw createApiServiceError(
        'Document content must be at most 768 KB. Upload larger content as a file.'
      );
    return mapDocument(
      await this.postOne(
        '/documents',
        { name: params.name, folder_id: params.folderId, content: params.content },
        rawDocumentSchema,
        'create document from content'
      )
    );
  }
  async createDocumentFromWebpage(params: { folderId: string; url: string }) {
    return mapDocument(
      await this.postOne(
        '/documents/webpage',
        { folder_id: params.folderId, url: params.url },
        rawDocumentSchema,
        'create document from webpage'
      )
    );
  }
  async getSignedUploadUrl(params: { fileName: string; contentType: string }) {
    const data = await requestAxiosData(
      'get file upload URL',
      () =>
        this.api.post<unknown>('/uploads/signed-url', {
          file_name: params.fileName,
          content_type: params.contentType
        }),
      apiError
    );
    const uploadSchema = z.object({ url: z.url(), key: z.string().min(1) });
    // The API reference shows a direct response; its official example uses a data envelope.
    const result = this.parse(
      z.union([uploadSchema, z.object({ data: uploadSchema })]),
      data,
      'get file upload URL'
    );
    return 'data' in result ? result.data : result;
  }
  async createDocumentFromFile(params: { folderId: string; key: string }) {
    await requestAxiosData(
      'create document from file',
      () => this.api.post('/documents/file', { folder_id: params.folderId, key: params.key }),
      apiError
    );
  }
  async deleteDocument(documentId: string) {
    await requestAxiosData(
      'delete document',
      () => this.api.delete(`/documents/${encodeURIComponent(documentId)}`),
      apiError
    );
  }

  async listConversations(params?: {
    botId?: string;
    keyword?: string;
    includeDocumentIds?: boolean;
    page?: number;
  }) {
    const result = await this.list(
      '/conversations',
      rawConversationSchema,
      'list conversations',
      {
        bot_id: params?.botId,
        keyword: params?.keyword,
        includes: params?.includeDocumentIds ? 'document_ids' : undefined,
        page: params?.page
      }
    );
    return { conversations: result.data.map(mapConversation), pagination: result.pagination };
  }
  async getConversation(conversationId: string, includeDocumentIds?: boolean) {
    return mapConversation(
      await this.getOne(
        `/conversations/${encodeURIComponent(conversationId)}`,
        rawConversationSchema,
        'get conversation',
        { includes: includeDocumentIds ? 'document_ids' : undefined }
      )
    );
  }
  async createConversation(params: { name: string; botId: string; documentIds?: string[] }) {
    return mapConversation(
      await this.postOne(
        '/conversations',
        { name: params.name, bot_id: params.botId, document_ids: params.documentIds },
        rawConversationSchema,
        'create conversation'
      )
    );
  }
  async updateConversation(
    conversationId: string,
    params: { name: string; botId: string; documentIds?: string[] }
  ) {
    return mapConversation(
      await this.postOne(
        `/conversations/${encodeURIComponent(conversationId)}`,
        { name: params.name, bot_id: params.botId, document_ids: params.documentIds },
        rawConversationSchema,
        'update conversation'
      )
    );
  }
  async deleteConversation(conversationId: string) {
    await requestAxiosData(
      'delete conversation',
      () => this.api.delete(`/conversations/${encodeURIComponent(conversationId)}`),
      apiError
    );
  }

  async listMessages(params?: {
    conversationId?: string;
    includeSources?: boolean;
    includeUsage?: boolean;
    page?: number;
  }) {
    const result = await this.list('/messages', rawMessageSchema, 'list messages', {
      conversation_id: params?.conversationId,
      includes: includes(params),
      page: params?.page
    });
    return { messages: result.data.map(mapMessage), pagination: result.pagination };
  }
  async getMessage(
    messageId: string,
    params?: { includeSources?: boolean; includeUsage?: boolean }
  ) {
    return mapMessage(
      await this.getOne(
        `/messages/${encodeURIComponent(messageId)}`,
        rawMessageSchema,
        'get message',
        { includes: includes(params) }
      )
    );
  }
  async sendMessage(params: { content: string; conversationId: string }) {
    return mapMessage(
      await this.postOne(
        '/messages',
        { content: params.content, conversation_id: params.conversationId },
        rawMessageSchema,
        'send message'
      )
    );
  }
  async sendMessageForStream(params: { content: string; conversationId: string }) {
    const result = await this.postOne(
      '/messages/stream',
      { content: params.content, conversation_id: params.conversationId, redirect: false },
      z.object({ stream_url: z.url() }),
      'send message for stream'
    );
    return { streamUrl: result.stream_url };
  }
}
