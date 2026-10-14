import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue
} from 'slates';

let BASE_URL = 'https://api.anchorbrowser.io';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'anchor-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Anchor Browser',
          reason: 'anchor_browser_api_error'
        })
    });
  }

  // =====================
  // Sessions
  // =====================

  async createSession(params?: SessionCreateParams) {
    let response = await this.axios.post('/v1/sessions', params ?? {});
    return response.data?.data as SessionCreateResponse;
  }

  async listSessions(params?: SessionListParams) {
    let response = await this.axios.get('/v1/sessions', { params });
    return response.data?.data as SessionListResponse;
  }

  async getSession(sessionId: string) {
    let response = await this.axios.get(`/v1/sessions/${encodeURIComponent(sessionId)}`);
    return response.data?.data as SessionDetails;
  }

  async getActiveSessionStatuses(params?: {
    tags?: string;
    domains?: string;
    createdFrom?: string;
    createdTo?: string;
  }) {
    let response = await this.axios.get('/v1/sessions/all/status', {
      params: {
        tags: params?.tags,
        domains: params?.domains,
        created_from: params?.createdFrom,
        created_to: params?.createdTo
      }
    });
    return response.data?.data as {
      count: number;
      items: Array<{ session_id: string; status: string; tags: string[]; created_at: string }>;
    };
  }

  async endSession(sessionId: string) {
    let response = await this.axios.delete(`/v1/sessions/${encodeURIComponent(sessionId)}`);
    return response.data;
  }

  async endAllSessions() {
    let response = await this.axios.delete('/v1/sessions/all');
    return response.data;
  }

  async getSessionPages(sessionId: string) {
    let response = await this.axios.get(`/v1/sessions/${encodeURIComponent(sessionId)}/pages`);
    return response.data?.data as {
      count: number;
      items: Array<{ id: string; title: string; url: string; frontend_url: string }>;
    };
  }

  async getSessionDownloads(sessionId: string) {
    let response = await this.axios.get(
      `/v1/sessions/${encodeURIComponent(sessionId)}/downloads`
    );
    return response.data?.data as { count: number; items: Record<string, unknown>[] };
  }

  // =====================
  // Profiles
  // =====================

  async createProfile(params: ProfileCreateParams) {
    let response = await this.axios.post('/v1/profiles', params);
    return response.data?.data as { status: string };
  }

  async listProfiles() {
    let response = await this.axios.get('/v1/profiles');
    return response.data?.data as { count: number; items: ProfileResponse[] };
  }

  async getProfile(name: string) {
    let response = await this.axios.get(`/v1/profiles/${encodeURIComponent(name)}`);
    return response.data?.data ?? response.data;
  }

  async deleteProfile(name: string) {
    let response = await this.axios.delete(`/v1/profiles/${encodeURIComponent(name)}`);
    return response.data;
  }

  // =====================
  // AI Tasks
  // =====================

  async performWebTask(params: WebTaskParams, sessionId?: string) {
    let response = await this.axios.post('/v1/tools/perform-web-task', params, {
      params: sessionId ? { sessionId } : undefined
    });
    return response.data?.data;
  }

  async getWebTaskStatus(workflowId: string) {
    let response = await this.axios.get(
      `/v1/tools/perform-web-task/${encodeURIComponent(workflowId)}/status`
    );
    return response.data?.data as { status: string; result?: unknown; error?: string };
  }

  // =====================
  // Web Content Tools
  // =====================

  async fetchWebpage(params: FetchWebpageParams, sessionId?: string) {
    let response = await this.axios.post('/v1/tools/fetch-webpage', params, {
      params: sessionId ? { sessionId } : undefined
    });
    return response.data?.data as { content: string };
  }

  async screenshotWebpage(params: ScreenshotParams, sessionId?: string) {
    let response = await this.axios.post('/v1/tools/screenshot', params, {
      params: sessionId ? { sessionId } : undefined,
      responseType: 'arraybuffer'
    });
    let bytes = new Uint8Array(response.data);
    let mimeType = getResponseHeaderValue(response.headers, 'content-type')?.split(';')[0];
    if (
      mimeType !== 'image/png' ||
      bytes.length < 8 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
    ) {
      throw createApiServiceError('Anchor Browser did not return a valid PNG screenshot.');
    }
    return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
  }

  async pageToPdf(params: PdfParams, sessionId?: string) {
    let response = await this.axios.post('/v1/tools/page-pdf', params, {
      params: sessionId ? { sessionId } : undefined,
      responseType: 'arraybuffer'
    });
    let bytes = new Uint8Array(response.data);
    let mimeType = getResponseHeaderValue(response.headers, 'content-type')?.split(';')[0];
    if (
      mimeType !== 'application/pdf' ||
      new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-'
    ) {
      throw createApiServiceError('Anchor Browser did not return a valid PDF.');
    }
    return new Response(bytes, { headers: { 'Content-Type': 'application/pdf' } });
  }

  // =====================
  // OS-Level Controls
  // =====================

  async mouseClick(
    sessionId: string,
    params: {
      x?: number;
      y?: number;
      button?: string;
      selector?: string;
      timeout?: number;
      index?: number;
    }
  ) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/mouse/click`,
      params
    );
    return response.data;
  }

  async mouseDoubleClick(
    sessionId: string,
    params: { x?: number; y?: number; button?: string }
  ) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/mouse/doubleClick`,
      params
    );
    return response.data;
  }

  async dragDrop(
    sessionId: string,
    params: { startX: number; startY: number; endX: number; endY: number; button?: string }
  ) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/drag-and-drop`,
      params
    );
    return response.data;
  }

  async scroll(
    sessionId: string,
    params: {
      x?: number;
      y?: number;
      deltaX?: number;
      deltaY: number;
      steps?: number;
      useOs?: boolean;
    }
  ) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/scroll`,
      params
    );
    return response.data;
  }

  async typeText(sessionId: string, params: { text: string; delay?: number }) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/keyboard/type`,
      params
    );
    return response.data;
  }

  async keyboardShortcut(sessionId: string, params: { keys: string[]; holdTime?: number }) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/keyboard/shortcut`,
      params
    );
    return response.data;
  }

  async navigate(sessionId: string, params: { url: string }) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/goto`,
      params
    );
    return response.data;
  }

  async setClipboard(sessionId: string, params: { text: string }) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/clipboard`,
      params
    );
    return response.data;
  }

  async getClipboard(sessionId: string) {
    let response = await this.axios.get(
      `/v1/sessions/${encodeURIComponent(sessionId)}/clipboard`
    );
    return response.data?.data as { text: string };
  }

  async takeScreenshot(sessionId: string) {
    let response = await this.axios.get(
      `/v1/sessions/${encodeURIComponent(sessionId)}/screenshot`,
      {
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  }

  // =====================
  // Extensions
  // =====================

  async listExtensions() {
    let response = await this.axios.get('/v1/extensions');
    return response.data?.data as ExtensionResponse[];
  }

  async getExtension(extensionId: string) {
    let response = await this.axios.get(`/v1/extensions/${encodeURIComponent(extensionId)}`);
    return response.data?.data as ExtensionResponse;
  }

  async deleteExtension(extensionId: string) {
    let response = await this.axios.delete(
      `/v1/extensions/${encodeURIComponent(extensionId)}`
    );
    return response.data;
  }

  // =====================
  // Batch Sessions
  // =====================

  async createBatch(params: BatchCreateParams) {
    let response = await this.axios.post('/v1/batch-sessions', params);
    return response.data as BatchCreateResponse;
  }

  async listBatches(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    let response = await this.axios.get('/v1/batch-sessions', {
      params: {
        page: params?.page,
        limit: params?.limit,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder
      }
    });
    return response.data as BatchListResponse;
  }

  async getBatch(batchId: string) {
    let response = await this.axios.get(`/v1/batch-sessions/${encodeURIComponent(batchId)}`);
    return response.data as BatchStatusResponse;
  }

  async cancelBatch(batchId: string) {
    let response = await this.axios.patch(
      `/v1/batch-sessions/${encodeURIComponent(batchId)}`,
      {
        status: 'cancelled'
      }
    );
    return response.data;
  }

  async deleteBatch(batchId: string) {
    let response = await this.axios.delete(
      `/v1/batch-sessions/${encodeURIComponent(batchId)}`
    );
    return response.data;
  }

  async retryBatch(
    batchId: string,
    params?: { retryFailedOnly?: boolean; maxRetries?: number }
  ) {
    let response = await this.axios.post(
      `/v1/batch-sessions/${encodeURIComponent(batchId)}/retry`,
      {
        retry_failed_only: params?.retryFailedOnly ?? true,
        max_retries: params?.maxRetries ?? 1
      }
    );
    return response.data;
  }

  // =====================
  // Event Coordination
  // =====================

  async signalEvent(sessionId: string, eventName: string, data: Record<string, unknown>) {
    let response = await this.axios.post(
      `/v1/tools/signal-event/${encodeURIComponent(eventName)}`,
      { data },
      { params: { sessionId } }
    );
    return response.data;
  }

  async waitForEvent(sessionId: string, eventName: string, timeoutMs?: number) {
    let response = await this.axios.get(
      `/v1/tools/wait-for-event/${encodeURIComponent(eventName)}`,
      {
        params: { sessionId },
        data: timeoutMs ? { timeoutMs } : undefined
      }
    );
    return response.data?.data;
  }

  // =====================
  // Recordings
  // =====================

  async listRecordings(sessionId: string) {
    let response = await this.axios.get(
      `/v1/sessions/${encodeURIComponent(sessionId)}/recordings`
    );
    return response.data?.data as { count: number; items: RecordingItem[] };
  }

  async pauseRecording(sessionId: string) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/recordings/pause`
    );
    return response.data?.data as { status: string };
  }

  async resumeRecording(sessionId: string) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/recordings/resume`
    );
    return response.data?.data as { status: string };
  }

  // =====================
  // Applications
  // =====================

  async createApplication(params: { source: string; name?: string; description?: string }) {
    let response = await this.axios.post('/v1/applications', params);
    return response.data;
  }

  async listApplications() {
    let response = await this.axios.get('/v1/applications');
    return response.data as { applications: ApplicationResponse[] };
  }

  async getApplication(applicationId: string) {
    let response = await this.axios.get(
      `/v1/applications/${encodeURIComponent(applicationId)}`
    );
    return response.data;
  }

  async updateApplication(applicationId: string, params: { allowedDomains?: string[] }) {
    let response = await this.axios.patch(
      `/v1/applications/${encodeURIComponent(applicationId)}`,
      {
        allowed_domains: params.allowedDomains
      }
    );
    return response.data;
  }

  async deleteApplication(applicationId: string) {
    let response = await this.axios.delete(
      `/v1/applications/${encodeURIComponent(applicationId)}`
    );
    return response.data;
  }

  async listApplicationIdentities(applicationId: string) {
    let response = await this.axios.get(
      `/v1/applications/${encodeURIComponent(applicationId)}/identities`
    );
    return response.data;
  }

  async listAuthFlows(applicationId: string) {
    let response = await this.axios.get(
      `/v1/applications/${encodeURIComponent(applicationId)}/auth-flows`
    );
    return response.data;
  }

  async createAuthFlow(
    applicationId: string,
    params: {
      name: string;
      description?: string;
      isRecommended?: boolean;
      methods?: string[];
      customFields?: Record<string, unknown>[];
    }
  ) {
    let response = await this.axios.post(
      `/v1/applications/${encodeURIComponent(applicationId)}/auth-flows`,
      {
        name: params.name,
        description: params.description,
        is_recommended: params.isRecommended,
        methods: params.methods,
        custom_fields: params.customFields
      }
    );
    return response.data;
  }

  async deleteAuthFlow(applicationId: string, authFlowId: string) {
    let response = await this.axios.delete(
      `/v1/applications/${encodeURIComponent(applicationId)}/auth-flows/${encodeURIComponent(authFlowId)}`
    );
    return response.data;
  }

  // =====================
  // Identities
  // =====================

  async createIdentity(params: IdentityCreateParams) {
    let response = await this.axios.post('/v1/identities', params);
    return response.data;
  }

  async listIdentities(params?: { page?: number; limit?: number }) {
    let response = await this.axios.get('/v1/identities', { params });
    return response.data;
  }

  async getIdentity(identityId: string) {
    let response = await this.axios.get(`/v1/identities/${encodeURIComponent(identityId)}`);
    return response.data;
  }

  async updateIdentity(
    identityId: string,
    params: {
      name?: string;
      metadata?: Record<string, unknown>;
      credentials?: Record<string, unknown>[];
    }
  ) {
    let response = await this.axios.put(
      `/v1/identities/${encodeURIComponent(identityId)}`,
      params
    );
    return response.data;
  }

  async deleteIdentity(identityId: string) {
    let response = await this.axios.delete(`/v1/identities/${encodeURIComponent(identityId)}`);
    return response.data;
  }

  async getIdentityCredentials(identityId: string) {
    let response = await this.axios.get(
      `/v1/identities/${encodeURIComponent(identityId)}/credentials`
    );
    return response.data;
  }

  // =====================
  // Integrations
  // =====================

  async createIntegration(params: {
    name: string;
    type: string;
    credentials: Record<string, unknown>;
  }) {
    let response = await this.axios.post('/v1/integrations', params);
    return response.data?.data as { integration: IntegrationResponse };
  }

  async listIntegrations() {
    let response = await this.axios.get('/v1/integrations');
    return response.data?.data as { integrations: IntegrationResponse[] };
  }

  async deleteIntegration(integrationId: string) {
    let response = await this.axios.delete(
      `/v1/integrations/${encodeURIComponent(integrationId)}`
    );
    return response.data;
  }

  // =====================
  // Agent Resources
  // =====================

  async listAgentFiles(sessionId: string) {
    let response = await this.axios.get(
      `/v1/sessions/${encodeURIComponent(sessionId)}/agent/files`
    );
    return response.data?.data as {
      files: Array<{ name: string; size: number; type: string; lastModified: string }>;
    };
  }

  async pauseAgent(sessionId: string) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/agent/pause`
    );
    return response.data;
  }

  async resumeAgent(sessionId: string) {
    let response = await this.axios.post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/agent/resume`
    );
    return response.data;
  }
}

