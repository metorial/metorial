import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://api.agentql.com';

export interface QueryDataParams {
  query?: string;
  prompt?: string;
  url?: string;
  html?: string;
  params?: {
    waitFor?: number;
    isScrollToBottomEnabled?: boolean;
    mode?: 'fast' | 'standard';
    isScreenshotEnabled?: boolean;
    browserProfile?: 'light' | 'stealth' | 'tf-browser';
    proxy?: TetraProxy | CustomProxy;
  };
}

export interface TetraProxy {
  type: 'tetra';
  countryCode?: string;
}

export interface CustomProxy {
  type: 'custom';
  url: string;
  username?: string;
  password?: string;
}

export interface QueryDataResponse {
  data: Record<string, unknown>;
  metadata?: {
    request_id?: string;
    generated_query?: string | null;
    screenshot?: string | null;
  } | null;
}

export interface QueryDocumentParams {
  query?: string;
  prompt?: string;
  mode?: 'fast' | 'standard';
}

export interface QueryDocumentResponse {
  data: Record<string, unknown>;
  metadata: {
    request_id: string;
  };
}

export interface CreateSessionParams {
  browserUaPreset?: 'windows' | 'macos' | 'linux';
  browserProfile?: 'light' | 'stealth' | 'tf-browser';
  shutdownMode?: 'on_disconnect' | 'on_inactivity_timeout';
  inactivityTimeoutSeconds?: number;
  sessionMaxDurationSeconds?: number;
  browserStartupUrl?: string;
  subUserId?: string;
  proxy?: TetraProxy | CustomProxy;
}

export interface CreateSessionResponse {
  session_id: string;
  cdp_url: string;
  base_url: string;
}

export interface UsageResponse {
  data: {
    api_key_usage: {
      current_cycle?: number | null;
      lifetime: number;
    };
    total_account_usage: {
      current_cycle?: number | null;
      lifetime: number;
    };
    current_subscription?: {
      lifetime_usage_limit: number | null;
      current_cycle_free_usage_limit: number | null;
      current_cycle_start: string;
      current_cycle_end: string;
    } | null;
  };
  metadata: {
    request_id: string;
  };
}

export interface SessionUsageParams {
  subUserId?: string;
  sessionId?: string;
  startAfter?: string;
  endBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  status?: 'running' | 'ended';
  sort?: 'created_at_desc' | 'updated_at_asc';
  limit?: number;
  page?: number;
}

export interface SessionUsageResponse {
  items: {
    session_id: string;
    user_id: string | null;
    sub_user_id: string | null;
    request_origin: string | null;
    base_url: string | null;
    cdp_url: string | null;
    mode: 'light' | 'stealth' | 'tf-browser' | null;
    start_time: string | null;
    end_time: string | null;
    duration_ms: number | null;
    proxy_trg_rx_bytes: number | null;
    proxy_trg_tx_bytes: number | null;
    status: 'running' | 'ended' | null;
    created_at: string;
    updated_at: string;
  }[];
  total: number;
  limit: number;
  page: number;
  total_pages: number;
  has_more: boolean;
}

let validateExtractionInput = (params: { query?: string; prompt?: string }) => {
  if (Boolean(params.query?.trim()) === Boolean(params.prompt?.trim())) {
    throw createApiServiceError('Provide exactly one non-empty query or prompt.');
  }
  if (
    (params.query !== undefined && !params.query.trim()) ||
    (params.prompt !== undefined && !params.prompt.trim())
  ) {
    throw createApiServiceError('query and prompt cannot be empty when provided.');
  }
};

