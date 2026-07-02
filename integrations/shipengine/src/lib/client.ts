import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        'API-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Addresses ──────────────────────────────────────────────

  async validateAddresses(addresses: AddressInput[]) {
    let res = await this.axios.post('/v1/addresses/validate', addresses);
    return res.data as AddressValidationResult[];
  }

  async recognizeAddress(text: string) {
    let res = await this.axios.put('/v1/addresses/recognize', { text });
    return res.data as AddressRecognitionResult;
  }

  // ── Rates ──────────────────────────────────────────────────

  async getRates(params: GetRatesRequest) {
    let res = await this.axios.post('/v1/rates', params);
    return res.data as GetRatesResponse;
  }

  async estimateRates(params: EstimateRatesRequest) {
    let res = await this.axios.post('/v1/rates/estimate', params);
    return res.data as RateEstimate[];
  }

  async getRateById(rateId: string) {
    let res = await this.axios.get(`/v1/rates/${rateId}`);
    return res.data as RateEstimate;
  }

  // ── Labels ─────────────────────────────────────────────────

  async createLabel(params: CreateLabelRequest) {
    let res = await this.axios.post('/v1/labels', params);
    return res.data as LabelResponse;
  }

  async createLabelFromRate(rateId: string, params?: Partial<CreateLabelRequest>) {
    let res = await this.axios.post(`/v1/labels/rates/${rateId}`, params || {});
    return res.data as LabelResponse;
  }

  async createLabelFromShipment(shipmentId: string, params?: Partial<CreateLabelRequest>) {
    let res = await this.axios.post(`/v1/labels/shipment/${shipmentId}`, params || {});
    return res.data as LabelResponse;
  }

  async getLabel(labelId: string) {
    let res = await this.axios.get(`/v1/labels/${labelId}`);
    return res.data as LabelResponse;
  }

  async listLabels(params?: ListLabelsParams) {
    let res = await this.axios.get('/v1/labels', { params });
    return res.data as PaginatedResponse<LabelResponse>;
  }

  async voidLabel(labelId: string) {
    let res = await this.axios.put(`/v1/labels/${labelId}/void`);
    return res.data as VoidLabelResponse;
  }

  async createReturnLabel(labelId: string) {
    let res = await this.axios.post(`/v1/labels/${labelId}/return`);
    return res.data as LabelResponse;
  }

  // ── Shipments ──────────────────────────────────────────────

  async createShipments(shipments: CreateShipmentRequest[]) {
    let res = await this.axios.post('/v1/shipments', { shipments });
    return res.data as CreateShipmentsResponse;
  }

  async getShipment(shipmentId: string) {
    let res = await this.axios.get(`/v1/shipments/${shipmentId}`);
    return res.data as ShipmentResponse;
  }

  async updateShipment(shipmentId: string, params: Partial<CreateShipmentRequest>) {
    let res = await this.axios.put(`/v1/shipments/${shipmentId}`, params);
    return res.data as ShipmentResponse;
  }

  async listShipments(params?: ListShipmentsParams) {
    let res = await this.axios.get('/v1/shipments', { params });
    return res.data as PaginatedResponse<ShipmentResponse>;
  }

  async cancelShipment(shipmentId: string) {
    await this.axios.delete(`/v1/shipments/${shipmentId}`);
  }

  // ── Tracking ───────────────────────────────────────────────

  async getTrackingInfo(carrierCode: string, trackingNumber: string) {
    let res = await this.axios.get('/v1/tracking', {
      params: { carrier_code: carrierCode, tracking_number: trackingNumber }
    });
    return res.data as TrackingInfo;
  }

  async getLabelTrackingInfo(labelId: string) {
    let res = await this.axios.get(`/v1/labels/${labelId}/track`);
    return res.data as TrackingInfo;
  }

  async startTracking(carrierCode: string, trackingNumber: string) {
    await this.axios.post('/v1/tracking/start', null, {
      params: { carrier_code: carrierCode, tracking_number: trackingNumber }
    });
  }

  async stopTracking(carrierCode: string, trackingNumber: string) {
    await this.axios.post('/v1/tracking/stop', null, {
      params: { carrier_code: carrierCode, tracking_number: trackingNumber }
    });
  }

  // ── Carriers ───────────────────────────────────────────────

  async listCarriers() {
    let res = await this.axios.get('/v1/carriers');
    return res.data as ListCarriersResponse;
  }

  async getCarrier(carrierId: string) {
    let res = await this.axios.get(`/v1/carriers/${carrierId}`);
    return res.data as CarrierResponse;
  }

  async listCarrierServices(carrierId: string) {
    let res = await this.axios.get(`/v1/carriers/${carrierId}/services`);
    return res.data as ListCarrierServicesResponse;
  }

  async listCarrierPackageTypes(carrierId: string) {
    let res = await this.axios.get(`/v1/carriers/${carrierId}/packages`);
    return res.data as ListCarrierPackagesResponse;
  }

  async listCarrierOptions(carrierId: string) {
    let res = await this.axios.get(`/v1/carriers/${carrierId}/options`);
    return res.data as ListCarrierOptionsResponse;
  }

  // ── Warehouses ─────────────────────────────────────────────

  async createWarehouse(params: CreateWarehouseRequest) {
    let res = await this.axios.post('/v1/warehouses', params);
    return res.data as WarehouseResponse;
  }

  async listWarehouses() {
    let res = await this.axios.get('/v1/warehouses');
    return res.data as ListWarehousesResponse;
  }

  async getWarehouse(warehouseId: string) {
    let res = await this.axios.get(`/v1/warehouses/${warehouseId}`);
    return res.data as WarehouseResponse;
  }

  async updateWarehouse(warehouseId: string, params: Partial<CreateWarehouseRequest>) {
    let res = await this.axios.put(`/v1/warehouses/${warehouseId}`, params);
    return res.data as WarehouseResponse;
  }

  async deleteWarehouse(warehouseId: string) {
    await this.axios.delete(`/v1/warehouses/${warehouseId}`);
  }

  // ── Webhooks ───────────────────────────────────────────────

  async createWebhook(params: CreateWebhookRequest) {
    let res = await this.axios.post('/v1/environment/webhooks', params);
    return res.data as WebhookResponse;
  }

  async listWebhooks() {
    let res = await this.axios.get('/v1/environment/webhooks');
    return res.data as WebhookResponse[];
  }

  async getWebhook(webhookId: string) {
    let res = await this.axios.get(`/v1/environment/webhooks/${webhookId}`);
    return res.data as WebhookResponse;
  }

  async updateWebhook(webhookId: string, params: Partial<CreateWebhookRequest>) {
    let res = await this.axios.put(`/v1/environment/webhooks/${webhookId}`, params);
    return res.data as WebhookResponse;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/v1/environment/webhooks/${webhookId}`);
  }

  // ── Batches ────────────────────────────────────────────────

  async listBatches(params?: ListBatchesParams) {
    let res = await this.axios.get('/v1/batches', { params });
    return res.data as PaginatedResponse<BatchResponse>;
  }

  async getBatch(batchId: string) {
    let res = await this.axios.get(`/v1/batches/${batchId}`);
    return res.data as BatchResponse;
  }

  // ── Manifests ──────────────────────────────────────────────

  async createManifest(params: CreateManifestRequest) {
    let res = await this.axios.post('/v1/manifests', params);
    return res.data as ManifestResponse;
  }

  async listManifests(params?: ListManifestsParams) {
    let res = await this.axios.get('/v1/manifests', { params });
    return res.data as PaginatedResponse<ManifestResponse>;
  }

  // ── Tags ───────────────────────────────────────────────────

  async listTags() {
    let res = await this.axios.get('/v1/tags');
    return res.data as ListTagsResponse;
  }

  // ── Service Points ─────────────────────────────────────────

  async listServicePoints(params: ListServicePointsRequest) {
    let res = await this.axios.post('/v1/service_points/list', params);
    return res.data as ListServicePointsResponse;
  }

  // ── Pickups ────────────────────────────────────────────────

  async schedulePickup(params: SchedulePickupRequest) {
    let res = await this.axios.post('/v1/pickups', params);
    return res.data as PickupResponse;
  }

  async listPickups(params?: ListPickupsParams) {
    let res = await this.axios.get('/v1/pickups', { params });
    return res.data as PaginatedResponse<PickupResponse>;
  }

  async deletePickup(pickupId: string) {
    await this.axios.delete(`/v1/pickups/${pickupId}`);
  }
}

// ── Types ──────────────────────────────────────────────────

export interface AddressInput {
  name?: string;
  company_name?: string;
  phone?: string;
  address_line1: string;
  address_line2?: string;
  address_line3?: string;
  city_locality?: string;
  state_province?: string;
  postal_code?: string;
  country_code: string;
  address_residential_indicator?: 'unknown' | 'yes' | 'no';
}

export interface AddressValidationResult {
  status: 'verified' | 'unverified' | 'warning' | 'error';
  original_address: AddressInput;
  matched_address: AddressInput | null;
  messages: Array<{
    code: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    detail_code: string;
  }>;
}

export interface AddressRecognitionResult {
  score: number;
  address: AddressInput;
  entities: Array<{
    type: string;
    score: number;
    text: string;
    start_index: number;
    end_index: number;
    result: Record<string, any>;
  }>;
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

export interface GetRatesResponse {
  shipment_id: string;
  carrier_id: string;
  status: string;
  rate_response: {
    rates: RateEstimate[];
    invalid_rates: any[];
    rate_request_id: string;
    shipment_id: string;
    created_at: string;
    status: string;
    errors: any[];
  };
}

export interface RateEstimate {
  rate_id: string;
  rate_type: string;
  carrier_id: string;
  shipping_amount: MoneyAmount;
  insurance_amount: MoneyAmount;
  confirmation_amount: MoneyAmount;
  other_amount: MoneyAmount;
  tax_amount?: MoneyAmount;
  zone?: number;
  package_type: string;
  delivery_days?: number;
  guaranteed_service: boolean;
  estimated_delivery_date?: string;
  carrier_delivery_days?: string;
  ship_date?: string;
  negotiated_rate: boolean;
  service_type: string;
  service_code: string;
  trackable: boolean;
  carrier_code: string;
  carrier_nickname: string;
  carrier_friendly_name: string;
  validation_status: string;
  warning_messages: string[];
  error_messages: string[];
}

export interface MoneyAmount {
  currency: string;
  amount: number;
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

export interface LabelResponse {
  label_id: string;
  status: string;
  shipment_id: string;
  ship_date: string;
  created_at: string;
  shipment_cost: MoneyAmount;
  insurance_cost: MoneyAmount;
  tracking_number: string;
  is_return_label: boolean;
  rma_number?: string;
  is_international: boolean;
  batch_id?: string;
  carrier_id: string;
  service_code: string;
  package_code: string;
  voided: boolean;
  voided_at?: string;
  label_format: string;
  display_scheme: string;
  label_layout: string;
  trackable: boolean;
  label_image_id?: string;
  carrier_code: string;
  tracking_status: string;
  label_download: {
    pdf?: string;
    png?: string;
    zpl?: string;
    href: string;
  };
  form_download?: { href: string };
  insurance_claim?: { href: string };
  packages: any[];
  charge_event?: string;
}

export interface VoidLabelResponse {
  approved: boolean;
  message: string;
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
  advanced_options?: Record<string, any>;
  insurance_provider?: string;
  tags?: Array<{ name: string }>;
}

export interface ShipmentResponse {
  shipment_id: string;
  carrier_id: string;
  service_code: string;
  external_shipment_id?: string;
  ship_date: string;
  created_at: string;
  modified_at: string;
  shipment_status: string;
  ship_to: AddressInput;
  ship_from: AddressInput;
  warehouse_id?: string;
  return_to?: AddressInput;
  confirmation?: string;
  customs?: CustomsInfo;
  advanced_options?: Record<string, any>;
  insurance_provider?: string;
  tags: Array<{ name: string }>;
  packages: any[];
  total_weight: Weight;
  items?: any[];
}

export interface CreateShipmentsResponse {
  shipments: ShipmentResponse[];
  has_errors: boolean;
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

export interface TrackingInfo {
  tracking_number: string;
  tracking_url?: string;
  status_code: string;
  carrier_code?: string;
  carrier_id?: number;
  status_description: string;
  carrier_status_code?: string;
  carrier_detail_code?: string;
  carrier_status_description?: string;
  ship_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  exception_description?: string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  occurred_at: string;
  carrier_occurred_at?: string;
  description: string;
  city_locality?: string;
  state_province?: string;
  postal_code?: string;
  country_code?: string;
  company_name?: string;
  signer?: string;
  event_code?: string;
  carrier_detail_code?: string;
  status_code?: string;
  status_description?: string;
  carrier_status_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface CarrierResponse {
  carrier_id: string;
  carrier_code: string;
  account_number: string;
  requires_funded_amount: boolean;
  balance: number;
  nickname: string;
  friendly_name: string;
  primary: boolean;
  has_multi_package_supporting_services: boolean;
  supports_label_messages: boolean;
  services: any[];
  packages: any[];
  options: any[];
}

export interface ListCarriersResponse {
  carriers: CarrierResponse[];
}

export interface CarrierServiceResponse {
  carrier_id: string;
  carrier_code: string;
  service_code: string;
  name: string;
  domestic: boolean;
  international: boolean;
  is_multi_package_supported: boolean;
}

export interface ListCarrierServicesResponse {
  services: CarrierServiceResponse[];
}

export interface CarrierPackageResponse {
  package_id?: string;
  package_code: string;
  name: string;
  description?: string;
  dimensions?: Dimensions;
}

export interface ListCarrierPackagesResponse {
  packages: CarrierPackageResponse[];
}

export interface CarrierOptionResponse {
  name: string;
  default_value: string;
  description: string;
}

export interface ListCarrierOptionsResponse {
  options: CarrierOptionResponse[];
}

export interface CreateWarehouseRequest {
  name: string;
  origin_address: AddressInput;
  return_address?: AddressInput;
}

export interface WarehouseResponse {
  warehouse_id: string;
  name: string;
  created_at: string;
  origin_address: AddressInput;
  return_address: AddressInput;
  is_default: boolean;
}

export interface ListWarehousesResponse {
  warehouses: WarehouseResponse[];
}

export interface CreateWebhookRequest {
  event: string;
  url: string;
  headers?: Record<string, string>;
}

export interface WebhookResponse {
  webhook_id: string;
  event: string;
  url: string;
  headers: Record<string, string>;
}

export interface BatchResponse {
  batch_id: string;
  external_batch_id?: string;
  batch_number: string;
  created_at: string;
  processed_at?: string;
  errors: number;
  warnings: number;
  completed: number;
  forms: number;
  count: number;
  batch_shipments_url?: { href: string };
  batch_labels_url?: { href: string };
  batch_errors_url?: { href: string };
  label_download?: { href: string };
  form_download?: { href: string };
  status: string;
  label_layout?: string;
  label_format?: string;
}

export interface ListBatchesParams {
  status?: string;
  page?: number;
  page_size?: number;
  sort_dir?: 'asc' | 'desc';
  sort_by?: string;
}

export interface ManifestResponse {
  manifest_id: string;
  form_id: string;
  created_at: string;
  ship_date: string;
  shipments: number;
  warehouse_id: string;
  submission_id: string;
  carrier_id: string;
  manifest_download: { href: string };
}

export interface CreateManifestRequest {
  carrier_id: string;
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

export interface ListTagsResponse {
  tags: Array<{ name: string }>;
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
    service_code?: string;
  }>;
  lat?: number;
  long?: number;
  radius?: number;
  radius_unit?: 'km' | 'mi';
  max_results?: number;
}

export interface ServicePointResponse {
  carrier_code: string;
  service_codes: string[];
  service_point_id: string;
  name: string;
  address: AddressInput;
  lat: number;
  long: number;
  distance_in_km?: number;
  distance_in_miles?: number;
  hours_of_operation?: any;
  features?: string[];
}

export interface ListServicePointsResponse {
  service_points: ServicePointResponse[];
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

export interface PickupResponse {
  pickup_id: string;
  label_ids: string[];
  created_at: string;
  cancelled_at?: string;
  carrier_id: string;
  confirmation_number: string;
  warehouse_id?: string;
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

export interface PaginatedResponse<_T> {
  total: number;
  page: number;
  pages: number;
  links: {
    first: { href: string };
    last: { href: string };
    prev: { href: string };
    next: { href: string };
  };
  [key: string]: any;
}
