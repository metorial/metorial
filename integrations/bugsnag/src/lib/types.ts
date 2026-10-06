export type FilterValue = { type: 'eq' | 'ne' | 'empty'; value: string; child_value?: string };
export type Filters = Record<string, FilterValue[]>;
export type PageOptions = { perPage?: number; pageUrl?: string };
export type SearchOptions = PageOptions & {
  sort?: string;
  direction?: string;
  filters?: Filters;
};
export type Organization = {
  id: string;
  name: string;
  slug?: string;
  created_at?: string;
  auto_upgrade?: boolean;
  billing_emails?: string[];
  managed_by_platform_services?: boolean;
};
export type Project = {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  api_key?: string;
  release_stages?: string[];
  language?: string;
  created_at?: string;
  updated_at?: string;
  open_error_count?: number;
  for_review_error_count?: number;
  collaborators_count?: number;
  global_grouping?: string[];
  location_grouping?: string[];
  discarded_app_versions?: string[];
  discarded_errors?: string[];
  url?: string;
  html_url?: string;
  errors_url?: string;
  events_url?: string;
};
export type BugsnagError = {
  id: string;
  error_class?: string;
  message?: string;
  context?: string;
  severity?: string;
  overridden_severity?: string;
  status?: string;
  unhandled?: boolean;
  events?: number;
  users?: number;
  first_seen?: string;
  last_seen?: string;
  release_stages?: string[];
  assigned_collaborator_id?: string;
  url?: string;
  project_url?: string;
};
export type Event = {
  id: string;
  error_id?: string;
  received_at?: string;
  error_class?: string;
  message?: string;
  severity?: string;
  unhandled?: boolean;
  context?: string;
  exceptions?: {
    errorClass?: string;
    message?: string;
    stacktrace?: {
      file?: string;
      lineNumber?: number;
      columnNumber?: number;
      method?: string;
      inProject?: boolean;
    }[];
  }[];
  user?: { id?: string; email?: string; name?: string };
  app?: { version?: string; releaseStage?: string; type?: string };
  device?: {
    hostname?: string;
    id?: string;
    manufacturer?: string;
    model?: string;
    osName?: string;
    osVersion?: string;
    locale?: string;
    browserName?: string;
    browserVersion?: string;
  };
  request?: { clientIp?: string; httpMethod?: string; url?: string; referer?: string };
  breadcrumbs?: { timestamp?: string; name?: string; type?: string; metaData?: unknown }[];
  feature_flags?: { feature_flag_name: string; variant_name?: string }[];
  metaData?: unknown;
};
export type Collaborator = {
  id: string;
  name?: string;
  email?: string;
  is_admin?: boolean;
  two_factor_enabled?: boolean;
  pending_invitation?: boolean;
  created_at?: string;
};
export type Comment = {
  id: string;
  message?: string;
  collaborator?: { name?: string; email?: string };
  created_at?: string;
  updated_at?: string;
};
export type SavedSearch = {
  id: string;
  name?: string;
  filters?: Filters;
  created_at?: string;
  updated_at?: string;
};
export type Release = {
  id: string;
  app_version?: string;
  app_version_code?: string;
  app_bundle_version?: string;
  build_label?: string;
  release_stage?: { name?: string };
  release_source?: string;
  builder_name?: string;
  build_tool?: string;
  release_time?: string;
  total_sessions_count?: number;
  unhandled_sessions_count?: number;
  source_control?: {
    provider?: string;
    repository?: string;
    revision?: string;
    diff_url?: string;
  };
};
export type Trend = { from?: string; to?: string; events_count?: number };
export type Pivot = { event_field_display_id?: string; name?: string };
export type PivotValue = { event_field_value?: string; events?: number; proportion?: number };
export type EventField = {
  display_id?: string;
  custom?: boolean;
  match_types?: string[];
  filter_options?: { name?: string; description?: string; hint_text?: string };
  values?: unknown[];
};
