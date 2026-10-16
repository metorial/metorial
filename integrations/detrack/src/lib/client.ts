import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export let requireDetrackString = (record: Record<string, unknown>, field: string) => {
  let value = record[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`Detrack returned a record without a valid ${field}.`, {
      reason: 'detrack_invalid_response'
    });
  }
  return value;
};

type JobRecord = Record<string, unknown> & { do_number: string; date: string };
type Page = {
  records: Record<string, unknown>[];
  total?: number;
  links?: Record<string, unknown>;
};

let readRecord = (value: unknown): Record<string, unknown> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError('Detrack returned an invalid record.', {
      reason: 'detrack_invalid_response'
    });
  }
  return value;
};

let readJob = (value: unknown): JobRecord => {
  let record = readRecord(value);
  return {
    ...record,
    do_number: requireDetrackString(record, 'do_number'),
    date: requireDetrackString(record, 'date')
  };
};

let readVehicle = (value: unknown) => {
  let vehicle = readRecord(value);
  requireDetrackString(vehicle, 'name');
  return vehicle;
};

let readData = (body: unknown): unknown => {
  let envelope = readRecord(body);
  if (envelope.data === undefined && (envelope.code || envelope.errors || envelope.error)) {
    throw buildApiServiceError(
      { response: { data: body } },
      {
        providerLabel: 'Detrack',
        reason: 'detrack_api_error',
        detailKeys: ['message', 'detail', 'error', 'code', 'field'],
        nestedKeys: ['errors', 'codes']
      }
    );
  }
  return envelope.data ?? envelope;
};

let readPage = (body: unknown): Page => {
  let envelope = readRecord(body);
  let data = readData(envelope);
  if (!Array.isArray(data)) {
    throw createApiServiceError('Detrack returned an invalid list response.', {
      reason: 'detrack_invalid_response'
    });
  }
  let total = envelope.total_count ?? envelope.total;
  if (total !== undefined && (typeof total !== 'number' || !Number.isFinite(total))) {
    throw createApiServiceError('Detrack returned an invalid total count.', {
      reason: 'detrack_invalid_response'
    });
  }
  return {
    records: data.map(readRecord),
    total: total as number | undefined,
    links: isApiErrorRecord(envelope.links) ? envelope.links : undefined
  };
};

let validatePagination = (page?: number, limit?: number, maxLimit?: number) => {
  if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
    throw createApiServiceError('Page must be a positive integer.');
  }
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit < 1 || (maxLimit !== undefined && limit > maxLimit))
  ) {
    throw createApiServiceError(
      `Limit must be a positive integer${maxLimit ? ` no greater than ${maxLimit}` : ''}.`
    );
  }
};

export interface JobData {
  date: string;
  do_number: string;
  address: string;
  type?: string;
  tracking_number?: string;
  order_number?: string;
  job_type?: string;
  assign_to?: string;
  instructions?: string;
  deliver_to?: string;
  deliver_to_collect_from?: string;
  last_name?: string;
  company_name?: string;
  phone_number?: string;
  sender_phone_number?: string;
  fax?: string;
  notify_email?: string;
  address_lat?: number;
  address_lng?: number;
  postal_code?: string;
  city?: string;
  state?: string;
  country?: string;
  billing_address?: string;
  warehouse_address?: string;
  job_sequence?: number;
  job_fee?: string;
  job_price?: string;
  invoice_number?: string;
  invoice_amount?: number;
  payment_mode?: string;
  payment_amount?: number;
  zone?: string;
  department?: string;
  depot?: string;
  depot_contact?: string;
  run_number?: string;
  customer?: string;
  account_number?: string;
  job_owner?: string;
  source?: string;
  remarks?: string;
  group_name?: string;
  weight?: number;
  parcel_width?: number;
  parcel_length?: number;
  parcel_height?: number;
  boxes?: string;
  cartons?: number;
  pieces?: number;
  envelopes?: number;
  pallets?: number;
  open_to_marketplace?: boolean;
  start_date?: string;
  job_release_time?: string;
  job_time?: string;
  time_window?: string;
  job_received_date?: string;
  service_type?: string;
  service_time?: number;
  eta_time?: string;
  attachment_url?: string;
  auto_reschedule?: boolean;
  webhook_url?: string;
  items?: ItemData[];
  [key: string]: unknown;
}

