export interface DatadogAuthConfig {
  token: string;
  apiKey?: string;
  appKey?: string;
  authMethod: 'oauth' | 'apikey';
  site: string;
}

export interface MonitorOptions {
  thresholds?: {
    critical?: number;
    warning?: number;
    ok?: number;
    criticalRecovery?: number;
    warningRecovery?: number;
  };
  notifyNoData?: boolean;
  noDataTimeframe?: number;
  notifyAudit?: boolean;
  renotifyInterval?: number;
  escalationMessage?: string;
  includeTags?: boolean;
  requireFullWindow?: boolean;
  evaluationDelay?: number;
}

export interface Monitor {
  id?: number;
  name: string;
  type: string;
  query: string;
  message?: string;
  tags?: string[];
  priority?: number;
  options?: MonitorOptions;
  overall_state?: string;
  created?: string;
  modified?: string;
  creator?: { name?: string; email?: string; handle?: string };
}

export interface Dashboard {
  id?: string;
  title: string;
  description?: string;
  layout_type: string;
  widgets: any[];
  template_variables?: any[];
  is_read_only?: boolean;
  notify_list?: string[];
  reflow_type?: string;
  tags?: string[];
  created_at?: string;
  modified_at?: string;
  author_handle?: string;
  url?: string;
}

export interface Event {
  id?: number;
  title: string;
  text: string;
  date_happened?: number;
  priority?: string;
  host?: string;
  tags?: string[];
  alert_type?: string;
  aggregation_key?: string;
  source_type_name?: string;
  device_name?: string;
}

export interface Incident {
  id?: string;
  type?: string;
  attributes?: {
    title?: string;
    customer_impacted?: boolean;
    severity?: string;
    state?: string;
    created?: string;
    modified?: string;
    resolved?: string;
    detected?: string;
    fields?: Record<string, any>;
    notification_handles?: any[];
    time_to_detect?: number;
    time_to_repair?: number;
    time_to_resolve?: number;
  };
  relationships?: Record<string, any>;
}

export interface SLO {
  id?: string;
  name: string;
  type: string;
  description?: string;
  tags?: string[];
  thresholds: Array<{
    timeframe: string;
    target: number;
    target_display?: string;
    warning?: number;
    warning_display?: string;
  }>;
  monitor_ids?: number[];
  query?: {
    numerator: string;
    denominator: string;
  };
  groups?: string[];
  created_at?: number;
  modified_at?: number;
  creator?: { name?: string; email?: string; handle?: string };
}

export interface LogSearchParams {
  query?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
  sort?: string;
  indexes?: string[];
}

export interface MetricsQueryParams {
  from: number;
  to: number;
  query: string;
}

export interface User {
  id?: string;
  type?: string;
  attributes?: {
    name?: string;
    handle?: string;
    email?: string;
    title?: string;
    status?: string;
    icon?: string;
    created_at?: string;
    modified_at?: string;
    disabled?: boolean;
  };
  relationships?: Record<string, any>;
}
