export interface Pagination {
  '@pagination'?: { count?: number; is_last?: boolean; next?: { offset: number } | null };
}
export interface Repository {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  active: boolean;
  private: boolean;
  starred?: boolean;
  default_branch?: { name?: string };
  github_language?: string | null;
  owner?: { login?: string };
}
export interface Build {
  id: number;
  number: string;
  state: string;
  duration?: number | null;
  event_type: string;
  previous_state?: string | null;
  branch?: { name?: string };
  commit?: { sha?: string; message?: string; author_name?: string };
  started_at?: string | null;
  finished_at?: string | null;
  repository?: { slug?: string };
  pull_request_title?: string | null;
  pull_request_number?: number | null;
  jobs?: Array<{ id: number; state?: string }>;
}
export interface Job {
  id: number;
  state?: string;
  number?: string;
  started_at?: string | null;
  finished_at?: string | null;
  build?: { id: number };
  repository?: { slug?: string };
  queue?: string;
  allow_failure?: boolean;
}
export interface Request {
  id: number;
  state?: string;
  result?: string | null;
  message?: string | null;
  branch_name?: string;
  branch?: string;
  event_type?: string;
  created_at?: string;
  repository?: { slug?: string };
  builds?: Array<{ id: number }>;
}
export interface EnvVar {
  id: string;
  name: string;
  value?: string | null;
  public: boolean;
  branch?: string | null;
}
export interface Cron {
  id: number;
  branch?: { name?: string };
  interval: string;
  dont_run_if_recent_build_exists: boolean;
  last_run?: string | null;
  next_run?: string | null;
  active?: boolean;
  created_at?: string;
}
export interface Branch {
  name: string;
  default_branch?: boolean;
  exists_on_github?: boolean;
  last_build?: Partial<Build>;
}
export interface Cache {
  slug?: string;
  branch?: string;
  size?: number;
  last_modified?: string;
}
export interface User {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}
export interface Log {
  id?: number;
  content?: string | null;
  log_parts?: Array<{ number?: number; content?: string }>;
}
export interface Setting {
  name: string;
  value: boolean | number;
}
export interface Lint {
  warnings?: Array<{ key?: string[]; message: string }>;
}
