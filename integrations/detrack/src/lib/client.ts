import { createAxios } from 'slates';

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
  phone?: string;
  sender_phone?: string;
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
  desc?: string;
  qty?: number;
  unit_of_measure?: string;
  comments?: string;
  unit_price?: number;
  weight?: number;
  serial_no?: string;
  batch_no?: string;
  expiry_date?: string;
  po_number?: string;
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
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://app.detrack.com/api/v2',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': token
      }
    });
  }

  // ===== JOB OPERATIONS =====

  async createJob(job: JobData): Promise<Record<string, unknown>> {
    let response = await this.http.post('/dn/jobs', { data: job });
    return response.data?.data ?? response.data;
  }

  async createJobs(jobs: JobData[]): Promise<Record<string, unknown>[]> {
    let response = await this.http.post('/dn/jobs/batch', { data: jobs });
    return response.data?.data ?? response.data;
  }

  async getJob(doNumber: string, date?: string): Promise<Record<string, unknown>> {
    let params: Record<string, string> = { do_number: doNumber };
    if (date) params.date = date;
    let response = await this.http.get('/dn/jobs/show', { params });
    return response.data?.data ?? response.data;
  }

  async updateJob(
    job: Partial<JobData> & { do_number: string; date: string }
  ): Promise<Record<string, unknown>> {
    let response = await this.http.put('/dn/jobs', { data: job });
    return response.data?.data ?? response.data;
  }

  async updateJobs(
    jobs: (Partial<JobData> & { do_number: string; date: string })[]
  ): Promise<Record<string, unknown>[]> {
    let response = await this.http.put('/dn/jobs/batch', { data: jobs });
    return response.data?.data ?? response.data;
  }

  async deleteJob(doNumber: string, date: string): Promise<Record<string, unknown>> {
    let response = await this.http.delete('/dn/jobs', {
      data: { data: { do_number: doNumber, date } }
    });
    return response.data?.data ?? response.data;
  }

  async deleteJobs(
    jobs: { do_number: string; date: string }[]
  ): Promise<Record<string, unknown>> {
    let response = await this.http.delete('/dn/jobs/batch', { data: { data: jobs } });
    return response.data?.data ?? response.data;
  }

  async reattemptJob(doNumber: string, date: string): Promise<Record<string, unknown>> {
    let response = await this.http.post('/dn/jobs/reattempt', {
      data: { do_number: doNumber, date }
    });
    return response.data?.data ?? response.data;
  }

  async listJobs(
    params: ListJobsParams = {}
  ): Promise<{ jobs: Record<string, unknown>[]; total: number; page: number }> {
    let response = await this.http.get('/dn/jobs', { params });
    let data = response.data;
    return {
      jobs: data?.data ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? 1
    };
  }

  async searchJobs(
    params: SearchJobsParams = {}
  ): Promise<{ jobs: Record<string, unknown>[]; total: number; page: number }> {
    let response = await this.http.get('/dn/jobs/search', { params });
    let data = response.data;
    return {
      jobs: data?.data ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? 1
    };
  }

  async downloadJobPod(doNumber: string, date: string): Promise<{ url: string }> {
    let response = await this.http.get('/dn/jobs/export/pod', {
      params: { do_number: doNumber, date }
    });
    return response.data?.data ?? response.data;
  }

  async downloadJobShippingLabel(doNumber: string, date: string): Promise<{ url: string }> {
    let response = await this.http.get('/dn/jobs/export/shipping-label', {
      params: { do_number: doNumber, date }
    });
    return response.data?.data ?? response.data;
  }

  // ===== VEHICLE OPERATIONS =====

  async listVehicles(): Promise<Record<string, unknown>[]> {
    let response = await this.http.get('/dn/vehicles');
    return response.data?.data ?? response.data ?? [];
  }

  async getVehicle(name: string): Promise<Record<string, unknown>> {
    let response = await this.http.get('/dn/vehicles/show', { params: { name } });
    return response.data?.data ?? response.data;
  }

  async createVehicle(vehicle: VehicleData): Promise<Record<string, unknown>> {
    let response = await this.http.post('/dn/vehicles', { data: vehicle });
    return response.data?.data ?? response.data;
  }

  async updateVehicle(
    vehicle: Partial<VehicleData> & { name: string }
  ): Promise<Record<string, unknown>> {
    let response = await this.http.put('/dn/vehicles', { data: vehicle });
    return response.data?.data ?? response.data;
  }

  async deleteVehicle(name: string): Promise<Record<string, unknown>> {
    let response = await this.http.delete('/dn/vehicles', { data: { data: { name } } });
    return response.data?.data ?? response.data;
  }
}
