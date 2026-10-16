import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  getApiErrorResponseWithBody,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface RagicAuth {
  token: string;
  authMode?: 'api_key' | 'session';
  serverDomain?: string;
}

export interface RagicClientConfig extends RagicAuth {
  serverDomain: string;
  accountName: string;
}

export interface SheetPath {
  tabFolder: string;
  sheetIndex: number;
}

export interface ListRecordsParams {
  where?: Array<{ fieldId: string; operator: string; value: string }>;
  fts?: string;
  order?: { fieldId: string; direction: 'ASC' | 'DESC' };
  limit?: number;
  offset?: number;
  subtables?: boolean;
  listing?: boolean;
  naming?: 'EID' | 'FNAME';
  info?: boolean;
  comment?: boolean;
  reverse?: boolean;
}

export interface WriteParams {
  doFormula?: boolean;
  doDefaultValue?: boolean;
  doLinkLoad?: boolean | 'first';
  doWorkflow?: boolean;
  notification?: boolean;
  checkLock?: boolean;
  doValidation?: boolean;
}

export let normalizeServerDomain = (domain: unknown) => {
  if (typeof domain !== 'string')
    throw createApiServiceError(
      'Enter the Ragic server domain from your account URL, without a scheme or path.'
    );
  let value = domain.trim();
  if (
    value.length > 253 ||
    !value.includes('.') ||
    value
      .split('.')
      .some(label => label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
  ) {
    throw createApiServiceError(
      'Enter the Ragic server domain from your account URL, without a scheme or path.'
    );
  }
  return value.toLowerCase();
};

export let ragicApiError = (error: unknown, operation: string, secrets: string[] = []) => {
  let upstream = getApiErrorResponseWithBody(error);
  let message = extractApiErrorMessage(error, {
    response: upstream,
    detailKeys: ['msg', 'message', 'error', 'detail'],
    fallbackMessage: 'The request could not be completed.'
  });
  for (let secret of secrets.filter(Boolean)) {
    message = message
      .replaceAll(secret, '[REDACTED]')
      .replaceAll(encodeURIComponent(secret), '[REDACTED]');
  }
  message = message
    .replace(/\bBasic\s+[^\s"'<>]+/gi, 'Basic [REDACTED]')
    .replace(/([?&](?:sid|APIKey|p)=)[^&\s"'<>]*/gi, '$1[REDACTED]');
  if (/^\s*</.test(message))
    message =
      'The server returned an unexpected page. Check your Ragic server and credentials.';
  let code = isApiErrorRecord(upstream?.data) ? upstream.data.code : undefined;
  return buildApiServiceError(error, {
    parent: {},
    extractResponse: () => ({
      status: upstream?.status,
      data: { message: message.slice(0, 1000) }
    }),
    extractMessage: () => message.slice(0, 1000),
    providerLabel: 'Ragic',
    reason: 'ragic_api_error',
    operation,
    extractUpstreamCode: () =>
      typeof code === 'number' || (typeof code === 'string' && /^\d+$/.test(code))
        ? String(code)
        : undefined
  });
};

export let createClient = (
  auth: RagicAuth,
  config: { accountName: string; serverDomain?: unknown }
) => {
  // Stored connections may predate moving the server domain into authentication.
  let serverDomain =
    auth.serverDomain !== undefined
      ? auth.serverDomain
      : config.serverDomain !== undefined
        ? config.serverDomain
        : 'www.ragic.com';
  return new Client({
    ...auth,
    serverDomain: normalizeServerDomain(serverDomain),
    accountName: config.accountName
  });
};

export let readCreatedRecordId = (data: Record<string, any>): string | undefined => {
  let value = data.ragicId ?? data._ragicId;
  if (value !== undefined && value !== null) {
    if (
      (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) ||
      (typeof value === 'string' && /^\d+$/.test(value))
    )
      return String(value);
    throw createApiServiceError('Ragic returned an invalid record ID.', {
      reason: 'invalid_response'
    });
  }
  let recordKeys = Object.keys(data).filter(
    key => /^\d+$/.test(key) && isApiErrorRecord(data[key])
  );
  return recordKeys.length === 1 ? recordKeys[0] : undefined;
};

export class Client {
  private baseURL: string;
  private axios;
  private accountName: string;

  constructor(private config: RagicClientConfig) {
    this.baseURL = `https://${normalizeServerDomain(config.serverDomain)}`;
    if (!config.token.trim())
      throw createApiServiceError('A Ragic API key or session is required.');
    if (!config.accountName.trim() || /[/?#]/.test(config.accountName))
      throw createApiServiceError('Enter the account/database name from your Ragic URL.');
    this.accountName = config.accountName;
    this.axios = createAuthenticatedAxios({
      baseURL: this.baseURL,
      authHeader:
        config.authMode === 'session' ? undefined : { value: `Basic ${config.token}` },
      timeout: 60000,
      validateStatus: () => true,
      paramsSerializer: { indexes: null }
    });
  }

  getDownloadAuth(): { headers: Record<string, string>; query: Record<string, string> } {
    return this.config.authMode === 'session'
      ? { headers: {}, query: { sid: this.config.token } }
      : { headers: { Authorization: `Basic ${this.config.token}` }, query: {} };
  }

  private buildSheetUrl(sheet: SheetPath): string {
    this.validateNumber(sheet.sheetIndex, 'sheetIndex');
    let parts = sheet.tabFolder.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.some(part => !part || part === '.' || part === '..'))
      throw createApiServiceError(
        'tabFolder must be the folder path from your Ragic sheet URL.'
      );
    return `/${encodeURIComponent(this.accountName)}/${parts.map(encodeURIComponent).join('/')}/${sheet.sheetIndex}`;
  }

  private buildRecordUrl(sheet: SheetPath, recordId: number): string {
    this.validateNumber(recordId, 'recordId');
    return `${this.buildSheetUrl(sheet)}/${recordId}`;
  }

  private validateNumber(value: number, name: string) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw createApiServiceError(`${name} must be a non-negative whole number.`);
  }

  private buildQueryParams(params: ListRecordsParams) {
    if (params.limit !== undefined && !Number.isSafeInteger(params.limit))
      throw createApiServiceError('limit must be a whole number.');
    if (params.offset !== undefined) this.validateNumber(params.offset, 'offset');
    return pickDefined({
      v: '3',
      api: '',
      where: params.where?.length
        ? params.where.map(w => `${w.fieldId},${w.operator},${encodeURIComponent(w.value)}`)
        : undefined,
      fts: params.fts,
      order: params.order ? `${params.order.fieldId},${params.order.direction}` : undefined,
      limit: params.limit === undefined ? undefined : String(params.limit),
      offset: params.offset === undefined ? undefined : String(params.offset),
      subtables: params.subtables === false ? '0' : undefined,
      listing: params.listing ? 'true' : undefined,
      naming: params.naming,
      info: params.info ? 'true' : undefined,
      comment: params.comment ? 'true' : undefined,
      reverse: params.reverse ? 'true' : undefined
    });
  }

  private buildWriteParams(params: WriteParams = {}): Record<string, string> {
    return Object.fromEntries(
      Object.entries(pickDefined({ v: '3', api: '', ...params })).map(([key, value]) => [
        key,
        String(value)
      ])
    );
  }

  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    params: Record<string, unknown> = { v: '3', api: '' },
    data?: unknown
  ): Promise<Record<string, any>> {
    let response: { status: number; data: unknown };
    try {
      response = await this.axios.request({
        method,
        url,
        params: { ...params, ...this.getDownloadAuth().query },
        data,
        ...(data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {})
      });
    } catch (error) {
      throw ragicApiError(error, 'request', [this.config.token]);
    }
    if (
      response.status < 200 ||
      response.status >= 300 ||
      (isApiErrorRecord(response.data) && response.data.status === 'ERROR')
    ) {
      throw ragicApiError({ response }, 'request', [this.config.token]);
    }
    if (!isApiErrorRecord(response.data))
      throw createApiServiceError('Ragic returned an invalid JSON object.', {
        reason: 'invalid_response'
      });
    return response.data;
  }

  listRecords(sheet: SheetPath, params: ListRecordsParams = {}) {
    return this.request('GET', this.buildSheetUrl(sheet), this.buildQueryParams(params));
  }

  getRecord(sheet: SheetPath, recordId: number, params: ListRecordsParams = {}) {
    return this.request(
      'GET',
      this.buildRecordUrl(sheet, recordId),
      this.buildQueryParams(params)
    );
  }

  createRecord(sheet: SheetPath, fields: Record<string, any>, writeParams?: WriteParams) {
    return this.request(
      'POST',
      this.buildSheetUrl(sheet),
      this.buildWriteParams(writeParams),
      fields
    );
  }

  updateRecord(
    sheet: SheetPath,
    recordId: number,
    fields: Record<string, any>,
    writeParams?: WriteParams
  ) {
    return this.request(
      'POST',
      this.buildRecordUrl(sheet, recordId),
      this.buildWriteParams(writeParams),
      fields
    );
  }

  deleteRecord(sheet: SheetPath, recordId: number) {
    return this.request('DELETE', this.buildRecordUrl(sheet, recordId));
  }

  addComment(sheet: SheetPath, recordId: number, comment: string) {
    if (!comment.trim()) throw createApiServiceError('Provide a comment to add.');
    let form = new FormData();
    form.set('c', comment);
    return this.request('POST', this.buildRecordUrl(sheet, recordId), undefined, form);
  }

  lockRecord(sheet: SheetPath, recordId: number) {
    return this.request('POST', this.buildRecordUrl(sheet, recordId), {
      v: '3',
      api: '',
      lock: ''
    });
  }

  unlockRecord(sheet: SheetPath, recordId: number) {
    return this.request('POST', this.buildRecordUrl(sheet, recordId), {
      v: '3',
      api: '',
      unlock: ''
    });
  }

  executeActionButton(sheet: SheetPath, recordId: number, buttonId: string) {
    if (!buttonId.trim())
      throw createApiServiceError('Provide a buttonId from list_action_buttons.');
    return this.request('POST', this.buildRecordUrl(sheet, recordId), {
      v: '3',
      api: '',
      bId: buttonId
    });
  }

  getActionButtons(sheet: SheetPath, category?: string) {
    return this.request(
      'GET',
      `${this.buildSheetUrl(sheet)}/metadata/actionButton`,
      pickDefined({ v: '3', api: '', category })
    );
  }

  getSheetSchema(sheet: SheetPath) {
    return this.request('GET', `${this.buildSheetUrl(sheet)}/metadata/schema`);
  }

  uploadFile(
    sheet: SheetPath,
    fieldId: string,
    fileName: string,
    bytes: ArrayBuffer,
    contentType?: string,
    recordId?: number
  ) {
    if (!/^\d+$/.test(fieldId))
      throw createApiServiceError('fieldId must be the numeric ID of a file or image field.');
    let form = new FormData();
    form.set(
      fieldId,
      new Blob([bytes], contentType ? { type: contentType } : undefined),
      fileName
    );
    let url =
      recordId === undefined
        ? this.buildSheetUrl(sheet)
        : this.buildRecordUrl(sheet, recordId);
    return this.request('POST', url, undefined, form);
  }

  getExportUrl(
    sheet: SheetPath,
    recordId: number,
    format: string,
    params: Record<string, string> = {}
  ) {
    let url = new URL(`${this.buildRecordUrl(sheet, recordId)}.${format}`, this.baseURL);
    for (let [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
  }

  async exportRecord(
    sheet: SheetPath,
    recordId: number,
    format: string,
    params: Record<string, string> = {}
  ) {
    let response: { status: number; data: ArrayBuffer; headers: Record<string, unknown> };
    try {
      response = await this.axios.get(this.getExportUrl(sheet, recordId, format, params), {
        params: this.getDownloadAuth().query,
        responseType: 'arraybuffer'
      });
    } catch (error) {
      throw ragicApiError(error, 'export', [this.config.token]);
    }
    let contentType = getResponseHeaderValue(response.headers, 'content-type');
    let text = new TextDecoder().decode(new Uint8Array(response.data).subarray(0, 65536));
    let body: unknown;
    if (/^\s*[{[]/.test(text)) {
      try {
        body = JSON.parse(text);
      } catch {}
    }
    if (
      response.status < 200 ||
      response.status >= 300 ||
      (isApiErrorRecord(body) && body.status === 'ERROR')
    ) {
      throw ragicApiError(
        { response: { status: response.status, data: body ?? text } },
        'export',
        [this.config.token]
      );
    }
    if (
      response.data.byteLength === 0 ||
      (/text\/html/i.test(contentType ?? '') && format !== 'xhtml')
    )
      throw createApiServiceError(
        'Ragic did not return the requested export. Check your permissions and template settings.',
        { reason: 'invalid_export' }
      );
    return { ...(contentType == null ? {} : { contentType }), data: response.data };
  }

  getFileDownloadUrl(
    fileReference: string,
    record?: SheetPath & { recordId: number }
  ): string {
    if (!fileReference.trim())
      throw createApiServiceError('Provide a file reference from get_record.');
    let url = new URL('/sims/file.jsp', this.baseURL);
    url.searchParams.set('a', this.accountName);
    url.searchParams.set('f', fileReference);
    if (record) {
      this.buildRecordUrl(record, record.recordId);
      url.searchParams.set('p', `/${record.tabFolder.replace(/^\/+|\/+$/g, '')}`);
      url.searchParams.set('si', String(record.sheetIndex));
      url.searchParams.set('nid', String(record.recordId));
    }
    return url.toString();
  }
}
