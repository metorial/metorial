export interface Session {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string;
  status: 'PENDING' | 'RUNNING' | 'ERROR' | 'TIMED_OUT' | 'COMPLETED';
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

export type ContextUpdateResponse = ContextCreateResponse;

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

export type FetchFormat = 'raw' | 'markdown' | 'json';

export interface FetchPageParams {
  url: string;
  allowRedirects?: boolean;
  allowInsecureSsl?: boolean;
  proxies?: boolean;
  format?: FetchFormat;
  schema?: Record<string, unknown>;
}

export interface FetchPageResponse {
  fetchId: string;
  statusCode: number;
  headers: Record<string, string>;
  content: unknown;
  contentType: string;
  encoding: string;
}

export interface WebSearchParams {
  query: string;
  numResults?: number;
}

export interface WebSearchResult {
  resultId: string;
  url: string;
  title: string;
  author?: string;
  publishedDate?: string;
  image?: string;
  favicon?: string;
}

export interface WebSearchResponse {
  requestId: string;
  query: string;
  results: WebSearchResult[];
}

export interface SessionUploadResponse {
  message: string;
}

export interface UploadFileParams {
  fileName: string;
  contentBase64: string;
  mimeType?: string;
}

export interface Download {
  downloadId: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  createdAt: string;
}

export interface ListDownloadsParams {
  sessionId: string;
  filename?: string;
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
}

export interface ListDownloadsResponse {
  downloads: Download[];
  total: number;
  limit: number;
  offset: number;
}

export interface DownloadContent extends Download {
  contentBase64: string;
  byteLength: number;
}
