export type PaginationParams = {
  limit?: number;
  pageToken?: string;
  ascending?: boolean;
};

export type MessageFilterParams = PaginationParams & {
  labels?: string[];
  before?: string;
  after?: string;
  includeSpam?: boolean;
  includeBlocked?: boolean;
  includeTrash?: boolean;
};

export type PaginatedResponse<K extends string, T> = {
  count: number;
  limit?: number;
  next_page_token?: string;
} & Record<K, T[]>;

export type Inbox = {
  inbox_id: string;
  pod_id: string;
  display_name?: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  message_id: string;
  inbox_id: string;
  thread_id: string;
  labels: string[];
  timestamp: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject?: string;
  preview?: string;
  text?: string;
  html?: string;
  extracted_text?: string;
  extracted_html?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  in_reply_to?: string;
  references?: string[];
  size: number;
  created_at: string;
  updated_at: string;
};

export type Thread = {
  thread_id: string;
  inbox_id: string;
  labels: string[];
  timestamp: string;
  received_timestamp?: string;
  sent_timestamp?: string;
  senders: string[];
  recipients: string[];
  subject?: string;
  preview?: string;
  attachments?: Attachment[];
  message_count: number;
  last_message_id: string;
  size: number;
  messages?: Message[];
  created_at: string;
  updated_at: string;
};

export type Draft = {
  draft_id: string;
  inbox_id: string;
  client_id?: string;
  labels?: string[];
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject?: string;
  preview?: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
  in_reply_to?: string;
  references?: string[];
  send_status?: string;
  send_at?: string;
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  attachment_id: string;
  filename: string;
  size: number;
  content_type?: string;
  content_disposition?: string;
  content_id?: string;
};

export type AttachmentResponse = Attachment & {
  download_url: string;
  expires_at: string;
};

export type Domain = {
  domain_id: string;
  pod_id?: string;
  domain: string;
  status: string;
  feedback_enabled: boolean;
  records?: DnsRecord[];
  client_id?: string;
  created_at: string;
  updated_at: string;
};

export type DnsRecord = {
  type: string;
  name: string;
  value: string;
  status: string;
  priority?: number;
};

export type Pod = {
  pod_id: string;
  name: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
};

export type Webhook = {
  webhook_id: string;
  url: string;
  event_types: string[];
  secret: string;
  enabled: boolean;
  pod_ids?: string[];
  inbox_ids?: string[];
  client_id?: string;
  created_at: string;
  updated_at: string;
};

export type ListEntry = {
  entry: string;
  organization_id: string;
  reason?: string;
  direction: string;
  list_type: string;
  entry_type: string;
  created_at: string;
};

export type SendMessageParams = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject?: string;
  text?: string;
  html?: string;
  labels?: string[];
  attachments?: SendAttachment[];
  headers?: Record<string, string>;
};

export type SendAttachment = {
  filename: string;
  contentType?: string;
  contentDisposition?: string;
  contentId?: string;
  content?: string;
  url?: string;
};

export type ReplyParams = {
  text?: string;
  html?: string;
  replyAll?: boolean;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  attachments?: SendAttachment[];
  headers?: Record<string, string>;
  labels?: string[];
};

export type CreateDraftParams = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject?: string;
  text?: string;
  html?: string;
  labels?: string[];
  attachments?: SendAttachment[];
  inReplyTo?: string;
  sendAt?: string;
  clientId?: string;
};

export type SendResult = {
  message_id: string;
  thread_id: string;
};
