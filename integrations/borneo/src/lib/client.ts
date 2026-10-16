import {
  API_ERROR_MAX_DETAILS,
  API_ERROR_MAX_MESSAGE_LENGTH,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { normalizeBaseUrl, redact, requireRecord } from './responses';

type Data = Record<string, any>;
type ListParams = {
  page?: number;
  size?: number;
  nextToken?: string;
  sortBy?: string;
  sortOrder?: string;
  [key: string]: unknown;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;

  constructor(config: { token: string; baseUrl: unknown; organisationId?: number }) {
    if (!config.token?.trim())
      throw createApiServiceError(
        'A Borneo API bearer token is required. Reconnect the account.'
      );
    if (
      config.organisationId !== undefined &&
      (!Number.isSafeInteger(config.organisationId) || config.organisationId < 0)
    )
      throw createApiServiceError(
        'organisationId must be a non-negative integer from get_current_user.'
      );
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: normalizeBaseUrl(config.baseUrl),
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 60000,
      maxRedirects: 0,
      headers:
        config.organisationId === undefined
          ? {}
          : { 'x-selected-organisation-id': String(config.organisationId) },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Borneo',
          reason: 'borneo_api_error',
          parent: {},
          extractResponse: (input, helpers) => {
            let response = helpers.getResponseWithBody(input);
            return response
              ? { ...response, data: redact(response.data, this.token) }
              : undefined;
          },
          extractMessage: (input, helpers) => {
            let body = redact(helpers.getResponseWithBody(input)?.data, this.token);
            if (!helpers.isRecord(body)) return undefined;
            let details: string[] = [];
            helpers.collectDetails(body, details, {
              detailKeys: ['message', 'Message', 'detail', 'error', 'error_description'],
              nestedKeys: ['errors']
            });
            if (Array.isArray(body.fieldList)) {
              for (let field of body.fieldList) {
                if (
                  !helpers.isRecord(field) ||
                  typeof field.message !== 'string' ||
                  !field.message.trim()
                )
                  continue;
                let path = typeof field.path === 'string' ? field.path.trim() : '';
                let detail = path ? `${path}: ${field.message.trim()}` : field.message.trim();
                if (!details.includes(detail)) details.push(detail);
              }
            }
            return details.length
              ? details
                  .slice(0, API_ERROR_MAX_DETAILS)
                  .join(' - ')
                  .slice(0, API_ERROR_MAX_MESSAGE_LENGTH)
              : undefined;
          },
          extractUpstreamCode: (_input, response, helpers) => {
            if (!helpers.isRecord(response?.data)) return undefined;
            for (let value of [response.data.code, response.data.__type]) {
              if (typeof value !== 'string' && typeof value !== 'number') continue;
              let code = String(value).split(',')[0]?.split(':')[0]?.trim();
              if (code?.includes('#')) code = code.split('#')[1];
              if (code) return redact(code, this.token).slice(0, API_ERROR_MAX_MESSAGE_LENGTH);
            }
            return undefined;
          },
          formatMessage: parts =>
            redact(
              `Borneo API request failed: ${parts.statusLabel}${parts.message}`,
              this.token
            )
        })
    });
  }

  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: Data,
    params?: Data,
    raw = false
  ): Promise<any> {
    let response = await this.axios.request({ method, url: path, data, params });
    return raw ? response.data : redact(response.data, this.token);
  }
  private async record(
    method: 'get' | 'post' | 'put',
    path: string,
    data?: Data,
    raw = false
  ) {
    return requireRecord(await this.request(method, path, data, undefined, raw));
  }
  private async created(path: string, data: Data, idField: string) {
    let result = await this.record('post', path, data);
    if (typeof result[idField] !== 'string' || !result[idField])
      throw createApiServiceError(`Borneo did not return the created record's ${idField}.`);
    return result;
  }
  private async listPage(
    path: string,
    params: ListParams = {},
    body: Data = {},
    querySizeKey?: string
  ) {
    let { page, size, nextToken, sortBy, sortOrder } = params;
    for (let [key, value, minimum] of [
      ['page', page, 0],
      ['size', size, 1]
    ] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < minimum))
        throw createApiServiceError(`${key} must be an integer of at least ${minimum}.`);
    }
    if (page && nextToken)
      throw createApiServiceError('Use either page or nextToken, not both.');
    let sort =
      sortBy === undefined && sortOrder === undefined
        ? undefined
        : pickDefined({ column: sortBy, order: sortOrder?.toUpperCase() });
    let seen = new Set<string>();
    for (let current = 0; ; current++) {
      let pagination = pickDefined({ nextToken, [querySizeKey ?? 'pageSize']: size });
      let data = requireRecord(
        await this.request(
          'post',
          path,
          pickDefined({ ...body, sort, ...(querySizeKey ? {} : pagination) }),
          querySizeKey ? pagination : undefined
        )
      );
      if (current === (page ?? 0)) return { data, requestNextToken: nextToken };
      if (typeof data.nextToken !== 'string' || !data.nextToken || seen.has(data.nextToken))
        throw createApiServiceError(
          'The requested page is unavailable. Start with the first page and use its nextToken.'
        );
      seen.add(data.nextToken);
      nextToken = data.nextToken;
    }
  }
  private async list(
    path: string,
    params: ListParams = {},
    filter?: Data,
    querySizeKey?: string
  ) {
    return (await this.listPage(path, params, pickDefined({ filter }), querySizeKey)).data;
  }

  createAndScheduleScan(params: Data) {
    if (params.inspectionPolicyId !== undefined)
      throw createApiServiceError(
        'Borneo accepts an inspectionPolicy object, not an inspectionPolicyId. Use inspectionPolicy instead.'
      );
    if (params.scanLimit !== undefined)
      throw createApiServiceError(
        'Borneo does not expose a resource-count scanLimit. Use scanLimits data-volume or sampling options.'
      );
    for (let key of ['itemsPerBatch', 'maxCumulativeDataSizeMb', 'sampleDurationMinutes']) {
      let value = params.scanLimits?.[key];
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0))
        throw createApiServiceError(`scanLimits.${key} must be a non-negative integer.`);
    }
    if (params.scheduleType === 'recurring' && !params.cronExpression?.trim())
      throw createApiServiceError('cronExpression is required for recurring scans.');
    return this.created(
      '/scan',
      pickDefined({
        scheduleType: params.scheduleType === 'one-time' ? 'once' : 'cron',
        connectorId: params.connectorId,
        resourceType: params.resourceType,
        scanType: params.scanType,
        resources:
          params.resourceIds === undefined ? undefined : { resourceIds: params.resourceIds },
        inspectionPolicy: params.inspectionPolicy,
        scanLimits: params.scanLimits,
        cron: params.cronExpression,
        name: params.name
      }),
      'scanId'
    );
  }
  getScanById(id: string) {
    return this.record('get', `/scan/${pathId(id)}`);
  }
  listScans(params: ListParams = {}) {
    return this.list(
      '/scan/list',
      params,
      params.status === undefined ? undefined : { status: [params.status] }
    );
  }
  getScanIteration(id: string) {
    return this.record('get', `/scan-iteration/${pathId(id)}`);
  }
  listScanIterations(params: ListParams = {}) {
    return this.list('/scan-iteration/list', params, pickDefined({ scanId: params.scanId }));
  }
  pauseScan(id: string) {
    return this.request('put', `/scan/${pathId(id)}/pause`);
  }
  resumeScan(id: string) {
    return this.request('put', `/scan/${pathId(id)}/resume`);
  }
  stopScan(id: string) {
    return this.request('put', `/scan/${pathId(id)}/stop`);
  }
  async listInspectionResults(params: ListParams & { type: string; scanId?: string }) {
    return (
      await this.listPage('/insight/list', params, {
        type: params.type,
        filter: pickDefined({ scanId: params.scanId })
      })
    ).data;
  }
  createDataBreach(params: Data) {
    return this.created('/data-breaches', breachPayload(params, true), 'dataBreachId');
  }
  getDataBreach(id: string) {
    return this.record('get', `/data-breaches/${pathId(id)}`);
  }
  listDataBreaches(params: ListParams = {}) {
    return this.list(
      '/data-breaches/list',
      params,
      params.status === undefined ? undefined : { status: [params.status] }
    );
  }
  updateDataBreach(id: string, params: Data) {
    return this.request(
      'put',
      `/data-breaches/${pathId(id)}`,
      requiredFields(breachPayload(params, false), ['shortDescription', 'saveAsDraft'])
    );
  }
  deleteDataBreach(id: string) {
    return this.request('delete', `/data-breaches/${pathId(id)}`);
  }
  evaluateDataBreachImpact(params: Data) {
    if (!params.breachId)
      throw createApiServiceError('breachId is required to evaluate an existing data breach.');
    if (params.name !== undefined)
      throw createApiServiceError(
        'The evaluation API accepts description as evaluation text. Update the breach separately to change its name.'
      );
    return this.request(
      'post',
      `/evaluate-data-breaches/${pathId(params.breachId)}`,
      pickDefined({ evaluation: params.description, saveAsDraft: params.isDraft ?? false })
    );
  }
  createEmployee(params: Data) {
    return this.created('/employees', pickDefined(params), 'employeeId');
  }
  getEmployee(id: string) {
    return this.record('get', `/employees/${pathId(id)}`);
  }
  listEmployees(params: ListParams = {}) {
    return this.list(
      '/employees/list',
      params,
      pickDefined({ search: params.search }),
      'pageSize'
    );
  }
  updateEmployee(id: string, params: Data) {
    if (params.referenceId !== undefined)
      throw createApiServiceError(
        'referenceId can be set when creating an employee, but the Borneo update API does not accept it.'
      );
    return this.request('put', `/employees/${pathId(id)}`, nonempty(params));
  }
  deleteEmployee(id: string) {
    return this.request('delete', `/employees/${pathId(id)}`);
  }
  createDepartment(params: Data) {
    return this.created('/departments', pickDefined(params), 'departmentId');
  }
  getDepartment(id: string) {
    return this.record('get', `/departments/${pathId(id)}`);
  }
  listDepartments(params: ListParams = {}) {
    return this.list('/departments/list', params);
  }
  updateDepartment(id: string, params: Data) {
    return this.request('put', `/departments/${pathId(id)}`, nonempty(params));
  }
  deleteDepartment(id: string) {
    return this.request('delete', `/departments/${pathId(id)}`);
  }
  createHeadquarter(params: Data) {
    return this.created('/headquarters', pickDefined(params), 'headquarterId');
  }
  getHeadquarter(id: string) {
    return this.record('get', `/headquarters/${pathId(id)}`);
  }
  listHeadquarters(params: ListParams = {}) {
    return this.list('/headquarters/list', params);
  }
  deleteHeadquarter(id: string) {
    return this.request('delete', `/headquarters/${pathId(id)}`);
  }
  createDomain(params: Data) {
    return this.created('/domains', pickDefined(params), 'domainId');
  }
  getDomain(id: string) {
    return this.record('get', `/domains/${pathId(id)}`);
  }
  listDomains(params: ListParams = {}) {
    return this.list('/domains/list', params);
  }
  updateDomain(id: string, params: Data) {
    return this.request(
      'put',
      `/domains/${pathId(id)}`,
      requiredFields(params, ['name', 'frequency'])
    );
  }
  deleteDomain(id: string) {
    return this.request('delete', `/domains/${pathId(id)}`);
  }
  createDashboardUser(params: Data) {
    return this.created('/dashboard-users/create', dashboardUserPayload(params), 'username');
  }
  listDashboardUsers(params: ListParams = {}) {
    if (
      params.page !== undefined ||
      params.size !== undefined ||
      params.nextToken !== undefined ||
      params.sortBy !== undefined ||
      params.sortOrder !== undefined
    )
      throw createApiServiceError(
        'The Borneo dashboard-user list API does not support pagination or sorting. Omit those fields.'
      );
    return this.record('post', '/dashboard-users/list', {});
  }
  enableDashboardUser(username: string) {
    return this.request('put', '/dashboard-users/enable', { username });
  }
  disableDashboardUser(username: string) {
    return this.request('put', '/dashboard-users/disable', { username });
  }
  removeDashboardUser(username: string) {
    return this.request('put', '/dashboard-users/remove', { username });
  }
  getCurrentUser() {
    return this.record('post', '/dashboard-users/current');
  }
  createProcessingActivity(params: Data) {
    return this.created(
      '/processing-activities',
      activityPayload(params),
      'processingActivityId'
    );
  }
  getProcessingActivity(id: string) {
    return this.record('get', `/processing-activities/${pathId(id)}`);
  }
  listProcessingActivities(params: ListParams = {}) {
    return this.list('/processing-activities/list', params);
  }
  updateProcessingActivity(id: string, params: Data) {
    return this.request(
      'put',
      `/processing-activities/${pathId(id)}`,
      requiredFields(activityPayload(params), ['name', 'active'])
    );
  }
  deleteProcessingActivity(id: string) {
    return this.request('delete', `/processing-activities/${pathId(id)}`);
  }
  exportProcessingActivities(params: Data) {
    return this.record(
      'post',
      '/processing-activities/list/export',
      {
        ...params,
        exportTypes: params.exportTypes.map((format: string) => format.toLowerCase())
      },
      true
    );
  }
  createDpia(params: Data) {
    return this.created('/dpias', dpiaPayload(params), 'dpiaId');
  }
  getDpia(id: string) {
    return this.record('get', `/dpias/${pathId(id)}`);
  }
  updateDpia(id: string, params: Data) {
    return this.request(
      'put',
      `/dpias/${pathId(id)}`,
      requiredFields(dpiaPayload(params), ['status'])
    );
  }
  deleteDpia(id: string) {
    return this.request('delete', `/dpias/${pathId(id)}`);
  }
  createRecipient(params: Data) {
    return this.created('/recipients', recipientPayload(params), 'recipientId');
  }
  getRecipient(id: string) {
    return this.record('get', `/recipients/${pathId(id)}`);
  }
  listRecipients(params: ListParams = {}) {
    return this.list('/recipients/list', params);
  }
  updateRecipient(id: string, params: Data) {
    return this.request(
      'put',
      `/recipients/${pathId(id)}`,
      requiredFields(recipientPayload(params), [
        'name',
        'status',
        'dataStorageLocation',
        'recipientWarranties'
      ])
    );
  }
  deleteRecipient(id: string) {
    return this.request('delete', `/recipients/${pathId(id)}`);
  }
  addDiscoveredRecipients(ids: string[]) {
    return this.record('post', '/discovered-recipients/add-recipients', {
      discoveredRecipientIds: ids
    });
  }
  archiveDiscoveredRecipient(id: string) {
    return this.request('post', `/discovered-recipients/archive/${pathId(id)}`);
  }
  listDiscoveredRecipients(params: ListParams = {}) {
    return this.list('/discovered-recipients/list', params);
  }
  createAsset(params: Data) {
    return this.created('/assets', assetPayload(params), 'assetId');
  }
  getAsset(id: string) {
    return this.record('get', `/assets/${pathId(id)}`);
  }
  listAssets(params: ListParams = {}) {
    return this.list(
      '/assets/list',
      params,
      params.type === undefined ? undefined : { type: [params.type] },
      'maxResults'
    );
  }
  updateAsset(id: string, params: Data) {
    return this.request(
      'put',
      `/assets/${pathId(id)}`,
      requiredFields(assetPayload(params), ['name', 'type'])
    );
  }
  deleteAsset(id: string) {
    return this.request('delete', `/assets/${pathId(id)}`);
  }
  createLegalDocument(params: Data) {
    return this.created('/legal-document', pickDefined(params), 'documentId');
  }
  getLegalDocument(id: string) {
    return this.record('get', `/legal-document/${pathId(id)}`);
  }
  listLegalDocuments(params: ListParams = {}) {
    return this.list('/legal-document/list', params);
  }
  deleteLegalDocument(id: string) {
    return this.request('delete', `/legal-document/${pathId(id)}`);
  }
  createInfotypeCategory(params: Data) {
    return this.created('/categories', params, 'categoryLabel');
  }
  getInfotypeCategory(label: string) {
    return this.record('get', `/categories/${pathId(label)}`);
  }
  listInfotypeCategories(params: ListParams = {}) {
    if (
      params.page !== undefined ||
      params.size !== undefined ||
      params.nextToken !== undefined
    )
      throw createApiServiceError(
        'The Borneo category list API is not paginated. Omit page, size, and nextToken.'
      );
    return this.list('/categories/list', params);
  }
  deleteInfotypeCategory(label: string) {
    return this.request('delete', `/categories/${pathId(label)}`);
  }
  async exportInventoryResources(params: ListParams = {}) {
    if (params.tags !== undefined)
      throw createApiServiceError(
        'Use resourceTags with source, tagKey, and tagValue; Borneo does not accept plain tag strings.'
      );
    let body = pickDefined({
      filter: pickDefined({
        accountId: params.accountId,
        region: params.region,
        resourceType: params.resourceType,
        resourceTags: params.resourceTags
      }),
      include: pickDefined({
        violationMetrics: params.includeViolationMetrics,
        frameworkExceptionsCount: params.includeFrameworkExceptionCounts
      }),
      select: params.fields
    });
    let rows = await this.listPage('/resource/inventory/list', params, body);
    let file = await this.record(
      'post',
      '/resource/inventory/list/export',
      pickDefined({
        ...body,
        pageSize: params.size,
        nextToken: rows.requestNextToken,
        sort:
          params.sortBy === undefined && params.sortOrder === undefined
            ? undefined
            : pickDefined({ column: params.sortBy, order: params.sortOrder?.toUpperCase() })
      }),
      true
    );
    return { rows: rows.data, file };
  }
  getResourceStatistics() {
    return this.record('get', '/resource/data-stats');
  }
  getCloudAccount(id: string) {
    return this.record('get', `/cloud-account/${pathId(id)}`);
  }
  downloadDashboardReport(params: Data) {
    return this.record('post', '/dashboard-report/download', params, true);
  }
  getDashboardReport(id: string) {
    return this.record('get', `/dashboard-report/${pathId(id)}`);
  }
  listDashboardReports(params: ListParams = {}) {
    return this.list('/dashboard-report/list', params);
  }
  deleteDashboardReport(id: string) {
    return this.request('delete', `/dashboard-report/${pathId(id)}`);
  }
  listAccounts(params: ListParams = {}) {
    return this.list('/accounts', params);
  }
  listConnectors(params: ListParams = {}) {
    return this.list('/connector', params);
  }
}

