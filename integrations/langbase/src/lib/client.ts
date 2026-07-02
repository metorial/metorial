import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { langbaseApiError, langbaseServiceError } from './errors';

let http = createAxios({
  baseURL: 'https://api.langbase.com/v1'
});

type DocumentUploadParams = {
  memoryName: string;
  documentName: string;
  contentType: string;
  contentBase64?: string;
  contentText?: string;
  meta?: Record<string, string>;
};

let asBlobPart = (content: Buffer | string) =>
  typeof content === 'string' ? content : new Uint8Array(content);

export class Client {
  constructor(private token: string) {}

  private authHeaders(extra?: Record<string, string>) {
    return {
      Authorization: `Bearer ${this.token}`,
      ...extra
    };
  }

  private headers(extra?: Record<string, string>) {
    return {
      'Content-Type': 'application/json',
      ...this.authHeaders(extra)
    };
  }

  private async request<T = any>(operation: string, config: Record<string, any>): Promise<T> {
    try {
      let res = await http.request(config);
      return res.data as T;
    } catch (error) {
      throw langbaseApiError(error, operation);
    }
  }

  // ─── Pipes ──────────────────────────────────────────────

  async createPipe(body: Record<string, any>) {
    return await this.request('create pipe', {
      method: 'post',
      url: '/pipes',
      data: body,
      headers: this.headers()
    });
  }

  async listPipes() {
    return await this.request('list pipes', {
      method: 'get',
      url: '/pipes',
      headers: this.headers()
    });
  }

  async updatePipe(pipeName: string, body: Record<string, any>) {
    return await this.request('update pipe', {
      method: 'post',
      url: `/pipes/${encodeURIComponent(pipeName)}`,
      data: body,
      headers: this.headers()
    });
  }

