export interface PaginatedResponse<T> {
  has_more: boolean;
  cursor: string;
  total: number;
  data: T[];
}

export interface Brand {
  id: string;
  name: string;
  from_name: string;
  from_email: string;
  filter_soft_bounces: boolean;
  max_soft_bounces: number;
  bounce_danger_percent: number;
  unsubscribe_text: string;
  connection_id: string;
  contact_limit: number;
  url: string;
  created: number;
}

export interface FieldValue {
  name: string;
  string?: string;
  date?: string;
  integer?: number;
}

export interface Contact {
  id: string;
  brand_id: string;
  email: string;
  field_values: FieldValue[];
  list_ids: string[];
  unsubscribe_all: boolean;
  unsubscribe_ids: string[];
  num_soft_bounces: number;
  num_hard_bounces: number;
  num_complaints: number;
  created: number;
}

export interface ContactList {
  id: string;
  name: string;
  all: boolean;
  created: number;
}

export interface Field {
  id: string;
  name: string;
  type: string;
  merge_tag_name: string;
  sample_value: string;
  created: number;
}

export interface Sender {
  id: string;
  identity_type: string;
  identity: string;
  bounce_domain: string;
  dns_records: Record<string, unknown>;
  bounce_dns_records: Record<string, unknown>;
  share_type: string;
  verified: boolean;
  bounce_verified: boolean;
  created: number;
}

export interface SuppressionList {
  id: string;
  file_name: string;
  file_size: number;
  created: number;
}

export interface BulkCampaign {
  id: string;
  name: string;
  subject: string;
  preview: string;
  from: { email: string; name: string };
  reply_to: { email: string; name: string };
  recipient_name: string;
  html: string;
  text: string;
  template_id: string;
  link_params: string;
  list_ids: string[];
  excluded_list_ids: string[];
  segment_id: string;
  message_type_id: string;
  track_opens: boolean;
  track_clicks: boolean;
  track_text_clicks: boolean;
  scheduled_for: number;
  throttling_type: string;
  throttling_amount: number;
  throttling_period: number;
  suppression_list_id: string;
  ready: boolean;
  status: string;
  num_sent: number;
  num_rejected: number;
  num_opens: number;
  num_total_opens: number;
  num_clicks: number;
  num_total_clicks: number;
  num_hard_bounces: number;
  num_soft_bounces: number;
  num_complaints: number;
  num_unsubscribes: number;
  started: number;
  sent: number;
  delayed_until: number;
  created: number;
}