let pathId = (value: string) => {
  if (!value?.trim())
    throw createApiServiceError('A non-empty Borneo resource ID is required.');
  return encodeURIComponent(value);
};
let nonempty = (data: Data) => {
  let result = pickDefined(data);
  if (!Object.keys(result).length)
    throw createApiServiceError('Provide at least one supported field to update.');
  return result;
};
let epochSeconds = (value: unknown, field: string) => {
  if (value === undefined) return undefined;
  let parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(parsed))
    throw createApiServiceError(`${field} must be a valid ISO 8601 timestamp.`);
  return Math.round(parsed / 1000);
};
let breachPayload = (params: Data, create: boolean) => {
  for (let key of ['status', 'severity', 'notificationDate', 'breachType'])
    if (params[key] !== undefined)
      throw createApiServiceError(
        `The Borneo data-breach API does not accept ${key}. Omit it and use the documented breach fields.`
      );
  if (create && !params.name?.trim())
    throw createApiServiceError('name is required to create a data breach.');
  if (
    params.affectedDataSubjects !== undefined &&
    (!Number.isSafeInteger(params.affectedDataSubjects) || params.affectedDataSubjects < 0)
  )
    throw createApiServiceError('affectedDataSubjects must be a non-negative integer.');
  return pickDefined({
    shortDescription: params.name,
    description: params.description,
    occurredAt: epochSeconds(params.breachDate, 'breachDate'),
    discoveredAt: epochSeconds(params.discoveryDate, 'discoveryDate'),
    numberAffectedPeople: params.affectedDataSubjects,
    kindOfData: params.affectedDataTypes?.join(', '),
    saveAsDraft: params.isDraft ?? (create ? false : undefined)
  });
};
let activityPayload = (params: Data) =>
  pickDefined({
    name: params.name,
    active: params.active,
    additionalInfo: params.description,
    retentionPeriodComment: params.retentionPolicy
  });
