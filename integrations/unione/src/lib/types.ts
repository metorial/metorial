// UniOne API types

export interface UniOneRecipient {
  email: string;
  substitutions?: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface UniOneAttachment {
  type: string;
  name: string;
  content: string;
}

export interface UniOneEmailBody {
  html?: string;
  plaintext?: string;
  amp?: string;
}

export interface UniOneEmailOptions {
  send_at?: string;
  unsubscribe_url?: string;
  custom_backend_id?: number;
  smtp_pool_id?: string;
}

export interface UniOneEmailMessage {
  recipients: UniOneRecipient[];
  template_id?: string;
  skip_unsubscribe?: 0 | 1;
  global_language?: string;
  template_engine?: 'simple' | 'velocity' | 'liquid' | 'none';
  global_substitutions?: Record<string, string>;
  global_metadata?: Record<string, string>;
  body?: UniOneEmailBody;
  subject?: string;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  reply_to_name?: string;
  track_links?: 0 | 1;
  track_read?: 0 | 1;
  headers?: Record<string, string>;
  attachments?: UniOneAttachment[];
  inline_attachments?: UniOneAttachment[];
  options?: UniOneEmailOptions;
  tags?: string[];
  bypass_global?: 0 | 1;
  bypass_unavailable?: 0 | 1;
  bypass_unsubscribed?: 0 | 1;
  bypass_complained?: 0 | 1;
}

export interface UniOneSendResponse {
  status: string;
  job_id: string;
  emails: string[];
  failed_emails?: Record<string, string>;
}

export interface UniOneTemplate {
  id?: string;
  name?: string;
  editor_type?: 'html' | 'visual';
  template_engine?: 'simple' | 'velocity' | 'liquid' | 'none';
  global_substitutions?: Record<string, string>;
  global_metadata?: Record<string, string>;
  body?: UniOneEmailBody;
  subject?: string;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  reply_to_name?: string;
  track_links?: 0 | 1;
  track_read?: 0 | 1;
  headers?: Record<string, string>;
  attachments?: UniOneAttachment[];
  inline_attachments?: UniOneAttachment[];
  options?: UniOneEmailOptions;
}

export interface UniOneTemplateListItem {
  id: string;
  name: string;
  editor_type: string;
  template_engine: string;
  subject: string;
  from_email: string;
  from_name: string;
  created: string;
  user_id: number;
  project_id: string;
  project_name: string;
}

export interface UniOneSuppressionEntry {
  email: string;
  cause: string;
  source: string;
  is_deletable: boolean;
  created: string;
}

export interface UniOneDomainDnsRecord {
  type: string;
  host: string;
  value: string;
  status?: string;
}

export interface UniOneDomainInfo {
  domain: string;
  verification_record: UniOneDomainDnsRecord;
  dkim: UniOneDomainDnsRecord;
  spf?: UniOneDomainDnsRecord;
  status?: string;
}

export interface UniOneWebhookConfig {
  url: string;
  status?: string;
  event_format?: 'json_post' | 'json_gzip_post';
  delivery_info?: 0 | 1;
  single_event?: 0 | 1;
  max_parallel?: number;
  events?: {
    email_status?: string[];
    spam_block?: string[];
  };
}

export interface UniOneWebhookInfo extends UniOneWebhookConfig {
  id: number;
  updated_at?: string;
}

export interface UniOneEventDumpRequest {
  start_time: string;
  end_time: string;
  limit?: number;
  allEvents?: boolean;
  filter?: {
    job_id?: string;
    status?: string;
    delivery_status?: string;
    email?: string;
    sender?: string;
    domain?: string;
    campaign_id?: string;
  };
}

export interface UniOneEventDump {
  dump_id: number;
  dump_status: string;
  url?: string;
  files?: string[];
  created?: string;
}

export interface UniOneTag {
  tag: string;
  status?: string;
}

export interface UniOneProject {
  id: string;
  name: string;
  country?: string;
  reg_time?: string;
  send_enabled?: boolean;
  custom_unsubscribe_url_enabled?: boolean;
  api_key?: string;
  backend_id?: number;
}

export interface UniOneSystemInfo {
  status: string;
  user_id: number;
  email: string;
  accounting_period_start?: string;
  accounting_period_end?: string;
  emails_included?: number;
  emails_sent?: number;
  project_id?: string;
  project_name?: string;
}

export interface UniOneValidationResult {
  status: string;
  email: string;
  validity: string;
  local_part: string;
  domain: string;
  mx_found: boolean;
  mx_record?: string;
  did_you_mean?: string;
  cause?: string;
  validity_score?: number;
}
