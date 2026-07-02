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
  pid: string;
  lid: string;
  quantity: number;
  unit_price: number;
  sku: string;
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
  };
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
