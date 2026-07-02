export interface Session {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string;
  status: 'RUNNING' | 'ERROR' | 'TIMED_OUT' | 'COMPLETED';
  proxyBytes: number;
  keepAlive: boolean;
  contextId: string | null;
  region: string;
  userMetadata: Record<string, string> | null;
  connectUrl?: string;
  seleniumRemoteUrl?: string;
  signingKey?: string;
}

export interface CreateSessionParams {
  projectId: string;
  extensionId?: string;
  keepAlive?: boolean;
  region?: 'us-west-2' | 'us-east-1' | 'eu-central-1' | 'ap-southeast-1';
  timeout?: number;
  userMetadata?: Record<string, string>;
  proxies?: boolean | ProxyConfig[];
  browserSettings?: BrowserSettings;
}

export interface BrowserSettings {
  context?: {
    id: string;
    persist?: boolean;
  };
  viewport?: {
    width: number;
    height: number;
  };
  blockAds?: boolean;
  solveCaptchas?: boolean;
  recordSession?: boolean;
  logSession?: boolean;
  advancedStealth?: boolean;
  captchaImageSelector?: string;
  captchaInputSelector?: string;
  os?: 'windows' | 'mac' | 'linux' | 'mobile' | 'tablet';
}

export interface BrowserbaseProxy {
  type: 'browserbase';
  domainPattern?: string;
  geolocation?: {
    country: string;
    city?: string;
    state?: string;
  };
}

export interface ExternalProxy {
  type: 'external';
  server: string;
  domainPattern?: string;
  username?: string;
  password?: string;
}

export interface NoneProxy {
  type: 'none';
  domainPattern?: string;
}

export type ProxyConfig = BrowserbaseProxy | ExternalProxy | NoneProxy;

export interface SessionDebugUrls {
  debuggerFullscreenUrl: string;
  debuggerUrl: string;
  wsUrl: string;
  pages: SessionPage[];
}

export interface SessionPage {
  id: string;
  url: string;
  faviconUrl: string;
  title: string;
  debuggerUrl: string;
  debuggerFullscreenUrl: string;
}

export interface SessionLog {
  method: string;
  pageId: number;
  sessionId: string;
  timestamp: number;
  frameId?: string;
  loaderId?: string;
  request: {
    timestamp: number;
    params: Record<string, unknown>;
    rawBody: string;
  };
  response: {
    timestamp: number;
    result: Record<string, unknown>;
    rawBody: string;
  };
}

export interface SessionRecordingEvent {
  data: Record<string, unknown>;
  sessionId: string;
  timestamp: number;
  type: number;
}

export interface Context {
  contextId: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

export interface ContextCreateResponse {
  contextId: string;
  uploadUrl: string;
  publicKey: string;
  cipherAlgorithm: string;
  initializationVectorSize: number;
}

export interface Extension {
  extensionId: string;
  createdAt: string;
  updatedAt: string;
  fileName: string;
  projectId: string;
}

export interface Project {
  projectId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  ownerId: string;
  defaultTimeout: number;
  concurrency: number;
}

export interface ProjectUsage {
  browserMinutes: number;
  proxyBytes: number;
}

export interface FetchPageParams {
  url: string;
  allowRedirects?: boolean;
  allowInsecureSsl?: boolean;
  proxies?: boolean;
}

export interface FetchPageResponse {
  fetchId: string;
  statusCode: number;
  headers: Record<string, string>;
  content: string;
  contentType: string;
  encoding: string;
}
