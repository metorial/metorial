import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { browserbaseApiError, browserbaseServiceError } from './errors';
import type {
  Context,
  ContextCreateResponse,
  ContextUpdateResponse,
  CreateSessionParams,
  Download,
  DownloadContent,
  Extension,
  FetchPageParams,
  FetchPageResponse,
  ListDownloadsParams,
  ListDownloadsResponse,
  Project,
  ProjectUsage,
  Session,
  SessionDebugUrls,
  SessionLog,
  SessionRecordingEvent,
  SessionUploadResponse,
  UploadFileParams,
  WebSearchParams,
  WebSearchResponse,
  WebSearchResult
} from './types';

let sanitizeMultipartHeader = (value: string) => value.replace(/[\r\n"]/g, '_');

let appendMultipartFile = (
  parts: Buffer[],
  boundary: string,
  name: string,
  filename: string,
  content: Buffer,
  mimeType: string
) => {
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${sanitizeMultipartHeader(name)}"; filename="${sanitizeMultipartHeader(filename)}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
  );
  parts.push(content);
  parts.push(Buffer.from('\r\n'));
};

let buildMultipartFileBody = (params: {
  fileField: string;
  filename: string;
  fileContent: Buffer;
  mimeType?: string;
}) => {
  let boundary = `----SlatesBrowserbaseBoundary${Date.now()}${Math.random().toString(16).slice(2)}`;
  let parts: Buffer[] = [];

  appendMultipartFile(
    parts,
    boundary,
    params.fileField,
    params.filename,
    params.fileContent,
    params.mimeType ?? 'application/octet-stream'
  );
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
};

let decodeBase64File = (contentBase64: string, fieldName = 'contentBase64') => {
  let normalized = contentBase64.replace(/\s+/g, '');

  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw browserbaseServiceError(`${fieldName} must be valid non-empty base64 data.`);
  }

  let content = Buffer.from(normalized, 'base64');
  if (content.length === 0) {
    throw browserbaseServiceError(`${fieldName} must contain at least one byte.`);
  }

  let canonical = content.toString('base64').replace(/=+$/, '');
  if (canonical !== normalized.replace(/=+$/, '')) {
    throw browserbaseServiceError(`${fieldName} must be valid base64 data.`);
  }

  return content;
};

