export interface PaginationParams {
  limit?: number;
  next?: string;
  prev?: string;
  orderBy?: string;
  order_by?: string;
  dir?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  pagination: {
    order_by: string;
    dir: string;
    limit: number;
    next?: string;
    prev?: string;
  };
  count: number;
  models: T[];
}

export interface HookdeckSource {
  id: string;
  team_id: string;
  name: string;
  description?: string | null;
  type?: string;
  config?: {
    allowed_http_methods?: string[];
    custom_response?: Record<string, unknown> | null;
    auth?: Record<string, unknown> | null;
    auth_type?: string | null;
  };
  url: string;
  authenticated?: boolean;
  disabled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HookdeckDestination {
  id: string;
  team_id: string;
  name: string;
  description?: string | null;
  type?: string;
  config?: {
    url?: string;
    rate_limit?: number | null;
    rate_limit_period?: string;
    http_method?: string | null;
    path_forwarding_disabled?: boolean;
    auth_type?: string | null;
    auth?: Record<string, unknown> | null;
  };
  disabled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HookdeckConnection {
  id: string;
  team_id: string;
  name: string;
  description?: string | null;
  source: HookdeckSource;
  destination: HookdeckDestination;
  rules?: HookdeckRule[];
  paused_at?: string | null;
  disabled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type HookdeckRule =
  | { type: 'retry'; strategy: string; count: number; interval: number }
  | {
      type: 'filter';
      headers?: Record<string, unknown>;
      body?: Record<string, unknown>;
      query?: Record<string, unknown>;
      path?: Record<string, unknown>;
    }
  | { type: 'transform'; transformation_id: string }
  | { type: 'delay'; delay: number }
  | { type: 'deduplicate'; period?: string; property?: string };

export interface HookdeckEvent {
  id: string;
  team_id: string;
  webhook_id: string;
  source_id: string;
  destination_id: string;
  event_data_id: string;
  request_id: string;
  status: string;
  attempts: number;
  response_status?: number | null;
  error_code?: string | null;
  last_attempt_at?: string | null;
  next_attempt_at?: string | null;
  created_at: string;
  updated_at: string;
  data?: Record<string, unknown>;
}

export interface HookdeckRequest {
  id: string;
  team_id: string;
  source_id: string;
  status?: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: string;
  path?: string;
  parsed_query?: Record<string, unknown>;
  data?: {
    headers?: Record<string, string>;
    body?: unknown;
    query?: string;
    path?: string;
    parsed_query?: Record<string, unknown>;
    parsedQuery?: Record<string, unknown>;
  };
  rejection_cause?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HookdeckAttempt {
  id: string;
  team_id: string;
  event_id: string;
  response_status?: number | null;
  status: string;
  error_code?: string | null;
  response_ms?: number | null;
  trigger?: string | null;
  data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HookdeckIssue {
  id: string;
  team_id: string;
  type: string;
  status: string;
  reference?: Record<string, unknown>;
  aggregation_keys?: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
  dismissed_at?: string | null;
  opened_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HookdeckTransformation {
  id: string;
  team_id: string;
  name: string;
  code: string;
  env?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface HookdeckBookmark {
  id: string;
  team_id: string;
  label: string;
  event_data_id: string;
  webhook_id: string;
  created_at: string;
  updated_at: string;
}

export interface HookdeckIssueTrigger {
  id: string;
  team_id?: string | null;
  name?: string | null;
  type: string;
  configs?: Record<string, unknown>;
  channels?: Record<string, unknown> | null;
  disabled_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HookdeckMetricsRow {
  time_bucket?: string | null;
  dimensions?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

export interface HookdeckMetricsResponse {
  data: HookdeckMetricsRow[];
  metadata?: Record<string, unknown>;
}

export interface HookdeckBulkOperation {
  id: string;
  team_id?: string;
  status?: string;
  type?: string;
  query?: Record<string, unknown>;
  count?: number;
  estimated_count?: number;
  processed_count?: number;
  created_at?: string;
  updated_at?: string;
}
