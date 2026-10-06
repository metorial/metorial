import { createAxios, isApiErrorRecord, pickDefined } from 'slates';
import type { z } from 'zod';
import {
  API_VERSION,
  type Auth,
  authScheme,
  decimal,
  invalid,
  ORIGIN,
  objectId,
  positiveInteger,
  record,
  safeData,
  text,
  timestamp,
  upstream
} from './helpers';
import {
  carrierTemplateSchema,
  parse,
  type Resource,
  rateSchema,
  resourceSchema,
  trackingSchema
} from './schemas';

export type PageOptions = { page?: number; results?: number; nextPage?: string };
export type Page<T> = { count?: number; next?: string; previous?: string; results: T[] };
export class ShippoClient {
  private axios: ReturnType<typeof createAxios>;
  readonly scheme: 'ShippoToken' | 'Bearer';
  private token: string;
  constructor(auth: Auth) {
    this.scheme = authScheme(auth);
    this.token = auth.token;
    this.axios = createAxios({
      baseURL: ORIGIN,
      timeout: 30_000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      headers: {
        Authorization: `${this.scheme} ${this.token}`,
        'Content-Type': 'application/json',
        'SHIPPO-API-VERSION': API_VERSION
      }
    });
  }
  private async request(
    method: 'get' | 'post' | 'delete',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const response = await this.axios.request({ method, url: path, data, params });
      return response.data === '' || response.data === undefined
        ? undefined
        : safeData(
            response.data,
            this.token,
            0,
            [],
            new URL(path, ORIGIN).pathname.replace(/\/$/, '') === '/parcel-templates'
          );
    } catch (error) {
      const e = upstream(
        error,
        method === 'get' ? 'read' : method === 'delete' ? 'delete' : 'create',
        true
      );
      if (method !== 'get') {
        e.data.writeMayHaveOccurred = true;
        e.data.resourcePath = path;
      }
      throw e;
    }
  }
  private async get(path: string, id: string): Promise<Resource> {
    const result = parse(resourceSchema, await this.request('get', `${path}/${objectId(id)}`));
    if (result.object_id !== id)
      throw invalid(
        'Shippo returned a different resource ID. Do not use it for a downstream operation.'
      );
    return result;
  }
  private async create(
    path: string,
    input: Record<string, unknown> | undefined,
    reference: Record<string, string> = {}
  ): Promise<Resource> {
    let result: Resource | undefined;
    try {
      result = parse(
        resourceSchema,
        await this.request('post', path, input === undefined ? undefined : pickDefined(input))
      );
      objectId(result.object_id);
      if (result.status === 'ERROR')
        throw invalid(
          'Shippo created an error-state resource. Inspect its exact ID and account history before retrying.'
        );
      return result;
    } catch (error) {
      const e = upstream(error, 'create confirmation');
      e.data.writeMayHaveOccurred = true;
      e.data.resourcePath = path;
      if (result) e.data.resourceId = result.object_id;
      e.data.resourceReferences = safeData(reference, this.token);
      throw e;
    }
  }
  private continuation(value: unknown, path: string): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const urlText = text(value, 'Continuation URL');
    let url: URL;
    try {
      url = new URL(urlText);
    } catch {
      throw invalid('Shippo returned an invalid continuation URL.');
    }
    const allowed = [
      'page',
      'page_token',
      'results',
      'rate',
      'tracking_status',
      'object_status',
      'carrier',
      'object_results'
    ];
    if (
      url.origin !== ORIGIN ||
      url.username ||
      url.password ||
      url.hash ||
      url.pathname.replace(/\/$/, '') !== path ||
      [...url.searchParams.keys()].some(k => !allowed.includes(k)) ||
      [...url.searchParams.keys()].some(k => url.searchParams.getAll(k).length !== 1)
    )
      throw invalid('Use a continuation from the same Shippo resource and API server.');
    safeData(url.href, this.token);
    return url.href;
  }
  private async list<T extends z.ZodType>(
    path: string,
    schema: T,
    params: PageOptions & Record<string, unknown> = {}
  ): Promise<Page<z.infer<T>>> {
    const { nextPage, ...query } = params;
    if (query.page !== undefined) positiveInteger(query.page, 'page');
    if (query.results !== undefined && positiveInteger(query.results, 'resultsPerPage') > 100)
      throw invalid('resultsPerPage must be from 1 to 100.');
    const next = this.continuation(nextPage, path);
    if (next && query.page !== undefined) throw invalid('Do not combine nextPage with page.');
    if (next) {
      const url = new URL(next);
      for (const [key, value] of Object.entries(pickDefined(query)))
        if (String(value) !== url.searchParams.get(key))
          throw invalid(
            'Keep supplied filters and page size identical to the preceding provider continuation.'
          );
    }
    const data = record(
      await this.request('get', next ?? path, undefined, next ? undefined : pickDefined(query))
    );
    if (!Array.isArray(data.results)) throw invalid('Shippo returned an invalid collection.');
    let count: number | undefined;
    if (data.count !== undefined && data.count !== null) {
      if (
        typeof data.count !== 'number' ||
        !Number.isSafeInteger(data.count) ||
        data.count < 0
      )
        throw invalid('Shippo returned an invalid total count.');
      count = data.count;
    }
    return {
      count,
      next: this.continuation(data.next, path),
      previous: this.continuation(data.previous, path),
      results: data.results.map(r => parse(schema, r))
    };
  }
  private address(value: unknown, inlineOnly = false): unknown {
    if (typeof value === 'string' && !inlineOnly) return objectId(value);
    const address = record(value);
    text(address.country, 'Address country');
    if (inlineOnly)
      for (const field of ['name', 'street1', 'city', 'zip', 'phone'])
        text(address[field], `Pickup address ${field}`);
    if (Object.keys(address).some(k => /password|token|secret|authorization/i.test(k)))
      throw invalid('Do not supply credentials in an address.');
    return address;
  }
  private parcel(value: unknown): unknown {
    if (typeof value === 'string') return objectId(value);
    const p = { ...record(value) };
    for (const [camel, snake] of [
      ['distanceUnit', 'distance_unit'],
      ['massUnit', 'mass_unit']
    ] as const) {
      if (p[camel] !== undefined && p[snake] !== undefined && p[camel] !== p[snake])
        throw invalid('A parcel contains conflicting unit fields.');
      if (p[camel] !== undefined) {
        p[snake] = p[camel];
        delete p[camel];
      }
    }
    for (const field of ['length', 'width', 'height'])
      if (p[field] !== undefined) decimal(p[field], field);
    decimal(p.weight, 'Parcel weight');
    if (!['g', 'oz', 'lb', 'kg'].includes(String(p.mass_unit)))
      throw invalid('Provide a supported parcel mass unit.');
    if (p.template !== undefined) text(p.template, 'Carrier template');
    else {
      for (const field of ['length', 'width', 'height']) decimal(p[field], field);
      if (!['cm', 'in', 'ft', 'mm', 'm', 'yd'].includes(String(p.distance_unit)))
        throw invalid('Provide a supported parcel distance unit.');
    }
    return pickDefined(p);
  }
  private shipment(data: Record<string, unknown>): Record<string, unknown> {
    if (!Array.isArray(data.parcels) || !data.parcels.length)
      throw invalid('Provide at least one parcel.');
    return pickDefined({
      ...data,
      address_from: this.address(data.address_from),
      address_to: this.address(data.address_to),
      parcels: data.parcels.map(p => this.parcel(p))
    });
  }
  createAddress(data: Record<string, unknown>) {
    this.address(data);
    return this.create('/addresses', data);
  }
  getAddress(id: string) {
    return this.get('/addresses', id);
  }
  listAddresses(params: PageOptions = {}) {
    return this.list('/addresses', resourceSchema, params);
  }
  async validateAddress(id: string) {
    const result = parse(
      resourceSchema,
      await this.request('get', `/addresses/${objectId(id)}/validate`)
    );
    if (result.object_id !== id)
      throw invalid('Address validation returned a different address ID.');
    return result;
  }
  createShipment(data: Record<string, unknown>) {
    return this.create('/shipments', this.shipment(data));
  }
  getShipment(id: string) {
    return this.get('/shipments', id);
  }
  getShipmentRates(id: string, params: PageOptions = {}) {
    return this.list(`/shipments/${objectId(id)}/rates`, rateSchema, params);
  }
  async getRate(id: string) {
    const result = parse(rateSchema, await this.request('get', `/rates/${objectId(id)}`));
    if (result.object_id !== id) throw invalid('Shippo returned a different rate ID.');
    return result;
  }
  async createTransaction(data: Record<string, unknown>) {
    if (data.rate !== undefined) {
      if (
        [data.shipment, data.carrier_account, data.servicelevel_token].some(
          v => v !== undefined
        )
      )
        throw invalid(
          'Choose rateId or complete single-call shipment details, without combining them.'
        );
      const rate = await this.getRate(objectId(data.rate));
      if (rate.amount !== undefined) decimal(rate.amount, 'Rate amount', true);
    } else {
      data = { ...data, shipment: this.shipment(record(data.shipment)) };
      objectId(data.carrier_account);
      text(data.servicelevel_token, 'Service level token');
    }
    const result = await this.create(
      '/transactions',
      data,
      typeof data.rate === 'string'
        ? { rateId: data.rate }
        : { carrierAccount: objectId(data.carrier_account) }
    );
    if (
      data.rate !== undefined &&
      (typeof result.rate === 'string' ? result.rate : result.rate?.object_id) !== data.rate
    ) {
      const e = invalid(
        'The purchase response did not bind to the requested rate. Check the returned transaction before retrying.'
      );
      e.data.resourceId = result.object_id;
      e.data.writeMayHaveOccurred = true;
      throw e;
    }
    if (data.rate === undefined && result.status === 'SUCCESS') {
      try {
        const rateId = typeof result.rate === 'string' ? result.rate : result.rate?.object_id;
        const rate = await this.getRate(objectId(rateId));
        if (
          rate.carrier_account !== data.carrier_account ||
          rate.servicelevel?.token !== data.servicelevel_token
        )
          throw invalid(
            'The single-call label does not match the requested carrier and service level.'
          );
      } catch (error) {
        const e = upstream(error, 'single-call purchase confirmation');
        e.data.resourceId = result.object_id;
        e.data.writeMayHaveOccurred = true;
        throw e;
      }
    }
    return result;
  }
  getTransaction(id: string) {
    return this.get('/transactions', id);
  }
  listTransactions(params: PageOptions & { rate?: string; tracking_status?: string } = {}) {
    return this.list('/transactions', resourceSchema, params);
  }
  private trackingInput(carrier: string, trackingNumber: string) {
    if (!/^[a-z0-9_]+$/.test(carrier)) throw invalid('Use the documented carrier token.');
    text(trackingNumber, 'Tracking number');
    if (trackingNumber === '.' || trackingNumber === '..')
      throw invalid('Use a carrier tracking number.');
  }
  async getTrackingStatus(carrier: string, trackingNumber: string) {
    this.trackingInput(carrier, trackingNumber);
    const result = parse(
      trackingSchema,
      await this.request(
        'get',
        `/tracks/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`
      )
    );
    if (result.carrier !== carrier || result.tracking_number !== trackingNumber)
      throw invalid('Tracking returned a different carrier or tracking number.');
    return result;
  }
  async registerTrackingWebhook(data: {
    carrier: string;
    tracking_number: string;
    metadata?: string;
  }) {
    this.trackingInput(data.carrier, data.tracking_number);
    const result = parse(
      trackingSchema,
      await this.request('post', '/tracks', pickDefined(data))
    );
    if (result.carrier !== data.carrier || result.tracking_number !== data.tracking_number) {
      const e = invalid(
        'Tracking registration returned a different carrier or tracking number.'
      );
      e.data.trackingReference = {
        carrier: data.carrier,
        trackingNumber: data.tracking_number
      };
      e.data.writeMayHaveOccurred = true;
      throw e;
    }
    return result;
  }
  createCustomsDeclaration(data: Record<string, unknown>) {
    if (!['ABANDON', 'RETURN'].includes(String(data.non_delivery_option)))
      throw invalid(
        'Supply nonDeliveryOption as ABANDON or RETURN; Shippo requires an explicit choice.'
      );
    if (
      data.incoterm !== undefined &&
      !['DDP', 'DDU', 'FCA', 'DAP', 'eDAP'].includes(String(data.incoterm))
    )
      throw invalid(
        'This legacy incoterm is not supported by the current Shippo API. Select DDP, DDU, FCA, DAP or eDAP after checking the carrier.'
      );
    if (data.contents_type === 'OTHER')
      text(data.contents_explanation, 'Contents explanation');
    if (data.eel_pfc === 'AES_ITN') text(data.aes_itn, 'AES/ITN reference');
    if (!Array.isArray(data.items) || !data.items.length)
      throw invalid('Provide at least one customs item.');
    for (const item of data.items) {
      const i = record(item);
      text(i.description, 'Customs item description');
      text(i.value_currency, 'Customs item currency');
      text(i.origin_country, 'Customs item origin country');
      positiveInteger(i.quantity, 'Customs quantity');
      decimal(i.net_weight, 'Customs weight');
      decimal(i.value_amount, 'Customs total value', true);
    }
    return this.create('/customs/declarations', data);
  }
  createOrder(data: Record<string, unknown>) {
    this.address(data.to_address);
    timestamp(data.placed_at, 'placedAt');
    for (const key of ['shipping_cost', 'total_price', 'total_tax'])
      if (data[key] !== undefined) decimal(data[key], key, true);
    if (data.total_price !== undefined || data.total_tax !== undefined)
      text(data.currency, 'Order currency');
    if (data.shipping_cost !== undefined)
      text(data.shipping_cost_currency, 'Shipping currency');
    if (data.weight !== undefined) {
      decimal(data.weight, 'Order weight');
      text(data.weight_unit, 'Order weight unit');
    }
    if (data.line_items !== undefined) {
      if (!Array.isArray(data.line_items)) throw invalid('Line items must be an array.');
      for (const item of data.line_items) {
        const i = record(item);
        text(i.currency, 'Line item currency');
        positiveInteger(i.quantity, 'Line quantity');
        decimal(i.total_price, 'Line total price', true);
        if (i.weight !== undefined) {
          decimal(i.weight, 'Line total weight');
          text(i.weight_unit, 'Line weight unit');
        }
      }
    }
    return this.create('/orders', data);
  }
  getOrder(id: string) {
    return this.get('/orders', id);
  }
  listOrders(params: PageOptions = {}) {
    return this.list('/orders', resourceSchema, params);
  }
  listCarrierAccounts(params: PageOptions & { carrier?: string } = {}) {
    return this.list('/carrier_accounts', resourceSchema, params);
  }
  createManifest(data: Record<string, unknown>) {
    objectId(data.carrier_account);
    this.address(data.address_from);
    data.shipment_date = timestamp(data.shipment_date, 'shipmentDate', true);
    if (data.transactions !== undefined) {
      if (!Array.isArray(data.transactions) || !data.transactions.length)
        throw invalid(
          'Provide at least one transaction, or omit transactions to close all applicable labels.'
        );
      data.transactions.forEach(objectId);
    }
    return this.create('/manifests', data, { carrierAccount: objectId(data.carrier_account) });
  }
  getManifest(id: string) {
    return this.get('/manifests', id);
  }
  createPickup(data: Record<string, unknown>) {
    objectId(data.carrier_account);
    const location = record(data.location);
    this.address(location.address, true);
    text(location.building_location_type, 'Building location type');
    if (location.building_location_type === 'Other')
      text(location.instructions, 'Pickup instructions');
    const start = timestamp(data.requested_start_time, 'requestedStartTime'),
      end = timestamp(data.requested_end_time, 'requestedEndTime');
    if (Date.parse(start) >= Date.parse(end))
      throw invalid('The pickup start must be before its end.');
    if (!Array.isArray(data.transactions) || !data.transactions.length)
      throw invalid('Provide at least one transaction for pickup.');
    data.transactions.forEach(objectId);
    return this.create('/pickups', data, { carrierAccount: objectId(data.carrier_account) });
  }
  async createRefund(data: { transaction: string }) {
    objectId(data.transaction);
    const transaction = await this.getTransaction(data.transaction);
    if (transaction.status !== 'SUCCESS')
      throw invalid(
        'Only a successfully purchased unused label can be submitted for a refund. Carrier eligibility is checked by Shippo.'
      );
    const result = await this.create('/refunds', data, { transactionId: data.transaction });
    if (result.transaction !== data.transaction) {
      const e = invalid(
        'The refund response references a different transaction. Check the returned refund before retrying.'
      );
      e.data.resourceId = result.object_id;
      e.data.writeMayHaveOccurred = true;
      throw e;
    }
    return result;
  }
  getRefund(id: string) {
    return this.get('/refunds', id);
  }
  async createBatch(data: Record<string, unknown>) {
    objectId(data.default_carrier_account);
    text(data.default_servicelevel_token, 'Default service level');
    if (
      !Array.isArray(data.batch_shipments) ||
      !data.batch_shipments.length ||
      data.batch_shipments.length > 10000
    )
      throw invalid('Provide from 1 to 10000 batch shipments.');
    const shipments: Array<{ shipment: Record<string, unknown> }> = [];
    for (const item of data.batch_shipments) {
      const supplied = record(item),
        id = objectId(supplied.shipment);
      const original = await this.getShipment(id);
      const copy: Record<string, unknown> = {};
      for (const k of [
        'address_from',
        'address_to',
        'address_return',
        'parcels',
        'customs_declaration',
        'extra',
        'metadata',
        'shipment_date',
        'carrier_accounts'
      ])
        if (original[k] !== undefined && original[k] !== null) copy[k] = original[k];
      if (Array.isArray(copy.extra) && copy.extra.length === 0) copy.extra = undefined;
      if (copy.extra !== undefined && !isApiErrorRecord(copy.extra))
        throw invalid(
          'The existing shipment extras cannot be copied safely into a batch. Create a supported shipment first.'
        );
      if (
        isApiErrorRecord(copy.address_from) &&
        typeof copy.address_from.object_id === 'string'
      )
        copy.address_from = copy.address_from.object_id;
      if (isApiErrorRecord(copy.address_to) && typeof copy.address_to.object_id === 'string')
        copy.address_to = copy.address_to.object_id;
      if (
        isApiErrorRecord(copy.address_return) &&
        typeof copy.address_return.object_id === 'string'
      )
        copy.address_return = copy.address_return.object_id;
      if (Array.isArray(copy.parcels))
        copy.parcels = copy.parcels.map(p =>
          isApiErrorRecord(p) && typeof p.object_id === 'string' ? p.object_id : p
        );
      if (
        isApiErrorRecord(copy.customs_declaration) &&
        typeof copy.customs_declaration.object_id === 'string'
      )
        copy.customs_declaration = copy.customs_declaration.object_id;
      shipments.push({ shipment: this.shipment(copy) });
    }
    return this.create(
      '/batches',
      { ...data, batch_shipments: shipments },
      { carrierAccount: objectId(data.default_carrier_account) }
    );
  }
  getBatch(id: string, params: PageOptions & { object_results?: string } = {}) {
    return this.getBatchPage(id, params);
  }
  private async getBatchPage(id: string, params: PageOptions & { object_results?: string }) {
    const path = `/batches/${objectId(id)}`;
    const { nextPage, ...query } = params;
    if (query.page !== undefined) positiveInteger(query.page, 'page');
    if (query.results !== undefined && positiveInteger(query.results, 'resultsPerPage') > 100)
      throw invalid('resultsPerPage must be from 1 to 100.');
    const url = this.continuation(nextPage, path);
    if (url && Object.values(query).some(v => v !== undefined))
      throw invalid('Use nextPage alone for a batch continuation.');
    const result = parse(
      resourceSchema,
      await this.request('get', url ?? path, undefined, url ? undefined : pickDefined(query))
    );
    if (result.object_id !== id) throw invalid('Shippo returned a different batch ID.');
    if (result.batch_shipments) {
      result.batch_shipments.next = this.continuation(result.batch_shipments.next, path);
      result.batch_shipments.previous = this.continuation(
        result.batch_shipments.previous,
        path
      );
    }
    return result;
  }
  async purchaseBatch(id: string) {
    const current = await this.getBatch(id);
    if (current.status !== 'VALID')
      throw invalid(
        'The exact batch must be VALID before purchase. Inspect get_shipping_resource; do not retry an in-progress purchase.'
      );
    const result = await this.create(`/batches/${objectId(id)}/purchase`, undefined, {
      batchId: id
    });
    if (result.object_id !== id) {
      const e = invalid(
        'Batch purchase returned a different batch ID. Check account history before retrying.'
      );
      e.data.resourceId = result.object_id;
      e.data.requestedBatchId = id;
      e.data.writeMayHaveOccurred = true;
      throw e;
    }
    return result;
  }
  createUserParcelTemplate(data: Record<string, unknown>) {
    if (data.template !== undefined) {
      text(data.template, 'Carrier template');
      if (
        ['name', 'length', 'width', 'height', 'distance_unit'].some(k => data[k] !== undefined)
      )
        throw invalid(
          'Carrier-template mode must omit name and custom dimensions. Omit template to create a custom template.'
        );
    } else {
      text(data.name, 'Template name');
      for (const k of ['length', 'width', 'height']) decimal(data[k], k);
      text(data.distance_unit, 'Distance unit');
    }
    if ((data.weight === undefined) !== (data.weight_unit === undefined))
      throw invalid('Supply both weight and massUnit, or omit both.');
    if (data.weight !== undefined) decimal(data.weight, 'Template weight');
    return this.create('/user-parcel-templates', data);
  }
  getUserParcelTemplate(id: string) {
    return this.get('/user-parcel-templates', id);
  }
  async listUserParcelTemplates() {
    return this.list('/user-parcel-templates', resourceSchema);
  }
  async deleteUserParcelTemplate(id: string) {
    await this.getUserParcelTemplate(id);
    await this.request('delete', `/user-parcel-templates/${objectId(id)}`);
  }
  listCarrierParcelTemplates(params: { carrier?: string } = {}) {
    return this.list('/parcel-templates', carrierTemplateSchema, params);
  }
}
