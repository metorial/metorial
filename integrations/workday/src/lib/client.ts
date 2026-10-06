import { createAuthenticatedAxios, isApiErrorRecord, pickDefined } from 'slates';
import {
  date,
  dates,
  display,
  identifier,
  incomplete,
  origin,
  page,
  paging,
  positiveQuantity,
  protect,
  type Row,
  record,
  reference,
  reject,
  resource,
  segment,
  string,
  upstreamError,
  type WorkdayAuth
} from './contracts';

export interface WorkdayClientConfig extends WorkdayAuth {
  baseUrl: string;
  tenant: string;
}
export interface WorkdayReference {
  id?: string;
  descriptor?: string;
  href?: string;
}
export interface WorkerSummary {
  id: string;
  descriptor: string;
  href?: string;
  primaryWorkEmail?: string;
  businessTitle?: string;
  primarySupervisoryOrganization?: WorkdayReference;
}
export interface WorkerDetail extends WorkerSummary {
  primaryPosition?: WorkdayReference;
  hireDate?: string;
  workerStatus?: { statusDate?: string; active?: boolean; terminated?: boolean };
  [key: string]: unknown;
}
export interface TimeOffEntry {
  id?: string;
  timeOffEntryId?: string;
  date?: string;
  quantity?: number;
  dailyQuantity?: number;
  timeOffType?: WorkdayReference;
  worker?: WorkdayReference;
  status?: unknown;
  unit?: WorkdayReference;
  [key: string]: unknown;
}
export interface InboxTask {
  id: string;
  descriptor?: string;
  href?: string;
  status?: unknown;
  assigned?: unknown;
  subject?: unknown;
  overallProcess?: WorkdayReference;
  stepType?: WorkdayReference;
  [key: string]: unknown;
}
export type PaginatedResponse<T> = { data: T[]; total: number };
export type WqlResult = PaginatedResponse<Row>;
export interface SupervisoryOrganization {
  id: string;
  descriptor?: string;
  href?: string;
  [key: string]: unknown;
}
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item
  );
const fieldsMatch = (actual: Row, fields: Row): boolean =>
  Object.entries(fields).every(([key, value]) =>
    key === 'worker'
      ? Object.entries(record(value)).every(
          ([field, expected]) =>
            canonical(record(actual.worker)[field]) === canonical(expected)
        )
      : canonical(actual[key]) === canonical(value)
  );

