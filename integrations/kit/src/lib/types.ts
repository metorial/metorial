export interface KitSubscriber {
  id: number;
  first_name: string | null;
  email_address: string;
  state: string;
  created_at: string;
  fields: Record<string, string | null>;
}

export interface KitTag {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface KitCustomField {
  id: number;
  key: string;
  label: string;
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
  subscriber_filter: Record<string, any>[];
}

export interface KitBroadcastStats {
  id: number;
  subject: string;
  recipients: number;
  open_rate: number;
  click_rate: number;
  unsubscribes: number;
  total_clicks: number;
  show_total_clicks: boolean;
  status: string;
  progress: number;
  send_at: string | null;
}

export interface KitSequence {
  id: number;
  name: string;
  hold: boolean;
  repeat: boolean;
  created_at: string;
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

export interface KitEmailTemplate {
  id: number;
  name: string;
}

export interface KitWebhook {
  id: number;
  target_url: string;
  event: {
    name: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface KitPaginatedResponse<T> {
  data: T[];
  pagination: {
    has_previous_page: boolean;
    has_next_page: boolean;
    start_cursor: string | null;
    end_cursor: string | null;
    per_page: number;
  };
}