// =====================
// Type Definitions
// =====================

export interface SessionCreateParams {
  session?: {
    initial_url?: string;
    tags?: string[];
    recording?: { active?: boolean };
    proxy?: Record<string, unknown>;
    timeout?: { max_duration?: number; idle_timeout?: number };
    live_view?: { read_only?: boolean };
  };
  browser?: {
    profile?: { name?: string; persist?: boolean };
    adblock?: { active?: boolean };
    popup_blocker?: { active?: boolean };
    captcha_solver?: { active?: boolean };
    headless?: { active?: boolean };
    viewport?: { width?: number; height?: number };
    extensions?: string[];
    extra_stealth?: { active?: boolean };
    disable_web_security?: { active?: boolean };
  };
  integrations?: Record<string, unknown>[];
  identities?: Array<{ id: string }>;
}

export interface SessionCreateResponse {
  id: string;
  cdp_url: string;
  live_view_url: string;
}

export interface SessionListParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  status?: string;
  tags?: string;
  domains?: string;
  created_from?: string;
  created_to?: string;
}

export interface SessionListResponse {
  sessions: SessionListItem[];
  total: number;
  page: number;
  total_pages: number;
}

export interface SessionListItem {
  id: string;
  status: string;
  tags: string[];
  headless: boolean;
  recording: boolean;
  used_credits: number;
  proxy_bytes: number;
  proxy_type: string;
  steps: number;
  duration: number;
  created_at: string;
  domains: string[];
  task_initiated: boolean;
}

