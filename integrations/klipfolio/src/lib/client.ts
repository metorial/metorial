import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { klipSchema, pathId, validateInput } from './contracts';

export class Client {
  private axios;
  private nextRequestAt = 0;

  constructor(private config: { token: string }) {
    if (
      typeof config.token !== 'string' ||
      !config.token.trim() ||
      /[\r\n]/.test(config.token)
    )
      throw createApiServiceError('A nonempty Klipfolio API key is required.', {
        reason: 'invalid_auth'
      });
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.klipfolio.com/api/1.0',
      timeout: 30000,
      maxRedirects: 0,
      authHeader: { name: 'kf-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Klipfolio',
          reason: 'upstream_error',
          parent: {},
          formatMessage: ({ status, message }) =>
            `Klipfolio API request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}: ${message}`,
          extractMessage: () =>
            'Check API key permissions, account feature access, request fields and rate limits; response details are concealed.'
        })
    });
    this.axios.interceptors.request.use(async request => {
      if (isApiErrorRecord(request.params)) {
        const { limit, offset } = request.params;
        validateInput({
          limit: limit === undefined ? undefined : Number(limit),
          offset: offset === undefined ? undefined : Number(offset)
        });
      }
      const wait = Math.max(0, this.nextRequestAt - Date.now());
      this.nextRequestAt = Date.now() + wait + 220;
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      return request;
    });
    this.axios.interceptors.response.use(response => {
      const envelope = response.data;
      if (!isApiErrorRecord(envelope))
        throw createApiServiceError('Klipfolio returned an invalid JSON response.', {
          reason: 'invalid_response'
        });
      const meta = isApiErrorRecord(envelope.meta) ? envelope.meta : {};
      if (meta.success === false || (typeof meta.status === 'number' && meta.status >= 400))
        throw createApiServiceError(
          'Klipfolio rejected the request. Check permissions, account features and request fields; response details are concealed.',
          {
            reason: 'upstream_error',
            upstreamStatus: typeof meta.status === 'number' ? meta.status : undefined
          }
        );
      if (response.config.method !== 'get' && meta.success !== true)
        throw createApiServiceError(
          'Klipfolio did not confirm this change. Read the resource back before retrying.',
          { reason: 'invalid_response' }
        );
      if (response.config.method === 'get' && !Object.hasOwn(envelope, 'data'))
        throw createApiServiceError('Klipfolio returned no resource data.', {
          reason: 'invalid_response'
        });
      const resourcePath = response.config.url?.match(
        /^\/(?:clients|tabs|klips|datasources|datasource-instances|users|roles|groups|dashboard-published-links)\/([^/]+)$/
      );
      if (
        response.config.method === 'get' &&
        (response.config.url === '/profile' || resourcePath) &&
        (!isApiErrorRecord(envelope.data) ||
          typeof envelope.data.id !== 'string' ||
          !envelope.data.id.trim() ||
          (resourcePath && envelope.data.id !== decodeURIComponent(resourcePath[1]!)))
      )
        throw createApiServiceError('Klipfolio returned an invalid resource identity.', {
          reason: 'invalid_response'
        });
      response.data = /\/datasource-instances\/[^/]+\/data$/.test(response.config.url ?? '')
        ? { ...envelope, data: this.concealFileData(envelope.data) }
        : this.conceal(
            envelope,
            '',
            /^\/datasources(?:\/|$)/.test(response.config.url ?? ''),
            /\/(?:schema|layout)$/.test(response.config.url ?? '')
          );
      return response;
    });
  }

  // Stored source data is user-requested content, not connector configuration.
  // Preserve its structure and nulls; remove the configured API key from keys and values.
  private concealFileData(value: unknown): unknown {
    if (typeof value === 'string') return value.split(this.config.token).join('[concealed]');
    if (Array.isArray(value)) return value.map(item => this.concealFileData(item));
    if (isApiErrorRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key.split(this.config.token).join('[concealed]'),
          this.concealFileData(item)
        ])
      );
    return value;
  }

  private conceal(
    value: unknown,
    key = '',
    hideProperties = false,
    preserveNulls = false
  ): unknown {
    if (key === 'properties' && hideProperties) {
      if (isApiErrorRecord(value))
        return Object.fromEntries(
          Object.keys(value).map(name => [
            name.split(this.config.token).join('[concealed]'),
            '[concealed]'
          ])
        );
      return '[concealed]';
    }
    if (
      /^(?:password|token|api[_-]?key|secret|authorization|credentials|access_token|refresh_token)$/i.test(
        key
      )
    )
      return '[concealed]';
    if (value === null) return preserveNulls ? null : undefined;
    if (typeof value === 'string') return value.split(this.config.token).join('[concealed]');
    if (Array.isArray(value))
      return value.map(item => this.conceal(item, '', hideProperties, preserveNulls));
    if (isApiErrorRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([name, item]) => [
          name.split(this.config.token).join('[concealed]'),
          this.conceal(item, name, hideProperties, preserveNulls)
        ])
      );
    }
    return value;
  }

  private listResponse(response: any, key: string) {
    const data = response.data;
    const rows = Array.isArray(data)
      ? data
      : (data?.[key] ?? (key === 'tabs' && typeof data?.id === 'string' ? [data] : undefined));
    if (
      !Array.isArray(rows) ||
      !rows.every(row => isApiErrorRecord(row) && typeof row.id === 'string' && row.id.trim())
    )
      throw createApiServiceError(`Klipfolio returned an invalid ${key} collection.`, {
        reason: 'invalid_response'
      });
    const total = response.meta?.total;
    if (total !== undefined && (!Number.isSafeInteger(total) || total < 0))
      throw createApiServiceError('Klipfolio returned an invalid collection total.', {
        reason: 'invalid_response'
      });
    return { ...response, data: rows };
  }

  async listGroups(opts?: { clientId?: string; limit?: number; offset?: number }) {
    const response = await this.axios.get('/groups', {
      params: {
        client_id: opts?.clientId,
        limit: opts?.limit,
        offset: opts?.offset
      }
    });
    return this.listResponse(response.data, 'groups');
  }

  private get headers() {
    return {
      'kf-api-key': this.config.token,
      'Content-Type': 'application/json'
    };
  }

  // ── Profile ──

  async getProfile(full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get('/profile', { headers: this.headers, params });
    return response.data?.data;
  }

  // ── Clients ──

  async listClients(opts?: {
    status?: string;
    externalId?: string;
    full?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.status) params.status = opts.status;
    if (opts?.externalId) params.external_id = opts.externalId;
    if (opts?.full) params.full = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/clients', { headers: this.headers, params });
    return this.listResponse(response.data, 'clients');
  }

  async getClient(clientId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/clients/${pathId(clientId)}`, {
      headers: this.headers,
      params
    });
    return response.data?.data;
  }

  async createClient(data: {
    name: string;
    description?: string;
    status?: string;
    seats?: number;
    externalId?: string;
  }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.status !== undefined) body.status = data.status;
    if (data.seats !== undefined) body.seats = data.seats;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    let response = await this.axios.post('/clients', body, { headers: this.headers });
    return response.data;
  }

  async updateClient(
    clientId: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
      seats?: number;
      externalId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.status !== undefined) body.status = data.status;
    if (data.seats !== undefined) body.seats = data.seats;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    let response = await this.axios.put(`/clients/${pathId(clientId)}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteClient(clientId: string) {
    let response = await this.axios.delete(`/clients/${pathId(clientId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Tabs (Dashboards) ──

  async listTabs(opts?: {
    clientId?: string;
    full?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.full) params.full = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/tabs', { headers: this.headers, params });
    return this.listResponse(response.data, 'tabs');
  }

  async getTab(tabId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/tabs/${pathId(tabId)}`, {
      headers: this.headers,
      params
    });
    return response.data?.data;
  }

  async createTab(data: { name: string; description?: string; clientId?: string }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    let response = await this.axios.post('/tabs', body, { headers: this.headers });
    return response.data;
  }

  async updateTab(tabId: string, data: { name?: string; description?: string }) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    let response = await this.axios.put(`/tabs/${pathId(tabId)}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteTab(tabId: string) {
    let response = await this.axios.delete(`/tabs/${pathId(tabId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Tab Sub-Resources ──

  async getTabShareRights(tabId: string) {
    let response = await this.axios.get(`/tabs/${pathId(tabId)}/share-rights`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async updateTabShareRights(
    tabId: string,
    groups: Array<{ groupId: string; canEdit: boolean }>
  ) {
    let body = { groups: groups.map(g => ({ group_id: g.groupId, can_edit: g.canEdit })) };
    let response = await this.axios.put(`/tabs/${pathId(tabId)}/share-rights`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteTabShareRight(tabId: string, groupId: string) {
    let response = await this.axios.delete(
      `/tabs/${pathId(tabId)}/share-rights/${pathId(groupId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getTabKlipInstances(tabId: string) {
    let response = await this.axios.get(`/tabs/${pathId(tabId)}/klip-instances`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async addKlipsToTab(
    tabId: string,
    klips: Array<{ klipId: string; region?: number; position?: number }>
  ) {
    let body = {
      klips: klips.map(k => ({ klip_id: k.klipId, region: k.region, position: k.position }))
    };
    let response = await this.axios.put(`/tabs/${pathId(tabId)}/klip-instances`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async removeKlipFromTab(tabId: string, instanceId: string) {
    let response = await this.axios.delete(
      `/tabs/${pathId(tabId)}/klip-instances/${pathId(instanceId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getTabLayout(tabId: string) {
    let response = await this.axios.get(`/tabs/${pathId(tabId)}/layout`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async updateTabLayout(tabId: string, layout: { type: string; state: Record<string, any> }) {
    let response = await this.axios.put(`/tabs/${pathId(tabId)}/layout`, layout, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Klips ──

  async listKlips(opts?: {
    clientId?: string;
    datasourceId?: string;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.datasourceId) params.datasource_id = opts.datasourceId;
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/klips', { headers: this.headers, params });
    return this.listResponse(response.data, 'klips');
  }

  async getKlip(klipId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/klips/${pathId(klipId)}`, {
      headers: this.headers,
      params
    });
    return response.data?.data;
  }

  async createKlip(data: {
    name: string;
    description?: string;
    clientId?: string;
    schema?: any;
  }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.schema !== undefined) body.schema = klipSchema(data.schema);
    let response = await this.axios.post('/klips', body, { headers: this.headers });
    return response.data;
  }

  async updateKlip(klipId: string, data: { name?: string; description?: string }) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    let response = await this.axios.put(`/klips/${pathId(klipId)}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteKlip(klipId: string) {
    let response = await this.axios.delete(`/klips/${pathId(klipId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getKlipSchema(klipId: string) {
    let response = await this.axios.get(`/klips/${pathId(klipId)}/schema`, {
      headers: this.headers
    });
    const schema = response.data?.data?.schema;
    if (!isApiErrorRecord(schema))
      throw createApiServiceError('Klipfolio returned an invalid Klip schema definition.', {
        reason: 'invalid_response'
      });
    return schema;
  }

  async updateKlipSchema(klipId: string, schema: any) {
    let response = await this.axios.put(
      `/klips/${pathId(klipId)}/schema`,
      klipSchema(schema),
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getKlipShareRights(klipId: string) {
    let response = await this.axios.get(`/klips/${pathId(klipId)}/share-rights`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  // ── Data Sources ──

  async listDatasources(opts?: {
    clientId?: string;
    full?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.full) params.full = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/datasources', { headers: this.headers, params });
    return this.listResponse(response.data, 'datasources');
  }

  async getDatasource(datasourceId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/datasources/${pathId(datasourceId)}`, {
      headers: this.headers,
      params
    });
    return response.data?.data;
  }

  async createDatasource(data: {
    name: string;
    description?: string;
    connector: string;
    format?: string;
    refreshInterval?: number;
    properties?: Record<string, any>;
    clientId?: string;
  }) {
    let body: Record<string, any> = {
      name: data.name,
      connector: data.connector
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.format !== undefined) body.format = data.format;
    if (data.refreshInterval !== undefined) body.refresh_interval = data.refreshInterval;
    if (data.properties !== undefined) body.properties = data.properties;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    let response = await this.axios.post('/datasources', body, { headers: this.headers });
    return response.data;
  }

  async updateDatasource(
    datasourceId: string,
    data: { name?: string; description?: string; refreshInterval?: number }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.refreshInterval !== undefined) body.refresh_interval = data.refreshInterval;
    let response = await this.axios.put(`/datasources/${pathId(datasourceId)}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteDatasource(datasourceId: string) {
    let response = await this.axios.delete(`/datasources/${pathId(datasourceId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async refreshDatasources(datasourceIds: string[]) {
    let body = { datasources: datasourceIds };
    let response = await this.axios.post('/datasources/@/refresh', body, {
      headers: this.headers
    });
    return response.data;
  }

  async enableDatasource(datasourceId: string) {
    let response = await this.axios.post(
      `/datasources/${pathId(datasourceId)}/@/enable`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async disableDatasource(datasourceId: string) {
    let response = await this.axios.post(
      `/datasources/${pathId(datasourceId)}/@/disable`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async getDatasourceProperties(datasourceId: string) {
    let response = await this.axios.get(`/datasources/${pathId(datasourceId)}/properties`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async updateDatasourceProperties(datasourceId: string, properties: Record<string, any>) {
    let response = await this.axios.put(
      `/datasources/${pathId(datasourceId)}/properties`,
      { properties },
      { headers: this.headers }
    );
    return response.data;
  }

  async getDatasourceShareRights(datasourceId: string) {
    let response = await this.axios.get(`/datasources/${pathId(datasourceId)}/share-rights`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async updateDatasourceShareRights(
    datasourceId: string,
    shareRights: {
      users?: Array<{ userId: string; canEdit: boolean }>;
      groups?: Array<{ groupId: string; canEdit: boolean }>;
    }
  ) {
    let body: Record<string, any> = {};
    if (shareRights.users) {
      body.users = shareRights.users.map(u => ({ user_id: u.userId, can_edit: u.canEdit }));
    }
    if (shareRights.groups) {
      body.groups = shareRights.groups.map(g => ({
        group_id: g.groupId,
        can_edit: g.canEdit
      }));
    }
    let response = await this.axios.put(
      `/datasources/${pathId(datasourceId)}/share-rights`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Data Source Instances ──

  async listDatasourceInstances(opts?: {
    clientId?: string;
    datasourceId?: string;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.datasourceId) params.datasource_id = opts.datasourceId;
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/datasource-instances', {
      headers: this.headers,
      params
    });
    return this.listResponse(response.data, 'datasources');
  }

  async getDatasourceInstance(instanceId: string) {
    let response = await this.axios.get(`/datasource-instances/${pathId(instanceId)}`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async getDatasourceInstanceData(instanceId: string) {
    let response = await this.axios.get(`/datasource-instances/${pathId(instanceId)}/data`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async refreshDatasourceInstance(instanceId: string) {
    let response = await this.axios.post(
      `/datasource-instances/${pathId(instanceId)}/@/refresh`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Users ──

  async listUsers(opts?: {
    clientId?: string;
    email?: string;
    full?: boolean;
    includeRoles?: boolean;
    includeGroups?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.email) params.email = opts.email;
    if (opts?.full) params.full = 'true';
    if (opts?.includeRoles) params.include_roles = 'true';
    if (opts?.includeGroups) params.include_groups = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/users', { headers: this.headers, params });
    return this.listResponse(response.data, 'users');
  }

  async getUser(userId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/users/${pathId(userId)}`, {
      headers: this.headers,
      params
    });
    return response.data?.data;
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    roles?: string[];
    password?: string;
    externalId?: string;
    clientId?: string;
    sendEmail?: boolean;
  }) {
    let params: Record<string, string> = {};
    params.send_email = data.sendEmail === true ? 'true' : 'false';
    if (!data.roles?.length)
      throw createApiServiceError('At least one role ID is required when creating a user.', {
        reason: 'invalid_input'
      });
    let body: Record<string, any> = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email
    };
    if (data.roles !== undefined) body.roles = data.roles;
    if (data.password !== undefined) body.password = data.password;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    let response = await this.axios.post('/users', body, { headers: this.headers, params });
    return response.data;
  }

  async updateUser(
    userId: string,
    data: { firstName?: string; lastName?: string; email?: string; externalId?: string }
  ) {
    let body: Record<string, any> = {};
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    let response = await this.axios.put(`/users/${pathId(userId)}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.axios.delete(`/users/${pathId(userId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getUserGroups(userId: string) {
    let response = await this.axios.get(`/users/${pathId(userId)}/groups`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async addUserToGroup(userId: string, groupId: string) {
    let response = await this.axios.put(
      `/users/${pathId(userId)}/groups/${pathId(groupId)}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async removeUserFromGroup(userId: string, groupId: string) {
    let response = await this.axios.delete(
      `/users/${pathId(userId)}/groups/${pathId(groupId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getUserTabInstances(userId: string) {
    let response = await this.axios.get(`/users/${pathId(userId)}/tab-instances`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async addTabsToUser(userId: string, tabIds: string[]) {
    let body = { tab_ids: tabIds };
    let response = await this.axios.put(`/users/${pathId(userId)}/tab-instances`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async removeTabFromUser(userId: string, tabInstanceId: string) {
    let response = await this.axios.delete(
      `/users/${pathId(userId)}/tab-instances/${pathId(tabInstanceId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Roles ──

  async listRoles(opts?: {
    clientId?: string;
    full?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.full) params.full = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/roles', { headers: this.headers, params });
    return this.listResponse(response.data, 'roles');
  }

  async getRole(roleId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/roles/${pathId(roleId)}`, {
      headers: this.headers,
      params
    });
    return response.data?.data;
  }

  async createRole(data: { name: string; description?: string; permissions?: string[] }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.permissions !== undefined) body.permissions = data.permissions;
    let response = await this.axios.post('/roles', body, { headers: this.headers });
    return response.data;
  }

  async updateRole(
    roleId: string,
    data: { name?: string; description?: string; permissions?: string[] }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.permissions !== undefined) body.permissions = data.permissions;
    let response = await this.axios.put(`/roles/${pathId(roleId)}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteRole(roleId: string) {
    let response = await this.axios.delete(`/roles/${pathId(roleId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getRolePermissions(roleId: string) {
    let response = await this.axios.get(`/roles/${pathId(roleId)}/permissions`, {
      headers: this.headers
    });
    const permissions = response.data?.data?.permissions;
    if (!Array.isArray(permissions) || !permissions.every(value => typeof value === 'string'))
      throw createApiServiceError('Klipfolio returned invalid role permissions.', {
        reason: 'invalid_response'
      });
    return permissions;
  }

  async updateRolePermissions(roleId: string, permissions: string[]) {
    let response = await this.axios.put(
      `/roles/${pathId(roleId)}/permissions`,
      { permissions },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Groups ──

  async getGroupUsers(groupId: string) {
    let response = await this.axios.get(`/groups/${pathId(groupId)}/users`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async addUserToGroupDirect(groupId: string, userId: string) {
    let response = await this.axios.put(
      `/groups/${pathId(groupId)}/users/${pathId(userId)}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async removeUserFromGroupDirect(groupId: string, userId: string) {
    let response = await this.axios.delete(
      `/groups/${pathId(groupId)}/users/${pathId(userId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getGroupDefaultTabs(groupId: string) {
    let response = await this.axios.get(`/groups/${pathId(groupId)}/default-tabs`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async addGroupDefaultTab(
    groupId: string,
    data: { tabId: string; canEdit?: boolean; visibility?: string; index?: number }
  ) {
    let body: Record<string, any> = { tab_id: data.tabId };
    if (data.canEdit !== undefined) body.can_edit = data.canEdit;
    if (data.visibility !== undefined) body.visibility = data.visibility;
    if (data.index !== undefined) body.index = data.index;
    let response = await this.axios.post(`/groups/${pathId(groupId)}/default-tabs`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateGroupDefaultTab(
    groupId: string,
    defaultTabId: string,
    data: { canEdit?: boolean; visibility?: string; index?: number }
  ) {
    let body: Record<string, any> = {};
    if (data.canEdit !== undefined) body.can_edit = data.canEdit;
    if (data.visibility !== undefined) body.visibility = data.visibility;
    if (data.index !== undefined) body.index = data.index;
    let response = await this.axios.put(
      `/groups/${pathId(groupId)}/default-tabs/${pathId(defaultTabId)}`,
      body,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteGroupDefaultTab(groupId: string, defaultTabId: string) {
    let response = await this.axios.delete(
      `/groups/${pathId(groupId)}/default-tabs/${pathId(defaultTabId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Published Links ──

  async listPublishedLinks(opts?: {
    clientId?: string;
    dashboardId?: string;
    limit?: number;
    offset?: number;
  }) {
    if (!opts?.dashboardId)
      throw createApiServiceError(
        'Provide dashboardId to list its published links; discover dashboard IDs with list_dashboards.',
        { reason: 'invalid_input' }
      );
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.dashboardId) params.dashboard_id = opts.dashboardId;
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/dashboard-published-links', {
      headers: this.headers,
      params
    });
    return this.listResponse(response.data, 'published_links');
  }

  async getPublishedLink(linkId: string) {
    let response = await this.axios.get(`/dashboard-published-links/${pathId(linkId)}`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async createPublishedLink(
    dashboardId: string,
    data: {
      name?: string;
      password?: string;
      description?: string;
      isPublic?: boolean;
      theme?: string;
      logo?: string;
    }
  ) {
    if (data.description !== undefined)
      throw createApiServiceError(
        'Published links do not support description in the documented Klips API. Use name instead.',
        { reason: 'invalid_input' }
      );
    let body: Record<string, any> = {};
    if (!data.name?.trim())
      throw createApiServiceError('A name is required when creating a published link.', {
        reason: 'invalid_input'
      });
    if (data.name !== undefined) body.name = data.name;
    if (data.password !== undefined) body.password = data.password;
    if (data.isPublic !== undefined) body.isPublic = data.isPublic;
    if (data.theme !== undefined) body.theme = data.theme;
    if (data.logo !== undefined) body.logo = data.logo;
    let response = await this.axios.post(
      `/dashboard-published-links/${pathId(dashboardId)}`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updatePublishedLink(
    linkId: string,
    data: {
      name?: string;
      password?: string;
      description?: string;
      isPublic?: boolean;
      theme?: string;
      logo?: string;
    }
  ) {
    if (data.description !== undefined)
      throw createApiServiceError(
        'Published links do not support description in the documented Klips API. Use name instead.',
        { reason: 'invalid_input' }
      );
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.password !== undefined) body.password = data.password;
    if (data.isPublic !== undefined) body.isPublic = data.isPublic;
    if (data.theme !== undefined) body.theme = data.theme;
    if (data.logo !== undefined) body.logo = data.logo;
    let response = await this.axios.put(`/dashboard-published-links/${pathId(linkId)}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deletePublishedLink(linkId: string) {
    let response = await this.axios.delete(`/dashboard-published-links/${pathId(linkId)}`, {
      headers: this.headers
    });
    return response.data;
  }
}