  async runPipe(
    body: Record<string, any>,
    options?: { pipeApiKey?: string; llmKey?: string }
  ) {
    let extra: Record<string, string> = {};
    if (options?.llmKey) {
      extra['LB-LLM-Key'] = options.llmKey;
    }

    let authToken = options?.pipeApiKey ?? this.token;
    let res: any;
    try {
      res = await http.post(
        '/pipes/run',
        { ...body, stream: false },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            ...extra
          }
        }
      );
    } catch (error) {
      throw langbaseApiError(error, 'run pipe');
    }

    return {
      ...res.data,
      threadId: res.headers?.['lb-thread-id'] ?? undefined
    };
  }

  // ─── Memory ─────────────────────────────────────────────

  async createMemory(body: Record<string, any>) {
    return await this.request('create memory', {
      method: 'post',
      url: '/memory',
      data: body,
      headers: this.headers()
    });
  }

  async listMemories() {
    return await this.request('list memories', {
      method: 'get',
      url: '/memory',
      headers: this.headers()
    });
  }

  async deleteMemory(memoryName: string) {
    return await this.request('delete memory', {
      method: 'delete',
      url: `/memory/${encodeURIComponent(memoryName)}`,
      headers: this.headers()
    });
  }

  async retrieveMemory(body: Record<string, any>) {
    return await this.request('retrieve memory', {
      method: 'post',
      url: '/memory/retrieve',
      data: body,
      headers: this.headers()
    });
  }

  async getDocumentSignedUrl(body: Record<string, any>) {
    return await this.request('get document signed URL', {
      method: 'post',
      url: '/memory/documents',
      data: body,
      headers: this.headers()
    });
  }

  async uploadDocument(params: DocumentUploadParams) {
    let signed = await this.getDocumentSignedUrl({
      memoryName: params.memoryName,
      documentName: params.documentName,
      ...(params.meta ? { meta: params.meta } : {})
    });

    if (typeof signed.signedUrl !== 'string' || signed.signedUrl.length === 0) {
      throw langbaseServiceError('Langbase did not return a signed document upload URL.');
    }

    let content =
      params.contentBase64 !== undefined
        ? Buffer.from(params.contentBase64, 'base64')
        : (params.contentText ?? '');

    let response: Response;
    try {
      response = await fetch(signed.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': params.contentType
        },
        body: new Blob([asBlobPart(content)], { type: params.contentType })
      });
    } catch (error) {
      throw langbaseApiError(error, 'upload document content');
    }

    if (!response.ok) {
      throw langbaseServiceError(
        `Langbase document upload failed: HTTP ${response.status} ${response.statusText}`
      );
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  }

  async listDocuments(memoryName: string) {
    return await this.request('list documents', {
      method: 'get',
      url: `/memory/${encodeURIComponent(memoryName)}/documents`,
      headers: this.headers()
    });
  }

  async deleteDocument(memoryName: string, documentName: string) {
    return await this.request('delete document', {
      method: 'delete',
      url: `/memory/${encodeURIComponent(memoryName)}/documents/${encodeURIComponent(documentName)}`,
      headers: this.headers()
    });
  }

  async retryDocumentEmbeddings(memoryName: string, documentName: string) {
    return await this.request('retry document embeddings', {
      method: 'get',
      url: `/memory/${encodeURIComponent(memoryName)}/documents/${encodeURIComponent(documentName)}/embeddings/retry`,
      headers: this.headers()
    });
  }

  // ─── Threads ────────────────────────────────────────────

  async createThread(body?: Record<string, any>) {
    return await this.request('create thread', {
      method: 'post',
      url: '/threads',
      data: body ?? {},
      headers: this.headers()
    });
  }

  async getThread(threadId: string) {
    return await this.request('get thread', {
      method: 'get',
      url: `/threads/${encodeURIComponent(threadId)}`,
      headers: this.headers()
    });
  }

  async updateThread(threadId: string, body: Record<string, any>) {
    return await this.request('update thread', {
      method: 'post',
      url: `/threads/${encodeURIComponent(threadId)}`,
      data: body,
      headers: this.headers()
    });
  }

  async deleteThread(threadId: string) {
    return await this.request('delete thread', {
      method: 'delete',
      url: `/threads/${encodeURIComponent(threadId)}`,
      headers: this.headers()
    });
  }

  async appendMessages(threadId: string, messages: Record<string, any>[]) {
    return await this.request('append messages', {
      method: 'post',
      url: `/threads/${encodeURIComponent(threadId)}/messages`,
      data: messages,
      headers: this.headers()
    });
  }

  async listMessages(threadId: string) {
    return await this.request('list messages', {
      method: 'get',
      url: `/threads/${encodeURIComponent(threadId)}/messages`,
      headers: this.headers()
    });
  }

  // ─── Agent ──────────────────────────────────────────────

  async runAgent(body: Record<string, any>, llmKey: string) {
    return await this.request('run agent', {
      method: 'post',
      url: '/agent/run',
      data: { ...body, stream: false },
      headers: this.headers({ 'LB-LLM-Key': llmKey })
    });
  }

  // ─── Parser ─────────────────────────────────────────────

  async parseDocument(
    documentName: string,
    contentType: string,
    documentContent: Buffer | string
  ) {
    let form = new FormData();
    form.append('documentName', documentName);
    form.append('contentType', contentType);
    form.append(
      'document',
      new Blob([asBlobPart(documentContent)], { type: contentType }),
      documentName
    );

    return await this.request('parse document', {
      method: 'post',
      url: '/parser',
      data: form,
      headers: this.authHeaders()
    });
  }

  // ─── Chunker ────────────────────────────────────────────

  async chunkText(body: Record<string, any>) {
    return await this.request('chunk text', {
      method: 'post',
      url: '/chunker',
      data: body,
      headers: this.headers()
    });
  }

  // ─── Embed ──────────────────────────────────────────────

  async generateEmbeddings(body: Record<string, any>) {
    return await this.request('generate embeddings', {
      method: 'post',
      url: '/embed',
      data: body,
      headers: this.headers()
    });
  }

  // ─── Images ─────────────────────────────────────────────

  async generateImages(body: Record<string, any>, llmKey: string) {
    return await this.request('generate images', {
      method: 'post',
      url: '/images',
      data: body,
      headers: this.headers({ 'LB-LLM-Key': llmKey })
    });
  }

  // ─── Tools ──────────────────────────────────────────────

  async webSearch(body: Record<string, any>, searchKey: string) {
    return await this.request('web search', {
      method: 'post',
      url: '/tools/web-search',
      data: body,
      headers: this.headers({ 'LB-WEB-SEARCH-KEY': searchKey })
    });
  }

  async webCrawl(body: Record<string, any>, crawlKey: string) {
    return await this.request('web crawl', {
      method: 'post',
      url: '/tools/crawl',
      data: body,
      headers: this.headers({ 'LB-CRAWL-KEY': crawlKey })
    });
  }
}
