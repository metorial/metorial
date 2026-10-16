import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export const defaultBaseUrl = 'https://app.rocketadmin.com/api';
export type RocketadminAuth = {
  token: string;
  authType?: 'api_key' | 'session';
  baseUrl?: string;
};

type JsonRecord = Record<string, unknown>;
type Query = Record<string, unknown>;

export function record(value: unknown, label = 'response'): JsonRecord {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Rocketadmin returned an invalid ${label}.`);
  }
  return value;
}

export function records(value: unknown, label = 'list'): JsonRecord[] {
  if (!Array.isArray(value) || value.some(item => !isApiErrorRecord(item))) {
    throw createApiServiceError(`Rocketadmin returned an invalid ${label}.`);
  }
  return value;
}

export function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`Rocketadmin did not return a valid ${label}.`);
  }
  return value;
}

export function normalizeBaseUrl(value = defaultBaseUrl): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Enter a valid Rocketadmin instance URL.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw createApiServiceError(
      'Use an HTTP or HTTPS Rocketadmin instance URL without credentials, query, or fragment.'
    );
  }
  // The legacy cloud value was the website root; custom API bases retain their paths.
  if (url.origin === 'https://app.rocketadmin.com' && url.pathname === '/') {
    url.pathname = '/api';
  }
  return url.toString().replace(/\/+$/, '');
}

export function createRocketadminClient(
  auth: RocketadminAuth,
  legacyConfig: unknown,
  masterPassword?: string
) {
  let legacyBaseUrl =
    isApiErrorRecord(legacyConfig) && typeof legacyConfig.baseUrl === 'string'
      ? legacyConfig.baseUrl
      : undefined;
  return new RocketadminClient({
    ...auth,
    baseUrl: auth.baseUrl ?? legacyBaseUrl,
    masterPassword
  });
}

export function validatePagination(page?: number, perPage?: number) {
  for (let [name, value] of [
    ['page', page],
    ['perPage', perPage]
  ] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
      throw createApiServiceError(`${name} must be a positive whole number.`);
    }
  }
  if ((page === undefined) !== (perPage === undefined)) {
    throw createApiServiceError('Provide page and perPage together.');
  }
}

export function paginationFrom(value: unknown) {
  if (value === undefined) return undefined;
  let pagination = record(value, 'pagination');
  for (let key of ['total', 'currentPage', 'perPage']) {
    if (
      pagination[key] !== undefined &&
      (typeof pagination[key] !== 'number' || !Number.isFinite(pagination[key]))
    ) {
      throw createApiServiceError(`Rocketadmin returned invalid pagination ${key}.`);
    }
  }
  return {
    total: typeof pagination.total === 'number' ? pagination.total : undefined,
    page: typeof pagination.currentPage === 'number' ? pagination.currentPage : undefined,
    perPage: typeof pagination.perPage === 'number' ? pagination.perPage : undefined
  };
}

export class RocketadminClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private authType: 'api_key' | 'session';
  private isHosted: boolean;

  constructor(config: RocketadminAuth & { masterPassword?: string }) {
    if (!config.token || /[\r\n;]/.test(config.token)) {
      throw createApiServiceError('Reconnect with valid Rocketadmin credentials.');
    }
    // Older stored connections contain only token; session credentials are JWTs.
    this.authType =
      config.authType ?? (config.token.split('.').length === 3 ? 'session' : 'api_key');
    let baseUrl = normalizeBaseUrl(config.baseUrl);
    this.isHosted = new URL(baseUrl).origin === 'https://app.rocketadmin.com';
    this.axios = createAuthenticatedAxios({
      baseURL: baseUrl,
      headers: {
        ...(this.authType === 'session'
          ? { Cookie: `rocketadmin_cookie=${config.token}` }
          : { 'x-api-key': config.token }),
        ...(config.masterPassword ? { masterpwd: config.masterPassword } : {})
      },
      timeout: 120_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Rocketadmin',
          reason: 'rocketadmin_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Query,
    apiKeyAllowed = false,
    text = false
  ): Promise<unknown> {
    if (this.authType === 'api_key' && !apiKeyAllowed) {
      throw createApiServiceError(
        'This operation requires an Email & Password connection. Rocketadmin API keys support connection discovery and table data operations.'
      );
    }
    let response = await this.axios.request({
      method,
      url: path,
      data,
      params: pickDefined(params ?? {}),
      ...(text
        ? { responseType: 'text' as const, transformResponse: [(value: unknown) => value] }
        : {})
    });
    return response.data;
  }

  async checkApiKey() {
    let result = record(
      await this.request('GET', '/check/apikey', undefined, undefined, true)
    );
    if (result.result !== true)
      throw createApiServiceError('Rocketadmin did not validate the API key.');
  }

  async listConnections() {
    return this.request('GET', '/connections', undefined, undefined, true);
  }

  async getConnection(connectionId: string) {
    return record(
      await this.request('GET', `/connection/one/${encodeURIComponent(connectionId)}`)
    );
  }

  async createConnection(params: JsonRecord) {
    return record(
      await this.request('POST', '/connection', {
        ...params,
        ssh: params.ssh ?? Boolean(params.sshHost)
      })
    );
  }

  private connectionParameters(value: JsonRecord) {
    let keys = [
      'type',
      'title',
      'host',
      'port',
      'database',
      'username',
      'password',
      'schema',
      'sid',
      'ssh',
      'sshHost',
      'sshPort',
      'sshUsername',
      'privateSSHKey',
      'ssl',
      'cert',
      'masterEncryption',
      'azure_encryption',
      'authSource',
      'dataCenter'
    ];
    let parameters = pickDefined(Object.fromEntries(keys.map(key => [key, value[key]])));
    if (parameters.ssh === true) {
      let missing = ['sshUsername', 'privateSSHKey', 'sshHost'].filter(
        key => typeof parameters[key] !== 'string' || !parameters[key]
      );
      if (
        typeof parameters.sshPort !== 'number' ||
        !Number.isInteger(parameters.sshPort) ||
        parameters.sshPort < 0 ||
        parameters.sshPort > 65535
      )
        missing.push('sshPort');
      if (missing.length) {
        throw createApiServiceError(
          `SSH connection updates and tests require ${missing.join(', ')}. Saved connection responses omit sshUsername and privateSSHKey; supply these credentials again.`
        );
      }
    }
    return parameters;
  }

  async updateConnection(connectionId: string, params: JsonRecord) {
    let existing = record((await this.getConnection(connectionId)).connection, 'connection');
    return record(
      await this.request(
        'PUT',
        `/connection/${encodeURIComponent(connectionId)}`,
        this.connectionParameters({ ...existing, ...pickDefined(params) })
      )
    );
  }

  async deleteConnection(connectionId: string, reason?: string) {
    return record(
      await this.request(
        'PUT',
        `/connection/delete/${encodeURIComponent(connectionId)}`,
        pickDefined({ reason })
      )
    );
  }

  async testConnection(connectionId: string, params: JsonRecord) {
    let existing = record((await this.getConnection(connectionId)).connection, 'connection');
    let result = record(
      await this.request(
        'POST',
        '/connection/test/',
        this.connectionParameters({ ...existing, ...pickDefined(params) }),
        { connectionId }
      )
    );
    if (result.result !== true) {
      throw createApiServiceError(
        typeof result.message === 'string'
          ? result.message
          : 'Rocketadmin could not test this connection.'
      );
    }
    return result;
  }

  async listTables(connectionId: string) {
    return records(
      await this.request(
        'GET',
        `/connection/tables/${encodeURIComponent(connectionId)}`,
        undefined,
        undefined,
        true
      ),
      'tables'
    );
  }

  async getTableStructure(connectionId: string, tableName: string) {
    return record(
      await this.request(
        'GET',
        `/table/structure/${encodeURIComponent(connectionId)}`,
        undefined,
        { tableName },
        true
      )
    );
  }

  async getRows(
    connectionId: string,
    tableName: string,
    params: {
      page?: number;
      perPage?: number;
      search?: string;
      sortField?: string;
      sortOrder?: string;
      filters?: JsonRecord;
    } = {}
  ) {
    validatePagination(params.page, params.perPage);
    if ((params.sortField === undefined) !== (params.sortOrder === undefined)) {
      throw createApiServiceError('Provide sortField and sortOrder together.');
    }
    return record(
      await this.request(
        'POST',
        `/table/rows/find/${encodeURIComponent(connectionId)}`,
        { filters: params.filters },
        {
          tableName,
          page: params.page,
          perPage: params.perPage,
          search: params.search,
          sort_by: params.sortField,
          sort_order: params.sortOrder
        },
        true
      )
    );
  }

  private primaryKeyParams(tableName: string, primaryKey: JsonRecord) {
    if (!Object.keys(primaryKey).length)
      throw createApiServiceError('Provide at least one primary-key column and value.');
    for (let [key, value] of Object.entries(primaryKey)) {
      if (
        ['tableName', '_uncached'].includes(key) ||
        value === null ||
        (typeof value === 'number' && !Number.isFinite(value)) ||
        !['string', 'number', 'boolean'].includes(typeof value)
      ) {
        throw createApiServiceError(
          'Primary keys must use non-null scalar values and cannot override tableName or _uncached.'
        );
      }
    }
    return { ...primaryKey, tableName };
  }

  async getRowByPrimaryKey(connectionId: string, tableName: string, primaryKey: JsonRecord) {
    return record(
      await this.request(
        'GET',
        `/table/row/${encodeURIComponent(connectionId)}`,
        undefined,
        this.primaryKeyParams(tableName, primaryKey),
        true
      )
    );
  }

  async addRow(connectionId: string, tableName: string, row: JsonRecord) {
    if (!Object.keys(row).length)
      throw createApiServiceError('Provide at least one column value in rowData.');
    return record(
      await this.request(
        'POST',
        `/table/row/${encodeURIComponent(connectionId)}`,
        row,
        { tableName },
        true
      )
    );
  }

  async updateRow(
    connectionId: string,
    tableName: string,
    primaryKey: JsonRecord,
    row: JsonRecord
  ) {
    return record(
      await this.request(
        'PUT',
        `/table/row/${encodeURIComponent(connectionId)}`,
        row,
        this.primaryKeyParams(tableName, primaryKey),
        true
      )
    );
  }

  async deleteRow(connectionId: string, tableName: string, primaryKey: JsonRecord) {
    let result = record(
      await this.request(
        'DELETE',
        `/table/row/${encodeURIComponent(connectionId)}`,
        undefined,
        this.primaryKeyParams(tableName, primaryKey),
        true
      )
    );
    record(result.row, 'deleted row');
    return result;
  }

  private validatePrimaryKeys(tableName: string, primaryKeys: JsonRecord[]) {
    if (!primaryKeys.length)
      throw createApiServiceError('Provide at least one primary key for a bulk operation.');
    for (let primaryKey of primaryKeys) this.primaryKeyParams(tableName, primaryKey);
  }

  async bulkUpdateRows(
    connectionId: string,
    tableName: string,
    primaryKeys: JsonRecord[],
    row: JsonRecord
  ) {
    this.validatePrimaryKeys(tableName, primaryKeys);
    let result = record(
      await this.request(
        'PUT',
        `/table/rows/update/${encodeURIComponent(connectionId)}`,
        { primaryKeys, newValues: row },
        { tableName },
        true
      )
    );
    if (result.success !== true)
      throw createApiServiceError('Rocketadmin did not confirm the bulk update.');
    return result;
  }

  async bulkDeleteRows(connectionId: string, tableName: string, primaryKeys: JsonRecord[]) {
    this.validatePrimaryKeys(tableName, primaryKeys);
    let result = await this.request(
      'PUT',
      `/table/rows/delete/${encodeURIComponent(connectionId)}`,
      primaryKeys,
      { tableName },
      true
    );
    if (result !== true)
      throw createApiServiceError('Rocketadmin did not confirm the bulk deletion.');
    return result;
  }

  async exportCsv(connectionId: string, tableName: string): Promise<string> {
    let result = await this.request(
      'POST',
      `/table/csv/export/${encodeURIComponent(connectionId)}`,
      {},
      { tableName },
      true,
      true
    );
    if (typeof result !== 'string')
      throw createApiServiceError('Rocketadmin did not return CSV text.');
    return result;
  }

  async listGroups(connectionId: string) {
    return records(
      await this.request('GET', `/connection/groups/${encodeURIComponent(connectionId)}`),
      'groups'
    );
  }
  async createGroup(connectionId: string, title: string) {
    return record(
      await this.request('POST', `/connection/group/${encodeURIComponent(connectionId)}`, {
        title
      })
    );
  }
  async deleteGroup(connectionId: string, groupId: string) {
    return this.request(
      'PUT',
      `/connection/group/delete/${encodeURIComponent(connectionId)}`,
      { groupId }
    );
  }
  async addUserToGroup(groupId: string, email: string) {
    return record(await this.request('PUT', '/group/user', { groupId, email }));
  }
  async removeUserFromGroup(groupId: string, email: string) {
    return this.request('PUT', '/group/user/delete', { groupId, email });
  }
  async getUsersInGroup(groupId: string) {
    return records(
      await this.request('GET', `/group/users/${encodeURIComponent(groupId)}`),
      'group users'
    );
  }
  async getUserInfo() {
    return record(await this.request('GET', '/user'));
  }
  async getCompanyInfo() {
    return record(await this.request('GET', '/company/my/full'));
  }
  async getUsersInConnection(connectionId: string) {
    return records(
      await this.request('GET', `/connection/users/${encodeURIComponent(connectionId)}`),
      'connection users'
    );
  }
  async getUsersInCompany(companyId: string) {
    return records(
      await this.request('GET', `/company/users/${encodeURIComponent(companyId)}`),
      'company users'
    );
  }
  async inviteUserToCompany(
    companyId: string,
    email: string,
    groupId: string | undefined,
    role: string,
    turnstileToken?: string
  ) {
    if (this.isHosted && !turnstileToken?.trim()) {
      throw createApiServiceError(
        'Hosted Rocketadmin invitations require a current turnstileToken from its interactive invitation challenge. Complete that challenge and supply the issued token.'
      );
    }
    return this.request(
      'PUT',
      `/company/user/${encodeURIComponent(companyId)}`,
      pickDefined({ email, groupId, role, turnstileToken })
    );
  }
  async removeUserFromCompany(companyId: string, userId: string) {
    return this.request(
      'DELETE',
      `/company/${encodeURIComponent(companyId)}/user/${encodeURIComponent(userId)}`
    );
  }
  async suspendUser(companyId: string, userId: string, suspend = true) {
    let users = await this.getUsersInCompany(companyId);
    let user = users.find(user => user.id === userId);
    let email = requiredString(
      user?.email,
      'company user email; call manage_company_users with action list to check the user ID'
    );
    let result = record(
      await this.request(
        'PUT',
        `/company/users/${suspend ? 'suspend' : 'unsuspend'}/${encodeURIComponent(companyId)}`,
        { usersEmails: [email] }
      )
    );
    if (result.success !== true)
      throw createApiServiceError('Rocketadmin did not confirm the user suspension change.');
    return result;
  }
  async listActionRules(connectionId: string, tableName: string) {
    let result = await this.request(
      'GET',
      `/action/rules/${encodeURIComponent(connectionId)}`,
      undefined,
      { tableName }
    );
    return records(
      Array.isArray(result) ? result : record(result, 'action rules response').action_rules,
      'action rules'
    );
  }
  async createActionRule(connectionId: string, rule: JsonRecord) {
    return record(
      await this.request('POST', `/action/rule/${encodeURIComponent(connectionId)}`, rule)
    );
  }
  async updateActionRule(connectionId: string, ruleId: string, rule: JsonRecord) {
    return record(
      await this.request(
        'PUT',
        `/action/rule/${encodeURIComponent(ruleId)}/${encodeURIComponent(connectionId)}`,
        rule
      )
    );
  }
  async deleteActionRule(connectionId: string, ruleId: string) {
    return this.request(
      'DELETE',
      `/action/rule/${encodeURIComponent(ruleId)}/${encodeURIComponent(connectionId)}`
    );
  }
  async listDashboards(connectionId: string) {
    return records(
      await this.request('GET', `/dashboards/${encodeURIComponent(connectionId)}`),
      'dashboards'
    );
  }
  async getDashboard(connectionId: string, dashboardId: string) {
    return record(
      await this.request(
        'GET',
        `/dashboard/${encodeURIComponent(dashboardId)}/${encodeURIComponent(connectionId)}`
      )
    );
  }
  async createDashboard(connectionId: string, title: string) {
    return record(
      await this.request('POST', `/dashboards/${encodeURIComponent(connectionId)}`, {
        name: title
      })
    );
  }
  async updateDashboard(connectionId: string, dashboardId: string, title: string) {
    return record(
      await this.request(
        'PUT',
        `/dashboard/${encodeURIComponent(dashboardId)}/${encodeURIComponent(connectionId)}`,
        { name: title }
      )
    );
  }
  async deleteDashboard(connectionId: string, dashboardId: string) {
    return this.request(
      'DELETE',
      `/dashboard/${encodeURIComponent(dashboardId)}/${encodeURIComponent(connectionId)}`
    );
  }
  private savedQueryPath(connectionId: string, queryId?: string) {
    return `/connection/${encodeURIComponent(connectionId)}/saved-query${queryId === undefined ? '' : `/${encodeURIComponent(queryId)}`}`;
  }
  async listSavedQueries(connectionId: string) {
    return records(
      await this.request(
        'GET',
        `/connection/${encodeURIComponent(connectionId)}/saved-queries`
      ),
      'saved queries'
    );
  }
  async getSavedQuery(connectionId: string, queryId: string) {
    return record(await this.request('GET', this.savedQueryPath(connectionId, queryId)));
  }
  async createSavedQuery(connectionId: string, query: JsonRecord) {
    return record(await this.request('POST', this.savedQueryPath(connectionId), query));
  }
  async updateSavedQuery(connectionId: string, queryId: string, query: JsonRecord) {
    return record(
      await this.request('PUT', this.savedQueryPath(connectionId, queryId), query)
    );
  }
  async deleteSavedQuery(connectionId: string, queryId: string) {
    return this.request('DELETE', this.savedQueryPath(connectionId, queryId));
  }
  async executeSavedQuery(connectionId: string, queryId: string) {
    return record(
      await this.request('POST', `${this.savedQueryPath(connectionId, queryId)}/execute`)
    );
  }
  async getConnectionLogs(connectionId: string, params: Query) {
    return record(
      await this.request('GET', `/logs/${encodeURIComponent(connectionId)}`, undefined, params)
    );
  }
  async getSignInAuditLogs(companyId: string, params: Query) {
    return record(
      await this.request('GET', '/sign-in-audit/logs', undefined, { ...params, companyId })
    );
  }
  async getTableSettings(connectionId: string, tableName: string) {
    return record(
      await this.request('GET', '/settings/', undefined, { connectionId, tableName })
    );
  }
  async createTableSettings(connectionId: string, tableName: string, settings: JsonRecord) {
    return record(
      await this.request('POST', '/settings/', settings, { connectionId, tableName })
    );
  }
  async updateTableSettings(connectionId: string, tableName: string, settings: JsonRecord) {
    return record(
      await this.request('PUT', '/settings/', settings, { connectionId, tableName })
    );
  }
  async deleteTableSettings(connectionId: string, tableName: string) {
    return this.request('DELETE', '/settings/', undefined, { connectionId, tableName });
  }
}
