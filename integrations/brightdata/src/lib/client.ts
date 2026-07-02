import { createAxios } from 'slates';

export class BrightDataClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.brightdata.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Web Unlocker API ──────────────────────────────────────────────

  async unlockUrl(params: {
    zone: string;
    url: string;
    format?: string;
    country?: string;
    dataFormat?: string;
  }): Promise<{ content: string; statusCode: number }> {
    let body: Record<string, string> = {
      zone: params.zone,
      url: params.url,
      format: params.format || 'raw'
    };

    if (params.country) {
      body.country = params.country;
    }

    if (params.dataFormat) {
      body.data_format = params.dataFormat;
    }

    let response = await this.axios.post('/request', body);
    return {
      content:
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      statusCode: response.status
    };
  }

  // ── SERP API ──────────────────────────────────────────────────────

  async searchSerp(params: {
    zone: string;
    url: string;
    format?: string;
    country?: string;
  }): Promise<{ content: string; statusCode: number }> {
    let body: Record<string, string> = {
      zone: params.zone,
      url: params.url,
      format: params.format || 'raw'
    };

    if (params.country) {
      body.country = params.country;
    }

    let response = await this.axios.post('/request', body);
    return {
      content:
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      statusCode: response.status
    };
  }

  // ── Web Scraper API ───────────────────────────────────────────────

  async triggerCollection(params: {
    datasetId: string;
    inputs: Record<string, string>[];
    format?: string;
    notify?: string;
    endpoint?: string;
    authHeader?: string;
    limitPerInput?: number;
    includeErrors?: boolean;
    uncompressedWebhook?: boolean;
    type?: string;
    discoverBy?: string;
  }): Promise<{ snapshotId: string }> {
    let queryParams: Record<string, string> = {
      dataset_id: params.datasetId
    };

    if (params.format) queryParams.format = params.format;
    if (params.notify) queryParams.notify = params.notify;
    if (params.endpoint) queryParams.endpoint = params.endpoint;
    if (params.authHeader) queryParams.auth_header = params.authHeader;
    if (params.limitPerInput !== undefined)
      queryParams.limit_per_input = String(params.limitPerInput);
    if (params.includeErrors !== undefined)
      queryParams.include_errors = String(params.includeErrors);
    if (params.uncompressedWebhook !== undefined)
      queryParams.uncompressed_webhook = String(params.uncompressedWebhook);
    if (params.type) queryParams.type = params.type;
    if (params.discoverBy) queryParams.discover_by = params.discoverBy;

    let queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    let response = await this.axios.post(`/datasets/v3/trigger?${queryString}`, params.inputs);

    let data = response.data as { snapshot_id: string };
    return { snapshotId: data.snapshot_id };
  }

  async scrapeSync(params: {
    datasetId: string;
    inputs: Record<string, string>[];
    format?: string;
    includeErrors?: boolean;
  }): Promise<{
    records: Record<string, unknown>[];
    snapshotId?: string;
    inProgress: boolean;
  }> {
    let queryParams: Record<string, string> = {
      dataset_id: params.datasetId
    };

    if (params.format) queryParams.format = params.format;
    if (params.includeErrors !== undefined)
      queryParams.include_errors = String(params.includeErrors);

    let queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    let response = await this.axios.post(`/datasets/v3/scrape?${queryString}`, params.inputs);

    if (response.status === 202) {
      let data = response.data as { snapshot_id?: string };
      return { records: [], snapshotId: data.snapshot_id, inProgress: true };
    }

    let records = Array.isArray(response.data) ? response.data : [response.data];
    return { records, inProgress: false };
  }

  // ── Snapshot Management ───────────────────────────────────────────

  async getSnapshotProgress(snapshotId: string): Promise<{
    snapshotId: string;
    datasetId: string;
    status: string;
  }> {
    let response = await this.axios.get(`/datasets/v3/progress/${snapshotId}`);
    let data = response.data as { snapshot_id: string; dataset_id: string; status: string };
    return {
      snapshotId: data.snapshot_id,
      datasetId: data.dataset_id,
      status: data.status
    };
  }

  async downloadSnapshot(params: {
    snapshotId: string;
    format?: string;
    compress?: boolean;
  }): Promise<{ records: Record<string, unknown>[] }> {
    let queryParams: Record<string, string> = {};
    if (params.format) queryParams.format = params.format;
    if (params.compress !== undefined) queryParams.compress = String(params.compress);

    let queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    let url = `/datasets/v3/snapshot/${params.snapshotId}`;
    if (queryString) url += `?${queryString}`;

    let response = await this.axios.get(url);
    let records = Array.isArray(response.data) ? response.data : [response.data];
    return { records };
  }

  // ── Account Management ────────────────────────────────────────────

  async getAccountStatus(): Promise<{
    status: string;
    customerId: string;
    canMakeRequests: boolean;
    authFailReason: string;
    ip: string;
  }> {
    let response = await this.axios.get('/status');
    let data = response.data as {
      status: string;
      customer: string;
      can_make_requests: boolean;
      auth_fail_reason: string;
      ip: string;
    };
    return {
      status: data.status,
      customerId: data.customer,
      canMakeRequests: data.can_make_requests,
      authFailReason: data.auth_fail_reason,
      ip: data.ip
    };
  }

  async getBalance(): Promise<{ balance: number; pendingBalance: number }> {
    let response = await this.axios.get('/customer/balance');
    let data = response.data as { balance: number; pending_balance: number };
    return {
      balance: data.balance,
      pendingBalance: data.pending_balance
    };
  }

  // ── Zone Management ───────────────────────────────────────────────

  async getActiveZones(): Promise<Array<{ name: string; type: string }>> {
    let response = await this.axios.get('/zone/get_active_zones');
    let data = response.data as Array<{ name: string; type: string }>;
    return data;
  }

  async getZoneInfo(zoneName: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/zone?zone=${encodeURIComponent(zoneName)}`);
    return response.data as Record<string, unknown>;
  }

  async getZoneStatus(zoneName: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/zone/status?zone=${encodeURIComponent(zoneName)}`);
    return response.data as Record<string, unknown>;
  }

  async getZonePasswords(zoneName: string): Promise<string[]> {
    let response = await this.axios.get(
      `/zone/passwords?zone=${encodeURIComponent(zoneName)}`
    );
    let data = response.data;
    return Array.isArray(data) ? data : [data];
  }

  async createZone(params: {
    name: string;
    type?: string;
    plan: Record<string, unknown>;
  }): Promise<{ message: string }> {
    let body: Record<string, unknown> = {
      zone: { name: params.name },
      plan: params.plan
    };

    if (params.type) {
      (body.zone as Record<string, unknown>).type = params.type;
    }

    let response = await this.axios.post('/zone', body);
    return { message: response.status === 201 ? 'Zone added' : String(response.data) };
  }

  async deleteZone(zoneName: string): Promise<void> {
    await this.axios.delete(`/zone?zone=${encodeURIComponent(zoneName)}`);
  }

  async toggleZone(zoneName: string, enable: boolean): Promise<void> {
    if (enable) {
      await this.axios.post(`/zone/enable?zone=${encodeURIComponent(zoneName)}`);
    } else {
      await this.axios.post(`/zone/disable?zone=${encodeURIComponent(zoneName)}`);
    }
  }

  // ── Scraping Job History ──────────────────────────────────────────

  async getSnapshotHistory(datasetId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/datasets/v3/snapshots?dataset_id=${encodeURIComponent(datasetId)}`
    );
    let data = response.data;
    return Array.isArray(data) ? data : [];
  }

  async cancelCollection(snapshotId: string): Promise<string> {
    let response = await this.axios.post(
      `/datasets/v3/cancel?snapshot_id=${encodeURIComponent(snapshotId)}`
    );
    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  }
}
