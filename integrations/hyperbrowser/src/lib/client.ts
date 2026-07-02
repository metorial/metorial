import { createAxios } from 'slates';

let BASE_URL = 'https://api.hyperbrowser.ai';

export class HyperbrowserClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Sessions ──────────────────────────────────────────

  async createSession(params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/api/session', params);
    return response.data;
  }

  async getSession(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/session/${sessionId}`);
    return response.data;
  }

  async stopSession(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/api/session/${sessionId}/stop`);
    return response.data;
  }

  async listSessions(
    params: { page?: number; perPage?: number } = {}
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/api/sessions', { params });
    return response.data;
  }

  async getSessionRecordingUrl(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/session/${sessionId}/recording-url`);
    return response.data;
  }

  async getSessionVideoRecordingUrl(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/session/${sessionId}/video-recording-url`);
    return response.data;
  }

  async getSessionDownloadsUrl(sessionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/session/${sessionId}/downloads-url`);
    return response.data;
  }

  // ── Scrape ────────────────────────────────────────────

  async startScrapeJob(params: Record<string, unknown>): Promise<{ jobId: string }> {
    let response = await this.axios.post('/api/scrape', params);
    return response.data;
  }

  async getScrapeJobStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/scrape/${jobId}/status`);
    return response.data;
  }

  async getScrapeJobResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/scrape/${jobId}`);
    return response.data;
  }

  async startBatchScrapeJob(params: Record<string, unknown>): Promise<{ jobId: string }> {
    let response = await this.axios.post('/api/scrape/batch', params);
    return response.data;
  }

  async getBatchScrapeJobStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/scrape/batch/${jobId}/status`);
    return response.data;
  }

  async getBatchScrapeJobResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/scrape/batch/${jobId}`);
    return response.data;
  }

  // ── Crawl ─────────────────────────────────────────────

  async startCrawlJob(params: Record<string, unknown>): Promise<{ jobId: string }> {
    let response = await this.axios.post('/api/crawl', params);
    return response.data;
  }

  async getCrawlJobStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/crawl/${jobId}/status`);
    return response.data;
  }

  async getCrawlJobResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/crawl/${jobId}`);
    return response.data;
  }

  // ── Extract ───────────────────────────────────────────

  async startExtractJob(params: Record<string, unknown>): Promise<{ jobId: string }> {
    let response = await this.axios.post('/api/extract', params);
    return response.data;
  }

  async getExtractJobStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/extract/${jobId}/status`);
    return response.data;
  }

  async getExtractJobResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/extract/${jobId}`);
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
    let response = await this.axios.get(`/api/profile/${profileId}`);
    return response.data;
  }

  async deleteProfile(profileId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/api/profile/${profileId}`);
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
    let response = await this.axios.post('/api/task/browser-use', params);
    return response.data;
  }

  async getBrowserUseTaskStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/task/browser-use/${jobId}/status`);
    return response.data;
  }

  async getBrowserUseTaskResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/task/browser-use/${jobId}`);
    return response.data;
  }

  async stopBrowserUseTask(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/api/task/browser-use/${jobId}/stop`);
    return response.data;
  }

  async startClaudeComputerUseTask(
    params: Record<string, unknown>
  ): Promise<{ jobId: string; liveUrl?: string }> {
    let response = await this.axios.post('/api/task/claude-computer-use', params);
    return response.data;
  }

  async getClaudeComputerUseTaskStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/task/claude-computer-use/${jobId}/status`);
    return response.data;
  }

  async getClaudeComputerUseTaskResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/task/claude-computer-use/${jobId}`);
    return response.data;
  }

  async stopClaudeComputerUseTask(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/api/task/claude-computer-use/${jobId}/stop`);
    return response.data;
  }

  async startCuaTask(
    params: Record<string, unknown>
  ): Promise<{ jobId: string; liveUrl?: string }> {
    let response = await this.axios.post('/api/task/cua', params);
    return response.data;
  }

  async getCuaTaskStatus(jobId: string): Promise<{ status: string }> {
    let response = await this.axios.get(`/api/task/cua/${jobId}/status`);
    return response.data;
  }

  async getCuaTaskResult(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/api/task/cua/${jobId}`);
    return response.data;
  }

  async stopCuaTask(jobId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/api/task/cua/${jobId}/stop`);
    return response.data;
  }

  // ── Polling Utility ───────────────────────────────────

  async pollForCompletion(
    getStatus: () => Promise<{ status: string }>,
    getResult: () => Promise<Record<string, unknown>>,
    options: { maxAttempts?: number; intervalMs?: number } = {}
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
        throw new Error(
          `Job failed: ${(result as Record<string, unknown>).error || 'Unknown error'}`
        );
      }

      if (status === 'stopped') {
        let result = await getResult();
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Job did not complete within ${maxAttempts} attempts`);
  }
}
