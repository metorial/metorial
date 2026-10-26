export type HighLevelAuth = {
  authType: 'oauth' | 'private_token';
  token: string;
  locationId: string;
  scopes?: string[];
};

export type HighLevelRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  scope: string;
  query?: Record<string, unknown>;
  body?: unknown;
};

export type HighLevelResponseMetadata = {
  status: number;
  traceId?: string;
  retryAfter?: string;
  rateLimit: {
    limitDaily?: string;
    dailyRemaining?: string;
    intervalMilliseconds?: string;
    max?: string;
    remaining?: string;
  };
};
