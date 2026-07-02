export interface SquareClientConfig {
  token: string;
  environment: 'production' | 'sandbox';
}

export interface SquareMoney {
  amount?: number;
  currency?: string;
}

export interface PaginatedResponse<T> {
  cursor?: string;
  items: T[];
}

export interface SquarePayment {
  id?: string;
  created_at?: string;
  updated_at?: string;
  amount_money?: SquareMoney;
  tip_money?: SquareMoney;
  total_money?: SquareMoney;
  app_fee_money?: SquareMoney;
  status?: string;
  source_type?: string;
  card_details?: Record<string, any>;
  location_id?: string;
  order_id?: string;
  customer_id?: string;
  reference_id?: string;
  note?: string;
  receipt_number?: string;
  receipt_url?: string;
  delay_action?: string;
  delay_duration?: string;
  delayed_until?: string;
  [key: string]: any;
}

export interface SquareOrder {
  id?: string;
  location_id?: string;
  reference_id?: string;
  customer_id?: string;
  line_items?: Record<string, any>[];
  taxes?: Record<string, any>[];
  discounts?: Record<string, any>[];
  fulfillments?: Record<string, any>[];
  state?: string;
  total_money?: SquareMoney;
  total_tax_money?: SquareMoney;
  total_discount_money?: SquareMoney;
  total_tip_money?: SquareMoney;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  tenders?: Record<string, any>[];
  net_amounts?: Record<string, any>;
  [key: string]: any;
}

export interface SquareCustomer {
  id?: string;
  created_at?: string;
  updated_at?: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  nickname?: string;
  email_address?: string;
  phone_number?: string;
  address?: Record<string, any>;
  note?: string;
  reference_id?: string;
  birthday?: string;
  preferences?: Record<string, any>;
  groups?: Record<string, any>[];
  segment_ids?: string[];
  [key: string]: any;
}

export interface SquareCatalogObject {
  type?: string;
  id?: string;
  updated_at?: string;
  version?: number;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_data?: Record<string, any>;
  item_variation_data?: Record<string, any>;
  category_data?: Record<string, any>;
  tax_data?: Record<string, any>;
  discount_data?: Record<string, any>;
  modifier_list_data?: Record<string, any>;
  modifier_data?: Record<string, any>;
  image_data?: Record<string, any>;
  [key: string]: any;
}

export interface SquareInvoice {
  id?: string;
  version?: number;
  location_id?: string;
  order_id?: string;
  primary_recipient?: Record<string, any>;
  payment_requests?: Record<string, any>[];
  delivery_method?: string;
  invoice_number?: string;
  title?: string;
  description?: string;
  scheduled_at?: string;
  status?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
  accepted_payment_methods?: Record<string, any>;
  sale_or_service_date?: string;
  [key: string]: any;
}

export interface SquareLocation {
  id?: string;
  name?: string;
  address?: Record<string, any>;
  timezone?: string;
  capabilities?: string[];
  status?: string;
  created_at?: string;
  merchant_id?: string;
  country?: string;
  language_code?: string;
  currency?: string;
  phone_number?: string;
  business_name?: string;
  type?: string;
  website_url?: string;
  business_email?: string;
  description?: string;
  [key: string]: any;
}

export interface SquareRefund {
  id?: string;
  status?: string;
  amount_money?: SquareMoney;
  payment_id?: string;
  order_id?: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
  location_id?: string;
  [key: string]: any;
}

export interface SquareInventoryCount {
  catalog_object_id?: string;
  catalog_object_type?: string;
  state?: string;
  location_id?: string;
  quantity?: string;
  calculated_at?: string;
  [key: string]: any;
}

export interface SquareWebhookSubscription {
  id?: string;
  name?: string;
  enabled?: boolean;
  event_types?: string[];
  notification_url?: string;
  api_version?: string;
  signature_key?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}
