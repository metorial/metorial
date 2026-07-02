import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://getcody.ai/api/v1'
});

export interface PaginationMeta {
  count: number;
  total: number;
  perPage: number;
  totalPages: number;
  nextPage: number | null;
  previousPage: number | null;
}

export interface Bot {
  botId: string;
  name: string;
  model: string;
  createdAt: number;
}

export interface Folder {
  folderId: string;
  name: string;
  createdAt: number;
}

export interface Document {
  documentId: string;
  name: string;
  status: string;
  contentUrl: string;
  folderId: string;
  createdAt: number;
}

export interface Conversation {
  conversationId: string;
  name: string;
  botId: string;
  createdAt: number;
}

export interface Message {
  messageId: string;
  content: string;
  conversationId: string;
  machine: boolean;
  failedResponding: boolean;
  flagged: boolean;
  createdAt: number;
}

export interface StreamInfo {
  streamUrl: string;
}

let mapBot = (raw: any): Bot => ({
  botId: raw.id,
  name: raw.name,
  model: raw.model,
  createdAt: raw.created_at
});

let mapFolder = (raw: any): Folder => ({
  folderId: raw.id,
  name: raw.name,
  createdAt: raw.created_at
});

let mapDocument = (raw: any): Document => ({
  documentId: raw.id,
  name: raw.name,
  status: raw.status,
  contentUrl: raw.content_url,
  folderId: raw.folder_id,
  createdAt: raw.created_at
});

let mapConversation = (raw: any): Conversation => ({
  conversationId: raw.id,
  name: raw.name,
  botId: raw.bot_id,
  createdAt: raw.created_at
});

let mapMessage = (raw: any): Message => ({
  messageId: raw.id,
  content: raw.content,
  conversationId: raw.conversation_id,
  machine: raw.machine,
  failedResponding: raw.failed_responding,
  flagged: raw.flagged,
  createdAt: raw.created_at
});

