import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export type BrowserAgentType = 'browser_use' | 'claude_computer_use' | 'openai_cua';

let BASE_URL = 'https://api.hyperbrowser.ai';

export class HyperbrowserClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Hyperbrowser API key is required. Reconnect your account.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 60_000,
      authHeader: { name: 'x-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Hyperbrowser',
          reason: 'hyperbrowser_api_error'
        })
    });
  }

  // ── Sessions ──────────────────────────────────────────

  async createSession(params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/session', this.normalizeSessionOptions(params));
    return response.data;
  }

  async getSession(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/session/${encodeURIComponent(sessionId)}`);
    return response.data;
  }

  async stopSession(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/api/session/${encodeURIComponent(sessionId)}/stop`);
    return response.data;
  }

  async listSessions(
    params: { page?: number; perPage?: number; status?: string } = {}
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/sessions', { params });
    return response.data;
  }

  async getSessionRecordingUrl(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/session/${encodeURIComponent(sessionId)}/recording-url`
    );
    return response.data;
  }

  async getSessionVideoRecordingUrl(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/session/${encodeURIComponent(sessionId)}/video-recording-url`
    );
    return response.data;
  }

  async getSessionDownloadsUrl(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/session/${encodeURIComponent(sessionId)}/downloads-url`
    );
    return response.data;
  }

  // ── Scrape ────────────────────────────────────────────

  async startScrapeJob(params: Record<string, unknown>): Promise<{ jobId: string }> {
    let response = await this.axios.post('/api/scrape', this.normalizeJobParams(params));
    return response.data;
  }

  async getScrapeJobStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/scrape/${encodeURIComponent(jobId)}/status`);
    return response.data;
  }

  async getScrapeJobResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/scrape/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  async startBatchScrapeJob(params: Record<string, unknown>): Promise<{ jobId: string }> {
    let response = await this.axios.post('/api/scrape/batch', this.normalizeJobParams(params));
    return response.data;
  }

  async getBatchScrapeJobStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(
      `/api/scrape/batch/${encodeURIComponent(jobId)}/status`
    );
    return response.data;
  }

  async getBatchScrapeJobResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/scrape/batch/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  // ── Crawl ─────────────────────────────────────────────

  async startCrawlJob(params: Record<string, unknown>): Promise<{ jobId: string }> {
    let response = await this.axios.post('/api/crawl', this.normalizeJobParams(params));
    return response.data;
  }

  async getCrawlJobStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/crawl/${encodeURIComponent(jobId)}/status`);
    return response.data;
  }

  async getCrawlJobResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/crawl/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  // ── Extract ───────────────────────────────────────────

  async startExtractJob(params: Record<string, unknown>): Promise<{ jobId: string }> {
    let response = await this.axios.post('/api/extract', this.normalizeJobParams(params));
    return response.data;
  }

  async getExtractJobStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/extract/${encodeURIComponent(jobId)}/status`);
    return response.data;
  }

  async getExtractJobResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/extract/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  // ── Web Search ────────────────────────────────────────

  async webSearch(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/web/search', params);
    return response.data;
  }

  // ── Profiles ──────────────────────────────────────────

  async createProfile(params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/profile', params);
    return response.data;
  }

  async getProfile(profileId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/profile/${encodeURIComponent(profileId)}`);
    return response.data;
  }

  async deleteProfile(profileId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/api/profile/${encodeURIComponent(profileId)}`);
    return response.data;
  }

  async listProfiles(
    params: { page?: number; limit?: number; name?: string } = {}
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/profiles', { params });
    return response.data;
  }

  // ── Agent Tasks ───────────────────────────────────────

  async startBrowserUseTask(
    params: Record<string, unknown>
  ): Promise<{ jobId: string; liveUrl?: string }> {
    let response = await this.axios.post(
      '/api/task/browser-use',
      this.normalizeJobParams(params)
    );
    return response.data;
  }

  async getBrowserUseTaskStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(
      `/api/task/browser-use/${encodeURIComponent(jobId)}/status`
    );
    return response.data;
  }

  async getBrowserUseTaskResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/task/browser-use/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  async stopBrowserUseTask(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/api/task/browser-use/${encodeURIComponent(jobId)}/stop`
    );
    return response.data;
  }

  async startClaudeComputerUseTask(
    params: Record<string, unknown>
  ): Promise<{ jobId: string; liveUrl?: string }> {
    let response = await this.axios.post(
      '/api/task/claude-computer-use',
      this.normalizeJobParams(params)
    );
    return response.data;
  }

  async getClaudeComputerUseTaskStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(
      `/api/task/claude-computer-use/${encodeURIComponent(jobId)}/status`
    );
    return response.data;
  }

  async getClaudeComputerUseTaskResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/api/task/claude-computer-use/${encodeURIComponent(jobId)}`
    );
    return response.data;
  }

  async stopClaudeComputerUseTask(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/api/task/claude-computer-use/${encodeURIComponent(jobId)}/stop`
    );
    return response.data;
  }

  async startCuaTask(
    params: Record<string, unknown>
  ): Promise<{ jobId: string; liveUrl?: string }> {
    let response = await this.axios.post('/api/task/cua', this.normalizeJobParams(params));
    return response.data;
  }

  async getCuaTaskStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/task/cua/${encodeURIComponent(jobId)}/status`);
    return response.data;
  }

  async getCuaTaskResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/task/cua/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  async stopCuaTask(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/api/task/cua/${encodeURIComponent(jobId)}/stop`);
    return response.data;
  }

  async getBrowserAgentTask(agentType: BrowserAgentType, jobId: string) {
    if (agentType === 'claude_computer_use') return this.getClaudeComputerUseTaskResult(jobId);
    if (agentType === 'openai_cua') return this.getCuaTaskResult(jobId);
    return this.getBrowserUseTaskResult(jobId);
  }

  async stopBrowserAgentTask(agentType: BrowserAgentType, jobId: string) {
    let result =
      agentType === 'claude_computer_use'
        ? await this.stopClaudeComputerUseTask(jobId)
        : agentType === 'openai_cua'
          ? await this.stopCuaTask(jobId)
          : await this.stopBrowserUseTask(jobId);
    if (result.success !== true) {
      throw createApiServiceError('Hyperbrowser did not confirm that the agent task stopped.');
    }
    return result;
  }

  private normalizeSessionOptions(params: Record<string, unknown>) {
    let normalized = { ...params };
    for (let key of ['device', 'platform']) {
      if (typeof normalized[key] === 'string') normalized[key] = [normalized[key]];
    }
    if (normalized.enableVideoWebRecording === true) {
      if (normalized.enableWebRecording === false) {
        throw createApiServiceError('Video recording requires enableWebRecording to be true.');
      }
      normalized.enableWebRecording = true;
    }
    return normalized;
  }

  private normalizeJobParams(params: Record<string, unknown>) {
    return {
      ...params,
      ...(params.sessionOptions
        ? {
            sessionOptions: this.normalizeSessionOptions(
              params.sessionOptions as Record<string, unknown>
            )
          }
        : {})
    };
  }

  // ── Polling Utility ───────────────────────────────────

  async pollForCompletion(
    getStatus: () => Promise<{ status: string }>,
    getResult: () => Promise<Record<string, unknown>>,
    options: { maxAttempts?: number; intervalMs?: number; jobId?: string } = {}
  ): Promise<Record<string, unknown>> {
    let maxAttempts = options.maxAttempts ?? 120;
    let intervalMs = options.intervalMs ?? 2000;

    for (let i = 0; i < maxAttempts; i++) {
      let statusResponse = await getStatus();
      let status = statusResponse.status;

      if (status === 'completed') {
        return await getResult();
      }

      if (status === 'failed') {
        let result = await getResult();
        throw createApiServiceError(
          `Hyperbrowser job${result.jobId ? ` ${result.jobId}` : ''} failed: ${typeof result.error === 'string' ? result.error : 'Unknown error'}`
        );
      }

      if (status === 'stopped') {
        let result = await getResult();
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw createApiServiceError(
      `Hyperbrowser job${options.jobId ? ` ${options.jobId}` : ''} did not complete within ${maxAttempts} polling attempts. Check its status before starting another job.`
    );
  }
}
