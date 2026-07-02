export interface PagerDutyReference {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
}

export interface PagerDutyIncident {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
  incident_number?: number;
  title?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  urgency?: string;
  incident_key?: string;
  service?: PagerDutyReference;
  escalation_policy?: PagerDutyReference;
  teams?: PagerDutyReference[];
  assignments?: { at: string; assignee: PagerDutyReference }[];
  acknowledgements?: { at: string; acknowledger: PagerDutyReference }[];
  last_status_change_at?: string;
  last_status_change_by?: PagerDutyReference;
  first_trigger_log_entry?: PagerDutyReference;
  resolve_reason?: { type: string; incident: PagerDutyReference } | null;
  alert_counts?: { all: number; triggered: number; resolved: number };
  priority?: PagerDutyReference & { name?: string; color?: string };
  body?: { type: string; details?: string };
  conference_bridge?: { conference_number?: string; conference_url?: string };
}

export interface PagerDutyService {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
  name?: string;
  description?: string;
  auto_resolve_timeout?: number | null;
  acknowledgement_timeout?: number | null;
  created_at?: string;
  updated_at?: string;
  status?: string;
  alert_creation?: string;
  integrations?: PagerDutyIntegration[];
  escalation_policy?: PagerDutyReference;
  teams?: PagerDutyReference[];
  incident_urgency_rule?: {
    type: string;
    urgency?: string;
    during_support_hours?: { type: string; urgency: string };
    outside_support_hours?: { type: string; urgency: string };
  };
  support_hours?: {
    type: string;
    time_zone?: string;
    start_time?: string;
    end_time?: string;
    days_of_week?: number[];
  } | null;
}

export interface PagerDutyIntegration {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
  name?: string;
  integration_key?: string;
  integration_email?: string;
  vendor?: PagerDutyReference;
}

export interface PagerDutyUser {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
  name?: string;
  email?: string;
  role?: string;
  description?: string;
  time_zone?: string;
  color?: string;
  avatar_url?: string;
  invitation_sent?: boolean;
  job_title?: string;
  teams?: PagerDutyReference[];
  contact_methods?: PagerDutyContactMethod[];
  notification_rules?: PagerDutyNotificationRule[];
}

export interface PagerDutyContactMethod {
  id: string;
  type: string;
  summary?: string;
  label?: string;
  address?: string;
  country_code?: number;
}

export interface PagerDutyNotificationRule {
  id: string;
  type: string;
  start_delay_in_minutes?: number;
  urgency?: string;
  contact_method?: PagerDutyReference;
}

export interface PagerDutyTeam {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
  name?: string;
  description?: string;
  default_role?: string;
  parent?: PagerDutyReference | null;
}

export interface PagerDutyEscalationPolicy {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
  name?: string;
  description?: string;
  num_loops?: number;
  on_call_handoff_notifications?: string;
  escalation_rules?: {
    id: string;
    escalation_delay_in_minutes: number;
    targets: PagerDutyReference[];
  }[];
  services?: PagerDutyReference[];
  teams?: PagerDutyReference[];
}

export interface PagerDutySchedule {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
  name?: string;
  description?: string;
  time_zone?: string;
  escalation_policies?: PagerDutyReference[];
  users?: PagerDutyReference[];
  schedule_layers?: {
    id: string;
    name?: string;
    start?: string;
    end?: string | null;
    rotation_virtual_start?: string;
    rotation_turn_length_seconds?: number;
    users?: { user: PagerDutyReference }[];
    restrictions?: {
      type: string;
      start_time_of_day?: string;
      start_day_of_week?: number;
      duration_seconds?: number;
    }[];
  }[];
  final_schedule?: {
    rendered_schedule_entries?: {
      start: string;
      end: string;
      user: PagerDutyReference;
    }[];
  };
}

export interface PagerDutyOnCall {
  user?: PagerDutyReference;
  schedule?: PagerDutyReference;
  escalation_policy?: PagerDutyReference;
  escalation_level?: number;
  start?: string;
  end?: string;
}

export interface PagerDutyMaintenanceWindow {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  html_url?: string;
  sequence_number?: number;
  start_time?: string;
  end_time?: string;
  description?: string;
  created_by?: PagerDutyReference;
  services?: PagerDutyReference[];
  teams?: PagerDutyReference[];
}

export interface PagerDutyIncidentNote {
  id: string;
  user?: PagerDutyReference;
  content?: string;
  created_at?: string;
}

export interface PagerDutyPriority {
  id: string;
  type: string;
  summary?: string;
  self?: string;
  name?: string;
  description?: string;
  order?: number;
  color?: string;
}

export interface PagerDutyWebhookSubscription {
  id: string;
  type: string;
  active?: boolean;
  delivery_method?: {
    type: string;
    url?: string;
    custom_headers?: { name: string; value: string }[];
    secret?: string;
  };
  description?: string;
  events?: string[];
  filter?: {
    id?: string;
    type: string;
  };
}

export interface PagerDutyAnalyticsIncidentData {
  mean_seconds_to_resolve?: number;
  mean_seconds_to_first_ack?: number;
  mean_seconds_to_engage?: number;
  mean_seconds_to_mobilize?: number;
  mean_engaged_seconds?: number;
  mean_engaged_user_count?: number;
  total_incident_count?: number;
  total_interruption_count?: number;
  total_notification_count?: number;
  up_time_pct?: number;
  range_start?: string;
  service_id?: string;
  service_name?: string;
  team_id?: string;
  team_name?: string;
}

export interface PagerDutyPaginatedResponse<T> {
  offset?: number;
  limit?: number;
  more?: boolean;
  total?: number;
  [key: string]: T[] | number | boolean | undefined;
}