export class WorkdayClient {
  private ax: ReturnType<typeof createAuthenticatedAxios>;
  readonly baseUrl: string;
  readonly tenant: string;
  readonly auth: WorkdayAuth;
  constructor(config: WorkdayClientConfig) {
    this.baseUrl = origin(config.baseUrl);
    this.tenant = identifier(config.tenant, 'Tenant');
    if (!/^[A-Za-z0-9_-]+$/.test(this.tenant))
      reject('Stored tenant is invalid. Reconnect Workday.');
    const token = string(config.token, 'Access token');
    if (/\s/.test(token))
      reject('Stored Workday credential is malformed. Reconnect the account.');
    this.auth = config;
    this.ax = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      maxRedirects: 0,
      headers: { Accept: 'application/json' }
    });
  }
  private path(service: string, version: string, suffix: string) {
    return `/api/${service}/${version}/${segment(this.tenant)}/${suffix}`;
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: unknown,
    params?: Row,
    multipart = false
  ): Promise<unknown> {
    protect({ path, data, params }, this.auth);
    let value: unknown;
    try {
      value = (
        await this.ax.request({
          method,
          url: path,
          data,
          params,
          ...(multipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : {})
        })
      ).data;
    } catch (error) {
      // Expected failures may be consumed by a later successful operation.
      // Refuse reflected credentials before preserving their status for that path.
      if (isApiErrorRecord(error)) protect(error.data, this.auth);
      throw upstreamError(error);
    }
    protect(value, this.auth);
    return value;
  }
  private async list(service: string, version: string, suffix: string, params: Row) {
    return page(
      await this.request('get', this.path(service, version, suffix), undefined, params)
    );
  }
  private async exact(service: string, version: string, suffix: string, expected: string) {
    return resource(await this.request('get', this.path(service, version, suffix)), expected);
  }
  async listWorkers(
    params: { limit?: number; offset?: number; search?: string } = {}
  ): Promise<PaginatedResponse<WorkerSummary>> {
    if (params.search !== undefined && [...string(params.search, 'Worker search')].length < 3)
      reject('Worker search must contain at least three consecutive characters.');
    const result = await this.list('common', 'v1', 'workers', {
      ...paging(params),
      ...pickDefined({ search: params.search })
    });
    return {
      ...result,
      data: result.data.map(item => {
        const worker = resource(item);
        return {
          ...worker,
          descriptor: string(worker.descriptor, 'Returned worker descriptor')
        } as WorkerSummary;
      })
    };
  }
  async getWorker(workerId: string, summary = false): Promise<WorkerDetail> {
    const path = this.path('common', 'v1', `workers/${segment(workerId)}`);
    const worker = resource(
      await this.request(
        'get',
        path,
        undefined,
        summary ? { view: 'workerSummary' } : undefined
      ),
      workerId
    );
    return {
      ...worker,
      descriptor: string(worker.descriptor, 'Returned worker descriptor')
    } as WorkerDetail;
  }
  async getWorkerTimeOffEntries(
    workerId: string,
    params: { limit?: number; offset?: number; fromDate?: string; toDate?: string } = {}
  ): Promise<PaginatedResponse<TimeOffEntry>> {
    return this.list(
      'absenceManagement',
      'v5',
      `workers/${segment(workerId)}/timeOffDetails`,
      { ...paging(params), ...dates(params) }
    );
  }
  async requestTimeOff(
    workerId: string,
    payload: {
      date: string;
      dailyQuantity: number;
      timeOffType: { id: string };
      comment?: string;
      positionId?: string;
      reasonId?: string;
      start?: string;
      end?: string;
    }
  ): Promise<Row> {
    const day = {
      date: date(payload.date),
      dailyQuantity: positiveQuantity(payload.dailyQuantity),
      timeOffType: { id: identifier(payload.timeOffType.id, 'Time-off type ID') },
      ...pickDefined({
        comment: payload.comment,
        position:
          payload.positionId === undefined
            ? undefined
            : { id: identifier(payload.positionId, 'Position ID') },
        reason:
          payload.reasonId === undefined
            ? undefined
            : { id: identifier(payload.reasonId, 'Reason ID') },
        start: payload.start,
        end: payload.end
      })
    };
    if ((payload.start === undefined) !== (payload.end === undefined))
      reject('Provide both start and end, or neither.');
    if (payload.start !== undefined && payload.end !== undefined) {
      if (
        !Number.isFinite(Date.parse(payload.start)) ||
        !Number.isFinite(Date.parse(payload.end)) ||
        Date.parse(payload.end) <= Date.parse(payload.start) ||
        !payload.start.startsWith(day.date) ||
        !payload.end.startsWith(day.date)
      )
        reject('Start and end must be increasing timestamps on the requested date.');
    }
    const valid = await this.listResources('valid_time_off_dates', {
      workerId,
      timeOffTypeId: payload.timeOffType.id,
      date: payload.date,
      positionId: payload.positionId
    });
    if (!valid.data.some(item => item.date === day.date))
      reject(
        'Workday did not report the requested date as valid for this worker and time-off type.'
      );
    const body = {
      days: [day],
      businessProcessParameters: { action: { id: 'd9e4223e446c11de98360015c5e6daf6' } }
    };
    // The current schema requires a multipart jsonData part, even without files.
    protect(body, this.auth);
    const form = new FormData();
    form.append('jsonData', new Blob([JSON.stringify(body)], { type: 'application/json' }));
    const result = record(
      await this.request(
        'post',
        this.path('absenceManagement', 'v5', `workers/${segment(workerId)}/requestTimeOff`),
        form,
        undefined,
        true
      )
    );
    if (!Array.isArray(result.days) || result.days.length !== 1) incomplete();
    const received = record(result.days[0]);
    if (
      received.date !== day.date ||
      received.dailyQuantity !== day.dailyQuantity ||
      record(received.timeOffType).id !== day.timeOffType.id
    )
      incomplete();
    return result;
  }
  async getWorkerTimeBlocks(
    workerId: string,
    params: { limit?: number; offset?: number; fromDate?: string; toDate?: string } = {}
  ): Promise<PaginatedResponse<Row>> {
    const pages = paging(params),
      range = dates(params);
    const selected = identifier(workerId, 'Worker ID');
    const worker =
      selected === 'me' || selected.includes('=')
        ? (await this.getWorker(selected, true)).id
        : selected;
    return this.list('timeTracking', 'v6', 'workerTimeBlocks', {
      ...pages,
      ...range,
      worker
    });
  }
  async getInboxTasks(
    workerId: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<InboxTask>> {
    const result = await this.list(
      'common',
      'v1',
      `workers/${segment(workerId)}/inboxTasks`,
      paging(params)
    );
    return { ...result, data: result.data.map(item => resource(item) as InboxTask) };
  }
  async actionInboxTask(
    workerId: string,
    taskId: string,
    action: 'approve' | 'deny',
    comment?: string
  ) {
    const current = await this.getWorker('me', true);
    if (workerId !== 'me' && workerId !== current.id)
      reject(
        'Only the connected worker can act on their own approval tasks. Discover that identity with get_current_user.'
      );
    const task = await this.getResource('inbox_task', taskId, current.id);
    if (
      record(task.stepType).id !== 'd8c8920e446c11de98360015c5e6daf6' ||
      record(task.status).id !== 'd9e4108c446c11de98360015c5e6daf6'
    )
      reject('Only an Approval step awaiting action can be approved or denied.');
    const result = resource(
      await this.request(
        'put',
        this.path('common', 'v1', `inboxTasks/${segment(taskId)}`),
        pickDefined({ comment }),
        { type: action === 'approve' ? 'approval' : 'denial' }
      ),
      taskId
    );
    if (result.id !== task.id) incomplete();
    return result;
  }
  async executeWql(
    query: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<WqlResult> {
    string(query, 'WQL query');
    const length = [...query].length;
    if (length > 16000) reject('WQL queries must contain at most 16,000 characters.');
    const pages = paging(params);
    if (length >= 2048 && (params.limit !== undefined || params.offset !== undefined))
      reject(
        'Workday does not document pagination parameters for long POST WQL queries. Put LIMIT/OFFSET in the query or shorten the query.'
      );
    const result = await this.request(
      length < 2048 ? 'get' : 'post',
      this.path('wql', 'v1', 'data'),
      length < 2048 ? undefined : { query },
      length < 2048 ? { ...pages, query } : undefined
    );
    return page(result);
  }
  reportDownload(
    reportOwner: string,
    reportName: string,
    prompts: Record<string, string> = {}
  ) {
    for (const [key, value] of Object.entries(prompts)) {
      string(key, 'Report prompt name');
      string(value, 'Report prompt value');
      if (key.toLowerCase() === 'format')
        reject('Use the format field instead of a format prompt.');
    }
    protect({ reportOwner, reportName, prompts }, this.auth);
    const url = new URL(
      `/ccx/service/customreport2/${segment(this.tenant)}/${segment(reportOwner, 'Report owner')}/${segment(reportName, 'Report name')}`,
      this.baseUrl
    );
    return {
      url: url.toString(),
      headers: { Authorization: `Bearer ${this.auth.token}` },
      query: { ...prompts, format: 'csv' }
    };
  }
  async getCustomReport(
    reportOwner: string,
    reportName: string,
    params: { format?: 'json' | 'csv'; prompts?: Record<string, string> } = {}
  ): Promise<unknown> {
    const download = this.reportDownload(reportOwner, reportName, params.prompts);
    return this.request('get', new URL(download.url).pathname, undefined, {
      ...download.query,
      format: params.format ?? 'json'
    });
  }
  async listSupervisoryOrganizations(
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<SupervisoryOrganization>> {
    const result = await this.list('common', 'v1', 'supervisoryOrganizations', paging(params));
    return { ...result, data: result.data.map(item => resource(item)) };
  }
  async getOrganizationWorkers(
    orgId: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<WorkerSummary>> {
    const result = await this.list(
      'common',
      'v1',
      `supervisoryOrganizations/${segment(orgId)}/workers`,
      paging(params)
    );
    return {
      ...result,
      data: result.data.map(item => {
        const worker = resource(item);
        return {
          ...worker,
          descriptor: string(worker.descriptor, 'Returned worker descriptor')
        } as WorkerSummary;
      })
    };
  }
  async listCustomObjects(
    objectName: string,
    params: { limit?: number; offset?: number; workerId?: string } = {}
  ): Promise<PaginatedResponse<Row>> {
    if (!params.workerId)
      reject(
        'Worker-scoped multi-instance custom objects require workerId from list_workers. Tenant-wide custom-object listing is not documented.'
      );
    const result = await this.list(
      'customObject',
      'v2',
      `workers/${segment(params.workerId)}/customObjects/${segment(objectName, 'Custom object alias')}`,
      {}
    );
    if (result.total !== result.data.length) incomplete();
    const { limit, offset } = paging(params);
    return { data: result.data.slice(offset, offset + limit), total: result.total };
  }
  async getCustomObject(objectName: string, objectId: string): Promise<Row> {
    const result = record(
      await this.request(
        'get',
        this.path(
          'customObject',
          'v2',
          `customObjects/${segment(objectName)}/${segment(objectId)}`
        )
      )
    );
    if (!Object.keys(result).length) incomplete();
    const compound = /^([^;]+);(.+)$/.exec(objectId);
    const reference = compound && /^([^=;]+)=(.+)$/.exec(compound[2]!);
    const nativeId = compound && !reference ? compound[2] : objectId;
    if (
      nativeId &&
      /^[a-f0-9]{32}$/i.test(nativeId) &&
      result.id !== undefined &&
      result.id !== nativeId
    )
      incomplete();
    if (reference && Object.hasOwn(result, reference[1]!)) {
      const value = result[reference[1]!];
      if (
        !['string', 'number', 'boolean'].includes(typeof value) ||
        String(value) !== reference[2]
      )
        incomplete();
    }
    if (
      compound &&
      /^[a-f0-9]{32}$/i.test(compound[1]!) &&
      result.worker !== undefined &&
      record(result.worker).id !== compound[1]
    )
      incomplete();
    return result;
  }
  private receipt(value: unknown) {
    if (record(value).ok !== 'OK') incomplete();
  }
  private writable(fields: Row) {
    protect(fields, this.auth);
    if (
      !Object.keys(fields).length ||
      ['id', 'href', 'descriptor', '__proto__', 'constructor', 'prototype'].some(key =>
        Object.hasOwn(fields, key)
      )
    )
      reject('Provide only nonempty tenant-defined writable custom fields.');
    return fields;
  }
  async createCustomObject(
    objectName: string,
    fields: Row,
    expectedId?: string
  ): Promise<Row> {
    this.writable(fields);
    const worker = record(fields.worker);
    const workerId = identifier(worker.id, 'Extended worker ID');
    if (!/^[a-f0-9]{32}$/.test(workerId))
      reject(
        'Custom-object creation requires the exact extended worker WID from list_workers.'
      );
    if (!expectedId)
      reject(
        'Provide objectId as the documented worker-WID;referenceAlias=value identity, so a receipt-only create can be read back safely. Custom types without reference IDs cannot be created by this tool.'
      );
    const identity = identifier(expectedId, 'Custom object identity');
    const match = /^([^;]+);([^=;]+)=(.+)$/.exec(identity);
    if (
      !match ||
      match[1] !== workerId ||
      typeof fields[match[2]!] !== 'string' ||
      fields[match[2]!] !== match[3]
    )
      reject(
        'objectId must bind the supplied worker WID and unchanged custom reference field.'
      );
    try {
      await this.getCustomObject(objectName, identity);
      reject('The exact custom object already exists. Use update_custom_object instead.');
    } catch (error) {
      const status = record((error as { data?: unknown }).data ?? {}).upstreamStatus;
      if (status !== 404) throw error;
    }
    this.receipt(
      await this.request(
        'post',
        this.path('customObject', 'v2', `customObjects/${segment(objectName)}`),
        fields
      )
    );
    const created = await this.getCustomObject(objectName, identity);
    if (!fieldsMatch(created, fields)) incomplete();
    return created;
  }
  async updateCustomObject(objectName: string, objectId: string, fields: Row): Promise<Row> {
    this.writable(fields);
    if ('worker' in fields) reject('Custom-object updates cannot move the extended worker.');
    const referenceAlias = /^([^;]+);([^=;]+)=/.exec(objectId)?.[2];
    if (referenceAlias && referenceAlias in fields)
      reject('Update fields cannot change the custom reference identity.');
    const before = await this.getCustomObject(objectName, objectId);
    this.receipt(
      await this.request(
        'put',
        this.path(
          'customObject',
          'v2',
          `customObjects/${segment(objectName)}/${segment(objectId)}`
        ),
        fields
      )
    );
    const result = await this.getCustomObject(objectName, objectId);
    if (
      !fieldsMatch(result, fields) ||
      (before.worker !== undefined && canonical(result.worker) !== canonical(before.worker))
    )
      incomplete();
    return result;
  }
  async deleteCustomObject(objectName: string, objectId: string): Promise<void> {
    await this.getCustomObject(objectName, objectId);
    this.receipt(
      await this.request(
        'delete',
        this.path(
          'customObject',
          'v2',
          `customObjects/${segment(objectName)}/${segment(objectId)}`
        )
      )
    );
  }
  async getResource(
    type: 'organization' | 'inbox_task' | 'time_off_entry' | 'time_block',
    id: string,
    workerId?: string
  ): Promise<Row> {
    if (type === 'organization') {
      if (workerId !== undefined)
        reject('workerId is only used with inbox_task or time_off_entry.');
      return this.exact('common', 'v1', `supervisoryOrganizations/${segment(id)}`, id);
    }
    if (type === 'time_block') {
      if (workerId !== undefined)
        reject('workerId is only used with inbox_task or time_off_entry.');
      return this.exact('timeTracking', 'v6', `workerTimeBlocks/${segment(id)}`, id);
    }
    if (!workerId)
      reject('Provide workerId from list_workers for this exact worker-scoped resource.');
    if (type === 'inbox_task')
      return this.exact(
        'common',
        'v1',
        `workers/${segment(workerId)}/inboxTasks/${segment(id)}`,
        id
      );
    const detail = record(
      await this.request(
        'get',
        this.path(
          'absenceManagement',
          'v5',
          `workers/${segment(workerId)}/timeOffDetails/${segment(id)}`
        )
      )
    );
    const returnedId = string(detail.timeOffEntryId, 'Returned time-off entry ID');
    const returnedWorker = string(record(detail.worker).id, 'Returned time-off worker ID');
    if (
      (!id.includes('=') && returnedId !== id) ||
      (/^[a-f0-9]{32}$/.test(workerId) && returnedWorker !== workerId)
    )
      incomplete();
    return detail;
  }
  async listResources(
    type:
      | 'eligible_absence_types'
      | 'valid_time_off_dates'
      | 'wql_data_sources'
      | 'wql_fields',
    input: {
      workerId?: string;
      timeOffTypeId?: string;
      date?: string;
      positionId?: string;
      dataSourceId?: string;
      limit?: number;
      offset?: number;
      search?: string;
    }
  ): Promise<PaginatedResponse<Row>> {
    const pages = paging(input);
    if (type.startsWith('wql_')) {
      if (
        [input.workerId, input.timeOffTypeId, input.date, input.positionId].some(
          value => value !== undefined
        )
      )
        reject('Worker and time-off fields are not used for WQL discovery.');
      if (type === 'wql_data_sources' && input.dataSourceId !== undefined)
        reject('dataSourceId is only used for wql_fields.');
      if (type === 'wql_fields' && !input.dataSourceId)
        reject('Provide dataSourceId discovered by list_resources with wql_data_sources.');
      return this.list(
        'wql',
        'v1',
        type === 'wql_fields'
          ? `dataSources/${segment(input.dataSourceId)}/fields`
          : 'dataSources',
        { ...pages, ...pickDefined({ searchString: input.search }) }
      );
    }
    if (!input.workerId || input.dataSourceId !== undefined || input.search !== undefined)
      reject('Absence discovery requires workerId and does not use dataSourceId or search.');
    if (type === 'eligible_absence_types') {
      if (
        [input.timeOffTypeId, input.date, input.positionId].some(value => value !== undefined)
      )
        reject('Eligible type discovery does not use a date, time-off type or position.');
      return this.list(
        'absenceManagement',
        'v5',
        `workers/${segment(input.workerId)}/eligibleAbsenceTypes`,
        pages
      );
    }
    if (!input.timeOffTypeId || !input.date)
      reject('Valid date discovery requires a discovered timeOffTypeId and date.');
    return this.list(
      'absenceManagement',
      'v5',
      `workers/${segment(input.workerId)}/validTimeOffDates`,
      {
        ...pages,
        timeOff: identifier(input.timeOffTypeId),
        date: date(input.date),
        ...pickDefined({
          position: input.positionId === undefined ? undefined : identifier(input.positionId)
        })
      }
    );
  }
}
export const createClient = (auth: WorkdayAuth, legacyConfig: unknown = {}) => {
  const legacy = record(legacyConfig);
  const baseUrl = auth.baseUrl ?? legacy.baseUrl;
  const tenant = auth.tenant ?? legacy.tenant;
  if (typeof baseUrl !== 'string' || typeof tenant !== 'string')
    reject('The Workday connection has no service origin or tenant. Reconnect the account.');
  return new WorkdayClient({ ...auth, baseUrl, tenant });
};
export { display, reference };