export interface SessionDetails {
  session_id: string;
  team_id: string;
  duration: number;
  status: string;
  credits_used: number;
  configuration: Record<string, unknown>;
  proxy_bytes: number;
  tokens: number | Record<string, unknown>;
  steps: number;
  tags: string[];
  created_at: string;
}

export interface ProfileCreateParams {
  name: string;
  description?: string;
  source?: string;
  session_id?: string;
  dedicated_sticky_ip?: boolean;
}

export interface ProfileResponse {
  name: string;
  description: string;
  source: string;
  session_id: string;
  status: string;
  created_at: string;
}

export interface WebTaskParams {
  prompt: string;
  url?: string;
  agent?: string;
  provider?: string;
  model?: string;
  detect_elements?: boolean;
  human_intervention?: boolean;
  max_steps?: number;
  secret_values?: Record<string, string>;
  highlight_elements?: boolean;
  output_schema?: Record<string, unknown>;
  async?: boolean;
}

export interface FetchWebpageParams {
  url: string;
  format?: string;
  wait?: number;
  new_page?: boolean;
  page_index?: number;
  return_partial_on_timeout?: boolean;
}

export interface ScreenshotParams {
  url?: string;
  width?: number;
  height?: number;
  image_quality?: number;
  wait?: number;
  scroll_all_content?: boolean;
  capture_full_height?: boolean;
  s3_target_address?: string;
}

