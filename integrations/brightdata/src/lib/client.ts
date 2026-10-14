import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { parseScrapedRecords } from './records';

export class BrightDataClient {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Bright Data API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.brightdata.com',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 90000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Bright Data',
          reason: 'brightdata_api_error'
        })
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

    if (params.dataFormat && params.dataFormat !== 'html') {
      body.data_format = params.dataFormat;
    }

    let response = await this.axios.post('/request', body);
    return {
      content:
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      statusCode:
        isApiErrorRecord(response.data) && typeof response.data.status_code === 'number'
          ? response.data.status_code
          : response.status
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
      statusCode:
        isApiErrorRecord(response.data) && typeof response.data.status_code === 'number'
          ? response.data.status_code
          : response.status
    };
  }

  // ── Web Scraper API ───────────────────────────────────────────────

  async triggerCollection(params: {
    datasetId: string;
    inputs: Record<string, string>[];
    format?: string;
    notify?: string;
    notifyOnCompletion?: boolean;
    endpoint?: string;
    authHeader?: string;
    limitPerInput?: number;
    includeErrors?: boolean;
    uncompressedWebhook?: boolean;
    type?: string;
    discoverBy?: string;
  }): Promise<{ snapshotId: string }> {
    if (params.inputs.length === 0) {
      throw createApiServiceError('Provide at least one scraper input.');
    }
    if (
      params.limitPerInput !== undefined &&
      (!Number.isSafeInteger(params.limitPerInput) || params.limitPerInput < 1)
    ) {
      throw createApiServiceError('limitPerInput must be a positive whole number.');
    }
    if (params.notify !== undefined && params.notifyOnCompletion !== undefined) {
      throw createApiServiceError('Use either notify or notifyOnCompletion, not both.');
    }
    let queryParams: Record<string, string> = {
      dataset_id: params.datasetId
    };

    if (params.format) queryParams.format = params.format;
    if (params.notify) queryParams.notify = params.notify;
    if (params.notifyOnCompletion !== undefined)
      queryParams.notify = String(params.notifyOnCompletion);
    if (params.endpoint) queryParams.endpoint = params.endpoint;
    if (params.authHeader) queryParams.auth_header = params.authHeader;
    if (params.includeErrors !== undefined)
      queryParams.include_errors = String(params.includeErrors);
    if (params.uncompressedWebhook !== undefined)
      queryParams.uncompressed_webhook = String(params.uncompressedWebhook);
    if (params.type) queryParams.type = params.type;
    if (params.discoverBy) queryParams.discover_by = params.discoverBy;

    let queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    let response = await this.axios.post(
      `/datasets/v3/trigger?${queryString}`,
      pickDefined({ input: params.inputs, limit_per_input: params.limitPerInput })
    );

    let data = response.data as { snapshot_id: string };
    if (typeof data?.snapshot_id !== 'string' || !data.snapshot_id) {
      throw createApiServiceError('Bright Data did not return a snapshot ID.');
    }
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
    content?: string;
  }> {
    if (params.inputs.length === 0) {
      throw createApiServiceError('Provide at least one scraper input.');
    }
    let queryParams: Record<string, string> = {
      dataset_id: params.datasetId
    };

    if (params.format) queryParams.format = params.format;
    if (params.includeErrors !== undefined)
      queryParams.include_errors = String(params.includeErrors);

    let queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    let response = await this.axios.post(`/datasets/v3/scrape?${queryString}`, {
      input: params.inputs
    });

    if (response.status === 202) {
      let data = response.data as { snapshot_id?: string };
      if (typeof data?.snapshot_id !== 'string' || !data.snapshot_id) {
        throw createApiServiceError('Bright Data did not return the pending snapshot ID.');
      }
      return { records: [], snapshotId: data.snapshot_id, inProgress: true };
    }

    let records = parseScrapedRecords(response.data, params.format ?? 'ndjson');
    let content =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    return { records, inProgress: false, content };
  }

  // ── Snapshot Management ───────────────────────────────────────────

  async getSnapshotProgress(snapshotId: string): Promise<{
    snapshotId: string;
    datasetId: string;
    status: string;
  }> {
    let response = await this.axios.get(
      `/datasets/v3/progress/${encodeURIComponent(snapshotId)}`
    );
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
    // Keep parsed records in the requested format alongside the downloadable file.
    let response = await this.axios.get(
      `/datasets/v3/snapshot/${encodeURIComponent(params.snapshotId)}`,
      { params: { format: params.format ?? 'ndjson', compress: false } }
    );
    let records = parseScrapedRecords(response.data, params.format ?? 'ndjson');
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
      authFailReason: data.auth_fail_reason ?? '',
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
    await this.axios.post('/zone/change_disable', { zone: zoneName, disable: enable ? 0 : 1 });
  }

  // ── Scraping Job History ──────────────────────────────────────────

  async getSnapshotHistory(
    datasetId: string,
    filters: {
      status?: string;
      skip?: number;
      limit?: number;
      fromDate?: string;
      toDate?: string;
    } = {}
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/datasets/v3/snapshots', {
      params: pickDefined({
        dataset_id: datasetId,
        status: filters.status,
        skip: filters.skip,
        limit: filters.limit,
        from_date: filters.fromDate,
        to_date: filters.toDate
      })
    });
    let data = response.data;
    if (!Array.isArray(data) || !data.every(isApiErrorRecord)) {
      throw createApiServiceError(
        'Bright Data returned an invalid snapshot history response.'
      );
    }
    return data;
  }

  async cancelCollection(snapshotId: string): Promise<string> {
    let response = await this.axios.post(
      `/datasets/v3/snapshot/${encodeURIComponent(snapshotId)}/cancel`
    );
    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  }

  async listScrapers(filters: { datasetId?: string; domain?: string }) {
    let response = await this.axios.get('/datasets/v3/scrapers', {
      params: pickDefined({ dataset_id: filters.datasetId, domain: filters.domain })
    });
    if (!Array.isArray(response.data) || !response.data.every(isApiErrorRecord)) {
      throw createApiServiceError('Bright Data returned an invalid scraper list.');
    }
    return response.data as Record<string, unknown>[];
  }

  async getSnapshotLog(snapshotId: string) {
    let response = await this.axios.get(`/datasets/v3/log/${encodeURIComponent(snapshotId)}`);
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError('Bright Data returned an invalid snapshot log.');
    }
    return response.data;
  }
}
