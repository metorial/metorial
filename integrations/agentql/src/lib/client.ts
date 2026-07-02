import { createAxios } from 'slates';

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
    browserProfile?: 'light' | 'stealth';
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
  metadata: {
    request_id: string;
    generated_query?: string | null;
    screenshot?: string | null;
  };
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
  browserProfile?: 'light' | 'stealth';
  shutdownMode?: 'on_disconnect' | 'on_inactivity_timeout';
  inactivityTimeoutSeconds?: number;
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
      current_cycle: number | null;
      lifetime: number;
    };
    total_account_usage: {
      current_cycle: number | null;
      lifetime: number;
    };
    current_subscription: {
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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-Key': config.token
      }
    });
  }

  async queryData(params: QueryDataParams): Promise<QueryDataResponse> {
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
    let bodyObj: Record<string, unknown> = {};
    if (params.query) bodyObj.query = params.query;
    if (params.prompt) bodyObj.prompt = params.prompt;
    if (params.mode) {
      bodyObj.params = { mode: params.mode };
    }

    let form = new FormData();
    let blob = new Blob([file], { type: 'application/octet-stream' });
    form.append('file', blob, fileName);
    form.append('body', JSON.stringify(bodyObj));

    let response = await this.axios.post<QueryDocumentResponse>('/v1/query-document', form);
    return response.data;
  }

  async createSession(params?: CreateSessionParams): Promise<CreateSessionResponse> {
    let body: Record<string, unknown> = {};

    if (params) {
      if (params.browserUaPreset) body.browser_ua_preset = params.browserUaPreset;
      if (params.browserProfile) body.browser_profile = params.browserProfile;
      if (params.shutdownMode) body.shutdown_mode = params.shutdownMode;
      if (params.inactivityTimeoutSeconds !== undefined)
        body.inactivity_timeout_seconds = params.inactivityTimeoutSeconds;
      if (params.proxy) body.proxy = buildProxyPayload(params.proxy);
    }

    let response = await this.axios.post<CreateSessionResponse>('/v1/tetra/sessions', body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getUsage(): Promise<UsageResponse> {
    let response = await this.axios.get<UsageResponse>('/v1/usage');
    return response.data;
  }
}
