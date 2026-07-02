export interface KitPagination {
  has_previous_page: boolean;
  has_next_page: boolean;
  start_cursor: string | null;
  end_cursor: string | null;
  per_page: number;
  total_count?: number;
}

export interface KitPaginatedResponse<T> {
  data: T[];
  pagination: KitPagination;
}

export interface KitSubscriber {
  id: number;
  first_name: string | null;
  email_address: string;
  state: string;
  created_at: string;
  updated_at?: string;
  canceled_at?: string | null;
  fields: Record<string, string | null>;
  added_at?: string;
  tags?: Array<{ id: number; name: string }>;
  attribution?: Record<string, unknown> | null;
  location?: Record<string, unknown> | null;
}

export interface KitSubscriberStats {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
  last_sent: string | null;
  last_opened: string | null;
  last_clicked: string | null;
  sends_since_last_open: number | null;
  sends_since_last_click: number | null;
}

export interface KitTag {
  id: number;
  name: string;
  created_at: string;
  updated_at?: string;
  subscriber_count?: number;
  tagged_at?: string;
}

export interface KitCustomField {
  id: number;
  key: string;
  label: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export interface KitForm {
  id: number;
  type: string;
  name: string;
  created_at: string;
  archived: boolean;
  uid: string;
  format: string;
}

export interface KitBroadcast {
  id: number;
  subject: string;
  preview_text: string | null;
  created_at: string;
  published_at: string | null;
  send_at: string | null;
  thumbnail_alt: string | null;
  thumbnail_url: string | null;
  email_address: string | null;
  email_template: { id: number; name: string } | null;
  email_layout_template: string | null;
  content: string | null;
  public: boolean;
  subscriber_filter: Record<string, unknown>[];
}

export interface KitBroadcastStats {
  recipients: number;
  open_rate: number;
  emails_opened?: number;
  click_rate: number;
  unsubscribe_rate?: number;
  unsubscribes: number;
  total_clicks: number;
  show_total_clicks: boolean;
  status: string;
  progress: number;
  open_tracking_disabled?: boolean;
  click_tracking_disabled?: boolean;
}

export interface KitBroadcastStatsSummary {
  id: number;
  subject?: string;
  send_at?: string | null;
  stats: KitBroadcastStats;
}

export interface KitBroadcastClick {
  url: string;
  unique_clicks: number;
  click_to_delivery_rate: number;
  click_to_open_rate: number;
}

export interface KitSequence {
  id: number;
  name: string;
  hold: boolean;
  repeat: boolean;
  active?: boolean;
  created_at: string;
  updated_at?: string;
  email_address?: string | null;
  email_template_id?: number | null;
  email_count?: number;
  subscriber_count?: number;
  send_days?: string[];
  send_hour?: number;
  time_zone?: string;
  exclude_subscriber_sources?: Record<string, unknown>[];
}

export interface KitSequenceEmail {
  id: number;
  sequence_id: number;
  subject: string;
  preview_text: string | null;
  email_address?: string | null;
  email_template_id: number | null;
  published: boolean;
  position: number | null;
  delay_value: number;
  delay_unit: string;
  send_days: string[] | null;
  content?: string | null;
}

export interface KitSegment {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface KitPurchase {
  id: number;
  transaction_id: string;
  status: string;
  email_address: string;
  currency: string;
  transaction_time: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  products: Array<{
    pid: number;
    lid: number;
    name: string;
    sku: string;
    unit_price: number;
    quantity: number;
  }>;
}

export interface KitAccount {
  user: {
    id: number;
    name: string;
    email_address: string;
    profile_image?: { url: string };
  };
}

export interface KitAccountEmailStats {
  sent: number;
  clicked: number;
  opened: number;
  email_stats_mode: string;
  open_tracking_enabled: boolean;
  click_tracking_enabled: boolean;
  starting: string;
  ending: string;
}

export interface KitAccountGrowthStats {
  cancellations: number;
  net_new_subscribers: number;
  new_subscribers: number;
  subscribers: number;
  starting: string;
  ending: string;
}

export interface KitEmailTemplate {
  id: number;
  name: string;
}

export interface KitPost {
  id: number;
  publication_id: number;
  created_at: string;
  title: string;
  slug: string | null;
  description: string | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  sent_at: string | null;
  thumbnail_alt: string | null;
  thumbnail_url: string | null;
  is_paid: boolean;
  public_url: string | null;
  content?: string | null;
}

export interface KitSnippet {
  id: number;
  name: string;
  snippet_type: string;
  archived: boolean;
  key: string;
  created_at: string;
  updated_at: string;
  content?: string | null;
  document?: {
    id: number;
    value: unknown;
    value_html: string | null;
    value_plain: string | null;
    version: number;
  } | null;
}

export interface KitWebhook {
  id: number;
  target_url: string;
  event: {
    name: string;
    [key: string]: unknown;
  };
  created_at: string;
}
