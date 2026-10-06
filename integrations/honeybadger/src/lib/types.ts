export type HoneybadgerRegion = 'us' | 'eu';
export interface HoneybadgerAuth {
  token: string;
  projectToken?: string;
  region?: HoneybadgerRegion;
}
export interface Page<T> {
  results: T[];
  links?: { next?: string | null; prev?: string | null };
  total_count?: number;
}
export interface Account {
  id: string;
  name?: string;
  email?: string;
  active?: boolean;
  parked?: boolean;
}
export interface Stream {
  id: string;
  name?: string;
  slug?: string;
  internal?: boolean;
  project_id?: number;
  created_at?: string;
}
export interface Project {
  id: number;
  name: string;
  token?: string;
  streams?: Stream[];
  language?: string;
  fault_count?: number;
  created_at?: string;
  environments?: unknown[];
  teams?: unknown[];
  active?: boolean;
  resolve_errors_on_deploy?: boolean;
  disable_public_links?: boolean;
}
export interface Fault {
  id: number;
  project_id?: number;
  klass?: string;
  message?: string;
  component?: string;
  action?: string;
  environment?: string;
  resolved?: boolean;
  ignored?: boolean;
  notices_count?: number;
  notices_count_in_range?: number;
  created_at?: string;
  last_notice_at?: string;
  tags?: string[];
  assignee?: unknown;
  url?: string;
  paused?: boolean;
  resolve_on_deploy?: boolean;
}
export interface Notice {
  id: string;
  message?: string;
  environment?: { environment_name?: string } | string | null;
  created_at?: string;
  request?: {
    url?: string;
    component?: string;
    action?: string;
    [key: string]: unknown;
  } | null;
  backtrace?: unknown;
  url?: string;
}
export interface Comment {
  id: number;
  body?: string;
  author?: unknown;
  created_at?: string;
}
export interface Site {
  id: string | number;
  name?: string;
  url?: string;
  active?: boolean;
  frequency?: number;
  match_type?: string;
  match?: string | null;
  request_method?: string;
  state?: string;
  last_checked_at?: string | null;
  validate_ssl?: boolean;
}
export interface Outage {
  down_at?: string;
  up_at?: string | null;
  created_at?: string;
  status?: number | null;
  reason?: string | null;
}
export interface CheckIn {
  id: string;
  name?: string;
  slug?: string;
  url?: string;
  state?: string;
  schedule_type?: string;
  report_period?: string;
  grace_period?: string;
  cron_schedule?: string;
  cron_timezone?: string;
  reported_at?: string | null;
  expected_at?: string | null;
  missed_count?: number;
}
export interface Deploy {
  id?: number;
  project_id?: number;
  environment?: string;
  revision?: string;
  repository?: string;
  local_username?: string;
  created_at?: string;
}
export interface Team {
  id: number;
  name?: string;
  created_at?: string;
  owner?: unknown;
  members?: unknown[];
  projects?: unknown[];
}
export interface Member {
  id: number;
  name?: string;
  email?: string;
  admin?: boolean;
  created_at?: string;
}
export interface Invitation {
  id: number;
  email?: string;
  admin?: boolean;
  created_at?: string;
}
export interface Environment {
  id: number;
  project_id?: number;
  name?: string;
  notifications?: boolean;
  created_at?: string;
}
export interface Insights {
  results: Record<string, unknown>[];
  meta?: {
    fields?: string[];
    row_count?: number;
    total_count?: number;
    start_at?: string;
    end_at?: string;
  };
}
export interface BacktraceLine {
  number: string;
  file: string;
  method?: string;
  source?: Record<string, string>;
}
