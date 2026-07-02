export interface MagentoProduct {
  id?: number;
  sku: string;
  name?: string;
  attribute_set_id?: number;
  price?: number;
  status?: number;
  visibility?: number;
  type_id?: string;
  weight?: number;
  created_at?: string;
  updated_at?: string;
  extension_attributes?: Record<string, any>;
  product_links?: MagentoProductLink[];
  media_gallery_entries?: MagentoMediaGalleryEntry[];
  tier_prices?: MagentoTierPrice[];
  custom_attributes?: MagentoCustomAttribute[];
}

export interface MagentoProductLink {
  sku?: string;
  link_type?: string;
  linked_product_sku?: string;
  linked_product_type?: string;
  position?: number;
}

export interface MagentoMediaGalleryEntry {
  id?: number;
  media_type?: string;
  label?: string;
  position?: number;
  disabled?: boolean;
  types?: string[];
  file?: string;
  content?: {
    base64_encoded_data?: string;
    type?: string;
    name?: string;
  };
}

export interface MagentoTierPrice {
  customer_group_id?: number;
  qty?: number;
  value?: number;
}

export interface MagentoCustomAttribute {
  attribute_code: string;
  value: any;
}

export interface MagentoOrder {
  entity_id?: number;
  increment_id?: string;
  state?: string;
  status?: string;
  grand_total?: number;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  shipping_amount?: number;
  total_qty_ordered?: number;
  customer_email?: string;
  customer_firstname?: string;
  customer_lastname?: string;
  customer_id?: number;
  created_at?: string;
  updated_at?: string;
  store_id?: number;
  base_currency_code?: string;
  order_currency_code?: string;
  items?: MagentoOrderItem[];
  billing_address?: MagentoAddress;
  payment?: MagentoPayment;
  extension_attributes?: Record<string, any>;
  status_histories?: MagentoStatusHistory[];
}

export interface MagentoOrderItem {
  item_id?: number;
  order_id?: number;
  sku?: string;
  name?: string;
  qty_ordered?: number;
  qty_shipped?: number;
  qty_invoiced?: number;
  qty_refunded?: number;
  price?: number;
  row_total?: number;
  tax_amount?: number;
  discount_amount?: number;
  product_type?: string;
}

export interface MagentoAddress {
  address_type?: string;
  city?: string;
  company?: string;
  country_id?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  postcode?: string;
  region?: string;
  region_code?: string;
  region_id?: number;
  street?: string[];
  telephone?: string;
}

export interface MagentoPayment {
  method?: string;
  additional_information?: string[];
}

export interface MagentoStatusHistory {
  comment?: string;
  created_at?: string;
  entity_name?: string;
  is_customer_notified?: number;
  is_visible_on_front?: number;
  status?: string;
}

export interface MagentoCustomer {
  id?: number;
  group_id?: number;
  email?: string;
  firstname?: string;
  lastname?: string;
  middlename?: string;
  prefix?: string;
  suffix?: string;
  dob?: string;
  gender?: number;
  store_id?: number;
  website_id?: number;
  created_at?: string;
  updated_at?: string;
  addresses?: MagentoCustomerAddress[];
  custom_attributes?: MagentoCustomAttribute[];
  extension_attributes?: Record<string, any>;
}

export interface MagentoCustomerAddress {
  id?: number;
  customer_id?: number;
  region?: {
    region_code?: string;
    region?: string;
    region_id?: number;
  };
  region_id?: number;
  country_id?: string;
  street?: string[];
  company?: string;
  telephone?: string;
  postcode?: string;
  city?: string;
  firstname?: string;
  lastname?: string;
  default_shipping?: boolean;
  default_billing?: boolean;
}

export interface MagentoCategory {
  id?: number;
  parent_id?: number;
  name?: string;
  is_active?: boolean;
  position?: number;
  level?: number;
  product_count?: number;
  children_data?: MagentoCategory[];
  created_at?: string;
  updated_at?: string;
  path?: string;
  include_in_menu?: boolean;
  custom_attributes?: MagentoCustomAttribute[];
}

export interface MagentoCmsPage {
  id?: number;
  identifier?: string;
  title?: string;
  page_layout?: string;
  content_heading?: string;
  content?: string;
  creation_time?: string;
  update_time?: string;
  sort_order?: string;
  meta_title?: string;
  meta_keywords?: string;
  meta_description?: string;
  active?: boolean;
}

export interface MagentoCmsBlock {
  id?: number;
  identifier?: string;
  title?: string;
  content?: string;
  creation_time?: string;
  update_time?: string;
  active?: boolean;
}

export interface MagentoInventorySourceItem {
  sku?: string;
  source_code?: string;
  quantity?: number;
  status?: number;
}

export interface MagentoSearchResult<T> {
  items: T[];
  search_criteria: Record<string, any>;
  total_count: number;
}

export interface MagentoCartItem {
  item_id?: number;
  sku?: string;
  qty?: number;
  name?: string;
  price?: number;
  product_type?: string;
  quote_id?: string;
}

export interface MagentoCart {
  id?: number;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  items?: MagentoCartItem[];
  items_count?: number;
  items_qty?: number;
  customer?: {
    email?: string;
    firstname?: string;
    lastname?: string;
  };
  billing_address?: MagentoAddress;
  currency?: {
    global_currency_code?: string;
    store_currency_code?: string;
    quote_currency_code?: string;
  };
}

export interface MagentoShippingMethod {
  carrier_code?: string;
  method_code?: string;
  carrier_title?: string;
  method_title?: string;
  amount?: number;
  available?: boolean;
}

export interface MagentoInvoice {
  entity_id?: number;
  order_id?: number;
  increment_id?: string;
  state?: number;
  grand_total?: number;
  created_at?: string;
  updated_at?: string;
  items?: MagentoInvoiceItem[];
}

export interface MagentoInvoiceItem {
  entity_id?: number;
  sku?: string;
  name?: string;
  qty?: number;
  price?: number;
  row_total?: number;
}

export interface MagentoShipment {
  entity_id?: number;
  order_id?: number;
  increment_id?: string;
  created_at?: string;
  updated_at?: string;
  items?: MagentoShipmentItem[];
  tracks?: MagentoShipmentTrack[];
}

export interface MagentoShipmentItem {
  entity_id?: number;
  order_item_id?: number;
  sku?: string;
  name?: string;
  qty?: number;
}

export interface MagentoShipmentTrack {
  order_id?: number;
  track_number?: string;
  title?: string;
  carrier_code?: string;
}

export interface MagentoCreditMemo {
  entity_id?: number;
  order_id?: number;
  increment_id?: string;
  state?: number;
  grand_total?: number;
  created_at?: string;
  updated_at?: string;
  items?: MagentoCreditMemoItem[];
}

export interface MagentoCreditMemoItem {
  entity_id?: number;
  sku?: string;
  name?: string;
  qty?: number;
  price?: number;
  row_total?: number;
}

export interface MagentoStoreConfig {
  id?: number;
  code?: string;
  website_id?: number;
  locale?: string;
  base_currency_code?: string;
  default_display_currency_code?: string;
  timezone?: string;
  weight_unit?: string;
  base_url?: string;
  base_link_url?: string;
  base_media_url?: string;
  secure_base_url?: string;
  secure_base_link_url?: string;
  secure_base_media_url?: string;
}