let dpiaPayload = (params: Data) => {
  let result: Data = pickDefined({
    processingActivityId: params.processingActivityId,
    status: params.status
  });
  for (let dimension of ['confidentiality', 'integrity', 'availability']) {
    let value = params[`${dimension}Risk`];
    if (value !== undefined) {
      if (!['very_low', 'low', 'medium', 'high', 'very_high'].includes(value))
        throw createApiServiceError(
          `${dimension}Risk must be very_low, low, medium, high, or very_high.`
        );
      result[dimension] = { baselineSeverity: value };
    }
  }
  return result;
};
let assetPayload = (params: Data) => {
  if (params.description !== undefined)
    throw createApiServiceError(
      'The Borneo asset API does not accept description. Omit it; asset names and types are supported.'
    );
  return pickDefined({ name: params.name, type: params.type });
};

let requiredFields = (data: Data, fields: string[]) => {
  for (let key of fields)
    if (
      data[key] === undefined ||
      data[key] === null ||
      (typeof data[key] === 'string' && !data[key].trim())
    )
      throw createApiServiceError(
        `The Borneo update API requires ${fields.join(', ')}. Provide all of those values.`
      );
  return pickDefined(data);
};
let recipientPayload = (params: Data) =>
  pickDefined({
    ...params,
    role: params.role === undefined ? undefined : [params.role],
    recipientWarranties:
      params.recipientWarranties === undefined ? undefined : [params.recipientWarranties]
  });

