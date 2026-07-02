import { createAxios } from 'slates';
import type {
  Context,
  ContextCreateResponse,
  CreateSessionParams,
  Extension,
  FetchPageParams,
  FetchPageResponse,
  Project,
  ProjectUsage,
  Session,
  SessionDebugUrls,
  SessionLog,
  SessionRecordingEvent
} from './types';

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

  // ── Sessions ──────────────────────────────────────────────────────

  async createSession(params: CreateSessionParams): Promise<Session> {
    let res = await this.http.post('/sessions', params);
    return this.mapSession(res.data);
  }

  async listSessions(options?: { status?: string; query?: string }): Promise<Session[]> {
    let params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.query) params.q = options.query;
    let res = await this.http.get('/sessions', { params });
    return (res.data as unknown[]).map((s: unknown) => this.mapSession(s));
  }

  async getSession(sessionId: string): Promise<Session> {
    let res = await this.http.get(`/sessions/${sessionId}`);
    return this.mapSession(res.data);
  }

  async completeSession(sessionId: string, projectId: string): Promise<Session> {
    let res = await this.http.post(`/sessions/${sessionId}`, {
      status: 'REQUEST_RELEASE',
      projectId
    });
    return this.mapSession(res.data);
  }

  // ── Session Observability ─────────────────────────────────────────

  async getSessionDebugUrls(sessionId: string): Promise<SessionDebugUrls> {
    let res = await this.http.get(`/sessions/${sessionId}/debug`);
    return res.data as SessionDebugUrls;
  }

  async getSessionLogs(sessionId: string): Promise<SessionLog[]> {
    let res = await this.http.get(`/sessions/${sessionId}/logs`);
    return res.data as SessionLog[];
  }

  async getSessionRecording(sessionId: string): Promise<SessionRecordingEvent[]> {
    let res = await this.http.get(`/sessions/${sessionId}/recording`);
    return res.data as SessionRecordingEvent[];
  }

  // ── Contexts ──────────────────────────────────────────────────────

  async createContext(projectId: string): Promise<ContextCreateResponse> {
    let res = await this.http.post('/contexts', { projectId });
    return this.mapContextCreateResponse(res.data);
  }

  async getContext(contextId: string): Promise<Context> {
    let res = await this.http.get(`/contexts/${contextId}`);
    return this.mapContext(res.data);
  }

  async deleteContext(contextId: string): Promise<void> {
    await this.http.delete(`/contexts/${contextId}`);
  }

  // ── Extensions ────────────────────────────────────────────────────

  async getExtension(extensionId: string): Promise<Extension> {
    let res = await this.http.get(`/extensions/${extensionId}`);
    return this.mapExtension(res.data);
  }

  async deleteExtension(extensionId: string): Promise<void> {
    await this.http.delete(`/extensions/${extensionId}`);
  }

  // ── Projects ──────────────────────────────────────────────────────

  async listProjects(): Promise<Project[]> {
    let res = await this.http.get('/projects');
    return (res.data as unknown[]).map((p: unknown) => this.mapProject(p));
  }

  async getProject(projectId: string): Promise<Project> {
    let res = await this.http.get(`/projects/${projectId}`);
    return this.mapProject(res.data);
  }

  async getProjectUsage(projectId: string): Promise<ProjectUsage> {
    let res = await this.http.get(`/projects/${projectId}/usage`);
    return res.data as ProjectUsage;
  }

  // ── Fetch ─────────────────────────────────────────────────────────

  async fetchPage(params: FetchPageParams): Promise<FetchPageResponse> {
    let res = await this.http.post('/fetch', params);
    let d = res.data as Record<string, unknown>;
    return {
      fetchId: d.id as string,
      statusCode: d.statusCode as number,
      headers: d.headers as Record<string, string>,
      content: d.content as string,
      contentType: d.contentType as string,
      encoding: d.encoding as string
    };
  }

  // ── Mappers ───────────────────────────────────────────────────────

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
}
