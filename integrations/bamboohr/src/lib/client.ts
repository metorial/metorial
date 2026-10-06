import { createAuthenticatedAxios, requestAxios } from 'slates';
import {
  amount,
  type BambooAuth,
  collection,
  credential,
  date,
  dateRange,
  decimalAmount,
  domain,
  fieldNames,
  id,
  inputData,
  integer,
  invalid,
  isApiKeyAuth,
  numericId,
  privateData,
  type Row,
  records,
  responseId,
  row,
  safeApiError,
  tableName,
  text,
  unexpected
} from './contracts';

type RequestOptions = {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  responseType?: 'arraybuffer';
};
export class Client {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  readonly origin: string;
  readonly authorization: string;
  constructor(private readonly auth: BambooAuth) {
    this.origin = `https://${domain(auth.companyDomain)}.bamboohr.com`;
    credential(auth.token, 'Authentication credential');
    const isApiKey = isApiKeyAuth(auth);
    this.authorization = isApiKey
      ? `Basic ${Buffer.from(`${auth.token}:x`).toString('base64')}`
      : `Bearer ${auth.token}`;
    if (isApiKey && auth.basicAuthorization !== this.authorization)
      invalid('Reconnect the API-key account to refresh stored authentication.');
    this.http = createAuthenticatedAxios({
      baseURL: this.origin,
      timeout: 60_000,
      maxRedirects: 0,
      maxContentLength: 32 * 1024 * 1024,
      maxBodyLength: 21 * 1024 * 1024,
      headers: { Accept: 'application/json', Authorization: this.authorization },
      errorAdapter: safeApiError
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    options: RequestOptions = {},
    statuses = [200],
    version: 'v1' | 'v1_1' = 'v1'
  ) {
    const response = await requestAxios(
      'BambooHR request',
      () =>
        this.http.request<unknown>({
          method,
          url: `/api/${version}${path}`,
          data,
          ...options
        }),
      safeApiError
    );
    if (!statuses.includes(response.status))
      throw safeApiError({ response: { status: response.status } });
    return response;
  }
  private async get(path: string, params?: RequestOptions['params']): Promise<unknown> {
    const response = await this.request('GET', path, undefined, { params });
    return privateData(response.data, this.auth);
  }
  private async write(
    method: 'POST' | 'PUT',
    path: string,
    data: unknown,
    statuses = [200],
    version: 'v1' | 'v1_1' = 'v1'
  ): Promise<unknown> {
    const response = await this.request(method, path, data, {}, statuses, version);
    return response.data === '' || response.data === undefined
      ? null
      : privateData(response.data, this.auth);
  }
  private exact(record: Row, requested: string): Row {
    if (responseId(record.id) !== requested) unexpected();
    return record;
  }
  private receipt(location: unknown, resourcePath: string): { id: string; location: string } {
    if (typeof location !== 'string') unexpected();
    let url: URL;
    try {
      url = new URL(location, this.origin);
    } catch {
      return unexpected();
    }
    if (url.origin !== this.origin || url.search || url.hash || url.username || url.password)
      unexpected();
    const paths = [
      `/api/v1/${resourcePath}/`,
      `/api/gateway.php/${domain(this.auth.companyDomain)}/v1/${resourcePath}/`
    ];
    const prefix = paths.find(path => url.pathname.startsWith(path));
    if (!prefix) unexpected();
    const suffix = url.pathname.slice(prefix.length).replace(/\/$/, '');
    if (!/^\d+$/.test(suffix) || /^0+$/.test(suffix)) unexpected();
    return { id: suffix, location: `${this.origin}/api/v1/${resourcePath}/${suffix}` };
  }
  async getEmployee(employeeId: string, fields: string[]): Promise<Row & { id: string }> {
    id(employeeId, 'Employee ID', true);
    fieldNames(fields);
    const employee = row(
      await this.get(`/employees/${employeeId}`, { fields: fields.join(',') })
    );
    if (typeof employee.id !== 'string' || !/^\d+$/.test(employee.id)) unexpected();
    if (employeeId !== '0' && employee.id !== employeeId) unexpected();
    return { ...employee, id: employee.id };
  }
  async getEmployeeDirectory() {
    const data = row(await this.get('/employees/directory'));
    const fields = records(data.fields);
    const employees = records(data.employees);
    for (const employee of employees) responseId(employee.id);
    return { fields, employees };
  }
  async addEmployee(data: Row) {
    inputData(data);
    text(data.firstName, 'First name');
    text(data.lastName, 'Last name');
    for (const key of [
      'id',
      'employeeId',
      'photo',
      'photoUrl',
      'employmentType',
      'terminationDate'
    ])
      if (key in data) invalid(`Employee creation does not accept ${key}.`);
    if (data.hireDate !== undefined) date(data.hireDate, 'Hire date');
    const response = await this.request('POST', '/employees', data, {}, [201]);
    if (response.data !== '' && response.data !== undefined && response.data !== null) {
      const created = row(privateData(response.data, this.auth));
      const employeeId = id(responseId(created.id), 'Created employee ID');
      // Current documentation describes Location as a web-app URL, while older responses used an API resource URL.
      if (response.headers.location !== undefined) {
        let location: URL;
        try {
          location = new URL(String(response.headers.location), this.origin);
        } catch {
          return unexpected();
        }
        if (
          location.origin !== this.origin ||
          location.username ||
          location.password ||
          location.hash
        )
          unexpected();
        privateData(location.pathname, this.auth);
        for (const [key, value] of location.searchParams)
          privateData({ [key]: value }, this.auth);
        if (location.pathname.startsWith('/api/')) {
          if (this.receipt(response.headers.location, 'employees').id !== employeeId)
            unexpected();
        }
      }
      return { id: employeeId, location: `${this.origin}/api/v1/employees/${employeeId}` };
    }
    const receipt = this.receipt(response.headers.location, 'employees');
    return { id: receipt.id, location: receipt.location };
  }
  async updateEmployee(employeeId: string, data: Row) {
    id(employeeId, 'Employee ID', true);
    inputData(data);
    for (const key of [
      'id',
      'employeeId',
      'photo',
      'photoUrl',
      'employmentType',
      'terminationDate'
    ])
      if (key in data)
        invalid(
          `Employee update does not accept ${key}. Use the exact employment-status table row for employment status fields; update photos in BambooHR.`
        );
    const fields = fieldNames(Object.keys(data));
    await this.write('POST', `/employees/${employeeId}`, data);
    const observed = await this.getEmployee(employeeId, fields);
    return fields.filter(
      field =>
        Object.hasOwn(observed, field) &&
        JSON.stringify(observed[field]) === JSON.stringify(data[field])
    );
  }
  async getCustomReport(
    format: string,
    fields: string[],
    title?: string,
    filterLastChanged?: string
  ) {
    fieldNames(fields);
    if (!fields.length) invalid('Supply at least one report field.');
    const body: Row = {
      title: title === undefined ? 'Custom Report' : text(title, 'Report title'),
      fields
    };
    if (filterLastChanged !== undefined) {
      const value = this.isoTimestamp(filterLastChanged);
      body.filters = { lastChanged: { includeNull: 'no', value } };
    }
    return this.report('POST', '/reports/custom', format, body, { onlyCurrent: true });
  }
  async getCompanyReport(
    reportId: string,
    format: string,
    filterLastChanged?: string,
    source = 'legacy',
    page = 1,
    pageSize = 500
  ) {
    id(reportId, 'Report ID');
    if (filterLastChanged !== undefined)
      invalid(
        'lastChangedSince is not supported for saved reports. BambooHR fd controls duplicate filtering, not change dates. Use generate_custom_report for a change filter.'
      );
    if (source === 'current') {
      if (format !== 'JSON')
        invalid(
          'Current saved reports return structured JSON only. Legacy report formats require a legacy report ID and reportSource=legacy.'
        );
      const result = row(
        await this.get(`/custom-reports/${reportId}`, {
          page: integer(page, 'Page', 1, 1_000_000),
          page_size: integer(pageSize, 'Page size', 1, 1000)
        })
      );
      records(result.data);
      records(result.fields);
      this.reportPagination(result.pagination);
      return { data: result, binary: undefined };
    }
    if (source !== 'legacy' || page !== 1 || pageSize !== 500)
      invalid(
        'Legacy saved reports do not support current-report page/pageSize. Select reportSource=current only with a current report ID.'
      );
    return this.report('GET', `/reports/${reportId}`, format);
  }
  private async report(
    method: 'GET' | 'POST',
    path: string,
    format: string,
    body?: Row,
    extraParams: RequestOptions['params'] = {}
  ) {
    const mimeTypes: Record<string, string> = {
      JSON: 'application/json',
      CSV: 'text/csv',
      PDF: 'application/pdf',
      XML: 'text/xml'
    };
    const mimeType = mimeTypes[format];
    if (!mimeType) invalid('Unsupported report format.');
    const response = await this.request(method, path, body, {
      params: { format, ...extraParams },
      headers: { Accept: mimeType, 'Content-Type': 'application/json' },
      ...(format === 'JSON' ? {} : { responseType: 'arraybuffer' as const })
    });
    if (format === 'JSON') {
      const result = row(privateData(response.data, this.auth));
      records(result.fields);
      records(result.employees);
      return { data: result, binary: undefined };
    }
    const contentType = String(response.headers['content-type'] ?? '')
      .split(';')[0]
      ?.trim()
      .toLowerCase();
    if (contentType !== mimeType) unexpected();
    const bytes =
      response.data instanceof ArrayBuffer
        ? new Uint8Array(response.data)
        : response.data instanceof Uint8Array
          ? response.data
          : unexpected();
    if (
      !bytes.length ||
      (format === 'PDF' && Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-')
    )
      unexpected();
    privateData(Buffer.from(bytes).toString('utf8'), this.auth);
    return { data: null, binary: { bytes, mimeType } };
  }
  async getTableRows(employeeId: string, table: string) {
    id(employeeId, 'Employee ID', true);
    tableName(table);
    const rows = records(await this.get(`/employees/${employeeId}/tables/${table}`));
    for (const record of rows) {
      responseId(record.id);
      if (employeeId !== '0' && responseId(record.employeeId) !== employeeId) unexpected();
    }
    return rows;
  }
  async addTableRow(employeeId: string, table: string, data: Row) {
    id(employeeId, 'Employee ID', true);
    tableName(table);
    inputData(data);
    if ('id' in data || 'employeeId' in data)
      invalid('Row identity must not be written as field data.');
    await this.write('POST', `/employees/${employeeId}/tables/${table}`, data, [200], 'v1_1');
  }
  async updateTableRow(employeeId: string, table: string, rowId: string, data: Row) {
    id(rowId, 'Row ID');
    const rows = await this.getTableRows(employeeId, table);
    if (!rows.some(record => responseId(record.id) === rowId))
      invalid('The exact table row was not visible for the selected employee.');
    inputData(data);
    if ('id' in data || 'employeeId' in data)
      invalid('Row identity must not be written as field data.');
    await this.write(
      'POST',
      `/employees/${employeeId}/tables/${table}/${rowId}`,
      data,
      [200],
      'v1_1'
    );
    const observed = (await this.getTableRows(employeeId, table)).filter(
      record => responseId(record.id) === rowId
    );
    if (observed.length !== 1) unexpected();
    return Object.keys(data).filter(
      field =>
        Object.hasOwn(observed[0] ?? {}, field) &&
        JSON.stringify(observed[0]?.[field]) === JSON.stringify(data[field])
    );
  }
  async deleteTableRow(employeeId: string, table: string, rowId: string) {
    id(rowId, 'Row ID');
    const rows = await this.getTableRows(employeeId, table);
    if (!rows.some(record => responseId(record.id) === rowId))
      invalid('The exact table row was not visible for the selected employee.');
    const response = await this.request(
      'DELETE',
      `/employees/${employeeId}/tables/${table}/${rowId}`
    );
    const data = row(privateData(response.data, this.auth));
    if (data.success !== true) unexpected();
    if (
      (await this.getTableRows(employeeId, table)).some(
        record => responseId(record.id) === rowId
      )
    )
      unexpected();
  }
  async getTimeOffRequests(params: {
    start: string;
    end: string;
    employeeId?: string;
    status?: string;
    type?: string;
  }) {
    dateRange(params.start, params.end);
    if (params.employeeId !== undefined) id(params.employeeId, 'Employee ID');
    if (params.type !== undefined)
      for (const type of params.type.split(',')) id(type, 'Time off type ID');
    if (
      params.status
        ?.split(',')
        .some(
          status =>
            !['approved', 'denied', 'superceded', 'requested', 'canceled'].includes(status)
        )
    )
      invalid('Unsupported time off status.');
    const result = records(await this.get('/time_off/requests', params));
    for (const request of result) {
      responseId(request.id);
      if (
        params.employeeId !== undefined &&
        responseId(request.employeeId) !== params.employeeId
      )
        unexpected();
    }
    return result;
  }
  async createTimeOffRequest(
    employeeId: string,
    data: {
      status: string;
      start: string;
      end: string;
      timeOffTypeId: string;
      amount: number;
      notes?: Record<string, string>;
      dates?: Record<string, number>;
    }
  ) {
    id(employeeId, 'Employee ID');
    id(data.timeOffTypeId, 'Time off type ID');
    dateRange(data.start, data.end);
    amount(data.amount, 'Time off amount');
    const notes =
      data.notes === undefined
        ? undefined
        : Object.entries(data.notes).map(([from, note]) => {
            if (!['employee', 'manager'].includes(from))
              invalid('Notes must be keyed by employee or manager, not dates.');
            return { from, note: text(note, 'Time off note') };
          });
    const dates =
      data.dates === undefined
        ? undefined
        : Object.entries(data.dates).map(([ymd, value]) => {
            date(ymd, 'Daily date');
            if (ymd < data.start || ymd > data.end)
              invalid('Daily dates must fall within the request range.');
            return { ymd, amount: amount(value, 'Daily amount') };
          });
    if (dates !== undefined && !dates.length) invalid('Daily amounts must not be empty.');
    const result = row(
      await this.write(
        'PUT',
        `/employees/${employeeId}/time_off/request`,
        { ...data, notes, dates },
        [201]
      )
    );
    const requestId = responseId(result.id);
    if (
      requestId === '0' ||
      responseId(result.employeeId) !== employeeId ||
      result.start !== data.start ||
      result.end !== data.end ||
      row(result.status).status !== data.status
    )
      unexpected();
    return { requestId };
  }
  async updateTimeOffRequestStatus(requestId: string, status: string, note?: string) {
    id(requestId, 'Time off request ID');
    if (!['approved', 'denied', 'canceled'].includes(status))
      invalid('Unsupported time off status.');
    await this.write('PUT', `/time_off/requests/${requestId}/status`, {
      status,
      ...(note !== undefined ? { note: text(note, 'Status note', true) } : {})
    });
  }
  async getWhosOut(start?: string, end?: string) {
    if (start !== undefined) date(start, 'Start date');
    if (end !== undefined) date(end, 'End date');
    if (start !== undefined && end !== undefined) dateRange(start, end);
    return records(await this.get('/time_off/whos_out', { start, end }));
  }
  async getTimeOffBalances(employeeId: string, end?: string) {
    id(employeeId, 'Employee ID');
    if (end !== undefined) date(end, 'As-of date');
    return records(await this.get(`/employees/${employeeId}/time_off/calculator`, { end }));
  }
  async getTimeOffTypes() {
    const data = row(await this.get('/meta/time_off/types'));
    records(data.timeOffTypes);
    records(data.defaultHours);
    return data;
  }
  async getTimesheetEntries(params: { start: string; end: string; employeeIds?: string }) {
    dateRange(params.start, params.end);
    if ((Date.parse(params.end) - Date.parse(params.start)) / 86_400_000 > 365)
      invalid('The timesheet date range must not exceed 365 days.');
    if (params.employeeIds !== undefined)
      for (const employeeId of params.employeeIds.split(',')) id(employeeId, 'Employee ID');
    const entries = records(await this.get('/time_tracking/timesheet_entries', params));
    for (const entry of entries) {
      responseId(entry.id);
      const employeeId = responseId(entry.employeeId);
      if (
        params.employeeIds !== undefined &&
        !params.employeeIds.split(',').includes(employeeId)
      )
        unexpected();
    }
    return entries;
  }
  private isoTimestamp(value: string): string {
    text(value, 'Timestamp');
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))
    )
      invalid('Timestamp must be an ISO 8601 date-time with a time zone.');
    date(value.slice(0, 10), 'Timestamp date');
    return new Date(value).toISOString();
  }
  async clockIn(
    employeeId: string,
    data: {
      start?: string;
      timezone?: string;
      note?: string;
      projectId?: string;
      taskId?: string;
    }
  ) {
    id(employeeId, 'Employee ID');
    const body: Row = {};
    if (data.start !== undefined) {
      const timestamp = this.isoTimestamp(data.start);
      const timezone = text(data.timezone, 'Timezone for a historical clock-in');
      let parts: Intl.DateTimeFormatPart[];
      try {
        parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        }).formatToParts(new Date(timestamp));
      } catch {
        return invalid('Timezone must be a supported IANA timezone.');
      }
      const part = (key: string) =>
        parts.find(item => item.type === key)?.value ?? unexpected();
      body.date = `${part('year')}-${part('month')}-${part('day')}`;
      body.start = `${part('hour')}:${part('minute')}`;
      body.timezone = timezone;
    } else if (data.timezone !== undefined) body.timezone = text(data.timezone, 'Timezone');
    if (data.note !== undefined) body.note = text(data.note, 'Clock-in note', true);
    if (data.projectId !== undefined) body.projectId = numericId(data.projectId, 'Project ID');
    if (data.taskId !== undefined) {
      if (data.projectId === undefined) invalid('taskId requires projectId.');
      body.taskId = numericId(data.taskId, 'Task ID');
    }
    const result = row(
      await this.write('POST', `/time_tracking/employees/${employeeId}/clock_in`, body)
    );
    responseId(result.id);
    if (responseId(result.employeeId) !== employeeId) unexpected();
    return result;
  }
  async clockOut(employeeId: string, data: { timezone?: string; note?: string } = {}) {
    id(employeeId, 'Employee ID');
    if (data.note !== undefined)
      invalid(
        'Clock-out notes are not supported by BambooHR. Omit note; add it to the clock-in entry instead.'
      );
    const result = row(
      await this.write(
        'POST',
        `/time_tracking/employees/${employeeId}/clock_out`,
        data.timezone === undefined ? {} : { timezone: text(data.timezone, 'Timezone') }
      )
    );
    responseId(result.id);
    if (responseId(result.employeeId) !== employeeId) unexpected();
    return result;
  }
  async addTimesheetEntry(
    employeeId: string,
    data: { date: string; hours: number; note?: string; projectId?: string; taskId?: string }
  ) {
    const body: Row = {
      employeeId: numericId(employeeId, 'Employee ID'),
      date: date(data.date, 'Timesheet date'),
      hours: amount(data.hours, 'Hours', 24)
    };
    if (data.note !== undefined) body.note = text(data.note, 'Timesheet note', true);
    if (data.projectId !== undefined) body.projectId = numericId(data.projectId, 'Project ID');
    if (data.taskId !== undefined) {
      if (data.projectId === undefined) invalid('taskId requires projectId.');
      body.taskId = numericId(data.taskId, 'Task ID');
    }
    const results = records(
      await this.write('POST', '/time_tracking/hour_entries/store', { hours: [body] }, [201])
    );
    if (results.length !== 1) unexpected();
    const result = results[0] ?? unexpected();
    responseId(result.id);
    if (
      responseId(result.employeeId) !== employeeId ||
      result.date !== data.date ||
      result.hours !== data.hours
    )
      unexpected();
    return result;
  }
  async getGoals(employeeId: string, filter?: string) {
    id(employeeId, 'Employee ID');
    const filters: Record<string, string> = {
      all: 'status-all',
      open: 'status-inProgress',
      closed: 'status-closed'
    };
    if (filter !== undefined && !filters[filter]) invalid('Unsupported goal filter.');
    const result = row(
      await this.get(`/performance/employees/${employeeId}/goals`, {
        filter: filter === undefined ? undefined : filters[filter]
      })
    );
    const goals = records(result.goals);
    for (const goal of goals) responseId(goal.id);
    return { goals };
  }
  async getGoal(employeeId: string, goalId: string) {
    id(employeeId, 'Employee ID');
    id(goalId, 'Goal ID');
    return this.exact(
      row(
        row(await this.get(`/performance/employees/${employeeId}/goals/${goalId}/aggregate`))
          .goal
      ),
      goalId
    );
  }
  private goalBody(employeeId: string, data: Row, existing?: Row): Row {
    const body: Row = {
      title: text(data.title ?? existing?.title, 'Goal title'),
      dueDate: date(data.dueDate ?? existing?.dueDate, 'Goal due date')
    };
    const shares = data.sharedWithEmployeeIds ??
      existing?.sharedWithEmployeeIds ?? [employeeId];
    if (!Array.isArray(shares)) invalid('Goal sharing must be an array of employee IDs.');
    const ids = shares.map(value =>
      numericId(typeof value === 'number' ? String(value) : value, 'Shared employee ID')
    );
    const owner = numericId(employeeId, 'Employee ID');
    if (!ids.includes(owner)) invalid('Goal sharing must include the owner employee ID.');
    body.sharedWithEmployeeIds = ids;
    if (data.description !== undefined)
      body.description = text(data.description, 'Goal description', true);
    if (data.alignsWithOptionId !== undefined)
      body.alignsWithOptionId = numericId(data.alignsWithOptionId, 'Alignment ID');
    if (data.percentComplete !== undefined) {
      body.percentComplete = integer(data.percentComplete, 'Goal progress', 0, 100);
      if (
        existing?.milestones !== undefined &&
        existing.milestones !== null &&
        records(existing.milestones).length
      )
        invalid('Milestone goal progress cannot be changed as a simple percentage.');
    }
    if (data.completionDate !== undefined) {
      if (data.percentComplete !== 100)
        invalid('completionDate requires percentComplete=100.');
      body.completionDate = date(data.completionDate, 'Completion date');
    }
    return body;
  }
  async createGoal(employeeId: string, data: Row) {
    id(employeeId, 'Employee ID');
    const body = this.goalBody(employeeId, data);
    const result = row(
      await this.write('POST', `/performance/employees/${employeeId}/goals`, body, [201])
    );
    const goal = row(result.goal);
    const goalId = responseId(goal.id);
    if (goalId === '0') unexpected();
    return { goal };
  }
  async updateGoal(employeeId: string, goalId: string, data: Row) {
    const existing = await this.getGoal(employeeId, goalId);
    inputData(data);
    const body = this.goalBody(employeeId, data, existing);
    const response = await requestAxios(
      'Update goal',
      () =>
        this.http.put<unknown>(
          `/api/v1_1/performance/employees/${employeeId}/goals/${goalId}`,
          body
        ),
      safeApiError
    );
    if (response.status !== 200) throw safeApiError({ response: { status: response.status } });
    return this.exact(row(row(privateData(response.data, this.auth)).goal), goalId);
  }
  async addGoalComment(employeeId: string, goalId: string, comment: string) {
    await this.getGoal(employeeId, goalId);
    const result = row(
      await this.write(
        'POST',
        `/performance/employees/${employeeId}/goals/${goalId}/comments`,
        { text: text(comment, 'Comment') },
        [201]
      )
    );
    responseId(result.id);
    return result;
  }
  async closeGoal(employeeId: string, goalId: string) {
    await this.getGoal(employeeId, goalId);
    const goal = this.exact(
      row(
        row(
          await this.write(
            'POST',
            `/performance/employees/${employeeId}/goals/${goalId}/close`,
            {},
            [201]
          )
        ).goal
      ),
      goalId
    );
    if (goal.status !== 'closed') unexpected();
    return goal;
  }
  async reopenGoal(employeeId: string, goalId: string) {
    await this.getGoal(employeeId, goalId);
    const goal = this.exact(
      row(
        row(
          await this.write(
            'POST',
            `/performance/employees/${employeeId}/goals/${goalId}/reopen`,
            {},
            [201]
          )
        ).goal
      ),
      goalId
    );
    if (!['in_progress', 'completed'].includes(String(goal.status))) unexpected();
    return goal;
  }
  async getTrainingTypes() {
    return collection(await this.get('/training/type'));
  }
  async getTrainingRecordsForEmployee(employeeId: string, trainingTypeId?: string) {
    id(employeeId, 'Employee ID');
    if (trainingTypeId !== undefined) id(trainingTypeId, 'Training type ID');
    const records = collection(
      await this.get(`/training/record/employee/${employeeId}`, { type: trainingTypeId })
    );
    for (const record of records) {
      if (
        responseId(record.employeeId) !== employeeId ||
        (trainingTypeId !== undefined && responseId(record.type) !== trainingTypeId)
      )
        unexpected();
    }
    return records;
  }
  async addTrainingRecord(
    employeeId: string,
    data: {
      completed: string;
      cost?: { currency: string; cost: number };
      instructor?: string;
      hours?: number;
      credits?: number;
      notes?: string;
      trainingTypeId: string;
    }
  ) {
    id(employeeId, 'Employee ID');
    const body: Row = {
      completed: date(data.completed, 'Completion date'),
      type: numericId(data.trainingTypeId, 'Training type ID')
    };
    for (const key of ['instructor', 'notes'] as const)
      if (data[key] !== undefined) body[key] = text(data[key], key, true);
    for (const key of ['hours', 'credits'] as const)
      if (data[key] !== undefined) body[key] = amount(data[key], key);
    if (data.cost !== undefined) {
      if (!/^[A-Z]{3}$/.test(data.cost.currency))
        invalid('Cost currency must be a three-letter uppercase currency code.');
      body.cost = {
        currency: data.cost.currency,
        amount: decimalAmount(data.cost.cost, 'Training cost')
      };
    }
    const result = row(
      await this.write('POST', `/training/record/employee/${employeeId}`, body, [201])
    );
    responseId(result.id);
    if (
      responseId(result.employeeId) !== employeeId ||
      responseId(result.type) !== data.trainingTypeId ||
      result.completed !== data.completed
    )
      unexpected();
    return result;
  }
  async getBenefitDeductionTypes() {
    return records(await this.get('/benefits/settings/deduction_types/all'));
  }
  async getBenefitPlans() {
    const data = row(await this.get('/benefit/company_benefit'));
    records(data.companyBenefits);
    return data;
  }
  async getBenefitCoverages() {
    const data = row(await this.get('/benefitcoverages'));
    records(data['Benefit Coverages']);
    return data;
  }
  async getEmployeeDependents(employeeId: string) {
    id(employeeId, 'Employee ID');
    const data = row(await this.get('/employeedependents', { employeeid: employeeId }));
    for (const dependent of records(data['Employee Dependents']))
      if (responseId(dependent.employeeId) !== employeeId) unexpected();
    return data;
  }
  async listEmployeeFiles(employeeId: string) {
    id(employeeId, 'Employee ID', true);
    const data = row(await this.get(`/employees/${employeeId}/files/view`));
    const owner = responseId(row(data.employee).id);
    if (employeeId !== '0' && owner !== employeeId) unexpected();
    return { employee: { id: owner }, categories: this.fileCategories(data.categories) };
  }
  async listCompanyFiles() {
    const data = row(await this.get('/files/view'));
    return { categories: this.fileCategories(data.categories) };
  }
  private fileCategories(value: unknown): Row[] {
    const categories = records(value);
    for (const category of categories) {
      responseId(category.id);
      for (const file of records(category.files)) {
        responseId(file.id);
        if (typeof file.name !== 'string') unexpected();
      }
    }
    return categories;
  }
  async file(fileId: string, employeeId?: string) {
    id(fileId, 'File ID');
    const data =
      employeeId === undefined
        ? await this.listCompanyFiles()
        : await this.listEmployeeFiles(employeeId);
    const files = data.categories
      .flatMap(category => records(category.files))
      .filter(file => responseId(file.id) === fileId);
    if (files.length !== 1)
      invalid(
        'The exact file is not visible in the selected employee/company folder. Check scope and permissions.'
      );
    return files[0] ?? unexpected();
  }
  fileUrl(fileId: string, employeeId?: string) {
    id(fileId, 'File ID');
    if (employeeId !== undefined) id(employeeId, 'Employee ID', true);
    return `${this.origin}/api/v1${employeeId === undefined ? '' : `/employees/${employeeId}`}/files/${fileId}`;
  }
  private async upload(
    categoryId: string,
    fileName: string,
    content: string,
    share: boolean | undefined,
    employeeId?: string
  ) {
    numericId(categoryId, 'Category ID');
    text(fileName, 'Filename');
    text(content, 'File content');
    if (/[\r\n/\\]/.test(fileName))
      invalid('Filename must not contain newlines or path separators.');
    const bytes = Buffer.from(content, 'utf8');
    if (!bytes.length || bytes.length >= 20 * 1024 * 1024)
      invalid('File content must be nonempty UTF-8 text under 20 MB.');
    const listing =
      employeeId === undefined
        ? await this.listCompanyFiles()
        : await this.listEmployeeFiles(employeeId);
    const categories = listing.categories;
    const owner =
      employeeId === undefined
        ? undefined
        : responseId(row('employee' in listing ? listing.employee : unexpected()).id);
    const category = categories.find(item => responseId(item.id) === categoryId);
    if (!category || category.canUploadFiles !== 'yes')
      invalid('The exact category is not visible or does not allow uploads.');
    const form = new FormData();
    form.set('category', categoryId);
    form.set('fileName', fileName);
    form.set('share', share ? 'yes' : 'no');
    form.set('file', new Blob([bytes]), fileName);
    const prefix = owner === undefined ? '' : `/employees/${owner}`;
    const response = await this.request(
      'POST',
      `${prefix}/files`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
      [201]
    );
    return this.receipt(
      response.headers.location,
      `${prefix.slice(1)}${prefix ? '/' : ''}files`
    );
  }
  async uploadEmployeeFile(
    employeeId: string,
    categoryId: string,
    fileName: string,
    content: string,
    share?: boolean
  ) {
    return this.upload(categoryId, fileName, content, share, employeeId);
  }
  async uploadCompanyFile(
    categoryId: string,
    fileName: string,
    content: string,
    share?: boolean
  ) {
    return this.upload(categoryId, fileName, content, share);
  }
  private async deleteFile(fileId: string, employeeId?: string) {
    id(fileId, 'File ID');
    const before =
      employeeId === undefined
        ? await this.listCompanyFiles()
        : await this.listEmployeeFiles(employeeId);
    const matches = before.categories.flatMap(category =>
      records(category.files)
        .filter(file => responseId(file.id) === fileId)
        .map(file => ({ category, file }))
    );
    if (matches.length !== 1)
      invalid(
        'The exact file is not visible in the selected employee/company folder. Check scope and permissions.'
      );
    const match = matches[0] ?? unexpected();
    if (match.file.canDeleteFile !== 'yes') invalid('This file does not permit deletion.');
    await this.request(
      'DELETE',
      `${employeeId === undefined ? '' : `/employees/${employeeId}`}/files/${fileId}`
    );
    const after =
      employeeId === undefined
        ? await this.listCompanyFiles()
        : await this.listEmployeeFiles(employeeId);
    if (
      !after.categories.some(
        category => responseId(category.id) === responseId(match.category.id)
      )
    )
      unexpected();
    if (
      after.categories.some(category =>
        records(category.files).some(item => responseId(item.id) === fileId)
      )
    )
      unexpected();
  }
  async deleteEmployeeFile(employeeId: string, fileId: string) {
    await this.deleteFile(fileId, employeeId);
  }
  async deleteCompanyFile(fileId: string) {
    await this.deleteFile(fileId);
  }
  async getFields() {
    return records(await this.get('/meta/fields'));
  }
  async getLists() {
    return records(await this.get('/meta/lists'));
  }
  async getTables() {
    return records(await this.get('/meta/tables'));
  }
  async getUsers() {
    return row(await this.get('/meta/users'));
  }
  async getJobSummaries() {
    return records(await this.get('/applicant_tracking/jobs'));
  }
  async getApplications(
    params: {
      page?: number;
      pageLimit?: number;
      jobId?: string;
      applicationStatusId?: string;
      newSince?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ) {
    if (params.pageLimit !== undefined)
      invalid(
        'BambooHR does not document pageLimit for applications. Omit it and use page to continue.'
      );
    if (params.page !== undefined) integer(params.page, 'Page', 1, 1_000_000);
    if (params.jobId !== undefined) id(params.jobId, 'Job ID');
    if (params.applicationStatusId !== undefined)
      for (const statusId of params.applicationStatusId.split(','))
        id(statusId, 'Application status ID');
    if (
      params.sortBy !== undefined &&
      ![
        'first_name',
        'job_title',
        'rating',
        'phone',
        'status',
        'last_updated',
        'created_date'
      ].includes(params.sortBy)
    )
      invalid('Unsupported application sort field.');
    const query: RequestOptions['params'] = { ...params };
    if (params.newSince !== undefined) {
      const native = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(params.newSince)
        ? `${params.newSince.replace(' ', 'T')}Z`
        : params.newSince;
      query.newSince = this.isoTimestamp(native).slice(0, 19).replace('T', ' ');
    }
    const data = row(await this.get('/applicant_tracking/applications', query));
    if (typeof data.paginationComplete !== 'boolean') unexpected();
    const applications = records(data.applications);
    for (const application of applications) responseId(application.id);
    return { applications, paginationComplete: data.paginationComplete };
  }
  async getApplicationDetails(applicationId: string) {
    id(applicationId, 'Application ID');
    return this.exact(
      row(await this.get(`/applicant_tracking/applications/${applicationId}`)),
      applicationId
    );
  }
  async getApplicationStatuses() {
    const statuses = records(await this.get('/applicant_tracking/statuses'));
    for (const status of statuses) responseId(status.id);
    return statuses;
  }
  async changeApplicationStatus(applicationId: string, statusId: string) {
    await this.getApplicationDetails(applicationId);
    const statuses = await this.getApplicationStatuses();
    if (
      !statuses.some(status => responseId(status.id) === statusId && status.enabled === true)
    )
      invalid('The selected application status is not active or visible.');
    const result = row(
      await this.write('POST', `/applicant_tracking/applications/${applicationId}/status`, {
        status: numericId(statusId, 'Status ID')
      })
    );
    responseId(result.id);
    if (result.type !== 'positionApplicantStatus') unexpected();
    const observed = await this.getApplicationDetails(applicationId);
    if (responseId(row(observed.status).id) !== statusId) unexpected();
  }
  async addApplicationComment(applicationId: string, comment: string) {
    await this.getApplicationDetails(applicationId);
    const result = row(
      await this.write('POST', `/applicant_tracking/applications/${applicationId}/comments`, {
        type: 'comment',
        comment: text(comment, 'Comment')
      })
    );
    responseId(result.id);
    if (result.type !== 'comment') unexpected();
    return result;
  }
  async listEmployees(limit: number, after?: string) {
    integer(limit, 'Limit', 1, 2500);
    if (after !== undefined) text(after, 'Cursor');
    const data = row(
      await this.get('/employees', { 'page[limit]': limit, 'page[after]': after })
    );
    const employees = records(data.data);
    for (const employee of employees) {
      if (typeof employee.employeeId !== 'string') unexpected();
      responseId(employee.employeeId);
    }
    const meta = row(data.meta);
    const page = row(meta.page);
    if (typeof meta.total !== 'number' || !Number.isSafeInteger(meta.total) || meta.total < 0)
      unexpected();
    if (
      !Object.hasOwn(page, 'nextCursor') ||
      (page.nextCursor !== null && (typeof page.nextCursor !== 'string' || !page.nextCursor))
    )
      unexpected();
    return {
      resources: employees,
      total: meta.total,
      nextCursor: typeof page.nextCursor === 'string' ? page.nextCursor : null,
      pagination: page
    };
  }
  private reportPagination(value: unknown): Row {
    const pagination = row(value);
    for (const key of ['total_records', 'current_page', 'total_pages'])
      if (
        typeof pagination[key] !== 'number' ||
        !Number.isSafeInteger(pagination[key]) ||
        Number(pagination[key]) < 0
      )
        unexpected();
    return pagination;
  }
  async listReports(page: number, pageSize: number) {
    const data = row(
      await this.get('/custom-reports', {
        page: integer(page, 'Page', 1, 1_000_000),
        page_size: integer(pageSize, 'Page size', 1, 1000)
      })
    );
    const reports = records(data.reports);
    for (const report of reports) responseId(report.id);
    const pagination = this.reportPagination(data.pagination);
    return {
      resources: reports,
      pagination,
      total: Number(pagination.total_records),
      nextPage:
        Number(pagination.current_page) < Number(pagination.total_pages)
          ? Number(pagination.current_page) + 1
          : null
    };
  }
}
export const clientFor = (ctx: { auth: BambooAuth }) => new Client(ctx.auth);
