import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';
import * as response from './response';
import type {
  AddressInput,
  CreateLabelRequest,
  CreateManifestRequest,
  CreateShipmentRequest,
  CreateWarehouseRequest,
  EstimateRatesRequest,
  GetRatesRequest,
  ListLabelsParams,
  ListManifestsParams,
  ListPickupsParams,
  ListServicePointsRequest,
  ListShipmentsParams,
  SchedulePickupRequest
} from './types';

export type * from './types';
export type LabelResponse = z.output<typeof response.label>;
export type ShipmentResponse = z.output<typeof response.shipment>;
export type WarehouseResponse = z.output<typeof response.warehouse>;
export type ManifestResponse = z.output<typeof response.manifest>;
export type PickupResponse = z.output<typeof response.pickup>;
export type TrackingInfo = z.output<typeof response.tracking>;
export const baseUrls = [
  'https://api.shipengine.com',
  'https://api.eu.shipengine.com'
] as const;
export const baseUrlSchema = z.enum(baseUrls);
const pageSchema = z.object({
  total: response.count,
  page: response.count,
  pages: response.count
});

const safeText = (value: string) =>
  value.trim().length > 0 &&
  ![...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
export const validateToken = (token: string) => {
  if (typeof token !== 'string' || !safeText(token) || token !== token.trim())
    throw createApiServiceError(
      'Enter a valid ShipEngine API key without surrounding whitespace or control characters.'
    );
};
const idPath = (id: string, kind: 'resource' | 'pickup' = 'resource') => {
  if (!(kind === 'pickup' ? response.pickupId : response.resourceId).safeParse(id).success)
    throw createApiServiceError(
      `Enter an exact ${kind === 'pickup' ? 'pickup' : 'ShipEngine resource'} ID from the provider.`
    );
  return encodeURIComponent(id);
};
export const apiFailure = (status?: number, uncertain = false) => {
  const error = buildApiServiceError(
    {},
    {
      providerLabel: 'ShipEngine',
      reason: 'shipengine_api_error',
      operation: 'request',
      parent: {},
      extractStatus: () => status,
      extractMessage: () => '',
      formatMessage: () =>
        `ShipEngine request failed${status ? ` (HTTP ${status})` : ''}. ${status === 401 ? 'Check the API key.' : status === 403 ? 'Check API key permissions and account access.' : status === 429 ? 'Wait before retrying.' : 'Check the provider record.'}${uncertain ? ' The change may have reached the provider; verify its state before retrying a purchase or change.' : ''}`
    }
  );
  if (uncertain) error.data.writeMayHaveOccurred = true;
  return error;
};
const upstreamStatus = (error: unknown): number | undefined => {
  const data = error && typeof error === 'object' ? Reflect.get(error, 'data') : undefined;
  const baggage = data && typeof data === 'object' ? Reflect.get(data, 'baggage') : undefined;
  const mapped =
    baggage && typeof baggage === 'object'
      ? Reflect.get(baggage, 'serviceErrorData')
      : undefined;
  const status = Number(
    (data && typeof data === 'object' ? Reflect.get(data, 'upstreamStatus') : undefined) ??
      (mapped && typeof mapped === 'object'
        ? Reflect.get(mapped, 'upstreamStatus')
        : undefined) ??
      getApiErrorStatus(error)
  );
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
};
const validateRequest = (value: unknown, field = ''): void => {
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) ||
      (['value', 'length', 'width', 'height', 'quantity', 'amount'].includes(field) &&
        value < 0))
  )
    throw createApiServiceError(
      'Provide finite, non-negative package dimensions, weight, quantity and money.'
    );
  if (typeof value === 'string') {
    if (value.trim().length === 0) throw createApiServiceError('Provide non-empty values.');
    if (
      [
        'carrier_id',
        'warehouse_id',
        'shipment_id',
        'label_id',
        'excluded_label_id',
        'manifest_id',
        'manifest_request_id',
        'form_id',
        'batch_id',
        'shipping_rule_id',
        'pickup_id'
      ].includes(field)
    )
      idPath(value, field === 'pickup_id' ? 'pickup' : 'resource');
    if (
      (field.endsWith('_at_start') ||
        field.endsWith('_at_end') ||
        ['ship_date', 'ship_date_start', 'ship_date_end', 'start_at', 'end_at'].includes(
          field
        )) &&
      !Number.isFinite(Date.parse(value))
    )
      throw createApiServiceError('Provide valid ISO dates and times.');
    if (field === 'country_code' && !/^[A-Z]{2}$/.test(value))
      throw createApiServiceError('Use a two-letter uppercase country code.');
  }
  if (Array.isArray(value)) {
    for (const item of value)
      validateRequest(item, field.endsWith('_ids') ? field.slice(0, -1) : field);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value))
      if (item !== undefined) validateRequest(item, key);
  }
};