export interface PdfParams {
  url: string;
  landscape?: boolean;
  displayHeaderFooter?: boolean;
  printBackground?: boolean;
  scale?: number;
  paperWidth?: number;
  paperHeight?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  pageRanges?: string;
  headerTemplate?: string;
  footerTemplate?: string;
  preferCSSPageSize?: boolean;
}

export interface ExtensionResponse {
  id: string;
  name: string;
  manifest: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BatchCreateParams {
  count: number;
  configuration?: SessionCreateParams;
  metadata?: Record<string, unknown>;
}

export interface BatchCreateResponse {
  batch_id: string;
  status: string;
  total_requests: number;
  created_at: string;
}

export interface BatchListResponse {
  batches: Array<{
    batch_id: string;
    status: string;
    total_requests: number;
    completed_requests: number;
    failed_requests: number;
    created_at: string;
  }>;
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export interface BatchStatusResponse {
  batch_id: string;
  status: string;
  total_requests: number;
  completed_requests: number;
  failed_requests: number;
  processing_requests: number;
  pending_requests: number;
  created_at: string;
  actual_completion_time: string;
  sessions: Array<{
    item_index: number;
    session_id: string;
    status: string;
    cdp_url: string;
    live_view_url: string;
    error: string;
    retry_count: number;
    started_at: string;
    completed_at: string;
    metadata: Record<string, unknown>;
  }>;
  progress: { percentage: number; current_phase: string };
}

export interface RecordingItem {
  id: string;
  is_primary: boolean;
  file_link: string;
  suggested_file_name: string;
  duration: number;
  size: number;
  created_at: string;
}

export interface ApplicationResponse {
  id: string;
  name: string;
  url: string;
  description: string;
  identity_count: number;
  auth_methods: string[];
  allowed_domains: string[];
  created_at: string;
  updated_at: string;
}

export interface IdentityCreateParams {
  name?: string;
  source: string;
  credentials?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  applicationName?: string;
  applicationDescription?: string;
}

export interface IntegrationResponse {
  id: string;
  name: string;
  type: string;
  path: string;
  createdAt: string;
}