let buildProxyPayload = (proxy?: TetraProxy | CustomProxy) => {
  if (!proxy) return undefined;
  if (proxy.type === 'tetra') {
    return {
      type: 'tetra',
      country_code: proxy.countryCode ?? 'US'
    };
  }
  return {
    type: 'custom',
    url: proxy.url,
    username: proxy.username ?? null,
    password: proxy.password ?? null
  };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'An AgentQL API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'X-API-Key', value: config.token },
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'AgentQL',
          reason: 'agentql_api_error',
          detailKeys: ['error_info', 'message', 'detail', 'msg', 'error'],
          nestedKeys: ['detail', 'errors'],
          extractResponse: (failure, helpers) => {
            let response = helpers.getResponse(failure);
            if (
              helpers.isRecord(failure) &&
              failure.name === 'SlateError' &&
              helpers.isRecord(failure.data) &&
              helpers.isRecord(failure.data.baggage) &&
              failure.data.baggage.response !== undefined
            ) {
              return { ...response, data: failure.data.baggage.response };
            }
            return response;
          },
          extractUpstreamCode: (_failure, response, helpers) => {
            let data = response?.data;
            if (
              helpers.isRecord(data) &&
              (typeof data.status_code === 'number' || typeof data.status_code === 'string')
            ) {
              return String(data.status_code);
            }
            return undefined;
          }
        })
    });
  }

  async queryData(params: QueryDataParams): Promise<QueryDataResponse> {
    validateExtractionInput(params);
    if (Boolean(params.url?.trim()) === Boolean(params.html?.trim())) {
      throw createApiServiceError('Provide exactly one non-empty url or html value.');
    }
    if (
      (params.url !== undefined && !params.url.trim()) ||
      (params.html !== undefined && !params.html.trim())
    ) {
      throw createApiServiceError('url and html cannot be empty when provided.');
    }
    let waitFor = params.params?.waitFor;
    if (waitFor !== undefined && (!Number.isInteger(waitFor) || waitFor < 0 || waitFor > 10)) {
      throw createApiServiceError('waitFor must be a whole number from 0 to 10 seconds.');
    }
    let body: Record<string, unknown> = {};

    if (params.query) body.query = params.query;
    if (params.prompt) body.prompt = params.prompt;
    if (params.url) body.url = params.url;
    if (params.html) body.html = params.html;

    if (params.params) {
      let p: Record<string, unknown> = {};
      if (params.params.waitFor !== undefined) p.wait_for = params.params.waitFor;
      if (params.params.isScrollToBottomEnabled !== undefined)
        p.is_scroll_to_bottom_enabled = params.params.isScrollToBottomEnabled;
      if (params.params.mode) p.mode = params.params.mode;
      if (params.params.isScreenshotEnabled !== undefined)
        p.is_screenshot_enabled = params.params.isScreenshotEnabled;
      if (params.params.browserProfile) p.browser_profile = params.params.browserProfile;
      if (params.params.proxy) p.proxy = buildProxyPayload(params.params.proxy);
      body.params = p;
    }

    let response = await this.axios.post<QueryDataResponse>('/v1/query-data', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async queryDocument(
    file: Uint8Array,
    fileName: string,
    params: QueryDocumentParams
  ): Promise<QueryDocumentResponse> {
    validateExtractionInput(params);
    if (!file.byteLength) {
      throw createApiServiceError('Provide a non-empty PDF, JPEG, JPG, or PNG file.');
    }
    let extension = fileName.split('.').pop()?.toLowerCase();
    let mimeType =
      extension === 'pdf'
        ? 'application/pdf'
        : extension === 'png'
          ? 'image/png'
          : ['jpg', 'jpeg'].includes(extension ?? '')
            ? 'image/jpeg'
            : undefined;
    if (!mimeType) {
      throw createApiServiceError('fileName must use a PDF, JPEG, JPG, or PNG extension.');
    }
    let bodyObj: Record<string, unknown> = {};
    if (params.query) bodyObj.query = params.query;
    if (params.prompt) bodyObj.prompt = params.prompt;
    if (params.mode) {
      bodyObj.params = { mode: params.mode };
    }

    let form = new FormData();
    let blob = new Blob([new Uint8Array(file)], { type: mimeType });
    form.append('file', blob, fileName);
    form.append('body', JSON.stringify(bodyObj));

    let response = await this.axios.post<QueryDocumentResponse>('/v1/query-document', form);
    return response.data;
  }

  async createSession(params?: CreateSessionParams): Promise<CreateSessionResponse> {
    let body: Record<string, unknown> = {};

    if (params) {
      let timeout = params.inactivityTimeoutSeconds;
      if (
        timeout !== undefined &&
        (!Number.isInteger(timeout) || timeout < 5 || timeout > 86400)
      ) {
        throw createApiServiceError(
          'inactivityTimeoutSeconds must be a whole number from 5 to 86400.'
        );
      }
      if (params.browserUaPreset) body.browser_ua_preset = params.browserUaPreset;
      if (params.browserProfile) body.browser_profile = params.browserProfile;
      if (params.shutdownMode) body.shutdown_mode = params.shutdownMode;
      if (params.inactivityTimeoutSeconds !== undefined)
        body.inactivity_timeout_seconds = params.inactivityTimeoutSeconds;
      if (params.sessionMaxDurationSeconds !== undefined)
        body.session_max_duration_seconds = params.sessionMaxDurationSeconds;
      if (params.browserStartupUrl !== undefined)
        body.browser_startup_url = params.browserStartupUrl;
      if (params.subUserId !== undefined) body.sub_user_id = params.subUserId;
      if (params.proxy) body.proxy = buildProxyPayload(params.proxy);
    }

    let response = await this.axios.post<CreateSessionResponse>('/v1/tetra/sessions', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async listSessionUsage(params: SessionUsageParams): Promise<SessionUsageResponse> {
    let response = await this.axios.get<SessionUsageResponse>('/v1/tetra/usage', {
      params: {
        sub_user_id: params.subUserId,
        session_id: params.sessionId,
        start_after: params.startAfter,
        end_before: params.endBefore,
        updated_after: params.updatedAfter,
        updated_before: params.updatedBefore,
        status: params.status,
        sort: params.sort,
        limit: params.limit,
        page: params.page
      }
    });
    return response.data;
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await this.axios.get<UsageResponse>('/v1/usage');
    return response.data;
  }
}