export const containsCredential = (value: string, token: string): boolean => {
  const forms = [
    token,
    Buffer.from(token).toString('base64'),
    Buffer.from(token).toString('base64url'),
    Buffer.from(token).toString('hex'),
    Buffer.from(token).toString('hex').toUpperCase()
  ];
  let decoded = value;
  for (let i = 0; i <= 4; i++) {
    if (forms.some(form => decoded.includes(form))) return true;
    for (const match of decoded.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
      const encoded = match[0];
      const bytes = Buffer.from(encoded, 'base64');
      if (
        bytes.toString('base64url') ===
          encoded.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') &&
        bytes.toString().includes(token)
      )
        return true;
    }
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, part =>
        Buffer.from(part.replaceAll('%', ''), 'hex').toString()
      );
    }
    if (next === decoded) break;
    decoded = next;
  }
  return false;
};
const scrubCredential = (value: unknown, token: string): unknown => {
  if (typeof value === 'string')
    return containsCredential(value, token) ? '[redacted]' : value;
  if (Array.isArray(value)) return value.map(item => scrubCredential(item, token));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !containsCredential(key, token))
        .map(([key, item]) => [key, scrubCredential(item, token)])
    );
  return value;
};

export class Client {
  private axios;
  private token: string;
  private redactedRecords = new WeakSet<object>();
  readonly baseUrl: z.infer<typeof baseUrlSchema>;
  constructor(config: { token: string; baseUrl?: string }) {
    validateToken(config.token);
    this.token = config.token;
    const base = baseUrlSchema.safeParse(config.baseUrl ?? baseUrls[0]);
    if (!base.success)
      throw createApiServiceError('Select the supported US or EU ShipEngine API host.');
    this.baseUrl = base.data;
    this.axios = createAxios({
      baseURL: this.baseUrl,
      headers: { 'API-Key': config.token, 'Content-Type': 'application/json' },
      timeout: 30_000,
      maxRedirects: 0,
      validateStatus: () => true,
      transformResponse: [response.parseResponse]
    });
  }
  private async request<S extends z.ZodType>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    schema: S,
    data?: unknown,
    params?: object
  ): Promise<z.output<S>> {
    validateRequest(data);
    validateRequest(params);
    if (params)
      for (const key of ['page', 'page_size']) {
        const value = Reflect.get(params, key);
        if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
          throw createApiServiceError('Page and page size must be positive safe integers.');
      }
    let res: { status: number; data: unknown };
    try {
      res = await this.axios.request({
        method,
        url: path,
        data,
        params: params ? pickDefined(params) : undefined
      });
    } catch (error) {
      throw apiFailure(upstreamStatus(error), method !== 'GET');
    }
    if (res.status < 200 || res.status >= 300)
      throw apiFailure(res.status, method !== 'GET' && res.status >= 500);
    const scrubbed = scrubCredential(res.data, this.token);
    const parsed = schema.safeParse(scrubbed);
    if (!parsed.success) {
      const error = createApiServiceError(
        `ShipEngine returned an unexpected response.${method !== 'GET' ? ' The change may have succeeded; check its state before retrying a purchase or change.' : ' Check the provider record before continuing.'}`
      );
      if (method !== 'GET') {
        error.data.writeMayHaveOccurred = true;
        if (scrubbed && typeof scrubbed === 'object')
          for (const [native, receipt, validator] of [
            ['label_id', 'labelId', response.resourceId],
            ['shipment_id', 'shipmentId', response.resourceId],
            ['warehouse_id', 'warehouseId', response.resourceId],
            ['pickup_id', 'pickupId', response.pickupId],
            ['manifest_id', 'manifestId', response.resourceId]
          ] as const) {
            const value = validator.safeParse(Reflect.get(scrubbed, native));
            if (value.success) error.data[receipt] = value.data;
          }
      }
      throw error;
    }
    if (
      parsed.data &&
      typeof parsed.data === 'object' &&
      JSON.stringify(scrubbed) !== JSON.stringify(res.data)
    )
      this.redactedRecords.add(parsed.data);
    return parsed.data;
  }
  private async exact<S extends z.ZodType>(
    path: string,
    schema: S,
    key: string,
    id: string
  ): Promise<z.output<S>> {
    const result = await this.request('GET', path, schema);
    if (!result || typeof result !== 'object' || Reflect.get(result, key) !== id)
      throw createApiServiceError(
        'ShipEngine returned a different resource. Check the exact provider ID before continuing.'
      );
    return result;
  }
  async settings() {
    return this.request(
      'GET',
      '/v1/account/settings',
      z.object({ default_label_layout: z.string().optional() })
    );
  }
  async validateAddresses(addresses: AddressInput[]) {
    return this.request(
      'POST',
      '/v1/addresses/validate',
      z.array(
        z.object({
          status: z.enum(['verified', 'unverified', 'warning', 'error']),
          original_address: response.address,
          matched_address: response.address.nullable(),
          messages: z.array(
            z.object({
              code: z.string(),
              message: z.string(),
              type: z.enum(['info', 'warning', 'error']),
              detail_code: response.optionalText
            })
          )
        })
      ),
      addresses
    );
  }
  async recognizeAddress(text: string) {
    return this.request(
      'PUT',
      '/v1/addresses/recognize',
      z.object({
        score: z.number().min(0).max(1),
        address: response.partialAddress,
        entities: z.array(
          z.object({
            type: z.string(),
            score: z.number().min(0).max(1),
            text: z.string(),
            start_index: response.count,
            end_index: response.count
          })
        )
      }),
      { text }
    );
  }
  private async carrierIds(ids?: string[]) {
    if (ids) {
      if (ids.length === 0) throw createApiServiceError('Select at least one carrier.');
      return ids;
    }
    const result = await this.listCarriers();
    if (!result.carriers.length)
      throw createApiServiceError('Connect a supported carrier before requesting rates.');
    return result.carriers.map(c => c.carrier_id);
  }
  async getRates(params: GetRatesRequest) {
    validateRequest(params);
    params.rate_options = {
      ...params.rate_options,
      carrier_ids: await this.carrierIds(params.rate_options?.carrier_ids)
    };
    return this.request(
      'POST',
      '/v1/rates',
      z.object({
        shipment_id: response.resourceId,
        rate_response: z.object({
          rates: z.array(response.rate),
          errors: z
            .array(
              z.object({
                error_source: response.optionalText,
                error_type: response.optionalText,
                error_code: response.optionalText
              })
            )
            .optional()
        })
      }),
      params
    );
  }
  async estimateRates(params: EstimateRatesRequest) {
    validateRequest(params);
    return this.request('POST', '/v1/rates/estimate', z.array(response.rate), {
      ...params,
      carrier_ids: await this.carrierIds(params.carrier_ids)
    });
  }
  async createLabel(params: CreateLabelRequest) {
    const result = await this.request('POST', '/v1/labels', response.label, params);
    if (
      (result.carrier_id !== undefined && result.carrier_id !== params.shipment.carrier_id) ||
      (result.service_code !== undefined &&
        result.service_code !== params.shipment.service_code) ||
      (params.shipment.external_shipment_id !== undefined &&
        result.external_shipment_id !== undefined &&
        result.external_shipment_id !== params.shipment.external_shipment_id)
    ) {
      const error = createApiServiceError(
        'The label purchase returned different shipment details. Check the existing label before purchasing again.'
      );
      Object.assign(error.data, {
        writeMayHaveOccurred: true,
        labelId: result.label_id,
        shipmentId: result.shipment_id
      });
      throw error;
    }
    return result;
  }
  async createLabelFromRate(id: string, params?: Partial<CreateLabelRequest>) {
    const rates = await this.request(
      'GET',
      `/v1/rates/${idPath(id)}`,
      z.object({ shipment_id: response.resourceId, rates: z.array(response.rate) })
    );
    const matches = rates.rates.filter(rate => rate.rate_id === id);
    if (matches.length !== 1)
      throw createApiServiceError(
        'The rate lookup did not identify this exact rate and shipment. Retrieve current rates before purchasing a label.'
      );
    const result = await this.request(
      'POST',
      `/v1/labels/rates/${idPath(id)}`,
      response.label,
      params ?? {}
    );
    if (result.shipment_id !== rates.shipment_id) {
      const error = createApiServiceError(
        'The label purchase returned a different rate shipment. Check the existing label before purchasing again.'
      );
      Object.assign(error.data, {
        writeMayHaveOccurred: true,
        labelId: result.label_id,
        shipmentId: result.shipment_id,
        rateId: id
      });
      throw error;
    }
    return result;
  }
  async createLabelFromShipment(id: string, params?: Partial<CreateLabelRequest>) {
    const result = await this.request(
      'POST',
      `/v1/labels/shipment/${idPath(id)}`,
      response.label,
      params ?? {}
    );
    if (result.shipment_id !== id) {
      const error = createApiServiceError(
        'The label purchase returned a different shipment. Check the existing label before purchasing again.'
      );
      error.data.writeMayHaveOccurred = true;
      error.data.labelId = result.label_id;
      error.data.shipmentId = result.shipment_id;
      throw error;
    }
    return result;
  }
  async getLabel(id: string, downloadType: 'url' | 'inline' = 'url') {
    const result = await this.request(
      'GET',
      `/v1/labels/${idPath(id)}`,
      response.label,
      undefined,
      { label_download_type: downloadType }
    );
    if (result.label_id !== id)
      throw createApiServiceError(
        'ShipEngine returned a different label. Check the exact ID before continuing.'
      );
    return result;
  }
  async listLabels(params?: ListLabelsParams) {
    if (params?.sort_by === 'ship_date')
      throw createApiServiceError(
        'Sorting labels by ship_date is unsupported. Use created_at, modified_at or voided_at.'
      );
    return this.request(
      'GET',
      '/v1/labels',
      pageSchema.extend({ labels: z.array(response.label) }),
      undefined,
      params
    );
  }
  async voidLabel(id: string) {
    return this.request(
      'PUT',
      `/v1/labels/${idPath(id)}/void`,
      z.object({ approved: z.boolean(), message: z.string() })
    );
  }
  async createShipments(shipments: CreateShipmentRequest[]) {
    const result = await this.request(
      'POST',
      '/v1/shipments',
      z.object({ shipments: z.array(response.shipment), has_errors: z.boolean() }),
      { shipments }
    );
    if (
      result.has_errors ||
      result.shipments.length !== shipments.length ||
      result.shipments.some(s => s.errors?.length)
    ) {
      const error = createApiServiceError(
        'ShipEngine reported an incomplete shipment creation. Check the provider for any created shipment before retrying.'
      );
      Object.assign(error.data, {
        writeMayHaveOccurred: true,
        shipmentIds: result.shipments.map(s => s.shipment_id)
      });
      throw error;
    }
    return result;
  }
  async getShipment(id: string) {
    return this.exact(`/v1/shipments/${idPath(id)}`, response.shipment, 'shipment_id', id);
  }
  async updateShipment(id: string, params: Partial<CreateShipmentRequest>) {
    if (!Object.keys(params).length)
      throw createApiServiceError('Provide at least one shipment field to update.');
    validateRequest(params);
    const before = await this.getShipment(id);
    if (this.redactedRecords.has(before))
      throw createApiServiceError(
        'The existing shipment contains sensitive values that cannot be safely reused for an update. Review the provider record before changing it.'
      );
    const result = await this.request(
      'PUT',
      `/v1/shipments/${idPath(id)}`,
      response.shipment,
      {
        carrier_id: before.carrier_id,
        service_code: before.service_code,
        shipping_rule_id: before.shipping_rule_id,
        external_order_id: before.external_order_id,
        items: before.items,
        tax_identifiers: before.tax_identifiers,
        shipment_number: before.shipment_number,
        is_return: before.is_return,
        order_source_code: before.order_source_code,
        comparison_rate_type: before.comparison_rate_type,
        ship_date: before.ship_date,
        packages: before.packages,
        tags: before.tags,
        confirmation: before.confirmation,
        external_shipment_id: before.external_shipment_id,
        warehouse_id: before.warehouse_id,
        return_to: before.return_to,
        customs: before.customs,
        advanced_options: before.advanced_options,
        insurance_provider: before.insurance_provider,
        ...params,
        ship_from: params.ship_from ?? before.ship_from,
        ship_to: params.ship_to ?? before.ship_to
      }
    );
    if (result.errors?.length)
      throw createApiServiceError(
        'ShipEngine reported shipment update errors. Check the provider state before retrying.'
      );
    if (result.shipment_id !== id)
      throw createApiServiceError(
        'ShipEngine returned a different shipment. Check the provider state before continuing.'
      );
    return result;
  }
  async listShipments(params?: ListShipmentsParams) {
    return this.request(
      'GET',
      '/v1/shipments',
      pageSchema.extend({ shipments: z.array(response.shipment) }),
      undefined,
      params
    );
  }
  async cancelShipment(id: string) {
    await this.getShipment(id);
    await this.request('PUT', `/v1/shipments/${idPath(id)}/cancel`, z.unknown());
    const result = await this.getShipment(id);
    if (result.shipment_status !== 'cancelled')
      throw createApiServiceError(
        'Shipment cancellation is not yet confirmed. The record is retained; check its status before retrying.'
      );
    return result;
  }
  async getTrackingInfo(carrierCode: string, trackingNumber: string) {
    const result = await this.request('GET', '/v1/tracking', response.tracking, undefined, {
      carrier_code: carrierCode,
      tracking_number: trackingNumber
    });
    if (
      result.tracking_number !== trackingNumber ||
      (result.carrier_code !== undefined && result.carrier_code !== carrierCode)
    )
      throw createApiServiceError(
        'ShipEngine returned tracking for a different package or carrier. Check the exact tracking number and carrier code.'
      );
    return result;
  }
  async getLabelTrackingInfo(id: string) {
    const label = await this.getLabel(id);
    if (!label.tracking_number)
      throw createApiServiceError(
        'This label has no tracking number yet. Check its existing status before continuing.'
      );
    const result = await this.request(
      'GET',
      `/v1/labels/${idPath(id)}/track`,
      response.tracking
    );
    if (
      result.tracking_number !== label.tracking_number ||
      (label.carrier_code !== undefined &&
        result.carrier_code !== undefined &&
        result.carrier_code !== label.carrier_code)
    )
      throw createApiServiceError(
        'ShipEngine returned tracking for a different label package. Check the existing label before continuing.'
      );
    return result;
  }
  async listCarriers() {
    return this.request(
      'GET',
      '/v1/carriers',
      z.object({ carriers: z.array(response.carrier) })
    );
  }
  async listCarrierServices(id: string) {
    const result = await this.request(
      'GET',
      `/v1/carriers/${idPath(id)}/services`,
      z.object({
        services: z.array(
          z.object({
            carrier_id: response.resourceId,
            carrier_code: z.string(),
            service_code: z.string(),
            name: z.string(),
            domestic: z.boolean(),
            international: z.boolean()
          })
        )
      })
    );
    if (result.services.some(service => service.carrier_id !== id))
      throw createApiServiceError(
        'ShipEngine returned services for a different carrier. Check the exact carrier ID.'
      );
    return result;
  }
  async listCarrierPackageTypes(id: string) {
    return this.request(
      'GET',
      `/v1/carriers/${idPath(id)}/packages`,
      z.object({
        packages: z.array(
          z.object({
            package_code: z.string(),
            name: z.string(),
            description: response.optionalText
          })
        )
      })
    );
  }
  async createWarehouse(params: CreateWarehouseRequest) {
    return this.request('POST', '/v1/warehouses', response.warehouse, params);
  }
  async listWarehouses() {
    return this.request(
      'GET',
      '/v1/warehouses',
      z.object({ warehouses: z.array(response.warehouse) })
    );
  }
  async getWarehouse(id: string) {
    return this.exact(`/v1/warehouses/${idPath(id)}`, response.warehouse, 'warehouse_id', id);
  }
  async updateWarehouse(id: string, params: Partial<CreateWarehouseRequest>) {
    if (!Object.keys(params).length)
      throw createApiServiceError('Provide at least one warehouse field to update.');
    validateRequest(params);
    const before = await this.getWarehouse(id);
    if (this.redactedRecords.has(before))
      throw createApiServiceError(
        'The existing warehouse contains sensitive values that cannot be safely reused for an update. Review the provider record before changing it.'
      );
    await this.request('PUT', `/v1/warehouses/${idPath(id)}`, z.unknown(), {
      name: params.name ?? before.name,
      origin_address: params.origin_address ?? before.origin_address,
      return_address: params.return_address ?? before.return_address
    });
    return this.getWarehouse(id);
  }
  async deleteWarehouse(id: string) {
    await this.getWarehouse(id);
    await this.request('DELETE', `/v1/warehouses/${idPath(id)}`, z.unknown());
    try {
      await this.getWarehouse(id);
    } catch (error) {
      if (error instanceof ServiceError && Number(error.data.upstreamStatus) === 404) return;
      throw error;
    }
    throw createApiServiceError(
      'Warehouse deletion is not confirmed. Check the provider record before retrying.'
    );
  }
  async createManifest(params: CreateManifestRequest) {
    return this.request('POST', '/v1/manifests', response.manifestsResponse, params);
  }
  async getManifest(id: string) {
    return this.exact(`/v1/manifests/${idPath(id)}`, response.manifest, 'manifest_id', id);
  }
  async getManifestRequest(id: string) {
    const result = await this.request(
      'GET',
      `/v1/manifests/requests/${idPath(id)}`,
      response.manifestsResponse
    );
    if (!result.manifests?.length && !result.manifest_requests?.length)
      throw createApiServiceError(
        'Manifest request state is unavailable. Check the exact provider request before submitting another manifest.'
      );
    if (
      result.manifest_requests?.length &&
      !result.manifest_requests.some(request => request.manifest_request_id === id)
    )
      throw createApiServiceError(
        'ShipEngine returned a different manifest request. Check the exact ID before continuing.'
      );
    return result;
  }
  async listManifests(params?: ListManifestsParams) {
    return this.request(
      'GET',
      '/v1/manifests',
      pageSchema.extend({ manifests: z.array(response.manifest) }),
      undefined,
      params
    );
  }
  async listServicePoints(params: ListServicePointsRequest) {
    return this.request(
      'POST',
      '/v1/service_points/list',
      z.object({
        service_points: z.array(
          z.object({
            service_point_id: z.string(),
            carrier_code: z.string(),
            service_codes: z.array(z.string()),
            company_name: response.optionalText,
            address_line1: z.string(),
            country_code: z.string(),
            city_locality: response.optionalText,
            state_province: response.optionalText,
            postal_code: response.optionalText,
            lat: z.number().finite(),
            long: z.number().finite(),
            distance_in_meters: z.number().finite().optional(),
            features: z.array(z.string()).optional()
          })
        )
      }),
      params
    );
  }
  async schedulePickup(params: SchedulePickupRequest) {
    if (new Set(params.label_ids).size !== params.label_ids.length)
      throw createApiServiceError('Provide each pickup label ID only once.');
    const result = await this.request('POST', '/v1/pickups', response.pickup, params);
    if (
      result.label_ids.length !== params.label_ids.length ||
      new Set(result.label_ids).size !== result.label_ids.length ||
      result.label_ids.some(id => !params.label_ids.includes(id))
    ) {
      const error = createApiServiceError(
        'The pickup response identifies different labels. Check the existing pickup before scheduling another.'
      );
      error.data.writeMayHaveOccurred = true;
      error.data.pickupId = result.pickup_id;
      throw error;
    }
    return result;
  }
  async getPickup(id: string) {
    return this.exact(`/v1/pickups/${idPath(id, 'pickup')}`, response.pickup, 'pickup_id', id);
  }
  async listPickups(params?: ListPickupsParams) {
    return this.request(
      'GET',
      '/v1/pickups',
      pageSchema.extend({ pickups: z.array(response.pickup) }),
      undefined,
      params
    );
  }
  async deletePickup(id: string) {
    await this.getPickup(id);
    const result = await this.request(
      'DELETE',
      `/v1/pickups/${idPath(id, 'pickup')}`,
      z.object({ pickup_id: response.pickupId })
    );
    if (result.pickup_id !== id)
      throw createApiServiceError(
        'ShipEngine returned a different pickup. Check the provider before continuing.'
      );
    const after = await this.getPickup(id);
    if (!after.cancelled_at && !after.canceled_at)
      throw createApiServiceError(
        'Pickup cancellation is not confirmed. Carrier history is retained; check its status before retrying.'
      );
  }
}
export const createClient = (ctx: {
  auth: { token: string; baseUrl?: string };
  config?: unknown;
}) => {
  const legacyBase =
    ctx.config && typeof ctx.config === 'object'
      ? Reflect.get(ctx.config, 'baseUrl')
      : undefined;
  if (ctx.auth.baseUrl && legacyBase && ctx.auth.baseUrl !== legacyBase)
    throw createApiServiceError(
      'The saved API host conflicts with the connection. Reconnect with the intended host.'
    );
  return new Client({
    token: ctx.auth.token,
    baseUrl: ctx.auth.baseUrl ?? (typeof legacyBase === 'string' ? legacyBase : undefined)
  });
};
