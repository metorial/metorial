export interface Subscriber {
  id: number;
  first_name: string | null;
  email_address: string;
  state: string;
  created_at: string;
  fields: Record<string, string | null>;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export interface Form {
  id: number;
  name: string;
  created_at: string;
  type: string;
  format: string | null;
  embed_js: string | null;
  embed_url: string | null;
  archived: boolean;
  uid: string;
}

export interface Sequence {
  id: number;
  name: string;
  hold: boolean;
  repeat: boolean;
  created_at: string;
  updated_at?: string;
  email_address?: string | null;
  email_template_id?: number | null;
  send_days?: string[];
  send_hour?: number;
  time_zone?: string;
  active?: boolean;
  exclude_subscriber_sources?: { type: string; ids: number[] }[];
  email_count?: number;
  subscriber_count?: number;
}

export interface SequenceEmail {
  id: number;
  sequence_id: number;
  subject: string;
  preview_text: string | null;
  email_address: string;
  email_template_id: number | null;
  published: boolean;
  position: number | null;
  delay_value: number;
  delay_unit: string;
  send_days: string[];
  content?: string | null;
}

export interface Broadcast {
  id: number;
  publication_id: number | null;
  created_at: string;
  subject: string | null;
  preview_text: string | null;
  description: string | null;
  content: string | null;
  public: boolean;
  published_at: string | null;
  send_at: string | null;
  thumbnail_alt: string | null;
  thumbnail_url: string | null;
  public_url: string | null;
  email_address: string | null;
  email_template: { id: number; name: string } | null;
  subscriber_filter: any[] | null;
}

export interface BroadcastStats {
  recipients: number;
  open_rate: number;
  emails_opened: number;
  click_rate: number;
  unsubscribe_rate: number;
  unsubscribes: number;
  total_clicks: number;
  show_total_clicks: boolean;
  status: string;
  progress: number;
  open_tracking_disabled: boolean;
  click_tracking_disabled: boolean;
}

export interface BroadcastClick {
  url: string;
  unique_clicks: number;
  click_to_delivery_rate: number;
  click_to_open_rate: number;
}

export interface CustomField {
  id: number;
  name: string;
  key: string;
  label: string;
}

export interface Purchase {
  id: number;
  transaction_id: string;
  status: string;
  email_address: string;
  subscriber_id?: number;
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  transaction_time: string;
  products: PurchaseProduct[];
}

export interface PurchaseProduct {
  name: string;
  pid: string | null;
  lid: string | null;
  quantity: number;
  unit_price: number;
  sku: string | null;
}

export interface Segment {
  id: number;
  name: string;
  created_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  is_default: boolean;
}

export interface Post {
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

export interface SnippetDocument {
  id: number;
  value: string | null;
  value_html: string | null;
  value_plain: string | null;
  version: number;
}

export interface Snippet {
  id: number;
  name: string;
  snippet_type: string;
  archived: boolean;
  key: string;
  created_at: string;
  updated_at: string;
  content?: string | null;
  document?: SnippetDocument | null;
}

export interface Webhook {
  id: number;
  account_id: number;
  event: {
    name: string;
    initiator_value?: string | null;
    tag_id?: number;
    form_id?: number;
    sequence_id?: number;
    product_id?: number;
    custom_field_id?: number;
  };
  target_url: string;
}

export interface Account {
  user: { id: number; email: string };
  account: {
    id: number;
    name: string;
    plan_type: string;
    primary_email_address: string;
    created_at: string;
    timezone?: {
      name: string;
      friendly_name: string;
      utc_offset: string;
    };
    sending_addresses?: {
      email_address: string;
      from_name: string;
      status: string;
      is_default: boolean;
      is_verified: boolean;
      is_dmarc_configured: boolean;
    }[];
  };
}

export interface CreatorProfile {
  name: string;
  byline: string;
  bio: string;
  image_url: string;
  profile_url: string;
}

export interface EmailStats {
  sent: number;
  clicked: number;
  opened: number;
  email_stats_mode: string;
  open_tracking_enabled: boolean;
  click_tracking_enabled: boolean;
  starting: string;
  ending: string;
  open_rate?: number;
  click_rate?: number;
  unsubscribe_rate?: number;
  bounce_rate?: number;
}

export interface GrowthStats {
  cancellations: number;
  net_new_subscribers: number;
  new_subscribers: number;
  subscribers: number;
  starting: string;
  ending: string;
}

export interface SubscriberStats {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
  last_sent: string | null;
  last_opened: string | null;
  last_clicked: string | null;
  sends_since_last_open: number;
  sends_since_last_click: number;
}

export interface PaginationInfo {
  has_previous_page: boolean;
  has_next_page: boolean;
  start_cursor: string | null;
  end_cursor: string | null;
  per_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}
