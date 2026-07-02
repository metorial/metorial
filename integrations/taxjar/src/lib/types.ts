// ---- Shared types ----

export interface NexusAddress {
  id?: string;
  country?: string;
  zip?: string;
  state?: string;
  city?: string;
  street?: string;
}

export interface LineItem {
  id?: string;
  quantity?: number;
  product_tax_code?: string;
  unit_price?: number;
  discount?: number;
}

export interface OrderLineItem {
  id?: string;
  quantity?: number;
  product_identifier?: string;
  description?: string;
  product_tax_code?: string;
  unit_price?: number;
  discount?: number;
  sales_tax?: number;
}

// ---- Tax Calculation ----

export interface TaxCalculationParams {
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country: string;
  to_zip?: string;
  to_state: string;
  to_city?: string;
  to_street?: string;
  amount?: number;
  shipping: number;
  customer_id?: string;
  exemption_type?: string;
  nexus_addresses?: NexusAddress[];
  line_items?: LineItem[];
}

export interface TaxBreakdownLineItem {
  id?: string;
  taxable_amount?: number;
  tax_collectable?: number;
  combined_tax_rate?: number;
  state_taxable_amount?: number;
  state_sales_tax_rate?: number;
  state_amount?: number;
  county_taxable_amount?: number;
  county_tax_rate?: number;
  county_amount?: number;
  city_taxable_amount?: number;
  city_tax_rate?: number;
  city_amount?: number;
  special_district_taxable_amount?: number;
  special_tax_rate?: number;
  special_district_amount?: number;
}

export interface TaxBreakdown {
  taxable_amount?: number;
  tax_collectable?: number;
  combined_tax_rate?: number;
  state_taxable_amount?: number;
  state_tax_rate?: number;
  state_tax_collectable?: number;
  county_taxable_amount?: number;
  county_tax_rate?: number;
  county_tax_collectable?: number;
  city_taxable_amount?: number;
  city_tax_rate?: number;
  city_tax_collectable?: number;
  special_district_taxable_amount?: number;
  special_tax_rate?: number;
  special_district_tax_collectable?: number;
  line_items?: TaxBreakdownLineItem[];
}

export interface TaxJurisdictions {
  country?: string;
  state?: string;
  county?: string;
  city?: string;
}

export interface TaxCalculationResult {
  order_total_amount: number;
  shipping: number;
  taxable_amount: number;
  amount_to_collect: number;
  rate: number;
  has_nexus: boolean;
  freight_taxable: boolean;
  tax_source?: string;
  jurisdictions?: TaxJurisdictions;
  breakdown?: TaxBreakdown;
}

// ---- Tax Rates ----

export interface RateParams {
  country?: string;
  state?: string;
  city?: string;
  street?: string;
}

export interface RateResult {
  zip: string;
  state: string;
  state_rate: string;
  county: string;
  county_rate: string;
  city: string;
  city_rate: string;
  combined_district_rate: string;
  combined_rate: string;
  freight_taxable: boolean;
}

// ---- Categories ----

export interface Category {
  product_tax_code: string;
  name: string;
  description: string;
}

// ---- Orders ----

export interface ListOrdersParams {
  transaction_date?: string;
  from_transaction_date?: string;
  to_transaction_date?: string;
  provider?: string;
}

export interface CreateOrderParams {
  transaction_id: string;
  transaction_date?: string;
  provider?: string;
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country: string;
  to_zip: string;
  to_state: string;
  to_city?: string;
  to_street?: string;
  amount: number;
  shipping: number;
  sales_tax: number;
  customer_id?: string;
  exemption_type?: string;
  line_items?: OrderLineItem[];
}

export interface UpdateOrderParams {
  transaction_id: string;
  transaction_date?: string;
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country?: string;
  to_zip?: string;
  to_state?: string;
  to_city?: string;
  to_street?: string;
  amount?: number;
  shipping?: number;
  sales_tax?: number;
  customer_id?: string;
  exemption_type?: string;
  line_items?: OrderLineItem[];
}

export interface Order {
  transaction_id: string;
  user_id?: number;
  transaction_date?: string;
  provider?: string;
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country?: string;
  to_zip?: string;
  to_state?: string;
  to_city?: string;
  to_street?: string;
  amount?: number;
  shipping?: number;
  sales_tax?: number;
  line_items?: OrderLineItem[];
}

// ---- Refunds ----

export interface ListRefundsParams {
  transaction_date?: string;
  from_transaction_date?: string;
  to_transaction_date?: string;
  provider?: string;
}

export interface CreateRefundParams {
  transaction_id: string;
  transaction_reference_id: string;
  transaction_date?: string;
  provider?: string;
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country: string;
  to_zip: string;
  to_state: string;
  to_city?: string;
  to_street?: string;
  amount: number;
  shipping: number;
  sales_tax: number;
  customer_id?: string;
  exemption_type?: string;
  line_items?: OrderLineItem[];
}

export interface UpdateRefundParams {
  transaction_id: string;
  transaction_reference_id?: string;
  transaction_date?: string;
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country?: string;
  to_zip?: string;
  to_state?: string;
  to_city?: string;
  to_street?: string;
  amount?: number;
  shipping?: number;
  sales_tax?: number;
  customer_id?: string;
  exemption_type?: string;
  line_items?: OrderLineItem[];
}

export interface Refund {
  transaction_id: string;
  user_id?: number;
  transaction_date?: string;
  transaction_reference_id?: string;
  provider?: string;
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country?: string;
  to_zip?: string;
  to_state?: string;
  to_city?: string;
  to_street?: string;
  amount?: number;
  shipping?: number;
  sales_tax?: number;
  line_items?: OrderLineItem[];
}

// ---- Customers ----

export interface ExemptRegion {
  country: string;
  state: string;
}

export interface CreateCustomerParams {
  customer_id: string;
  exemption_type: string;
  name: string;
  exempt_regions?: ExemptRegion[];
  country?: string;
  state?: string;
  zip?: string;
  city?: string;
  street?: string;
}

export interface UpdateCustomerParams {
  customer_id: string;
  exemption_type?: string;
  name?: string;
  exempt_regions?: ExemptRegion[];
  country?: string;
  state?: string;
  zip?: string;
  city?: string;
  street?: string;
}

export interface Customer {
  customer_id: string;
  exemption_type: string;
  name: string;
  exempt_regions?: ExemptRegion[];
  country?: string;
  state?: string;
  zip?: string;
  city?: string;
  street?: string;
}

// ---- Nexus ----

export interface NexusRegion {
  country_code: string;
  country: string;
  region_code: string;
  region: string;
}

// ---- Address Validation ----

export interface ValidateAddressParams {
  country?: string;
  state?: string;
  zip?: string;
  city?: string;
  street?: string;
}

export interface ValidatedAddress {
  zip: string;
  state: string;
  city: string;
  street: string;
  country: string;
}

// ---- Summary Rates ----

export interface SummaryRate {
  country_code: string;
  country: string;
  region_code: string;
  region: string;
  minimum_rate: {
    label: string;
    rate: number;
  };
  average_rate: {
    label: string;
    rate: number;
  };
}
