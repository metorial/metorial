export interface AddressInput {
  name?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  address_line3?: string;
  city_locality?: string;
  state_province?: string;
  postal_code?: string;
  country_code: string;
  address_residential_indicator?: 'unknown' | 'yes' | 'no';
}

export interface Weight {
  value: number;
  unit: 'pound' | 'ounce' | 'gram' | 'kilogram';
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: 'inch' | 'centimeter';
}

export interface Package {
  weight: Weight;
  dimensions?: Dimensions;
  insured_value?: { amount: number; currency: string };
  package_code?: string;
  content_description?: string;
}

export interface GetRatesRequest {
  shipment_id?: string;
  shipment?: {
    external_shipment_id?: string;
    ship_from: AddressInput;
    ship_to: AddressInput;
    packages: Package[];
    carrier_ids?: string[];
    service_code?: string;
    confirmation?: string;
    customs?: CustomsInfo;
  };
  rate_options?: {
    carrier_ids?: string[];
    service_codes?: string[];
    package_types?: string[];
    calculate_tax_amount?: boolean;
    preferred_currency?: string;
  };
}

export interface EstimateRatesRequest {
  carrier_id?: string;
  carrier_ids?: string[];
  from_country_code?: string;
  from_postal_code?: string;
  from_city_locality?: string;
  from_state_province?: string;
  to_country_code: string;
  to_postal_code?: string;
  to_city_locality?: string;
  to_state_province?: string;
  weight: Weight;
  dimensions?: Dimensions;
  confirmation?: string;
  address_residential_indicator?: string;
  ship_date?: string;
}

export interface CustomsInfo {
  contents: 'merchandise' | 'gift' | 'returned_goods' | 'documents' | 'sample';
  non_delivery: 'treat_as_abandoned' | 'return_to_sender';
  customs_items: Array<{
    description: string;
    quantity: number;
    value: { amount: number; currency: string };
    harmonized_tariff_code?: string;
    country_of_origin?: string;
    sku?: string;
  }>;
}

export interface CreateLabelRequest {
  shipment: {
    carrier_id: string;
    service_code: string;
    ship_from: AddressInput;
    ship_to: AddressInput;
    packages: Package[];
    confirmation?: string;
    customs?: CustomsInfo;
    external_shipment_id?: string;
    warehouse_id?: string;
  };
  label_format?: 'pdf' | 'png' | 'zpl';
  label_layout?: '4x6' | 'letter';
  label_download_type?: 'url' | 'inline';
  display_scheme?: string;
  is_return_label?: boolean;
}

export interface ListLabelsParams {
  label_status?: string;
  carrier_id?: string;
  service_code?: string;
  tracking_number?: string;
  batch_id?: string;
  warehouse_id?: string;
  created_at_start?: string;
  created_at_end?: string;
  page?: number;
  page_size?: number;
  sort_dir?: 'asc' | 'desc';
  sort_by?: string;
}

export interface CreateShipmentRequest {
  carrier_id?: string;
  service_code?: string;
  ship_from: AddressInput;
  ship_to: AddressInput;
  ship_date?: string;
  packages: Package[];
  confirmation?: string;
  customs?: CustomsInfo;
  external_shipment_id?: string;
  warehouse_id?: string;
  return_to?: AddressInput;
  advanced_options?: Record<string, unknown>;
  insurance_provider?: string;
  tags?: Array<{ name: string }>;
}

export interface ListShipmentsParams {
  shipment_status?: string;
  batch_id?: string;
  tag?: string;
  created_at_start?: string;
  created_at_end?: string;
  modified_at_start?: string;
  modified_at_end?: string;
  page?: number;
  page_size?: number;
  sort_dir?: 'asc' | 'desc';
  sort_by?: string;
  sales_order_id?: string;
}

export interface CreateWarehouseRequest {
  name: string;
  origin_address: AddressInput;
  return_address?: AddressInput;
}

export interface CreateManifestRequest {
  carrier_id?: string;
  excluded_label_ids?: string[];
  label_ids?: string[];
  warehouse_id?: string;
  ship_date?: string;
}

export interface ListManifestsParams {
  warehouse_id?: string;
  carrier_id?: string;
  ship_date_start?: string;
  ship_date_end?: string;
  created_at_start?: string;
  created_at_end?: string;
  page?: number;
  page_size?: number;
}

export interface ListServicePointsRequest {
  address_query?: string;
  address?: {
    address_line1?: string;
    city_locality?: string;
    state_province?: string;
    postal_code?: string;
    country_code: string;
  };
  providers: Array<{
    carrier_id: string;
    service_code?: string[];
  }>;
  lat?: number;
  long?: number;
  radius?: number;
  max_results?: number;
}

export interface SchedulePickupRequest {
  label_ids: string[];
  contact_details: {
    name: string;
    email?: string;
    phone: string;
  };
  pickup_notes?: string;
  pickup_window: {
    start_at: string;
    end_at: string;
  };
}

export interface ListPickupsParams {
  carrier_id?: string;
  warehouse_id?: string;
  created_at_start?: string;
  created_at_end?: string;
  page?: number;
  page_size?: number;
}