let responseDataToBase64 = (data: unknown) => {
  if (Buffer.isBuffer(data)) {
    return data.toString('base64');
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('base64');
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64');
  }

  if (typeof data === 'string') {
    return Buffer.from(data, 'binary').toString('base64');
  }

  throw browserbaseServiceError('Browserbase returned file content in an unsupported format.');
};

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.browserbase.com/v1',
      headers: {
        'X-BB-API-Key': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw browserbaseApiError(error, operation);
    }
  }

  // Sessions

  async createSession(params: CreateSessionParams): Promise<Session> {
    let res = await this.request('create session', () => this.http.post('/sessions', params));
    return this.mapSession(res.data);
  }

  async listSessions(options?: { status?: string; query?: string }): Promise<Session[]> {
    let params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.query) params.q = options.query;
    let res = await this.request('list sessions', () =>
      this.http.get('/sessions', { params })
    );
    return (res.data as unknown[]).map((s: unknown) => this.mapSession(s));
  }

  async getSession(sessionId: string): Promise<Session> {
    let res = await this.request('get session', () => this.http.get(`/sessions/${sessionId}`));
    return this.mapSession(res.data);
  }

  async completeSession(sessionId: string): Promise<Session> {
    let res = await this.request('complete session', () =>
      this.http.post(`/sessions/${sessionId}`, {
        status: 'REQUEST_RELEASE'
      })
    );
    return this.mapSession(res.data);
  }

  async uploadSessionFile(
    sessionId: string,
    params: UploadFileParams
  ): Promise<SessionUploadResponse> {
    let content = decodeBase64File(params.contentBase64);
    let multipart = buildMultipartFileBody({
      fileField: 'file',
      filename: params.fileName,
      fileContent: content,
      mimeType: params.mimeType
    });

    let res = await this.request('upload session file', () =>
      this.http.post(`/sessions/${sessionId}/uploads`, multipart.body, {
        headers: { 'Content-Type': multipart.contentType }
      })
    );
    return { message: String((res.data as Record<string, unknown>).message ?? '') };
  }

  // Session observability

  async getSessionDebugUrls(sessionId: string): Promise<SessionDebugUrls> {
    let res = await this.request('get session live URLs', () =>
      this.http.get(`/sessions/${sessionId}/debug`)
    );
    return res.data as SessionDebugUrls;
  }

  async getSessionLogs(sessionId: string): Promise<SessionLog[]> {
    let res = await this.request('get session logs', () =>
      this.http.get(`/sessions/${sessionId}/logs`)
    );
    return res.data as SessionLog[];
  }

  async getSessionRecording(sessionId: string): Promise<SessionRecordingEvent[]> {
    let res = await this.request('get session recording', () =>
      this.http.get(`/sessions/${sessionId}/recording`)
    );
    return res.data as SessionRecordingEvent[];
  }

  // Contexts

  async createContext(projectId: string): Promise<ContextCreateResponse> {
    let res = await this.request('create context', () =>
      this.http.post('/contexts', { projectId })
    );
    return this.mapContextCreateResponse(res.data);
  }

  async getContext(contextId: string): Promise<Context> {
    let res = await this.request('get context', () => this.http.get(`/contexts/${contextId}`));
    return this.mapContext(res.data);
  }

  async updateContext(contextId: string): Promise<ContextUpdateResponse> {
    let res = await this.request('update context', () =>
      this.http.put(`/contexts/${contextId}`)
    );
    return this.mapContextCreateResponse(res.data);
  }

  async deleteContext(contextId: string): Promise<void> {
    await this.request('delete context', () => this.http.delete(`/contexts/${contextId}`));
  }

  // Extensions

  async uploadExtension(params: UploadFileParams): Promise<Extension> {
    let content = decodeBase64File(params.contentBase64);
    let multipart = buildMultipartFileBody({
      fileField: 'file',
      filename: params.fileName,
      fileContent: content,
      mimeType: params.mimeType ?? 'application/zip'
    });

    let res = await this.request('upload extension', () =>
      this.http.post('/extensions', multipart.body, {
        headers: { 'Content-Type': multipart.contentType }
      })
    );
    return this.mapExtension(res.data);
  }

  async getExtension(extensionId: string): Promise<Extension> {
    let res = await this.request('get extension', () =>
      this.http.get(`/extensions/${extensionId}`)
    );
    return this.mapExtension(res.data);
  }

  async deleteExtension(extensionId: string): Promise<void> {
    await this.request('delete extension', () =>
      this.http.delete(`/extensions/${extensionId}`)
    );
  }

  // Projects

  async listProjects(): Promise<Project[]> {
    let res = await this.request('list projects', () => this.http.get('/projects'));
    return (res.data as unknown[]).map((p: unknown) => this.mapProject(p));
  }

  async getProject(projectId: string): Promise<Project> {
    let res = await this.request('get project', () => this.http.get(`/projects/${projectId}`));
    return this.mapProject(res.data);
  }

  async getProjectUsage(projectId: string): Promise<ProjectUsage> {
    let res = await this.request('get project usage', () =>
      this.http.get(`/projects/${projectId}/usage`)
    );
    return res.data as ProjectUsage;
  }

  // Fetch and search

  async fetchPage(params: FetchPageParams): Promise<FetchPageResponse> {
    let res = await this.request('fetch page', () => this.http.post('/fetch', params));
    let d = res.data as Record<string, unknown>;
    return {
      fetchId: d.id as string,
      statusCode: d.statusCode as number,
      headers: d.headers as Record<string, string>,
      content: d.content,
      contentType: d.contentType as string,
      encoding: d.encoding as string
    };
  }

  async webSearch(params: WebSearchParams): Promise<WebSearchResponse> {
    let res = await this.request('web search', () => this.http.post('/search', params));
    let d = res.data as Record<string, unknown>;
    return {
      requestId: d.requestId as string,
      query: d.query as string,
      results: ((d.results as unknown[]) ?? []).map(result => this.mapWebSearchResult(result))
    };
  }

  // Downloads

  async listDownloads(options: ListDownloadsParams): Promise<ListDownloadsResponse> {
    let params: Record<string, string | number> = {
      sessionId: options.sessionId
    };

    for (let key of [
      'filename',
      'mimeType',
      'minSize',
      'maxSize',
      'createdAfter',
      'createdBefore',
      'limit',
      'offset'
    ] as const) {
      let value = options[key];
      if (value !== undefined) {
        params[key] = value;
      }
    }

    let res = await this.request('list downloads', () =>
      this.http.get('/downloads', { params })
    );
    let d = res.data as Record<string, unknown>;

    return {
      downloads: ((d.downloads as unknown[]) ?? []).map(download =>
        this.mapDownload(download)
      ),
      total: d.total as number,
      limit: d.limit as number,
      offset: d.offset as number
    };
  }

  async getDownload(downloadId: string): Promise<Download> {
    let res = await this.request('get download metadata', () =>
      this.http.get(`/downloads/${downloadId}`, {
        headers: { Accept: 'application/json' }
      })
    );
    return this.mapDownload(res.data);
  }

  async getDownloadContent(downloadId: string): Promise<DownloadContent> {
    let metadata = await this.getDownload(downloadId);
    let res = await this.request('get download content', () =>
      this.http.get(`/downloads/${downloadId}`, {
        headers: { Accept: 'application/octet-stream' },
        responseType: 'arraybuffer'
      })
    );
    let contentBase64 = responseDataToBase64(res.data);

    return {
      ...metadata,
      contentBase64,
      byteLength: Buffer.from(contentBase64, 'base64').byteLength
    };
  }

  async deleteDownload(downloadId: string): Promise<void> {
    await this.request('delete download', () => this.http.delete(`/downloads/${downloadId}`));
  }

  // Mappers

  private mapSession(data: unknown): Session {
    let d = data as Record<string, unknown>;
    return {
      sessionId: d.id as string,
      createdAt: d.createdAt as string,
      updatedAt: d.updatedAt as string,
      projectId: d.projectId as string,
      startedAt: d.startedAt as string,
      endedAt: (d.endedAt as string) || null,
      expiresAt: d.expiresAt as string,
      status: d.status as Session['status'],
      proxyBytes: (d.proxyBytes as number) || 0,
      keepAlive: (d.keepAlive as boolean) || false,
      contextId: (d.contextId as string) || null,
      region: d.region as string,
      userMetadata: (d.userMetadata as Record<string, string>) || null,
      connectUrl: d.connectUrl as string | undefined,
      seleniumRemoteUrl: d.seleniumRemoteUrl as string | undefined,
      signingKey: d.signingKey as string | undefined
    };
  }

  private mapContext(data: unknown): Context {
    let d = data as Record<string, unknown>;
    return {
      contextId: d.id as string,
      createdAt: d.createdAt as string,
      updatedAt: d.updatedAt as string,
      projectId: d.projectId as string
    };
  }

  private mapContextCreateResponse(data: unknown): ContextCreateResponse {
    let d = data as Record<string, unknown>;
    return {
      contextId: d.id as string,
      uploadUrl: d.uploadUrl as string,
      publicKey: d.publicKey as string,
      cipherAlgorithm: d.cipherAlgorithm as string,
      initializationVectorSize: d.initializationVectorSize as number
    };
  }

  private mapExtension(data: unknown): Extension {
    let d = data as Record<string, unknown>;
    return {
      extensionId: d.id as string,
      createdAt: d.createdAt as string,
      updatedAt: d.updatedAt as string,
      fileName: d.fileName as string,
      projectId: d.projectId as string
    };
  }

  private mapProject(data: unknown): Project {
    let d = data as Record<string, unknown>;
    return {
      projectId: d.id as string,
      createdAt: d.createdAt as string,
      updatedAt: d.updatedAt as string,
      name: d.name as string,
      ownerId: d.ownerId as string,
      defaultTimeout: d.defaultTimeout as number,
      concurrency: d.concurrency as number
    };
  }

  private mapWebSearchResult(data: unknown): WebSearchResult {
    let d = data as Record<string, unknown>;
    return {
      resultId: d.id as string,
      url: d.url as string,
      title: d.title as string,
      author: d.author as string | undefined,
      publishedDate: d.publishedDate as string | undefined,
      image: d.image as string | undefined,
      favicon: d.favicon as string | undefined
    };
  }

  private mapDownload(data: unknown): Download {
    let d = data as Record<string, unknown>;
    return {
      downloadId: d.id as string,
      sessionId: d.sessionId as string,
      filename: d.filename as string,
      mimeType: d.mimeType as string,
      size: d.size as number,
      checksum: d.checksum as string,
      createdAt: d.createdAt as string
    };
  }
}
