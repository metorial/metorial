import { ServiceError } from '@lowerdeck/error';
import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import {
  boundOrigin,
  boundPath,
  type Connection,
  encodedPath,
  filePath,
  incomplete,
  integer,
  MAX_BYTES,
  nativeId,
  protect,
  type Row,
  reject,
  row,
  serviceOrigin,
  signedTarget,
  text,
  upstream
} from './contracts';

export type { Row } from './contracts';
export interface FilesComClientConfig extends Connection {}
type Pages = { cursor?: string; perPage?: number; sortBy?: Record<string, string> };
export class FilesComClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  readonly baseUrl: string;
  readonly token: string;
  constructor(config: FilesComClientConfig) {
    if (typeof config.token !== 'string' || !config.token || /\s/.test(config.token))
      reject('Provide a valid Files.com API key.');
    this.token = config.token;
    this.baseUrl = config.baseUrl
      ? boundOrigin(config.baseUrl)
      : serviceOrigin(config.subdomain);
    this.axios = createAuthenticatedAxios({
      baseURL: `${this.baseUrl}/api/rest/v1`,
      authHeader: { name: 'X-FilesAPI-Key', value: config.token },
      timeout: 30000,
      maxRedirects: 0
    });
  }
  private currentKeyData(value: unknown): Row {
    let data = value;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        incomplete();
      }
    }
    const source = row(data);
    // The normal key field exactly matches the configured key and is already a known secret.
    protect(
      Object.fromEntries(
        Object.entries(source).filter(([key, item]) => !(key === 'key' && item === this.token))
      ),
      this.token
    );
    return Object.fromEntries(
      Object.entries(source).filter(([key]) =>
        [
          'id',
          'user_id',
          'site_id',
          'site_name',
          'workspace_id',
          'name',
          'permission_set'
        ].includes(key)
      )
    );
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: Row,
    params?: Row
  ) {
    protect({ path, data, params }, this.token);
    let response: { data: unknown; headers: Record<string, unknown>; status: number };
    try {
      response = await this.axios.request({
        method,
        url: path,
        data,
        params: pickDefined(params ?? {}),
        ...(path === '/api_key'
          ? { transformResponse: [(value: unknown) => this.currentKeyData(value)] }
          : {})
      });
    } catch (error) {
      if (isApiErrorRecord(error)) protect(error.data, this.token);
      throw upstream(error);
    }
    protect({ data: response.data, headers: response.headers }, this.token);
    return response;
  }
  private paging(params: Pages = {}) {
    if (params.cursor !== undefined && !params.cursor)
      reject('A pagination cursor cannot be empty.');
    return pickDefined({
      cursor: params.cursor,
      per_page: integer(params.perPage ?? 100, 1, 10000),
      sort_by: params.sortBy
    });
  }
  private async list(path: string, params: Row) {
    const response = await this.request('get', path, undefined, params);
    if (!Array.isArray(response.data)) incomplete();
    const cursor = getResponseHeaderValue(response.headers, 'X-Files-Cursor-Next');
    if (cursor !== undefined) protect(cursor, this.token);
    return { data: (response.data as unknown[]).map(row), cursor: cursor || undefined };
  }
  private async exact(path: string, expected?: number) {
    const result = row((await this.request('get', path)).data);
    if (
      !Object.keys(result).length ||
      (expected !== undefined && nativeId(result.id) !== expected)
    )
      incomplete();
    return result;
  }
  private validateFields(kind: string, data: Row, creating = false) {
    if (!Object.keys(data).length) reject('Provide at least one field to change.');
    for (const [key, value] of Object.entries(data)) {
      if (['user_id', 'group_id', 'max_uses'].includes(key))
        integer(value, key === 'max_uses' ? 0 : 1);
      if (key === 'path' || key === 'user_root') data[key] = filePath(value, true);
      if (
        ['expires_at', 'start_access_on_date', 'authenticate_until'].includes(key) &&
        (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
      )
        reject('Provide a valid ISO date/time.');
    }
    if (kind === 'users') {
      if (creating && (typeof data.username !== 'string' || !data.username.trim()))
        reject('username is required for create.');
      if (data.require_2fa === 'none') data.require_2fa = 'never_require';
      if (data.grant_permission === 'none') data.grant_permission = '';
    }
    if (kind === 'groups' && creating && (typeof data.name !== 'string' || !data.name.trim()))
      reject('name is required for create.');
    if (kind === 'permissions' && creating) {
      if (data.path === undefined || data.permission === undefined)
        reject('path and permission are required for create; an empty path selects the root.');
      if (
        [data.user_id, data.group_id, data.username].filter(v => v !== undefined).length !== 1
      )
        reject('Provide exactly one userId, groupId or username.');
    }
    if (
      kind === 'notifications' &&
      creating &&
      [data.user_id, data.group_id, data.username].filter(v => v !== undefined).length !== 1
    )
      reject('Provide exactly one userId, groupId or username for notifications.');
    if (kind === 'bundles') {
      if (data.preview_only !== undefined)
        reject(
          'previewOnly is not a documented writable bundle field. Configure preview restrictions in Files.com and read the resulting link.'
        );
      if (data.paths !== undefined) {
        if (!Array.isArray(data.paths) || !data.paths.length)
          reject('Provide at least one path.');
        data.paths = data.paths.map(p => filePath(p));
      }
    }
    if (kind === 'automations') {
      if (creating && !data.automation) reject('automationType is required for create.');
      if (
        creating &&
        data.trigger === 'custom_schedule' &&
        (!Array.isArray(data.schedule_times_of_day) || !data.schedule_times_of_day.length)
      )
        reject('Custom schedules require scheduleTimesOfDay.');
      if (
        data.schedule_times_of_day !== undefined &&
        (!Array.isArray(data.schedule_times_of_day) ||
          data.schedule_times_of_day.some(
            time => typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
          ))
      )
        reject('Schedule times must use HH:MM.');
      if (
        data.schedule_days_of_week !== undefined &&
        (!Array.isArray(data.schedule_days_of_week) ||
          data.schedule_days_of_week.some(
            day => typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6
          ))
      )
        reject('Schedule days must be integers 0–6.');
    }
  }
  private async write(kind: string, method: 'post' | 'patch', data: Row, id?: number) {
    this.validateFields(kind, data, method === 'post');
    const result = row(
      (
        await this.request(
          method,
          `/${kind}${id === undefined ? '' : `/${integer(id)}`}`,
          data
        )
      ).data
    );
    const actual = nativeId(result.id);
    if (id !== undefined && actual !== id) incomplete();
    for (const required of kind === 'users'
      ? ['username']
      : kind === 'groups'
        ? ['name']
        : kind === 'permissions'
          ? ['path', 'permission']
          : [])
      if (typeof result[required] !== 'string') incomplete();
    return result;
  }
  private async remove(kind: string, id: number) {
    const response = await this.request('delete', `/${kind}/${integer(id)}`);
    if (response.status !== 200 && response.status !== 204) incomplete();
  }
  async getFileInfo(path: string) {
    const result = row(
      (
        await this.request('get', `/files/${encodedPath(path, true)}`, undefined, {
          action: 'stat',
          with_previews: true
        })
      ).data
    );
    this.validateFile(result);
    boundPath(result.path, path);
    return result;
  }
  private validateFile(file: Row) {
    if (
      typeof file.path !== 'string' ||
      typeof file.display_name !== 'string' ||
      !['file', 'directory'].includes(String(file.type))
    )
      incomplete();
    if (
      file.size !== undefined &&
      file.size !== null &&
      (typeof file.size !== 'number' || !Number.isSafeInteger(file.size) || file.size < 0)
    )
      incomplete();
  }
  async listFolder(path: string, params: Pages & { search?: string } = {}) {
    const result = await this.list(`/folders/${encodedPath(path, true)}`, {
      ...this.paging(params),
      ...pickDefined({ search: params.search })
    });
    result.data.forEach(item => this.validateFile(item));
    return { entries: result.data, cursor: result.cursor };
  }
  async createFolder(path: string, params: { mkdirParents?: boolean } = {}) {
    const result = row(
      (
        await this.request('post', `/folders/${encodedPath(path)}`, {
          mkdir_parents: params.mkdirParents ?? true
        })
      ).data
    );
    this.validateFile(result);
    if (result.type !== 'directory') incomplete();
    boundPath(result.path, path);
    return result;
  }
  async deleteFile(path: string, params: { recursive?: boolean } = {}) {
    const response = await this.request('delete', `/files/${encodedPath(path)}`, undefined, {
      recursive: params.recursive ?? false
    });
    if (response.status !== 200 && response.status !== 204) incomplete();
  }
  private async fileAction(
    action: 'copy' | 'move',
    path: string,
    destination: string,
    params: Row
  ) {
    const result = row(
      (
        await this.request('post', `/file_actions/${action}/${encodedPath(path)}`, {
          destination: filePath(destination),
          ...pickDefined(params)
        })
      ).data
    );
    const status = text(result.status);
    if (status === 'pending') nativeId(result.file_migration_id);
    return result;
  }
  copyFile(
    path: string,
    destination: string,
    params: { overwrite?: boolean; structure?: boolean } = {}
  ) {
    return this.fileAction('copy', path, destination, params);
  }
  moveFile(path: string, destination: string, params: { overwrite?: boolean } = {}) {
    return this.fileAction('move', path, destination, params);
  }
  async getFileOperation(id: number) {
    return this.exact(`/file_migrations/${integer(id)}`, id);
  }
  async listUsers(params: Pages & { search?: string } = {}) {
    const r = await this.list('/users', {
      ...this.paging(params),
      ...pickDefined({ search: params.search })
    });
    r.data.forEach(user => {
      nativeId(user.id);
      text(user.username);
    });
    return { users: r.data, cursor: r.cursor };
  }
  getUser(id: number) {
    return this.exact(`/users/${integer(id)}`, id);
  }
  createUser(data: Row) {
    return this.write('users', 'post', data);
  }
  updateUser(id: number, data: Row) {
    return this.write('users', 'patch', data, id);
  }
  deleteUser(id: number) {
    return this.remove('users', id);
  }
  async listGroups(params: Pages = {}) {
    const r = await this.list('/groups', this.paging(params));
    r.data.forEach(g => {
      nativeId(g.id);
      text(g.name);
    });
    return { groups: r.data, cursor: r.cursor };
  }
  getGroup(id: number) {
    return this.exact(`/groups/${integer(id)}`, id);
  }
  createGroup(data: Row) {
    return this.write('groups', 'post', data);
  }
  updateGroup(id: number, data: Row) {
    return this.write('groups', 'patch', data, id);
  }
  deleteGroup(id: number) {
    return this.remove('groups', id);
  }
  async listPermissions(
    params: Pages & {
      path?: string;
      userId?: number;
      groupId?: number;
      includeGroups?: boolean;
    } = {}
  ) {
    const r = await this.list('/permissions', {
      ...this.paging(params),
      ...pickDefined({
        path: params.path === undefined ? undefined : filePath(params.path, true),
        user_id: params.userId === undefined ? undefined : String(integer(params.userId)),
        group_id: params.groupId === undefined ? undefined : String(integer(params.groupId)),
        include_groups: params.includeGroups
      })
    });
    r.data.forEach(p => {
      nativeId(p.id);
      if (typeof p.path !== 'string') incomplete();
      text(p.permission);
    });
    return { permissions: r.data, cursor: r.cursor };
  }
  createPermission(data: Row) {
    return this.write('permissions', 'post', data);
  }
  deletePermission(id: number) {
    return this.remove('permissions', id);
  }
  async listBundles(params: Pages = {}) {
    const r = await this.list('/bundles', this.paging(params));
    r.data.forEach(b => nativeId(b.id));
    return { bundles: r.data, cursor: r.cursor };
  }
  getBundle(id: number) {
    return this.exact(`/bundles/${integer(id)}`, id);
  }
  createBundle(data: Row) {
    return this.write('bundles', 'post', data);
  }
  updateBundle(id: number, data: Row) {
    return this.write('bundles', 'patch', data, id);
  }
  deleteBundle(id: number) {
    return this.remove('bundles', id);
  }
  async listAutomations(params: Pages = {}) {
    const r = await this.list('/automations', this.paging(params));
    r.data.forEach(a => nativeId(a.id));
    return { automations: r.data, cursor: r.cursor };
  }
  getAutomation(id: number) {
    return this.exact(`/automations/${integer(id)}`, id);
  }
  createAutomation(data: Row) {
    return this.write('automations', 'post', data);
  }
  updateAutomation(id: number, data: Row) {
    return this.write('automations', 'patch', data, id);
  }
  deleteAutomation(id: number) {
    return this.remove('automations', id);
  }
  async runAutomation(id: number) {
    const response = await this.request('post', `/automations/${integer(id)}/manual_run`, {});
    if (response.status !== 200 && response.status !== 202 && response.status !== 204)
      incomplete();
  }
  async listNotifications(
    params: Pages & { path?: string; userId?: number; groupId?: number } = {}
  ) {
    const r = await this.list('/notifications', {
      ...this.paging(params),
      ...pickDefined({
        path: params.path === undefined ? undefined : filePath(params.path, true),
        group_id: params.groupId === undefined ? undefined : String(integer(params.groupId)),
        filter: params.userId === undefined ? undefined : { user_id: integer(params.userId) }
      })
    });
    r.data.forEach(n => nativeId(n.id));
    return { notifications: r.data, cursor: r.cursor };
  }
  createNotification(data: Row) {
    return this.write('notifications', 'post', data);
  }
  updateNotification(id: number, data: Row) {
    return this.write('notifications', 'patch', data, id);
  }
  deleteNotification(id: number) {
    return this.remove('notifications', id);
  }
  async listActionLogs(
    params: Pages & {
      path?: string;
      folder?: string;
      userId?: number;
      username?: string;
      startAt?: string;
      endAt?: string;
    } = {}
  ) {
    if (
      [params.path, params.folder, params.userId].filter(v => v !== undefined).length > 1 ||
      params.username !== undefined
    )
      reject(
        'History supports one exact path, folder or userId selector; use list_users to resolve username.'
      );
    if (
      (params.startAt !== undefined && !Number.isFinite(Date.parse(params.startAt))) ||
      (params.endAt !== undefined && !Number.isFinite(Date.parse(params.endAt))) ||
      (params.startAt && params.endAt && Date.parse(params.startAt) > Date.parse(params.endAt))
    )
      reject('Provide a valid ordered history date range.');
    const suffix =
      params.path !== undefined
        ? `/files/${encodedPath(params.path)}`
        : params.folder !== undefined
          ? `/folders/${encodedPath(params.folder, true)}`
          : params.userId !== undefined
            ? `/users/${integer(params.userId)}`
            : '';
    const r = await this.list(`/history${suffix}`, {
      ...this.paging(params),
      ...pickDefined({ start_at: params.startAt, end_at: params.endAt })
    });
    r.data.forEach(log => text(log.action));
    return { logs: r.data, cursor: r.cursor };
  }
  async getCurrentApiKey() {
    const current = await this.exact('/api_key');
    nativeId(current.id);
    return current;
  }
  async downloadFile(path: string) {
    const file = row((await this.request('get', `/files/${encodedPath(path)}`)).data);
    this.validateFile(file);
    boundPath(file.path, path);
    if (file.type !== 'file') reject('Select a file to download.');
    if (typeof file.size !== 'number' || file.size > MAX_BYTES)
      reject('Downloads require a known file size of at most 10 MiB.');
    const target = signedTarget(file.download_uri, this.token);
    let response: Response;
    try {
      response = await fetch(target, {
        redirect: 'error',
        signal: AbortSignal.timeout(30000)
      });
    } catch {
      throw upstream({});
    }
    if (!response.ok) throw upstream({ response: { status: response.status } });
    const reader = response.body?.getReader();
    if (!reader) incomplete();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          reject('The download exceeds 10 MiB.');
        }
        chunks.push(chunk.value);
      }
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw upstream({});
    }
    if (size !== file.size) incomplete();
    return { file, bytes: Buffer.concat(chunks) };
  }
  async uploadFile(path: string, bytes: Buffer, mkdirParents: boolean) {
    filePath(path);
    if (bytes.byteLength > MAX_BYTES) reject('Uploads are limited to 10 MiB.');
    // The official small-stream protocol opens, requests each part, PUTs bytes, then finalizes.
    const opened = row(
      (
        await this.request('post', `/files/${encodedPath(path)}`, {
          action: 'put',
          size: bytes.byteLength,
          mkdir_parents: mkdirParents
        })
      ).data
    );
    const ref = text(opened.ref),
      partsize = nativeId(opened.partsize),
      nativePath = text(opened.path);
    protect(ref, this.token);
    boundPath(nativePath, path);
    if (Math.ceil(bytes.byteLength / partsize) > 16) incomplete();
    for (let offset = 0, part = 1; offset < bytes.byteLength; offset += partsize, part++) {
      const details = row(
        (
          await this.request('post', `/files/${encodedPath(path)}`, {
            action: 'put',
            ref,
            part
          })
        ).data
      );
      if (
        (details.path !== undefined && details.path !== nativePath) ||
        (details.ref !== undefined && details.ref !== ref)
      )
        incomplete();
      const target = signedTarget(details.upload_uri, this.token);
      let response: Response;
      try {
        response = await fetch(target, {
          method: 'PUT',
          body: bytes.subarray(offset, Math.min(offset + partsize, bytes.byteLength)),
          redirect: 'error',
          signal: AbortSignal.timeout(30000)
        });
      } catch {
        throw upstream({});
      }
      if (!response.ok) throw upstream({ response: { status: response.status } });
    }
    const result = row(
      (await this.request('post', `/files/${encodedPath(nativePath)}`, { action: 'end', ref }))
        .data
    );
    this.validateFile(result);
    if (
      result.type !== 'file' ||
      result.size !== bytes.byteLength ||
      result.path !== nativePath
    )
      incomplete();
    const current = await this.getFileInfo(path);
    if (
      current.type !== 'file' ||
      current.size !== bytes.byteLength ||
      current.path !== result.path
    )
      incomplete();
    return current;
  }
}
export const createClient = (auth: Connection, config: unknown = {}) => {
  const legacy = row(config);
  return new FilesComClient({
    ...auth,
    ...(auth.baseUrl === undefined
      ? { subdomain: typeof legacy.subdomain === 'string' ? legacy.subdomain : undefined }
      : {})
  });
};