let dashboardUserRoles = new Set([
  'borneo_admin',
  'borneo_analyst',
  'compliance_engineer',
  'data_engineer',
  'department_coordinator',
  'borneo_engineer',
  'no_access_role',
  'privacy_supervisor'
]);

let dashboardUserPayload = (params: Data) => {
  let payload: Data = pickDefined({
    email: params.email,
    name: params.name,
    roles: params.roles
  });
  if (params.organisations !== undefined && params.memberships !== undefined)
    throw createApiServiceError('Provide either organisations or memberships, not both.');

  if (params.memberships !== undefined) {
    payload.organisations = params.memberships.map((membership: Data) => {
      if (!Number.isSafeInteger(membership.organisationId) || membership.organisationId < 0)
        throw createApiServiceError(
          'Each membership needs a non-negative numeric organisationId from get_current_user.'
        );
      validateMembershipRoles(membership.roles);
      return pickDefined({
        organisationId: membership.organisationId,
        roles: membership.roles,
        departments: membership.departments
      });
    });
  } else if (params.organisations !== undefined) {
    if (params.organisations.length) validateMembershipRoles(params.roles);
    payload.organisations = params.organisations.map((value: string) => {
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
        throw createApiServiceError(
          'Legacy organisations must contain numeric organisation IDs from get_current_user. Use memberships to supply explicit organisation roles.'
        );
      return { organisationId: Number(value), roles: params.roles };
    });
  }
  return payload;
};

let validateMembershipRoles = (roles: unknown) => {
  if (
    !Array.isArray(roles) ||
    !roles.length ||
    roles.some(role => !dashboardUserRoles.has(role))
  )
    throw createApiServiceError(
      'Organisation memberships require explicit documented Borneo roles. Supply roles with legacy organisations, or use memberships with a roles list for each organisation.'
    );
};