let mapPagination = (raw: any): PaginationMeta => ({
  count: raw.count,
  total: raw.total,
  perPage: raw.per_page,
  totalPages: raw.total_pages,
  nextPage: raw.next_page ?? null,
  previousPage: raw.previous_page ?? null
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Bots ──

  async listBots(params?: {
    keyword?: string;
    page?: number;
  }): Promise<{ bots: Bot[]; pagination: PaginationMeta }> {
    let response = await api.get('/bots', {
      headers: this.headers(),
      params: {
        ...(params?.keyword ? { keyword: params.keyword } : {}),
        ...(params?.page ? { page: params.page } : {})
      }
    });
    return {
      bots: response.data.data.map(mapBot),
      pagination: mapPagination(response.data.meta.pagination)
    };
  }

  // ── Folders ──

  async listFolders(params?: {
    keyword?: string;
    page?: number;
  }): Promise<{ folders: Folder[]; pagination: PaginationMeta }> {
    let response = await api.get('/folders', {
      headers: this.headers(),
      params: {
        ...(params?.keyword ? { keyword: params.keyword } : {}),
        ...(params?.page ? { page: params.page } : {})
      }
    });
    return {
      folders: response.data.data.map(mapFolder),
      pagination: mapPagination(response.data.meta.pagination)
    };
  }

  async createFolder(name: string): Promise<Folder> {
    let response = await api.post('/folders', { name }, { headers: this.headers() });
    return mapFolder(response.data.data);
  }

  async getFolder(folderId: string): Promise<Folder> {
    let response = await api.get(`/folders/${folderId}`, { headers: this.headers() });
    return mapFolder(response.data.data);
  }

  async updateFolder(folderId: string, name: string): Promise<Folder> {
    let response = await api.post(
      `/folders/${folderId}`,
      { name },
      { headers: this.headers() }
    );
    return mapFolder(response.data.data);
  }

  // ── Documents ──

  async listDocuments(params?: {
    folderId?: string;
    conversationId?: string;
    keyword?: string;
    page?: number;
  }): Promise<{ documents: Document[]; pagination: PaginationMeta }> {
    let response = await api.get('/documents', {
      headers: this.headers(),
      params: {
        ...(params?.folderId ? { folder_id: params.folderId } : {}),
        ...(params?.conversationId ? { conversation_id: params.conversationId } : {}),
        ...(params?.keyword ? { keyword: params.keyword } : {}),
        ...(params?.page ? { page: params.page } : {})
      }
    });
    return {
      documents: response.data.data.map(mapDocument),
      pagination: mapPagination(response.data.meta.pagination)
    };
  }

  async getDocument(documentId: string): Promise<Document> {
    let response = await api.get(`/documents/${documentId}`, { headers: this.headers() });
    return mapDocument(response.data.data);
  }

  async createDocumentFromContent(params: {
    name: string;
    folderId?: string;
    content: string;
  }): Promise<Document> {
    let response = await api.post(
      '/documents',
      {
        name: params.name,
        ...(params.folderId ? { folder_id: params.folderId } : {}),
        content: params.content
      },
      { headers: this.headers() }
    );
    return mapDocument(response.data.data);
  }

  async createDocumentFromWebpage(params: {
    folderId: string;
    url: string;
  }): Promise<Document> {
    let response = await api.post(
      '/documents/webpage',
      {
        folder_id: params.folderId,
        url: params.url
      },
      { headers: this.headers() }
    );
    return mapDocument(response.data.data);
  }

  async getSignedUploadUrl(params: {
    fileName: string;
    contentType: string;
  }): Promise<{ url: string; key: string }> {
    let response = await api.post(
      '/uploads/signed-url',
      {
        file_name: params.fileName,
        content_type: params.contentType
      },
      { headers: this.headers() }
    );
    return {
      url: response.data.url,
      key: response.data.key
    };
  }

  async createDocumentFromFile(params: { folderId: string; key: string }): Promise<void> {
    await api.post(
      '/documents/file',
      {
        folder_id: params.folderId,
        key: params.key
      },
      { headers: this.headers() }
    );
  }

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}`, { headers: this.headers() });
  }

  // ── Conversations ──

  async listConversations(params?: {
    botId?: string;
    keyword?: string;
    includeDocumentIds?: boolean;
    page?: number;
  }): Promise<{ conversations: Conversation[]; pagination: PaginationMeta }> {
    let response = await api.get('/conversations', {
      headers: this.headers(),
      params: {
        ...(params?.botId ? { bot_id: params.botId } : {}),
        ...(params?.keyword ? { keyword: params.keyword } : {}),
        ...(params?.includeDocumentIds ? { includes: 'document_ids' } : {}),
        ...(params?.page ? { page: params.page } : {})
      }
    });
    return {
      conversations: response.data.data.map(mapConversation),
      pagination: mapPagination(response.data.meta.pagination)
    };
  }

  async getConversation(
    conversationId: string,
    includeDocumentIds?: boolean
  ): Promise<Conversation> {
    let response = await api.get(`/conversations/${conversationId}`, {
      headers: this.headers(),
      params: includeDocumentIds ? { includes: 'document_ids' } : {}
    });
    return mapConversation(response.data.data);
  }

  async createConversation(params: {
    name: string;
    botId: string;
    documentIds?: string[];
  }): Promise<Conversation> {
    let response = await api.post(
      '/conversations',
      {
        name: params.name,
        bot_id: params.botId,
        ...(params.documentIds ? { document_ids: params.documentIds } : {})
      },
      { headers: this.headers() }
    );
    return mapConversation(response.data.data);
  }

  async updateConversation(
    conversationId: string,
    params: {
      name: string;
      botId: string;
      documentIds?: string[];
    }
  ): Promise<Conversation> {
    let response = await api.post(
      `/conversations/${conversationId}`,
      {
        name: params.name,
        bot_id: params.botId,
        ...(params.documentIds ? { document_ids: params.documentIds } : {})
      },
      { headers: this.headers() }
    );
    return mapConversation(response.data.data);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`/conversations/${conversationId}`, { headers: this.headers() });
  }

  // ── Messages ──

  async listMessages(params?: {
    conversationId?: string;
    includeSources?: boolean;
    includeUsage?: boolean;
    page?: number;
  }): Promise<{ messages: Message[]; pagination: PaginationMeta }> {
    let includes: string[] = [];
    if (params?.includeSources) includes.push('sources');
    if (params?.includeUsage) includes.push('usage');

    let response = await api.get('/messages', {
      headers: this.headers(),
      params: {
        ...(params?.conversationId ? { conversation_id: params.conversationId } : {}),
        ...(includes.length > 0 ? { includes: includes.join(',') } : {}),
        ...(params?.page ? { page: params.page } : {})
      }
    });
    return {
      messages: response.data.data.map(mapMessage),
      pagination: mapPagination(response.data.meta.pagination)
    };
  }

  async getMessage(
    messageId: string,
    params?: {
      includeSources?: boolean;
      includeUsage?: boolean;
    }
  ): Promise<Message> {
    let includes: string[] = [];
    if (params?.includeSources) includes.push('sources');
    if (params?.includeUsage) includes.push('usage');

    let response = await api.get(`/messages/${messageId}`, {
      headers: this.headers(),
      params: includes.length > 0 ? { includes: includes.join(',') } : {}
    });
    return mapMessage(response.data.data);
  }

  async sendMessage(params: { content: string; conversationId: string }): Promise<Message> {
    let response = await api.post(
      '/messages',
      {
        content: params.content,
        conversation_id: params.conversationId
      },
      { headers: this.headers() }
    );
    return mapMessage(response.data.data);
  }

  async sendMessageForStream(params: {
    content: string;
    conversationId: string;
  }): Promise<StreamInfo> {
    let response = await api.post(
      '/messages/stream',
      {
        content: params.content,
        conversation_id: params.conversationId,
        redirect: false
      },
      {
        headers: this.headers(),
        maxRedirects: 0
      }
    );
    return {
      streamUrl: response.data.data.stream_url
    };
  }
}
