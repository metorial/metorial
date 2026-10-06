import { createAxios } from 'slates';
import { nativeApp, nativeUser, nativeWorkspace } from './schemas';
import {
  type AuthOutput,
  clean,
  connection,
  fail,
  id,
  jsonBytes,
  parse,
  type Row,
  upstream,
  z
} from './validation';
export class Client {
  private axios;
  private token: string;
  constructor(auth: AuthOutput, config: unknown = {}) {
    const c = connection(auth, config);
    this.token = c.token;
    this.axios = createAxios({
      baseURL: `${c.baseUrl}/api/ext`,
      headers: { Authorization: `Basic ${c.token}`, 'Content-Type': 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT',
    url: string,
    data?: unknown,
    params?: Row
  ) {
    if (data !== undefined) jsonBytes(data);
    let response: { data: unknown; headers: Record<string, unknown> };
    try {
      response = await this.axios.request<unknown>({ method, url, data, params });
    } catch (e) {
      throw upstream(e, method !== 'GET' && !url.startsWith('/export/'));
    }
    clean({ ...response.headers }, [this.token]);
    return clean(response.data, [this.token]);
  }
  async listUsers(groupNames?: string, status?: string) {
    return parse(
      z.array(nativeUser).max(1000),
      await this.request('GET', '/users', undefined, { group_names: groupNames, status })
    );
  }
  async getUser(identifier: string) {
    const result = await this.request(
      'GET',
      `/user/${encodeURIComponent(id(identifier, 'user UUID or email'))}`
    );
    if (Array.isArray(result) && result.length === 0)
      fail(
        'No user matches this UUID or email. Verify the identifier with list_users.',
        'not_found'
      );
    const user = parse(nativeUser, result);
    if (user.id !== identifier && user.email.toLowerCase() !== identifier.toLowerCase())
      fail(
        'ToolJet returned a different user; no further write was attempted.',
        'identity_mismatch'
      );
    return user;
  }
  async createUser(body: Row) {
    return parse(nativeUser, await this.request('POST', '/users', body));
  }
  async updateUser(identifier: string, body: Row) {
    await this.request('PATCH', `/user/${encodeURIComponent(id(identifier))}`, body);
  }
  async updateUserRole(workspaceId: string, body: Row) {
    await this.request(
      'PUT',
      `/update-user-role/workspace/${encodeURIComponent(id(workspaceId, 'workspace UUID'))}`,
      body
    );
  }
  async listWorkspaces() {
    return parse(z.array(nativeWorkspace).max(1000), await this.request('GET', '/workspaces'));
  }
  async replaceUserWorkspaces(userId: string, workspaces: Row[]) {
    await this.request(
      'PUT',
      `/user/${encodeURIComponent(id(userId, 'user UUID'))}/workspaces`,
      workspaces
    );
  }
  async updateUserWorkspace(userId: string, workspaceId: string, body: Row) {
    await this.request(
      'PATCH',
      `/user/${encodeURIComponent(id(userId, 'user UUID'))}/workspace/${encodeURIComponent(id(workspaceId, 'workspace UUID'))}`,
      body
    );
  }
  async listApps(workspaceId: string) {
    return parse(
      z.array(nativeApp).max(1000),
      await this.request(
        'GET',
        `/workspace/${encodeURIComponent(id(workspaceId, 'workspace UUID'))}/apps`
      )
    );
  }
  async exportApp(
    workspaceId: string,
    appId: string,
    options: { exportTJDB?: boolean; appVersion?: string; exportAllVersions?: boolean }
  ) {
    const raw = await this.request(
      'POST',
      `/export/workspace/${encodeURIComponent(id(workspaceId, 'workspace UUID'))}/apps/${encodeURIComponent(id(appId, 'app UUID'))}`,
      {},
      options
    );
    return parse(
      z
        .object({
          tooljet_version: z.string(),
          app: z.array(z.record(z.string(), z.unknown())).min(1)
        })
        .passthrough(),
      raw
    );
  }
  async importApp(workspaceId: string, body: Row) {
    return this.request(
      'POST',
      `/import/workspace/${encodeURIComponent(id(workspaceId, 'workspace UUID'))}/apps`,
      body
    );
  }
}