export interface ItemData {
  sku?: string;
  description?: string;
  quantity?: number;
  unit_of_measure?: string;
  comments?: string;
  unit_price?: number;
  weight?: number;
  serial_numbers?: string[];
  batch_number?: string;
  expiry_date?: string;
  purchase_order_number?: string;
  reject_quantity?: number;
  reject_reason?: string;
  [key: string]: unknown;
}

export interface VehicleData {
  name: string;
  detrack_id?: string;
  [key: string]: unknown;
}

export interface ListJobsParams {
  date?: string;
  page?: number;
  limit?: number;
  type?: string;
  assign_to?: string;
  status?: string;
  do_number?: string;
  query?: string;
  sort?: string;
}

export interface SearchJobsParams {
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  type?: string;
  assign_to?: string;
  status?: string;
  do_number?: string;
  tracking_number?: string;
  order_number?: string;
  customer?: string;
  [key: string]: unknown;
}

export class DetrackClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('A Detrack API key is required.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.detrack.com/api/v2',
      authHeader: { name: 'X-API-KEY', value: token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Detrack',
          reason: 'detrack_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          detailKeys: ['message', 'detail', 'error', 'code', 'field'],
          nestedKeys: ['errors', 'codes']
        })
    });
  }

  async createJob(job: JobData): Promise<JobRecord> {
    let response = await this.http.post('/dn/jobs', { data: job });
    return readJob(readData(response.data));
  }

  async createJobs(jobs: JobData[]): Promise<Record<string, unknown>[]> {
    let response = await this.http.post('/dn/jobs/bulk', { data: jobs });
    return readPage(response.data).records;
  }

  async getJob(doNumber: string, date?: string, type?: string): Promise<JobRecord> {
    let params: Record<string, string> = { do_number: doNumber };
    if (date) params.date = date;
    if (type) params.type = type;
    let response = await this.http.get('/dn/jobs/show', { params });
    return readJob(readData(response.data));
  }

  async updateJob(
    job: Partial<JobData> & { do_number: string; date: string }
  ): Promise<JobRecord> {
    let { do_number, date, ...data } = job;
    let response = await this.http.put('/dn/jobs/update', {
      do_number,
      date,
      type: job.type,
      data
    });
    return readJob(readData(response.data));
  }

  async updateJobs(
    jobs: (Partial<JobData> & { do_number: string; date: string })[]
  ): Promise<Record<string, unknown>[]> {
    let response = await this.http.put('/dn/jobs', {
      data: jobs.map(({ do_number, date, ...data }) => ({
        do_number,
        date,
        type: data.type,
        data
      }))
    });
    return readPage(response.data).records;
  }

  async deleteJob(doNumber: string, date: string, type?: string): Promise<void> {
    let response = await this.http.delete('/dn/jobs/delete', {
      params: pickDefined({ do_number: doNumber, date, type })
    });
    if (response.status !== 204) {
      readData(response.data);
      throw createApiServiceError('Detrack did not confirm the job deletion.', {
        reason: 'detrack_unconfirmed_delete'
      });
    }
  }

  async deleteJobs(
    jobs: { do_number: string; date: string }[]
  ): Promise<Record<string, unknown>> {
    let response = await this.http.delete('/dn/jobs', { data: { data: jobs } });
    return readRecord(readData(response.data));
  }

  async reattemptJob(
    doNumber: string,
    date: string,
    newDate?: string,
    type?: string
  ): Promise<JobRecord> {
    let response = await this.http.post('/dn/jobs/reattempt', {
      data: pickDefined({ do_number: doNumber, date, new_date: newDate, type })
    });
    return readJob(readData(response.data));
  }

  async listJobs(params: ListJobsParams = {}) {
    validatePagination(params.page, params.limit, 100);
    let response = await this.http.get('/dn/jobs', { params });
    let data = readPage(response.data);
    return {
      jobs: data.records.map(readJob),
      total: data.total,
      page: params.page ?? 1,
      links: data.links
    };
  }

  async searchJobs(params: SearchJobsParams = {}) {
    validatePagination(params.page, params.limit, 100);
    let { from, to, assign_to, status, date, ...filters } = params;
    let response = await this.http.post('/dn/jobs/search', {
      data: pickDefined({
        ...filters,
        dates:
          from !== undefined || to !== undefined || date !== undefined
            ? pickDefined({ from: from ?? date, to: to ?? date })
            : undefined,
        vehicles: assign_to !== undefined ? [{ name: assign_to }] : undefined,
        statuses:
          status !== undefined
            ? status
                .split(',')
                .map(value => value.trim())
                .filter(Boolean)
            : undefined
      })
    });
    let data = readPage(response.data);
    return {
      jobs: data.records.map(readJob),
      total: data.total,
      page: params.page ?? 1,
      links: data.links
    };
  }

  downloadJobPod(doNumber: string, date: string, type?: string): { url: string } {
    return this.jobDocumentUrl(doNumber, date, 'pod', type);
  }

  downloadJobShippingLabel(doNumber: string, date: string, type?: string): { url: string } {
    return this.jobDocumentUrl(doNumber, date, 'shipping-label', type);
  }

  private jobDocumentUrl(doNumber: string, date: string, document: string, type?: string) {
    let url = new URL(
      `https://app.detrack.com/api/v2/dn/jobs/export/${encodeURIComponent(doNumber)}/${encodeURIComponent(date)}`
    );
    url.searchParams.set('format', 'pdf');
    url.searchParams.set('document', document);
    if (type !== undefined) url.searchParams.set('type', type);
    return { url: url.toString() };
  }

  async listVehicles(params: { page?: number; limit?: number; name?: string } = {}) {
    validatePagination(params.page, params.limit);
    let response = await this.http.get('/vehicles', { params });
    return { ...readPage(response.data), page: params.page ?? 1 };
  }

  async getVehicle(name: string): Promise<Record<string, unknown>> {
    let page = await this.listVehicles({ name });
    let matches = page.records.filter(vehicle => vehicle.name === name);
    if (matches.length !== 1) {
      throw createApiServiceError(
        `Detrack did not return exactly one vehicle named "${name}". Check list_vehicles before trying again.`,
        { reason: 'detrack_vehicle_not_unique' }
      );
    }
    return matches[0]!;
  }

  async createVehicle(vehicle: VehicleData): Promise<Record<string, unknown>> {
    if (!vehicle.detrack_id?.trim())
      throw createApiServiceError(
        'detrackId is required when creating a vehicle. Find it in the driver app.'
      );
    let response = await this.http.post('/vehicles', { data: vehicle });
    return readVehicle(readData(response.data));
  }

  async updateVehicle(
    vehicle: Partial<VehicleData> & { name: string }
  ): Promise<Record<string, unknown>> {
    let current = await this.getVehicle(vehicle.name);
    let id = requireDetrackString(current, 'id');
    let response = await this.http.put(`/vehicles/${encodeURIComponent(id)}`, {
      data: vehicle
    });
    return readVehicle(readData(response.data));
  }

  async deleteVehicle(name: string): Promise<Record<string, unknown>> {
    let current = await this.getVehicle(name);
    let id = requireDetrackString(current, 'id');
    let response = await this.http.delete(`/vehicles/${encodeURIComponent(id)}`);
    if (response.status !== 204) {
      readData(response.data);
      throw createApiServiceError('Detrack did not confirm the vehicle deletion.', {
        reason: 'detrack_unconfirmed_delete'
      });
    }
    return current;
  }

  async listDepots(params: { page?: number; limit?: number } = {}) {
    validatePagination(params.page, params.limit);
    let response = await this.http.get('/dn/depots', { params });
    return { ...readPage(response.data), page: params.page ?? 1 };
  }

  async listRoutes(params: { date: string; name?: string; page?: number; limit?: number }) {
    validatePagination(params.page, params.limit);
    let response = await this.http.get('/dn/routes', { params });
    return { ...readPage(response.data), page: params.page ?? 1 };
  }
}
