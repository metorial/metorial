import { createAuthenticatedAxios, getResponseHeaderValue, requestAxios } from 'slates';
import {
  adapt,
  cookie,
  id,
  incomplete,
  invalid,
  json,
  name,
  origin,
  protect,
  type Row,
  record,
  responseCookies
} from './validation';

export type Named = {
  id: string;
  name: string;
  slug?: string;
  website?: string;
  email?: string;
};
export type Application = Named & {
  workspaceId: string;
  isPublic?: boolean;
  color?: string;
  icon?: string;
  lastDeployedAt?: string;
  lastEditedAt?: string;
  gitConnected?: boolean;
};
const text = (row: Row, key: string): string | undefined => {
  const value = row[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw incomplete();
  return value;
};
const flag = (row: Row, key: string): boolean | undefined => {
  const value = row[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw incomplete();
  return value;
};
export function named(value: unknown): Named {
  const row = record(value);
  try {
    id(row.id);
    name(row.name);
  } catch {
    throw incomplete();
  }
  return {
    id: row.id as string,
    name: row.name as string,
    slug: text(row, 'slug'),
    website: text(row, 'website'),
    email: text(row, 'email')
  };
}
export function application(value: unknown): Application {
  const row = record(value);
  let workspaceId: string;
  try {
    workspaceId = id(row.workspaceId);
  } catch {
    throw incomplete();
  }
  return {
    ...named(row),
    workspaceId,
    isPublic: flag(row, 'isPublic'),
    color: text(row, 'color'),
    icon: text(row, 'icon'),
    lastDeployedAt: text(row, 'lastDeployedAt'),
    lastEditedAt: text(row, 'modifiedAt') ?? text(row, 'lastEditedAt'),
    gitConnected:
      row.gitApplicationMetadata == null
        ? undefined
        : !!record(row.gitApplicationMetadata).remoteUrl
  };
}
export function envelope(value: unknown): unknown {
  const row = record(value);
  const meta = record(row.responseMeta);
  if (
    meta.success !== true ||
    !Number.isInteger(meta.status) ||
    Number(meta.status) < 200 ||
    Number(meta.status) >= 300 ||
    !Object.hasOwn(row, 'data')
  )
    throw incomplete();
  return row.data;
}
const array = (value: unknown): unknown[] => {
  if (!Array.isArray(value) || value.length > 1000) throw incomplete();
  return value;
};
const unique = <T extends { id: string }>(rows: T[]): T[] => {
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw incomplete();
  return rows;
};
export class Client {
  readonly instanceUrl: string;
  private readonly token: string;
  private readonly expectedUserId?: string;
  private readonly http;
  constructor(config: { instanceUrl: string; token?: string; userId?: string }) {
    this.instanceUrl = origin(config.instanceUrl);
    this.token = cookie(config.token, false);
    this.expectedUserId = config.userId === undefined ? undefined : id(config.userId);
    this.http = createAuthenticatedAxios({
      baseURL: this.instanceUrl,
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 5 * 1024 * 1024,
      errorAdapter: adapt
    });
  }
  private session() {
    cookie(this.token);
  }
  private secrets() {
    return { token: this.token };
  }
  private async response(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Row,
    raw = false
  ) {
    this.session();
    if (data !== undefined) {
      json(data);
      protect(data, this.secrets());
    }
    const response = await requestAxios<unknown>(
      'Appsmith request',
      () =>
        this.http.request({
          method,
          url: path,
          data,
          params,
          headers: { Cookie: `SESSION=${this.token}` }
        }),
      adapt
    );
    if (response.status !== 200 && response.status !== 201) throw incomplete();
    if (!raw) protect(response.data, this.secrets());
    return response;
  }
  private async data(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Row
  ) {
    return envelope((await this.response(method, path, data, params)).data);
  }
  async checkHealth() {
    const response = await requestAxios<unknown>(
      'instance health',
      () => this.http.get('/api/v1/health'),
      adapt
    );
    if (
      response.status !== 200 ||
      (typeof response.data === 'string' && /<html|<!doctype/i.test(response.data))
    )
      throw incomplete();
    protect(response.data, this.secrets());
    return { isHealthy: true, status: 'The native health endpoint returned HTTP 200.' };
  }
  async getInstanceInfo(): Promise<Row> {
    const response = await requestAxios<unknown>(
      'instance configuration',
      () => this.http.get('/api/v1/consolidated-api/view'),
      adapt
    );
    if (response.status !== 200) throw incomplete();
    protect(response.data, this.secrets());
    const row = record(response.data);
    return Object.hasOwn(row, 'responseMeta') ? record(envelope(row)) : row;
  }
  async listWorkspaces() {
    return unique(array(await this.data('GET', '/api/v1/workspaces/home')).map(named));
  }
  async getWorkspace(workspaceId: string) {
    const key = id(workspaceId),
      result = named(await this.data('GET', `/api/v1/workspaces/${key}`));
    if (result.id !== key) throw incomplete();
    return result;
  }
  async createWorkspace(value: string) {
    const wanted = name(value),
      receipt = named(await this.data('POST', '/api/v1/workspaces', { name: wanted }));
    const current = await this.getWorkspace(receipt.id);
    if (receipt.name !== wanted || current.name !== wanted) throw incomplete();
    return current;
  }
  async updateWorkspace(workspaceId: string, updates: { name?: string; website?: string }) {
    const key = id(workspaceId),
      body: Row = {};
    if (updates.name !== undefined) body.name = name(updates.name);
    if (updates.website !== undefined) {
      if (
        updates.website.length > 2048 ||
        Array.from(updates.website).some(c => c.charCodeAt(0) < 32)
      )
        throw invalid('Provide a website value of at most 2048 characters without controls.');
      body.website = updates.website;
    }
    if (!Object.keys(body).length)
      throw invalid('Provide at least one workspace field to update.');
    await this.getWorkspace(key);
    const receipt = named(await this.data('PUT', `/api/v1/workspaces/${key}`, body)),
      current = await this.getWorkspace(key);
    if (
      receipt.id !== key ||
      Object.entries(body).some(([k, v]) => current[k as keyof Named] !== v)
    )
      throw incomplete();
    return current;
  }
  async deleteWorkspace(workspaceId: string) {
    const before = await this.getWorkspace(id(workspaceId));
    const receipt = named(await this.data('DELETE', `/api/v1/workspaces/${before.id}`));
    if (receipt.id !== before.id || receipt.name !== before.name) throw incomplete();
    return receipt;
  }
  async getWorkspaceMembers(workspaceId: string) {
    const key = id(workspaceId);
    await this.getWorkspace(key);
    return array(await this.data('GET', `/api/v1/workspaces/${key}/members`)).map(value => {
      const row = record(value);
      const member = {
        userId: text(row, 'userId'),
        username: text(row, 'username'),
        name: text(row, 'name'),
        roleName: text(row, 'roleName')
      };
      if (!member.userId && !member.username) throw incomplete();
      return member;
    });
  }
  async listApplications(workspaceId?: string) {
    const key = workspaceId === undefined ? undefined : id(workspaceId);
    const rows = unique(
      array(
        await this.data(
          'GET',
          '/api/v1/applications/home',
          undefined,
          key ? { workspaceId: key } : undefined
        )
      ).map(application)
    );
    if (key && rows.some(row => row.workspaceId !== key)) throw incomplete();
    return rows;
  }
  async getApplication(applicationId: string) {
    const key = id(applicationId),
      matches = (await this.listApplications()).filter(row => row.id === key);
    if (matches.length !== 1) throw incomplete();
    return matches[0]!;
  }
  private async readReceipt(
    value: unknown,
    workspaceId: string,
    wantedName?: string,
    sourceId?: string
  ) {
    const receipt = application(value);
    if (
      receipt.workspaceId !== workspaceId ||
      receipt.id === sourceId ||
      (wantedName !== undefined && receipt.name !== wantedName)
    )
      throw incomplete();
    const current = await this.getApplication(receipt.id);
    if (
      current.workspaceId !== workspaceId ||
      (wantedName !== undefined && current.name !== wantedName)
    )
      throw incomplete();
    return current;
  }
  async createApplication(workspaceId: string, value: string, color?: string, icon?: string) {
    const key = id(workspaceId),
      wanted = name(value),
      body: Row = { workspaceId: key, name: wanted };
    if (color !== undefined) {
      if (!/^#[A-F0-9]{6}$/.test(color))
        throw invalid('Use an application color such as #AABBCC.');
      body.color = color;
    }
    if (icon !== undefined) {
      if (!icon.trim() || icon.length > 99)
        throw invalid('Provide a valid native Appsmith icon identifier.');
      body.icon = icon;
    }
    await this.getWorkspace(key);
    return this.readReceipt(
      await this.data('POST', '/api/v1/applications', body),
      key,
      wanted
    );
  }
  async updateApplication(
    applicationId: string,
    updates: { name?: string; isPublic?: boolean }
  ) {
    const key = id(applicationId),
      wanted = updates.name === undefined ? undefined : name(updates.name);
    if (updates.isPublic !== undefined && typeof updates.isPublic !== 'boolean')
      throw invalid('Provide a boolean public-access value.');
    if (wanted === undefined && updates.isPublic === undefined)
      throw invalid('Provide at least one application field to update.');
    const before = await this.getApplication(key);
    if (wanted !== undefined) {
      const receipt = application(
        await this.data('PUT', `/api/v1/applications/${key}`, { name: wanted })
      );
      if (
        receipt.id !== key ||
        receipt.workspaceId !== before.workspaceId ||
        receipt.name !== wanted
      )
        throw incomplete();
    }
    if (updates.isPublic !== undefined) {
      const receipt = application(
        await this.data('PUT', `/api/v1/applications/${key}/changeAccess`, {
          publicAccess: updates.isPublic
        })
      );
      if (
        receipt.id !== key ||
        receipt.workspaceId !== before.workspaceId ||
        receipt.isPublic !== updates.isPublic
      )
        throw incomplete();
    }
    const current = await this.getApplication(key);
    if (
      current.workspaceId !== before.workspaceId ||
      (wanted !== undefined && current.name !== wanted) ||
      (updates.isPublic !== undefined && current.isPublic !== updates.isPublic)
    )
      throw incomplete();
    return current;
  }
  async deleteApplication(applicationId: string) {
    const before = await this.getApplication(id(applicationId));
    const receipt = application(
      await this.data('DELETE', `/api/v1/applications/${before.id}`)
    );
    if (receipt.id !== before.id || receipt.workspaceId !== before.workspaceId)
      throw incomplete();
    return receipt;
  }
  async publishApplication(applicationId: string) {
    const before = await this.getApplication(id(applicationId));
    if ((await this.data('POST', `/api/v1/applications/publish/${before.id}`)) !== true)
      throw incomplete();
    const current = await this.getApplication(before.id);
    if (current.workspaceId !== before.workspaceId) throw incomplete();
    return current;
  }
  async cloneApplication(applicationId: string) {
    const before = await this.getApplication(id(applicationId));
    return this.readReceipt(
      await this.data('POST', `/api/v1/applications/clone/${before.id}`),
      before.workspaceId,
      undefined,
      before.id
    );
  }
  private imported(value: unknown): unknown {
    const row = record(value);
    if (
      row.artifact !== undefined &&
      row.application !== undefined &&
      record(row.artifact).id !== record(row.application).id
    )
      throw incomplete();
    return row.artifact ?? row.application ?? row;
  }
  async forkApplication(applicationId: string, targetWorkspaceId: string) {
    const source = id(applicationId),
      target = id(targetWorkspaceId);
    await this.getApplication(source);
    await this.getWorkspace(target);
    return this.readReceipt(
      this.imported(await this.data('POST', `/api/v1/applications/${source}/fork/${target}`)),
      target,
      undefined,
      source
    );
  }
  async exportApplication(applicationId: string) {
    const app = await this.getApplication(id(applicationId));
    const exported = record(
      (
        await this.response(
          'GET',
          `/api/v1/applications/export/${app.id}`,
          undefined,
          undefined,
          true
        )
      ).data
    );
    protect(exported, {});
    const native = record(exported.exportedApplication);
    if (
      native.name !== app.name ||
      (exported.artifactJsonType !== undefined && exported.artifactJsonType !== 'APPLICATION')
    )
      throw incomplete();
    const cleaned = Object.fromEntries(
      Object.entries(exported).filter(
        ([key]) => !['decryptedFields', 'invisibleActionFields'].includes(key)
      )
    );
    protect(cleaned, this.secrets());
    return { name: app.name, bytes: json(cleaned) };
  }
  async importApplication(workspaceId: string, value: unknown) {
    const target = id(workspaceId);
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        throw invalid('Provide valid application export JSON.');
      }
    }
    protect(value, this.secrets());
    const content = record(value),
      exported = record(content.exportedApplication),
      wanted = name(exported.name);
    if (content.artifactJsonType !== undefined && content.artifactJsonType !== 'APPLICATION')
      throw invalid('Provide an Appsmith application export.');
    for (const key of ['decryptedFields', 'invisibleActionFields'])
      if (content[key] != null && Object.keys(record(content[key])).length)
        throw invalid(
          'Remove embedded credential fields from the export and reconfigure datasources in Appsmith after import.'
        );
    protect(content, this.secrets());
    const serialized = json(content);
    await this.getWorkspace(target);
    const me = await this.response('GET', '/api/v1/users/me');
    this.user(envelope(me.data));
    const cookies = responseCookies(me.headers['set-cookie']);
    if (cookies.has('SESSION') && cookies.get('SESSION') !== this.token)
      throw invalid('Reconnect after the native session rotates before importing.');
    const csrf = cookies.get('XSRF-TOKEN');
    if (!csrf)
      throw invalid(
        'This instance did not issue its native CSRF cookie. Import through the dashboard or reconnect to a compatible instance.'
      );
    let decoded: string;
    try {
      decoded = decodeURIComponent(csrf);
    } catch {
      throw incomplete();
    }
    cookie(decoded);
    const form = new FormData();
    form.append(
      'file',
      new Blob([serialized], { type: 'application/json' }),
      'application.json'
    );
    const response = await requestAxios<unknown>(
      'application import',
      () =>
        this.http.post(`/api/v1/applications/import/${target}`, form, {
          headers: {
            'Content-Type': undefined,
            Cookie: `SESSION=${this.token}; XSRF-TOKEN=${csrf}`,
            'X-XSRF-TOKEN': decoded
          }
        }),
      adapt
    );
    if (response.status !== 200 && response.status !== 201) throw incomplete();
    protect(response.data, this.secrets());
    return this.readReceipt(this.imported(envelope(response.data)), target, wanted);
  }
  async listPages(applicationId: string) {
    const key = id(applicationId);
    await this.getApplication(key);
    const result = record(
      await this.data('GET', '/api/v1/pages', undefined, { applicationId: key, mode: 'EDIT' })
    );
    if (result.applicationId !== undefined && result.applicationId !== key) throw incomplete();
    return unique(
      array(result.pages).map(value => {
        const row = record(value);
        return {
          ...named(row),
          isDefault: flag(row, 'isDefault'),
          isHidden: flag(row, 'isHidden')
        };
      })
    );
  }
  async listDatasources(workspaceId: string) {
    const key = id(workspaceId);
    await this.getWorkspace(key);
    return unique(
      array(
        await this.data('GET', '/api/v1/datasources', undefined, { workspaceId: key })
      ).map(value => {
        const row = record(value);
        if (row.workspaceId !== undefined && row.workspaceId !== key) throw incomplete();
        return {
          ...named(row),
          pluginName: text(row, 'pluginName'),
          pluginId: text(row, 'pluginId'),
          isValid: flag(row, 'isValid'),
          isConfigured: flag(row, 'isConfigured')
        };
      })
    );
  }
  private user(value: unknown) {
    const row = record(value);
    let key: string;
    try {
      key = id(row.id);
    } catch {
      throw incomplete();
    }
    const email = text(row, 'email');
    if (
      row.isAnonymous === true ||
      !email ||
      (this.expectedUserId !== undefined && key !== this.expectedUserId)
    )
      throw incomplete();
    return {
      id: key,
      email,
      name: text(row, 'name'),
      role: text(row, 'role'),
      isAnonymous: false
    };
  }
  async getCurrentUser() {
    return this.user(await this.data('GET', '/api/v1/users/me'));
  }
  async triggerWorkflow(webhookUrl: string, payload: Row) {
    let url: URL;
    try {
      url = new URL(webhookUrl);
    } catch {
      throw invalid('Provide the exact native workflow webhook URL.');
    }
    if (
      url.origin !== this.instanceUrl ||
      url.username ||
      url.password ||
      url.hash ||
      webhookUrl !== webhookUrl.trim()
    )
      throw invalid(
        'Use the native webhook URL from the configured Appsmith instance, without URL credentials or a fragment.'
      );
    const workflowSecrets = {
      ...this.secrets(),
      webhookUrl,
      query: Object.fromEntries(url.searchParams)
    };
    const serialized = json(payload);
    protect(payload, workflowSecrets);
    // The native URL contains its own credential. Fetch avoids retaining it in shared HTTP traces.
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
        redirect: 'error',
        signal: AbortSignal.timeout(30000)
      });
    } catch {
      throw adapt({});
    }
    if (!response.ok) throw adapt({ response: { status: response.status } });
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 4 * 1024 * 1024) {
            await reader.cancel();
            throw incomplete();
          }
          chunks.push(part.value);
        }
      } catch (error) {
        throw adapt(error);
      }
    }
    const body = Buffer.concat(chunks).toString('utf8');
    let result: unknown = body || undefined;
    if (
      body &&
      (getResponseHeaderValue(response.headers, 'content-type') ?? '').includes('json')
    ) {
      try {
        result = JSON.parse(body);
      } catch {
        throw incomplete();
      }
    }
    if (typeof result === 'string' && /<html|<!doctype/i.test(result)) throw incomplete();
    protect(result, workflowSecrets);
    let workflowRunId: string | undefined;
    if (result && typeof result === 'object' && Object.hasOwn(result, 'responseMeta')) {
      result = envelope(result);
      const row = record(result);
      if (row.workflowRunId !== undefined) workflowRunId = id(row.workflowRunId);
    }
    return {
      response: result,
      triggered: true,
      httpStatus: response.status,
      workflowRunId,
      completionConfirmed: false
    };
  }
}
export function clientFor(
  ctx: {
    auth: { token?: string; instanceUrl?: string; userId?: string };
    config: Record<string, unknown>;
  },
  suppliedOrigin?: string
) {
  const legacy =
    typeof ctx.config.instanceUrl === 'string' ? ctx.config.instanceUrl : undefined;
  const bound = ctx.auth.instanceUrl ?? (ctx.auth.token ? legacy : undefined);
  if (bound && suppliedOrigin !== undefined && origin(bound) !== origin(suppliedOrigin))
    throw invalid(
      'Use the instance that issued this session. Reconnect to use another instance.'
    );
  return new Client({
    instanceUrl: bound ?? suppliedOrigin ?? legacy ?? '',
    token: ctx.auth.token,
    userId: ctx.auth.userId
  });
}
