import { pickDefined } from 'slates';
import { safeAxios } from './http';
import { collection, exact, nativeDatabase, nativeTable, single } from './schemas';
import {
  absent,
  bytes,
  clean,
  domain,
  fail,
  id,
  type Row,
  token,
  upstream
} from './validation';
export class DatabaseClient {
  private axios;
  private secret: string;
  constructor(config: { token: string }) {
    this.secret = token(config.token);
    this.axios = safeAxios(
      {
        baseURL: 'https://tables-api.softr.io/api/v1',
        headers: { 'Softr-Api-Key': this.secret, 'Content-Type': 'application/json' },
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: 8 * 1024 * 1024,
        maxBodyLength: 8 * 1024 * 1024
      },
      [this.secret]
    );
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: unknown,
    params?: Row
  ) {
    clean({ url, params }, [this.secret]);
    if (data !== undefined) {
      clean(data, [this.secret]);
      bytes(data);
    }
    let response: { data: unknown; status: number; headers: Record<string, unknown> };
    try {
      response = await this.axios.request<unknown>({
        method,
        url,
        data,
        params: pickDefined(params ?? {})
      });
    } catch (e) {
      throw upstream(e, method !== 'GET' && !url.endsWith('/search'));
    }
    if (method !== 'DELETE' && response.status !== 200)
      fail(
        'Softr returned an unexpected database receipt status. Read the exact resource before retrying a possible write; HTTP acceptance alone does not confirm completion.',
        'invalid_response'
      );
    clean({ ...response.headers }, [this.secret]);
    return { status: response.status, data: clean(response.data, [this.secret]) };
  }
  private db(databaseId: string) {
    return `/databases/${encodeURIComponent(id(databaseId, 'database ID'))}`;
  }
  private table(databaseId: string, tableId: string) {
    return `${this.db(databaseId)}/tables/${encodeURIComponent(id(tableId, 'table ID'))}`;
  }
  async listDatabases() {
    return (await this.request('GET', '/databases')).data;
  }
  async getDatabase(databaseId: string) {
    return (await this.request('GET', this.db(databaseId))).data;
  }
  async createDatabase(params: { workspaceId: string; name: string; description?: string }) {
    id(params.workspaceId, 'workspace ID');
    return (await this.request('POST', '/databases', pickDefined(params))).data;
  }
  async updateDatabase(databaseId: string, params: Row) {
    return (await this.request('PUT', this.db(databaseId), params)).data;
  }
  async listTables(databaseId: string) {
    return (await this.request('GET', `${this.db(databaseId)}/tables`)).data;
  }
  async getTable(databaseId: string, tableId: string) {
    return (await this.request('GET', this.table(databaseId, tableId))).data;
  }
  async createTable(databaseId: string, params: Row) {
    return (await this.request('POST', `${this.db(databaseId)}/tables`, params)).data;
  }
  async updateTable(databaseId: string, tableId: string, params: Row) {
    return (await this.request('PUT', this.table(databaseId, tableId), params)).data;
  }
  async listViews(databaseId: string, tableId: string) {
    return (await this.request('GET', `${this.table(databaseId, tableId)}/views`)).data;
  }
  private field(databaseId: string, tableId: string, fieldId: string) {
    return `${this.table(databaseId, tableId)}/fields/${encodeURIComponent(id(fieldId, 'field ID'))}`;
  }
  async getTableField(databaseId: string, tableId: string, fieldId: string) {
    return (await this.request('GET', this.field(databaseId, tableId, fieldId))).data;
  }
  async addTableField(databaseId: string, tableId: string, params: Row) {
    return (await this.request('POST', `${this.table(databaseId, tableId)}/fields`, params))
      .data;
  }
  async updateTableField(databaseId: string, tableId: string, fieldId: string, params: Row) {
    return (await this.request('PUT', this.field(databaseId, tableId, fieldId), params)).data;
  }
  private records(databaseId: string, tableId: string) {
    return `${this.table(databaseId, tableId)}/records`;
  }
  private record(databaseId: string, tableId: string, recordId: string) {
    return `${this.records(databaseId, tableId)}/${encodeURIComponent(id(recordId, 'record ID'))}`;
  }
  async listRecords(databaseId: string, tableId: string, params: Row) {
    return (await this.request('GET', this.records(databaseId, tableId), undefined, params))
      .data;
  }
  async getRecord(databaseId: string, tableId: string, recordId: string, params: Row = {}) {
    return (
      await this.request('GET', this.record(databaseId, tableId, recordId), undefined, params)
    ).data;
  }
  async createRecord(databaseId: string, tableId: string, fields: Row, params: Row = {}) {
    return (await this.request('POST', this.records(databaseId, tableId), { fields }, params))
      .data;
  }
  async updateRecord(
    databaseId: string,
    tableId: string,
    recordId: string,
    fields: Row,
    params: Row = {}
  ) {
    return (
      await this.request(
        'PATCH',
        this.record(databaseId, tableId, recordId),
        { fields },
        params
      )
    ).data;
  }
  async searchRecords(databaseId: string, tableId: string, params: Row, fieldNames?: boolean) {
    return (
      await this.request('POST', `${this.records(databaseId, tableId)}/search`, params, {
        fieldNames
      })
    ).data;
  }
  private async deletion(path: string, params?: Row) {
    const receipt = await this.request('DELETE', path, undefined, params);
    if (receipt.status !== 204)
      fail(
        'The deletion may have taken effect but the documented 204 receipt is missing. Read the exact resource before retrying.',
        'deletion_unverified'
      );
    try {
      await this.request('GET', path);
    } catch (e) {
      if (absent(e)) return;
      throw e;
    }
    fail(
      'Softr acknowledged deletion but the exact resource is still readable. Reconcile before retrying.',
      'deletion_unverified'
    );
  }
  async deleteDatabase(databaseId: string, force = false) {
    await this.deletion(this.db(databaseId), { force });
    const databases = collection(nativeDatabase, await this.listDatabases());
    if (databases.some(d => d.id === databaseId))
      fail(
        'The deleted database still appears in the native inventory. Reconcile before retrying.',
        'deletion_unverified'
      );
  }
  async deleteTable(databaseId: string, tableId: string, force = false) {
    await this.deletion(this.table(databaseId, tableId), { force });
    exact(single(nativeDatabase, await this.getDatabase(databaseId)), databaseId);
  }
  async deleteTableField(databaseId: string, tableId: string, fieldId: string) {
    await this.deletion(this.field(databaseId, tableId, fieldId));
    exact(single(nativeTable, await this.getTable(databaseId, tableId)), tableId);
  }
  async deleteRecord(databaseId: string, tableId: string, recordId: string) {
    await this.deletion(this.record(databaseId, tableId, recordId));
    exact(single(nativeTable, await this.getTable(databaseId, tableId)), tableId);
  }
}
export class StudioClient {
  private secret: string;
  private host: string;
  constructor(config: { token: string; domain: string }) {
    this.secret = token(config.token);
    this.host = domain(config.domain);
  }
  private async request(
    method: 'POST' | 'DELETE',
    path: string,
    data?: unknown,
    secrets: readonly string[] = []
  ) {
    if (data !== undefined) {
      clean(data, [this.secret]);
      bytes(data);
    }
    let response: { data: unknown; status: number; headers: Record<string, unknown> };
    try {
      clean({ path }, [this.secret]);
      const client = safeAxios(
        {
          baseURL: 'https://studio-api.softr.io/v1/api',
          headers: {
            'Softr-Api-Key': this.secret,
            'Softr-Domain': this.host,
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          maxRedirects: 0,
          maxContentLength: 8 * 1024 * 1024,
          maxBodyLength: 8 * 1024 * 1024
        },
        [this.secret, ...secrets]
      );
      response = await client.request<unknown>({ method, url: path, data });
    } catch (e) {
      throw upstream(e, true);
    }
    clean({ ...response.headers }, [this.secret, ...secrets]);
    return { status: response.status, data: clean(response.data, [this.secret, ...secrets]) };
  }
  async createUser(params: {
    fullName: string;
    email: string;
    password?: string;
    generateMagicLink?: boolean;
  }) {
    return this.request(
      'POST',
      '/users',
      pickDefined({
        full_name: params.fullName,
        email: params.email,
        password: params.password,
        generate_magic_link: params.generateMagicLink ?? false
      }),
      params.password ? [params.password] : []
    );
  }
  async deleteUser(email: string) {
    return this.request('DELETE', `/users/${encodeURIComponent(id(email, 'user email'))}`);
  }
  async generateMagicLink(email: string) {
    return this.request(
      'POST',
      `/users/magic-link/generate/${encodeURIComponent(id(email, 'user email'))}`,
      {}
    );
  }
  async lifecycle(email: string, action: 'activate' | 'deactivate') {
    return this.request(
      'POST',
      `/users/${encodeURIComponent(id(email, 'user email'))}/${action}`
    );
  }
  async syncUsers(emails?: string[]) {
    return this.request('POST', '/users/sync', emails);
  }
  async validateToken(jwt: string) {
    bytes({ jwt });
    const client = safeAxios(
      {
        baseURL: `https://${this.host}/v1/api`,
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: 8 * 1024 * 1024,
        maxBodyLength: 8 * 1024 * 1024
      },
      [this.secret, jwt]
    );
    let response: { data: unknown; headers: Record<string, unknown> };
    try {
      response = await client.post<unknown>('/users/validate-token', { jwt });
    } catch (e) {
      throw upstream(e, false);
    }
    clean({ ...response.headers }, [this.secret, jwt]);
    return clean(response.data, [this.secret, jwt]);
  }
}
