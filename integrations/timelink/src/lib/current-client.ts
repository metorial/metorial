import { buildApiServiceError, createApiServiceError, createAxios, pickDefined } from 'slates';

export type Resource = 'clients' | 'projects' | 'services' | 'users' | 'timeEntries';
export type MutableResource = Exclude<Resource, 'users'>;
export type ApiRecord = Record<string, unknown>;
export type RecordPage = { records: ApiRecord[]; pagination?: ApiRecord };

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class CurrentClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A Timelink API token is required.');
    this.axios = createAxios({
      baseURL: 'https://api.timelink.io/api/v1/',
      headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json' }
    });
  }

  private async request(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    options: { params?: ApiRecord; data?: ApiRecord } = {}
  ): Promise<ApiRecord> {
    try {
      const response = await this.axios.request({ method, url: path, ...options });
      if (!isRecord(response.data)) {
        throw createApiServiceError('Timelink returned an invalid response object.');
      }
      if (method !== 'get' && response.data.success !== true) {
        throw createApiServiceError('Timelink did not confirm the requested operation.');
      }
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Timelink',
        reason: 'timelink_api_error',
        operation: `${method.toUpperCase()} ${path}`,
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
      });
    }
  }

  private record(value: unknown): ApiRecord {
    if (!isRecord(value) || typeof value.id !== 'string' || !value.id) {
      throw createApiServiceError(
        'Timelink returned an invalid record or omitted its string ID.'
      );
    }
    return value;
  }

  private path(resource: Resource, id: string): string {
    if (!id.trim()) throw createApiServiceError('A Timelink record ID is required.');
    return `/${resource}/${encodeURIComponent(id)}`;
  }

  async listRecords(resource: Resource, params: ApiRecord = {}): Promise<RecordPage> {
    const body = await this.request('get', `/${resource}`, { params: pickDefined(params) });
    return this.page(body);
  }

  private page(body: ApiRecord): RecordPage {
    if (!Array.isArray(body.data)) {
      throw createApiServiceError('Timelink omitted the record list from its response.');
    }
    if (body.meta !== undefined && !isRecord(body.meta)) {
      throw createApiServiceError('Timelink returned invalid pagination metadata.');
    }
    return { records: body.data.map(value => this.record(value)), pagination: body.meta };
  }

  async getRecord(resource: Resource, id: string): Promise<ApiRecord> {
    const body = await this.request('get', this.path(resource, id));
    return this.record(body.data);
  }

  async createRecord(resource: MutableResource, data: ApiRecord): Promise<ApiRecord> {
    const body = await this.request('post', `/${resource}`, { data: pickDefined(data) });
    return this.record(body.data);
  }

  async updateRecord(
    resource: MutableResource,
    id: string,
    data: ApiRecord
  ): Promise<ApiRecord> {
    if (!Object.values(data).some(value => value !== undefined)) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    const body = await this.request('patch', this.path(resource, id), {
      data: pickDefined(data)
    });
    return this.record(body.data);
  }

  async deleteRecord(resource: MutableResource, id: string): Promise<ApiRecord> {
    const body = await this.request('delete', this.path(resource, id));
    const record = this.record(body.data);
    if (record.id !== id) {
      throw createApiServiceError('Timelink confirmed deletion of a different record ID.');
    }
    return record;
  }

  async getCurrentToken(): Promise<ApiRecord> {
    const body = await this.request('get', '/token');
    if (
      !isRecord(body.data) ||
      typeof body.data.id !== 'number' ||
      typeof body.data.name !== 'string'
    ) {
      throw createApiServiceError('Timelink returned invalid token identity data.');
    }
    return body.data;
  }

  async getCompany(): Promise<ApiRecord> {
    const body = await this.request('get', '/company');
    const company = this.record(body.data);
    if (typeof company.name !== 'string') {
      throw createApiServiceError('Timelink omitted the company name.');
    }
    return company;
  }

  async getRequiredTimeEntryFields(): Promise<string[]> {
    const body = await this.request('get', '/timeEntries/fieldsRequired');
    if (!Array.isArray(body.data) || body.data.some(value => typeof value !== 'string')) {
      throw createApiServiceError('Timelink returned an invalid required-fields list.');
    }
    return body.data;
  }

  async listActiveTimeEntries(params: ApiRecord): Promise<RecordPage> {
    return this.page(
      await this.request('get', '/timeEntries/active', { params: pickDefined(params) })
    );
  }
}
