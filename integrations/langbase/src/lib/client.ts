import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.langbase.com/v1'
});

export class Client {
  constructor(private token: string) {}

  private headers(extra?: Record<string, string>) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...extra
    };
  }

  // ─── Pipes ──────────────────────────────────────────────

  async createPipe(body: Record<string, any>) {
    let res = await http.post('/pipes', body, {
      headers: this.headers()
    });
    return res.data;
  }

  async listPipes() {
    let res = await http.get('/pipes', {
      headers: this.headers()
    });
    return res.data;
  }

  async updatePipe(pipeName: string, body: Record<string, any>) {
    let res = await http.post(`/pipes/${encodeURIComponent(pipeName)}`, body, {
      headers: this.headers()
    });
    return res.data;
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
    let res = await http.post(
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
    return {
      ...res.data,
      threadId: res.headers?.['lb-thread-id'] ?? undefined
    };
  }

  // ─── Memory ─────────────────────────────────────────────

  async createMemory(body: Record<string, any>) {
    let res = await http.post('/memory', body, {
      headers: this.headers()
    });
    return res.data;
  }

  async listMemories() {
    let res = await http.get('/memory', {
      headers: this.headers()
    });
    return res.data;
  }

  async deleteMemory(memoryName: string) {
    let res = await http.delete(`/memory/${encodeURIComponent(memoryName)}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async retrieveMemory(body: Record<string, any>) {
    let res = await http.post('/memory/retrieve', body, {
      headers: this.headers()
    });
    return res.data;
  }

  async getDocumentSignedUrl(body: Record<string, any>) {
    let res = await http.post('/memory/documents', body, {
      headers: this.headers()
    });
    return res.data;
  }

  async listDocuments(memoryName: string) {
    let res = await http.get(`/memory/${encodeURIComponent(memoryName)}/documents`, {
      headers: this.headers()
    });
    return res.data;
  }

  async deleteDocument(memoryName: string, documentName: string) {
    let res = await http.delete(
      `/memory/${encodeURIComponent(memoryName)}/documents/${encodeURIComponent(documentName)}`,
      { headers: this.headers() }
    );
    return res.data;
  }

  async retryDocumentEmbeddings(memoryName: string, documentName: string) {
    let res = await http.get(
      `/memory/${encodeURIComponent(memoryName)}/documents/${encodeURIComponent(documentName)}/embeddings/retry`,
      { headers: this.headers() }
    );
    return res.data;
  }

  // ─── Threads ────────────────────────────────────────────

  async createThread(body?: Record<string, any>) {
    let res = await http.post('/threads', body ?? {}, {
      headers: this.headers()
    });
    return res.data;
  }

  async getThread(threadId: string) {
    let res = await http.get(`/threads/${encodeURIComponent(threadId)}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async updateThread(threadId: string, body: Record<string, any>) {
    let res = await http.post(`/threads/${encodeURIComponent(threadId)}`, body, {
      headers: this.headers()
    });
    return res.data;
  }

  async deleteThread(threadId: string) {
    let res = await http.delete(`/threads/${encodeURIComponent(threadId)}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async appendMessages(threadId: string, body: Record<string, any>) {
    let res = await http.post(`/threads/${encodeURIComponent(threadId)}/messages`, body, {
      headers: this.headers()
    });
    return res.data;
  }

  async listMessages(threadId: string) {
    let res = await http.get(`/threads/${encodeURIComponent(threadId)}/messages`, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Agent ──────────────────────────────────────────────

  async runAgent(body: Record<string, any>, llmKey: string) {
    let res = await http.post(
      '/agent/run',
      { ...body, stream: false },
      {
        headers: this.headers({ 'LB-LLM-Key': llmKey })
      }
    );
    return res.data;
  }

  // ─── Parser ─────────────────────────────────────────────

  async parseDocument(
    documentName: string,
    contentType: string,
    documentContent: Buffer | string
  ) {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let parts: string[] = [];

    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="documentName"\r\n\r\n${documentName}`
    );
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="contentType"\r\n\r\n${contentType}`
    );

    let fileContent =
      typeof documentContent === 'string'
        ? documentContent
        : documentContent.toString('base64');
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${documentName}"\r\nContent-Type: ${contentType}\r\n\r\n${fileContent}`
    );
    parts.push(`--${boundary}--`);

    let body = parts.join('\r\n');

    let res = await http.post('/parser', body, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return res.data;
  }

  // ─── Chunker ────────────────────────────────────────────

  async chunkText(body: Record<string, any>) {
    let res = await http.post('/chunker', body, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Embed ──────────────────────────────────────────────

  async generateEmbeddings(body: Record<string, any>) {
    let res = await http.post('/embed', body, {
      headers: this.headers()
    });
    return res.data;
  }

  // ─── Images ─────────────────────────────────────────────

  async generateImages(body: Record<string, any>, llmKey: string) {
    let res = await http.post('/images', body, {
      headers: this.headers({ 'LB-LLM-Key': llmKey })
    });
    return res.data;
  }

  // ─── Tools ──────────────────────────────────────────────

  async webSearch(body: Record<string, any>, searchKey: string) {
    let res = await http.post('/tools/web-search', body, {
      headers: this.headers({ 'LB-WEB-SEARCH-KEY': searchKey })
    });
    return res.data;
  }

  async webCrawl(body: Record<string, any>, crawlKey: string) {
    let res = await http.post('/tools/crawl', body, {
      headers: this.headers({ 'LB-CRAWL-KEY': crawlKey })
    });
    return res.data;
  }
}
