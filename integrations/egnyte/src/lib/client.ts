import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios
} from 'slates';
import {
  absolutePath,
  apiError,
  bindId,
  domainName,
  encodePath,
  ensurePrivate,
  identifier,
  integer,
  invalid,
  noControls,
  optionalPage,
  type RecordValue,
  record,
  requiredList,
  text
} from './contracts';

type Auth = { token: string; domain: string; refreshToken?: string };
type Page = { offset?: number; count?: number };
export class EgnyteClient {
  readonly baseUrl: string;
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private secrets: string[];
  constructor(auth: Auth) {
    this.baseUrl = `https://${domainName(auth.domain)}.egnyte.com`;
    this.secrets = [noControls(text(auth.token, 'access token')), auth.refreshToken ?? ''];
    this.axios = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `Bearer ${auth.token}` },
      timeout: 30000,
      maxRedirects: 0
    });
  }
  assertSafe(value: unknown) {
    ensurePrivate(value, this.secrets);
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    params?: RecordValue,
    options: { accept303?: boolean; contentType?: string } = {}
  ) {
    this.assertSafe({ path, params });
    if (!(data instanceof Uint8Array)) this.assertSafe(data);
    const response = await requestAxios(
      'Egnyte request',
      () =>
        this.axios.request({
          method,
          url: path,
          data,
          params: pickDefined(params ?? {}),
          ...(options.accept303
            ? { validateStatus: status => status === 200 || status === 303 }
            : {}),
          ...(options.contentType ? { headers: { 'Content-Type': options.contentType } } : {})
        }),
      apiError
    );
    this.assertSafe(response.data);
    if (response.status === 207)
      throw invalid(
        'Egnyte only partially completed the requested operation. Inspect the exact resource before retrying.'
      );
    return response;
  }
  private async object(
    method: 'get' | 'post' | 'put' | 'patch',
    path: string,
    data?: unknown,
    params?: RecordValue
  ) {
    return record((await this.request(method, path, data, params)).data);
  }
  private page(options: Page, maximum = 100) {
    return {
      offset: optionalPage(options.offset),
      count: optionalPage(options.count, 1, maximum)
    };
  }
  private async item(
    path: string,
    expected?: { id: string | number; field?: string },
    params?: RecordValue
  ) {
    const result = await this.object('get', path, undefined, params);
    return expected ? bindId(result, expected.id, expected.field) : result;
  }
  private fileInfo(value: unknown, expected?: string, field = 'group_id') {
    const result = record(value);
    if (expected) bindId(result, expected, field);
    text(result.name, 'resource name');
    if (typeof result.is_folder !== 'boolean')
      throw invalid('Egnyte returned an invalid file or folder type.');
    if (expected && result.is_folder !== (field === 'folder_id'))
      throw invalid('Egnyte returned a different resource type than requested.');
    text(result.is_folder ? result.folder_id : result.group_id, 'file or folder ID');
    if (result.folder_id !== undefined && result.group_id !== undefined)
      throw invalid('Egnyte returned ambiguous file and folder identities.');
    if (result.size !== undefined) integer(result.size);
    if (result.lastModified !== undefined)
      integer(result.lastModified, -8640000000000000, 8640000000000000);
    return result;
  }
  async listFolder(
    path: string,
    options: Page & {
      listContent?: boolean;
      allowedLinkTypes?: string;
      sortBy?: string;
      sortDirection?: string;
    } = {}
  ) {
    if (options.sortBy === 'size')
      throw invalid(
        'Folder listing does not support sorting by size. Use name or last_modified.'
      );
    const result = this.fileInfo(
      await this.object('get', `/pubapi/v1/fs/${encodePath(path)}`, undefined, {
        ...this.page(options, 1000),
        list_content: true,
        sort_by: options.sortBy,
        sort_direction:
          options.sortDirection === 'asc'
            ? 'ascending'
            : options.sortDirection === 'desc'
              ? 'descending'
              : options.sortDirection
      })
    );
    if (!result.is_folder || absolutePath(result.path) !== absolutePath(path))
      throw invalid('Egnyte returned a different folder than requested.');
    requiredList(result.files).forEach(f => {
      if (this.fileInfo(f).is_folder !== false)
        throw invalid('Egnyte returned a folder in the file list.');
    });
    requiredList(result.folders).forEach(f => {
      if (this.fileInfo(f).is_folder !== true)
        throw invalid('Egnyte returned a file in the folder list.');
    });
    return result;
  }
  async getFileMetadata(path: string) {
    const result = this.fileInfo(
      await this.item(`/pubapi/v1/fs/${encodePath(path)}`, undefined, {
        list_content: false,
        include_locks: true
      })
    );
    if (absolutePath(result.path) !== absolutePath(path))
      throw invalid('Egnyte returned a different path than requested.');
    return result;
  }
  async getFileById(id: string, listContent = false) {
    return this.fileInfo(
      await this.item(`/pubapi/v1/fs/ids/file/${identifier(id)}`, undefined, {
        list_content: listContent,
        include_locks: true
      }),
      id
    );
  }
  async getFolderById(id: string) {
    return this.fileInfo(
      await this.item(`/pubapi/v1/fs/ids/folder/${identifier(id)}`, undefined, {
        list_content: false
      }),
      id,
      'folder_id'
    );
  }
  async createFolder(path: string) {
    const result = await this.object('post', `/pubapi/v1/fs/${encodePath(path)}`, {
      action: 'add_folder'
    });
    text(result.folder_id);
    if (absolutePath(result.path) !== absolutePath(path))
      throw invalid('Egnyte returned a different created folder.');
    return result;
  }
  async uploadFile(
    folderPath: string,
    filename: string,
    content: Uint8Array,
    contentType = 'application/octet-stream'
  ) {
    const name = noControls(text(filename, 'filename'));
    if (name === '.' || name === '..' || /[/\\]/.test(name))
      throw invalid('Provide a single filename without path separators.');
    if (content.byteLength > 4 * 1024 * 1024)
      throw invalid(
        'Uploads are limited to 4 MiB. Use the Egnyte application for larger files.'
      );
    const path = `${absolutePath(folderPath)}/${filename}`;
    const result = this.fileInfo(
      (
        await this.request(
          'post',
          `/pubapi/v1/fs-content/${encodePath(path)}`,
          content,
          undefined,
          { contentType }
        )
      ).data
    );
    if (result.is_folder || absolutePath(result.path) !== path || result.name !== filename)
      throw invalid('Egnyte did not return the requested uploaded file.');
    text(result.group_id, 'uploaded file ID');
    text(result.entry_id, 'uploaded version ID');
    if (result.size !== undefined && result.size !== content.byteLength)
      throw invalid(
        'Egnyte returned a different uploaded size. Inspect the exact file before retrying.'
      );
    return result;
  }
  getDownloadUrl(id: string, entryId?: string) {
    const url = new URL(`${this.baseUrl}/pubapi/v1/fs-content/ids/file/${identifier(id)}`);
    if (entryId !== undefined) {
      identifier(entryId);
      url.searchParams.set('entry_id', entryId);
    }
    return url.toString();
  }
  async copyFileOrFolder(source: string, destination: string, permissions?: string) {
    return this.relocationReceipt(
      await this.object(
        'post',
        `/pubapi/v1/fs/${encodePath(source)}`,
        pickDefined({ action: 'copy', destination: absolutePath(destination), permissions })
      ),
      destination
    );
  }
  async moveFileOrFolder(source: string, destination: string, permissions?: string) {
    return this.relocationReceipt(
      await this.object(
        'post',
        `/pubapi/v1/fs/${encodePath(source)}`,
        pickDefined({ action: 'move', destination: absolutePath(destination), permissions })
      ),
      destination
    );
  }
  private relocationReceipt(result: RecordValue, destination: string) {
    if (absolutePath(result.path) !== absolutePath(destination))
      throw invalid(
        'Egnyte returned a different destination. Inspect the exact resource before retrying.'
      );
    const ids = [result.group_id, result.folder_id].filter(id => id !== undefined);
    if (ids.length !== 1)
      throw invalid(
        'Egnyte did not confirm a single copied or moved resource. Inspect the destination before retrying.'
      );
    text(ids[0], 'copied or moved resource ID');
    return result;
  }
  async deleteFileOrFolder(path: string, entryId?: string) {
    if (entryId !== undefined) identifier(entryId);
    await this.request('delete', `/pubapi/v1/fs/${encodePath(path)}`, undefined, {
      entry_id: entryId
    });
  }
  async lockFile(path: string, lockToken: string) {
    await this.request('post', `/pubapi/v1/fs/${encodePath(path)}`, {
      action: 'lock',
      lock_token: text(lockToken, 'lock token')
    });
  }
  async unlockFile(path: string, lockToken: string) {
    await this.request('post', `/pubapi/v1/fs/${encodePath(path)}`, {
      action: 'unlock',
      lock_token: text(lockToken, 'lock token')
    });
  }
  async createLink(options: {
    path: string;
    type: string;
    accessibility: string;
    recipients?: string[];
    sendEmail?: boolean;
    message?: string;
    notify?: boolean;
    expiryDate?: string;
    expiryClicks?: number;
    password?: string;
    linkToCurrent?: boolean;
  }) {
    if (options.expiryDate && options.expiryClicks !== undefined)
      throw invalid('Choose date expiry or click expiry, not both.');
    if (options.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(options.expiryDate))
      throw invalid('Link expiry dates use YYYY-MM-DD.');
    if (options.expiryClicks !== undefined) integer(options.expiryClicks, 1, 10);
    if (
      (options.sendEmail || options.accessibility === 'recipients') &&
      !options.recipients?.length
    )
      throw invalid('Provide recipients for the selected sharing settings.');
    this.assertSafe(options);
    const result = await this.object(
      'post',
      '/pubapi/v1/links',
      pickDefined({
        path: absolutePath(options.path),
        type: options.type,
        accessibility: options.accessibility,
        recipients: options.recipients,
        send_email: options.sendEmail,
        message: options.message,
        notify: options.notify,
        expiry_date: options.expiryDate,
        expiry_clicks: options.expiryClicks,
        password: options.password,
        link_to_current: options.linkToCurrent
      })
    );
    requiredList(result.links).forEach(link => {
      text(link.id);
      text(link.url, 'sharing URL');
    });
    if (!requiredList(result.links).length)
      throw invalid('Egnyte did not return a sharing link.');
    return result;
  }
  async listLinks(
    options: Page & {
      path?: string;
      username?: string;
      createdBefore?: string;
      createdAfter?: string;
      type?: string;
      accessibility?: string;
    } = {}
  ) {
    if (options.type === 'upload')
      throw invalid(
        'The Links listing filter supports file or folder; upload links can be read by ID.'
      );
    const result = await this.object('get', '/pubapi/v2/links', undefined, {
      ...this.page(options, 500),
      path: options.path === undefined ? undefined : absolutePath(options.path),
      username: options.username,
      created_before: options.createdBefore,
      created_after: options.createdAfter,
      type: options.type,
      accessibility: options.accessibility
    });
    requiredList(result.links).forEach(link => {
      text(link.id);
      text(link.url);
      text(link.path);
      text(link.type);
      text(link.accessibility);
    });
    return result;
  }
  async getLinkDetails(id: string) {
    const result = await this.item(`/pubapi/v1/links/${identifier(id)}`);
    if (!requiredList(result.links).some(link => link.id === id))
      throw invalid('Egnyte returned a different sharing link.');
    return result;
  }
  async deleteLink(id: string) {
    await this.request('delete', `/pubapi/v1/links/${identifier(id)}`);
  }
  async getPermissions(path: string) {
    const result = await this.item(`/pubapi/v2/perms/${encodePath(path)}`);
    record(result.userPerms);
    record(result.groupPerms);
    if (typeof result.inheritsPermissions !== 'boolean')
      throw invalid('Egnyte returned invalid permission inheritance.');
    return result;
  }
  async setPermissions(
    path: string,
    options: {
      userPerms?: Record<string, string>;
      groupPerms?: Record<string, string>;
      inheritsPermissions?: boolean;
      keepParentPermissions?: boolean;
    }
  ) {
    if (!Object.keys(pickDefined(options)).length)
      throw invalid('Provide at least one permission change.');
    if (options.keepParentPermissions !== undefined && options.inheritsPermissions !== false)
      throw invalid('keepParentPermissions requires inheritsPermissions=false.');
    this.assertSafe(options);
    await this.request('post', `/pubapi/v2/perms/${encodePath(path)}`, pickDefined(options));
  }
  private scimPage(options: { startIndex?: number; count?: number; filter?: string }) {
    return {
      startIndex: optionalPage(options.startIndex, 1),
      count: optionalPage(options.count, 1, 100),
      filter: options.filter
    };
  }
  private user(value: unknown, expected?: number) {
    const result = record(value);
    integer(result.id, 1);
    text(result.userName);
    return expected === undefined ? result : bindId(result, expected);
  }
  private group(value: unknown, expected?: string) {
    const result = record(value);
    text(result.id);
    text(result.displayName);
    return expected === undefined ? result : bindId(result, expected);
  }
  async listUsers(options: { startIndex?: number; count?: number; filter?: string } = {}) {
    const result = await this.object(
      'get',
      '/pubapi/v2/users',
      undefined,
      this.scimPage(options)
    );
    requiredList(result.resources).forEach(value => this.user(value));
    return result;
  }
  async getUser(id: number) {
    integer(id, 1);
    return this.user(await this.item(`/pubapi/v2/users/${id}`), id);
  }
  async createUser(options: {
    userName: string;
    email: string;
    givenName: string;
    familyName: string;
    userType?: string;
    authType?: string;
    sendInvite?: boolean;
    active?: boolean;
  }) {
    this.assertSafe(options);
    if (options.sendInvite === false && (!options.authType || options.authType === 'egnyte'))
      throw invalid(
        'Egnyte-authenticated users always receive invitations; sendInvite=false requires an appropriate SSO or AD account.'
      );
    return this.user(
      await this.object(
        'post',
        '/pubapi/v2/users',
        pickDefined({
          userName: text(options.userName),
          email: text(options.email),
          name: { givenName: text(options.givenName), familyName: text(options.familyName) },
          active: options.active ?? true,
          userType: options.userType ?? 'standard',
          authType: options.authType ?? 'egnyte',
          sendInvite: options.sendInvite
        })
      )
    );
  }
  async updateUser(id: number, body: RecordValue) {
    integer(id, 1);
    if (!Object.keys(body).length) throw invalid('Provide at least one user change.');
    this.assertSafe(body);
    return this.user(await this.object('patch', `/pubapi/v2/users/${id}`, body), id);
  }
  async deleteUser(id: number) {
    integer(id, 1);
    await this.request('delete', `/pubapi/v2/users/${id}`);
  }
  async listGroups(options: { startIndex?: number; count?: number; filter?: string } = {}) {
    const result = await this.object(
      'get',
      '/pubapi/v2/groups',
      undefined,
      this.scimPage(options)
    );
    requiredList(result.resources).forEach(value => this.group(value));
    return result;
  }
  async getGroup(id: string) {
    return this.group(await this.item(`/pubapi/v2/groups/${identifier(id)}`), id);
  }
  async createGroup(displayName: string, members?: { value: number }[]) {
    members?.forEach(m => integer(m.value, 1));
    return this.group(
      await this.object(
        'post',
        '/pubapi/v2/groups',
        pickDefined({ displayName: text(displayName), members })
      )
    );
  }
  async updateGroup(
    id: string,
    body: { displayName?: string; members?: { value: number }[] }
  ) {
    if (!Object.keys(body).length) throw invalid('Provide at least one group change.');
    if (body.displayName !== undefined) text(body.displayName);
    body.members?.forEach(m => integer(m.value, 1));
    if (body.members === undefined)
      return this.group(
        await this.object('patch', `/pubapi/v2/groups/${identifier(id)}`, body),
        id
      );
    // PATCH adds members. Preserve the documented legacy replacement contract with a bound read + PUT.
    const current = await this.getGroup(id);
    return this.group(
      await this.object('put', `/pubapi/v2/groups/${identifier(id)}`, {
        displayName: body.displayName ?? text(current.displayName),
        members: body.members
      }),
      id
    );
  }
  async deleteGroup(id: string) {
    await this.request('delete', `/pubapi/v2/groups/${identifier(id)}`);
  }
  async search(
    options: Page & {
      query: string;
      folder?: string;
      modifiedBefore?: string;
      modifiedAfter?: string;
    }
  ) {
    if (options.query.length < 3 || options.query.length > 100)
      throw invalid('Search queries must contain 3–100 characters.');
    const result = await this.object('get', '/pubapi/v1/search', undefined, {
      ...this.page(options, 20),
      query: options.query,
      folder: options.folder === undefined ? undefined : absolutePath(options.folder),
      modified_before: options.modifiedBefore,
      modified_after: options.modifiedAfter
    });
    requiredList(result.results).forEach(value => {
      text(value.name);
      text(value.path);
    });
    return result;
  }
  async createComment(path: string, body: string) {
    this.assertSafe(body);
    const result = await this.object('post', '/pubapi/v1/notes', {
      path: absolutePath(path),
      body: text(body, 'comment')
    });
    text(result.id);
    return result;
  }
  async listComments(path: string, options: Page = {}) {
    const result = await this.object('get', '/pubapi/v1/notes', undefined, {
      ...this.page(options),
      file: absolutePath(path)
    });
    requiredList(result.notes).forEach(note => {
      text(note.id);
      text(note.message);
    });
    return result;
  }
  async deleteComment(id: string) {
    await this.request('delete', `/pubapi/v1/notes/${identifier(id)}`);
  }
  async listTrash(folderPath?: string, options: Page = {}) {
    if (folderPath !== undefined)
      throw invalid(
        'Trash listing does not support folder-path scoping. List the current trash page and use its exact item IDs.'
      );
    const result = await this.object(
      'get',
      '/pubapi/v2/fs/trash',
      undefined,
      this.page(options)
    );
    requiredList(result.items).forEach(item => {
      text(item.id);
      text(item.path);
      text(item.name);
    });
    return result;
  }
  async restoreFromTrash(path: string, trashId?: string) {
    const target = absolutePath(path);
    const matches: RecordValue[] = [];
    for (let offset = 0; offset < 10000; offset += 100) {
      const page = await this.listTrash(undefined, { offset, count: 100 });
      matches.push(
        ...requiredList(page.items).filter(
          item => item.path === target && (trashId === undefined || item.id === trashId)
        )
      );
      if (page.has_more === false) {
        if (matches.length !== 1)
          throw invalid(
            'The original path does not identify exactly one trash item. Supply its exact trash ID.'
          );
        await this.request('post', '/pubapi/v1/fs/trash', {
          action: 'RESTORE',
          ids: [text(matches[0]!.id)]
        });
        return;
      }
      if (page.has_more !== true || !requiredList(page.items).length)
        throw invalid('Egnyte returned uncertain trash pagination; no item was restored.');
    }
    throw invalid('Trash discovery exceeded the bounded scan; no item was restored.');
  }
  async emptyTrash(): Promise<void> {
    throw invalid(
      'The current Egnyte API does not document emptying the entire trash. Use the Egnyte application to select and purge items explicitly.'
    );
  }
  async setFileMetadataProperties(id: string, namespace: string, properties: RecordValue) {
    return this.setProperties('file', id, namespace, properties);
  }
  async setFolderMetadataProperties(id: string, namespace: string, properties: RecordValue) {
    return this.setProperties('folder', id, namespace, properties);
  }
  private async setProperties(
    type: string,
    id: string,
    namespace: string,
    properties: RecordValue
  ) {
    if (!Object.keys(properties).length)
      throw invalid('Provide at least one metadata property.');
    this.assertSafe(properties);
    await this.request(
      'put',
      `/pubapi/v1/fs/ids/${type}/${identifier(id)}/properties/${identifier(namespace)}`,
      properties
    );
  }
  async getNamespace(namespace: string) {
    return this.item(`/pubapi/v1/properties/namespace/${identifier(namespace)}`);
  }
  async listNamespaces() {
    return requiredList((await this.request('get', '/pubapi/v1/properties/namespace')).data);
  }
  async getProperties(type: 'file' | 'folder', id: string, namespace: string) {
    return this.item(
      `/pubapi/v1/fs/ids/${type}/${identifier(id)}/properties/${identifier(namespace)}`
    );
  }
  async listWorkflows(options: Page = {}) {
    const result = await this.object('get', '/pubapi/v1/workflows', undefined, {
      offset: optionalPage(options.offset),
      limit: optionalPage(options.count, 1, 25)
    });
    requiredList(result.results);
    return result;
  }
  async createWorkflow(body: RecordValue) {
    this.assertSafe(body);
    const result = await this.object('post', '/pubapi/v1/workflows', body);
    text(result.workflowId);
    return result;
  }
  async resolveUsername(username: string) {
    text(username);
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(username))
      throw invalid('Provide a valid Egnyte username.');
    const page = await this.listUsers({
      filter: `userName eq "${username}"`,
      startIndex: 1,
      count: 100
    });
    const users = requiredList(page.resources).filter(
      user =>
        typeof user.userName === 'string' &&
        user.userName.toLowerCase() === username.toLowerCase()
    );
    if (users.length !== 1 || page.totalResults !== 1)
      throw invalid('The workflow username does not resolve to exactly one user.');
    return integer(users[0]!.id, 1);
  }
  async getWorkflow(id: string) {
    return this.item(`/pubapi/v1/workflows/${identifier(id)}`, { id });
  }
  async listWorkflowTasks(options: Page = {}) {
    const result = await this.object('get', '/pubapi/v1/workflows/tasks', undefined, {
      offset: optionalPage(options.offset),
      limit: optionalPage(options.count, 1, 50)
    });
    requiredList(result.results).forEach(task => text(task.id));
    return result;
  }
  async cancelWorkflow(id: string) {
    await this.request('post', `/pubapi/v1/workflows/${identifier(id)}/cancel`);
  }
  async createAuditReport(type: string, body: RecordValue) {
    this.assertSafe(body);
    const result = await this.object('post', `/pubapi/v1/audit/${identifier(type)}`, body);
    text(result.id);
    return result;
  }
  async getAuditReportStatus(id: string) {
    const response = await this.request(
      'get',
      `/pubapi/v1/audit/jobs/${identifier(id)}`,
      undefined,
      undefined,
      { accept303: true }
    );
    const result = record(response.data);
    if (result.status !== 'running' && result.status !== 'completed')
      throw invalid('Egnyte returned an unknown audit job status.');
    if ((response.status === 303) !== (result.status === 'completed'))
      throw invalid('Egnyte returned inconsistent audit job status.');
    const location = getResponseHeaderValue(response.headers, 'location');
    this.assertSafe(location);
    return { status: result.status, location };
  }
  async getAuditReport(type: string, id: string, options: Page = {}) {
    return this.request(
      'get',
      `/pubapi/v1/audit/${identifier(type)}/${identifier(id)}`,
      undefined,
      this.page(options, 1000)
    );
  }
  async getCurrentUser() {
    const result = await this.item('/pubapi/v1/userinfo');
    integer(result.id, 1);
    text(result.username);
    return result;
  }
}
