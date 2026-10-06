import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';
import {
  accountSchema,
  currentMonitorSchema,
  currentUserSchema,
  idSchema,
  incidentSchema,
  invalidInput,
  legacyContactSchema,
  legacyMonitorSchema,
  legacyPageSchema,
  legacyWindowSchema,
  paginationSchema,
  positiveId,
  readResponse,
  safeMonitorUrl,
  validatePage
} from './types';

export class Client {
  private axios;
  constructor(private config: { token: string; apiVersion?: 'v2' | 'v3' }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      invalidInput('A nonempty UptimeRobot API credential without line breaks is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: `https://api.uptimerobot.com/${config.apiVersion ?? 'v2'}`,
      ...(config.apiVersion === 'v3'
        ? { authHeader: { value: `Bearer ${config.token}` } }
        : {}),
      contentType:
        config.apiVersion === 'v3' ? 'application/json' : 'application/x-www-form-urlencoded',
      validateStatus: () => true,
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'UptimeRobot',
          reason: 'api_error',
          parent: createApiServiceError('The upstream transport request failed.'),
          extractMessage: () =>
            'The request could not be completed. Check the connection and retry.'
        })
    });
  }
  private requireVersion(version: 'v2' | 'v3') {
    if ((this.config.apiVersion ?? 'v2') !== version)
      invalidInput(
        version === 'v3'
          ? 'This tool requires a Current API Token connection. Use List Monitors, Create Monitor, or Update Monitor with a Legacy API Key connection.'
          : 'This tool requires a Legacy API Key connection. For current monitor workflows use List Current Monitors, Get Monitor, or Manage Monitor with a Current API Token connection.'
      );
  }
  private secretStrings(...values: unknown[]) {
    let pending = [...values];
    let secrets: string[] = [];
    while (pending.length) {
      let value = pending.pop();
      if (typeof value === 'string') secrets.push(value);
      else if (Array.isArray(value)) pending.push(...value);
      else if (isApiErrorRecord(value)) pending.push(...Object.values(value));
    }
    return secrets;
  }
  private check(
    data: unknown,
    status: number,
    headers: unknown,
    operation: string,
    secrets: string[] = []
  ) {
    if (status < 200 || status >= 300 || (isApiErrorRecord(data) && data.stat === 'fail')) {
      let upstream =
        isApiErrorRecord(data) && isApiErrorRecord(data.error) ? data.error : data;
      let code = isApiErrorRecord(upstream) ? (upstream.type ?? upstream.code) : undefined;
      let detail = isApiErrorRecord(upstream) ? upstream.message : undefined;
      let message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.filter(item => typeof item === 'string').join('; ')
            : 'The provider rejected the request.';
      let redactions = [this.config.token, ...secrets]
        .filter(Boolean)
        .flatMap(secret => {
          let encoded = new URLSearchParams({ value: secret }).toString().slice(6);
          return [
            secret,
            JSON.stringify(secret).slice(1, -1),
            encoded,
            encoded.replace(/\+/g, '%20')
          ];
        })
        .sort((left, right) => right.length - left.length);
      for (let secret of redactions) message = message.split(secret).join('[redacted]');
      message = message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
      let error = createApiServiceError(
        `UptimeRobot ${operation} failed (HTTP ${status}): ${message}`,
        {
          reason: 'api_error',
          upstreamStatus: status,
          upstreamCode: typeof code === 'string' ? code : undefined
        }
      );
      for (let [key, header] of [
        ['retryAfter', 'Retry-After'],
        ['rateLimit', 'X-RateLimit-Limit'],
        ['rateLimitRemaining', 'X-RateLimit-Remaining'],
        ['rateLimitReset', 'X-RateLimit-Reset']
      ]) {
        let value = getResponseHeaderValue(headers, header!);
        if (value !== undefined) error.data[key!] = value;
      }
      throw error;
    }
  }
  private async post(
    endpoint: string,
    params: Record<string, string | number | undefined> = {}
  ) {
    this.requireVersion('v2');
    let body = new URLSearchParams({ api_key: this.config.token, format: 'json' });
    for (let [key, value] of Object.entries(params))
      if (value !== undefined) body.set(key, String(value));
    let response = await this.axios.post<unknown>(endpoint, body.toString());
    let headerValues: unknown;
    if (typeof params.custom_http_headers === 'string') {
      try {
        headerValues = JSON.parse(params.custom_http_headers);
      } catch {
        invalidInput('customHttpHeaders must be valid JSON.');
      }
    }
    this.check(
      response.data,
      response.status,
      response.headers,
      endpoint,
      this.secretStrings(
        params.http_password,
        params.http_username,
        params.custom_http_headers,
        headerValues,
        params.post_value,
        params.password,
        params.url,
        endpoint === '/newAlertContact' ? params.value : undefined
      )
    );
    let data = readResponse(
      z.object({ stat: z.literal('ok') }).passthrough(),
      response.data,
      endpoint
    );
    return data;
  }
  private acknowledgment(
    data: Record<string, unknown>,
    key: string,
    expected?: number | string
  ) {
    let ack = readResponse(
      z.object({ id: z.union([z.string(), z.number()]) }),
      data[key],
      key
    );
    if (expected !== undefined && String(ack.id) !== String(expected))
      invalidInput('UptimeRobot acknowledged a different resource ID.');
    return { id: ack.id };
  }
  private pagination(data: Record<string, unknown>) {
    return readResponse(
      paginationSchema,
      data.pagination ?? { total: data.total, offset: data.offset, limit: data.limit },
      'pagination'
    );
  }
  // ==================== Account ====================

  async getAccountDetails() {
    let data = await this.post('/getAccountDetails');
    return readResponse(accountSchema, data.account, 'getAccountDetails');
  }

  // ==================== Monitors ====================

  async getMonitors(
    params: {
      monitors?: string;
      types?: string;
      statuses?: string;
      search?: string;
      customUptimeRatios?: string;
      allTimeUptimeRatio?: number;
      logs?: number;
      logsLimit?: number;
      responseTimes?: number;
      responseTimesLimit?: number;
      alertContacts?: number;
      ssl?: number;
      offset?: number;
      limit?: number;
    } = {}
  ) {
    if (
      params.monitors !== undefined &&
      (!params.monitors ||
        params.monitors
          .split('-')
          .some(
            value =>
              !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1
          ))
    )
      invalidInput('Resource IDs must be positive integers.');
    validatePage(params.offset, params.limit);
    let data = await this.post('/getMonitors', {
      ...(params.monitors && { monitors: params.monitors }),
      ...(params.types && { types: params.types }),
      ...(params.statuses && { statuses: params.statuses }),
      ...(params.search && { search: params.search }),
      ...(params.customUptimeRatios && { custom_uptime_ratios: params.customUptimeRatios }),
      ...(params.allTimeUptimeRatio !== undefined && {
        all_time_uptime_ratio: params.allTimeUptimeRatio
      }),
      ...(params.logs !== undefined && { logs: params.logs }),
      ...(params.logsLimit !== undefined && { logs_limit: params.logsLimit }),
      ...(params.responseTimes !== undefined && { response_times: params.responseTimes }),
      ...(params.responseTimesLimit !== undefined && {
        response_times_limit: params.responseTimesLimit
      }),
      ...(params.alertContacts !== undefined && { alert_contacts: params.alertContacts }),
      ...(params.ssl !== undefined && { ssl: params.ssl }),
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit })
    });

    return {
      monitors: readResponse(z.array(legacyMonitorSchema), data.monitors, 'getMonitors'),
      pagination: this.pagination(data)
    };
  }

  async newMonitor(params: {
    friendlyName: string;
    url: string;
    type: number;
    subType?: number;
    port?: number;
    keywordType?: number;
    keywordCaseType?: number;
    keywordValue?: string;
    interval?: number;
    timeout?: number;
    httpUsername?: string;
    httpPassword?: string;
    httpAuthType?: number;
    httpMethod?: number;
    postType?: number;
    postValue?: string;
    postContentType?: number;
    alertContacts?: string;
    mwindows?: string;
    customHttpHeaders?: string;
    customHttpStatuses?: string;
    ignoreSslErrors?: number;
    disableDomainExpireNotifications?: number;
  }) {
    if (!params.friendlyName.trim() || !params.url.trim())
      invalidInput('friendlyName and url must not be empty.');
    if (params.type === 2 && (!params.keywordValue || !params.keywordType))
      invalidInput('Keyword monitors require keywordValue and keywordType.');
    if (params.type === 4) {
      if (!params.subType) invalidInput('Port monitors require portSubType.');
      if (params.subType === 99 && params.port === undefined)
        invalidInput('Custom port monitors require portNumber.');
      params.port ??= (
        { 1: 80, 2: 443, 3: 21, 4: 25, 5: 110, 6: 143 } as Record<number, number>
      )[params.subType];
      if (
        params.port !== undefined &&
        (!Number.isInteger(params.port) || params.port < 1 || params.port > 65535)
      )
        invalidInput('portNumber must be an integer from 1 to 65535.');
    }
    if (
      params.interval !== undefined &&
      (!Number.isInteger(params.interval) || params.interval < 15)
    )
      invalidInput(
        'interval must be an integer of at least 15 seconds; your plan may require a longer interval.'
      );
    if (
      params.timeout !== undefined &&
      (!Number.isInteger(params.timeout) || params.timeout < 1 || params.timeout > 60)
    )
      invalidInput('timeout must be an integer from 1 to 60 seconds.');
    if (params.customHttpHeaders !== undefined) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(params.customHttpHeaders);
      } catch {
        invalidInput('customHttpHeaders must be a JSON object string.');
      }
      if (!isApiErrorRecord(parsed))
        invalidInput('customHttpHeaders must be a JSON object string.');
    }
    let data = await this.post('/newMonitor', {
      friendly_name: params.friendlyName,
      url: params.url,
      type: params.type,
      ...(params.subType !== undefined && { sub_type: params.subType }),
      ...(params.port !== undefined && { port: params.port }),
      ...(params.keywordType !== undefined && { keyword_type: params.keywordType }),
      ...(params.keywordCaseType !== undefined && {
        keyword_case_type: params.keywordCaseType
      }),
      ...(params.keywordValue !== undefined && { keyword_value: params.keywordValue }),
      ...(params.interval !== undefined && { interval: params.interval }),
      ...(params.timeout !== undefined && { timeout: params.timeout }),
      ...(params.httpUsername !== undefined && { http_username: params.httpUsername }),
      ...(params.httpPassword !== undefined && { http_password: params.httpPassword }),
      ...(params.httpAuthType !== undefined && { http_auth_type: params.httpAuthType }),
      ...(params.httpMethod !== undefined && { http_method: params.httpMethod }),
      ...(params.postType !== undefined && { post_type: params.postType }),
      ...(params.postValue !== undefined && { post_value: params.postValue }),
      ...(params.postContentType !== undefined && {
        post_content_type: params.postContentType
      }),
      ...(params.alertContacts !== undefined && { alert_contacts: params.alertContacts }),
      ...(params.mwindows && { mwindows: params.mwindows }),
      ...(params.customHttpHeaders && { custom_http_headers: params.customHttpHeaders }),
      ...(params.customHttpStatuses && { custom_http_statuses: params.customHttpStatuses }),
      ...(params.ignoreSslErrors !== undefined && {
        ignore_ssl_errors: params.ignoreSslErrors
      }),
      ...(params.disableDomainExpireNotifications !== undefined && {
        disable_domain_expire_notifications: params.disableDomainExpireNotifications
      })
    });

    let ack = readResponse(z.object({ id: idSchema }), data.monitor, 'newMonitor');
    let result = await this.getMonitors({ monitors: String(ack.id) });
    let monitor = result.monitors.find(item => item.id === ack.id);
    if (!monitor)
      throw createApiServiceError(
        `Created monitor ${ack.id}, but it could not be read back. Check the account before trying another creation.`,
        { reason: 'invalid_response' }
      );
    return monitor;
  }

  async editMonitor(params: {
    monitorId: number;
    friendlyName?: string;
    url?: string;
    subType?: number;
    port?: number;
    keywordType?: number;
    keywordCaseType?: number;
    keywordValue?: string;
    interval?: number;
    timeout?: number;
    status?: number;
    httpUsername?: string;
    httpPassword?: string;
    httpAuthType?: number;
    httpMethod?: number;
    postType?: number;
    postValue?: string;
    postContentType?: number;
    alertContacts?: string;
    mwindows?: string;
    customHttpHeaders?: string;
    customHttpStatuses?: string;
    ignoreSslErrors?: number;
    disableDomainExpireNotifications?: number;
  }) {
    positiveId(params.monitorId, 'monitorId');
    if (Object.values(params).filter(value => value !== undefined).length < 2)
      invalidInput('Provide at least one monitor setting to update.');
    if (
      params.interval !== undefined &&
      (!Number.isInteger(params.interval) || params.interval < 15)
    )
      invalidInput(
        'interval must be an integer of at least 15 seconds; your plan may require a longer interval.'
      );
    if (
      params.timeout !== undefined &&
      (!Number.isInteger(params.timeout) || params.timeout < 1 || params.timeout > 60)
    )
      invalidInput('timeout must be an integer from 1 to 60 seconds.');
    if (params.customHttpHeaders !== undefined) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(params.customHttpHeaders);
      } catch {
        invalidInput('customHttpHeaders must be a JSON object string.');
      }
      if (!isApiErrorRecord(parsed))
        invalidInput('customHttpHeaders must be a JSON object string.');
    }
    let data = await this.post('/editMonitor', {
      id: params.monitorId,
      ...(params.friendlyName !== undefined && { friendly_name: params.friendlyName }),
      ...(params.url !== undefined && { url: params.url }),
      ...(params.subType !== undefined && { sub_type: params.subType }),
      ...(params.port !== undefined && { port: params.port }),
      ...(params.keywordType !== undefined && { keyword_type: params.keywordType }),
      ...(params.keywordCaseType !== undefined && {
        keyword_case_type: params.keywordCaseType
      }),
      ...(params.keywordValue !== undefined && { keyword_value: params.keywordValue }),
      ...(params.interval !== undefined && { interval: params.interval }),
      ...(params.timeout !== undefined && { timeout: params.timeout }),
      ...(params.status !== undefined && { status: params.status }),
      ...(params.httpUsername !== undefined && { http_username: params.httpUsername }),
      ...(params.httpPassword !== undefined && { http_password: params.httpPassword }),
      ...(params.httpAuthType !== undefined && { http_auth_type: params.httpAuthType }),
      ...(params.httpMethod !== undefined && { http_method: params.httpMethod }),
      ...(params.postType !== undefined && { post_type: params.postType }),
      ...(params.postValue !== undefined && { post_value: params.postValue }),
      ...(params.postContentType !== undefined && {
        post_content_type: params.postContentType
      }),
      ...(params.alertContacts !== undefined && { alert_contacts: params.alertContacts }),
      ...(params.mwindows !== undefined && { mwindows: params.mwindows }),
      ...(params.customHttpHeaders !== undefined && {
        custom_http_headers: params.customHttpHeaders
      }),
      ...(params.customHttpStatuses !== undefined && {
        custom_http_statuses: params.customHttpStatuses
      }),
      ...(params.ignoreSslErrors !== undefined && {
        ignore_ssl_errors: params.ignoreSslErrors
      }),
      ...(params.disableDomainExpireNotifications !== undefined && {
        disable_domain_expire_notifications: params.disableDomainExpireNotifications
      })
    });

    let ack = this.acknowledgment(data, 'monitor', params.monitorId);
    return { id: readResponse(idSchema, ack.id, 'editMonitor') };
  }

  async deleteMonitor(monitorId: number) {
    positiveId(monitorId, 'monitorId');
    let data = await this.post('/deleteMonitor', { id: monitorId });
    let ack = this.acknowledgment(data, 'monitor', monitorId);
    return { id: readResponse(idSchema, ack.id, 'deleteMonitor') };
  }

  // ==================== Alert Contacts ====================

  async getAlertContacts(
    params: { alertContacts?: string; offset?: number; limit?: number } = {}
  ) {
    if (
      params.alertContacts !== undefined &&
      (!params.alertContacts ||
        params.alertContacts
          .split('-')
          .some(
            value =>
              !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1
          ))
    )
      invalidInput('Resource IDs must be positive integers.');
    validatePage(params.offset, params.limit);
    let data = await this.post('/getAlertContacts', {
      ...(params.alertContacts !== undefined && { alert_contacts: params.alertContacts }),
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit })
    });

    return {
      alertContacts: readResponse(
        z.array(legacyContactSchema),
        data.alert_contacts,
        'getAlertContacts'
      ),
      ...this.pagination(data)
    };
  }

  async newAlertContact(params: { type: number; friendlyName?: string; value: string }) {
    if (params.type === 1)
      invalidInput(
        'SMS alert-contact creation is no longer supported. Use email or webhook notifications.'
      );
    if (!params.value.trim()) invalidInput('The contact value must not be empty.');
    let data = await this.post('/newAlertContact', {
      type: params.type,
      value: params.value,
      ...(params.friendlyName !== undefined && { friendly_name: params.friendlyName })
    });

    let ack = this.acknowledgment(
      { ...data, alert_contact: data.alert_contact ?? data.alertcontact },
      'alert_contact'
    );
    let result = await this.getAlertContacts({ alertContacts: String(ack.id) });
    let contact = result.alertContacts.find(item => item.id === String(ack.id));
    if (!contact)
      throw createApiServiceError(
        `Created alert contact ${ack.id}, but it could not be read back. Check the account before trying another creation.`,
        { reason: 'invalid_response' }
      );
    return contact;
  }

  async deleteAlertContact(contactId: string) {
    if (!/^\d+$/.test(contactId) || Number(contactId) < 1)
      invalidInput('contactId must be a positive numeric contact ID.');
    let data = await this.post('/deleteAlertContact', { id: contactId });
    return this.acknowledgment(
      { ...data, alert_contact: data.alert_contact ?? data.alertcontact },
      'alert_contact',
      contactId
    );
  }

  // ==================== Public Status Pages ====================

  async getPSPs(params: { psps?: string; offset?: number; limit?: number } = {}) {
    if (
      params.psps !== undefined &&
      (!params.psps ||
        params.psps
          .split('-')
          .some(
            value =>
              !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1
          ))
    )
      invalidInput('Resource IDs must be positive integers.');
    validatePage(params.offset, params.limit);
    let data = await this.post('/getPSPs', {
      ...(params.psps && { psps: params.psps }),
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit })
    });

    return {
      statusPages: readResponse(z.array(legacyPageSchema), data.psps, 'getPSPs'),
      pagination: this.pagination(data)
    };
  }

  async newPSP(params: {
    friendlyName: string;
    type: number;
    monitors: string;
    sort?: number;
    customDomain?: string;
    password?: string;
    hideUrlLinks?: number;
    status?: number;
  }) {
    if (params.type === 2 && (!params.monitors || params.monitors === '0'))
      invalidInput('Provide monitorIds, or explicitly set includeAllMonitors to true.');
    let data = await this.post('/newPSP', {
      friendly_name: params.friendlyName,
      type: params.type,
      monitors: params.monitors,
      ...(params.sort !== undefined && { sort: params.sort }),
      ...(params.customDomain !== undefined && { custom_domain: params.customDomain }),
      ...(params.password !== undefined && { password: params.password }),
      ...(params.hideUrlLinks !== undefined && { hide_url_links: params.hideUrlLinks }),
      ...(params.status !== undefined && { status: params.status })
    });

    return readResponse(z.object({ id: idSchema }), data.psp, 'status page');
  }

  async deletePSP(pspId: number) {
    positiveId(pspId);
    let data = await this.post('/deletePSP', { id: pspId });
    let ack = this.acknowledgment(data, 'psp', pspId);
    return { id: readResponse(idSchema, ack.id, 'deletePSP') };
  }

  // ==================== Maintenance Windows ====================

  async getMWindows(params: { mwindows?: string; offset?: number; limit?: number } = {}) {
    if (
      params.mwindows !== undefined &&
      (!params.mwindows ||
        params.mwindows
          .split('-')
          .some(
            value =>
              !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1
          ))
    )
      invalidInput('Resource IDs must be positive integers.');
    validatePage(params.offset, params.limit);
    let data = await this.post('/getMWindows', {
      ...(params.mwindows && { mwindows: params.mwindows }),
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit })
    });

    return {
      maintenanceWindows: readResponse(
        z.array(legacyWindowSchema),
        data.mwindows,
        'getMWindows'
      ),
      pagination: this.pagination(data)
    };
  }

  async newMWindow(params: {
    friendlyName: string;
    type: number;
    startTime: string | number;
    duration: number;
    value: string;
  }) {
    if (!Number.isInteger(params.duration) || params.duration < 1)
      invalidInput('duration must be a positive integer in minutes.');
    if (params.type === 1 && !/^\d+$/.test(String(params.startTime)))
      invalidInput('A one-time startTime must be a Unix timestamp in seconds.');
    if (params.type !== 1 && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(params.startTime)))
      invalidInput('Recurring startTime must use HH:mm.');
    if (
      params.type >= 3 &&
      (!params.value ||
        params.value
          .split('-')
          .some(
            day =>
              !/^\d+$/.test(day) ||
              Number(day) < 1 ||
              Number(day) > (params.type === 3 ? 7 : 28)
          ))
    )
      invalidInput('Provide valid days for the selected recurrence.');
    if (params.type < 3 && params.value)
      invalidInput('days is only valid for weekly or monthly maintenance.');
    let data = await this.post('/newMWindow', {
      friendly_name: params.friendlyName,
      type: params.type,
      start_time: params.startTime,
      duration: params.duration,
      value: params.value
    });

    let ack = readResponse(z.object({ id: idSchema }), data.mwindow, 'newMWindow');
    let result = await this.getMWindows({ mwindows: String(ack.id) });
    let window = result.maintenanceWindows.find(item => item.id === ack.id);
    if (!window)
      throw createApiServiceError(
        `Created maintenance window ${ack.id}, but it could not be read back. Check the account before trying another creation.`,
        { reason: 'invalid_response' }
      );
    return window;
  }

  async deleteMWindow(mwindowId: number) {
    positiveId(mwindowId);
    let data = await this.post('/deleteMWindow', { id: mwindowId });
    let ack = this.acknowledgment(data, 'mwindow', mwindowId);
    return { id: readResponse(idSchema, ack.id, 'deleteMWindow') };
  }

  private async currentRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    params?: Record<string, unknown>
  ) {
    this.requireVersion('v3');
    let response = await this.axios.request<unknown>({
      method,
      url: path,
      data: body,
      params
    });
    this.check(
      response.data,
      response.status,
      response.headers,
      path,
      this.secretStrings(
        body?.httpPassword,
        body?.httpUsername,
        body?.postValueData,
        body?.customHttpHeaders,
        body?.url
      )
    );
    return response.data;
  }
  private nextCursor(nextLink: string | null, path: string): string | null {
    if (nextLink === null) return null;
    let url: URL;
    try {
      url = new URL(nextLink, `https://api.uptimerobot.com/v3${path}`);
    } catch {
      return invalidInput('UptimeRobot returned an invalid pagination link.');
    }
    if (
      url.origin !== 'https://api.uptimerobot.com' ||
      url.pathname !== `/v3${path}` ||
      url.username ||
      url.password
    )
      return invalidInput('UptimeRobot returned an unexpected pagination link.');
    let cursor = url.searchParams.get('cursor');
    if (!cursor || !/^\d+$/.test(cursor))
      return invalidInput('UptimeRobot returned an invalid pagination cursor.');
    return cursor;
  }
  async whoAmI() {
    return readResponse(
      currentUserSchema,
      await this.currentRequest('GET', '/user/me'),
      'user identity'
    );
  }
  async listCurrentMonitors(
    params: {
      limit?: number;
      cursor?: string;
      status?: string;
      name?: string;
      url?: string;
      tags?: string;
      groupId?: number;
    } = {}
  ) {
    if (params.cursor !== undefined && !/^\d+$/.test(params.cursor))
      invalidInput('cursor must be a numeric cursor returned by the previous page.');
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 200)
    )
      invalidInput('limit must be between 1 and 200.');
    let page = readResponse(
      z.object({ data: z.array(currentMonitorSchema), nextLink: z.string().nullable() }),
      await this.currentRequest('GET', '/monitors', undefined, params),
      'monitors'
    );
    return {
      monitors: page.data.map(item => ({
        ...item,
        url:
          String(item.type).toUpperCase() === 'HEARTBEAT' || item.type === 5
            ? null
            : safeMonitorUrl(item.url)
      })),
      nextCursor: this.nextCursor(page.nextLink, '/monitors')
    };
  }
  async getCurrentMonitor(id: number) {
    positiveId(id, 'monitorId');
    let monitor = readResponse(
      currentMonitorSchema,
      await this.currentRequest('GET', `/monitors/${id}`),
      'monitor'
    );
    if (monitor.id !== id) invalidInput('UptimeRobot returned a different monitor ID.');
    return {
      ...monitor,
      url:
        String(monitor.type).toUpperCase() === 'HEARTBEAT' || monitor.type === 5
          ? null
          : safeMonitorUrl(monitor.url)
    };
  }
  async manageCurrentMonitor(
    action: 'create' | 'update' | 'delete' | 'pause' | 'start',
    id?: number,
    body?: Record<string, unknown>
  ) {
    if (action !== 'create') {
      if (id === undefined) invalidInput('monitorId is required for this action.');
      positiveId(id);
    }
    let path =
      action === 'create'
        ? '/monitors'
        : `/monitors/${id}${action === 'pause' || action === 'start' ? `/${action}` : ''}`;
    let data = await this.currentRequest(
      action === 'update' ? 'PATCH' : action === 'delete' ? 'DELETE' : 'POST',
      path,
      body
    );
    if (action === 'delete') return { monitorId: id!, deleted: true };
    let monitor = readResponse(currentMonitorSchema, data, 'monitor mutation');
    if (id !== undefined && id !== monitor.id)
      invalidInput('UptimeRobot acknowledged a different monitor ID.');
    return {
      monitorId: monitor.id,
      deleted: false,
      monitor: {
        ...monitor,
        url:
          String(monitor.type).toUpperCase() === 'HEARTBEAT' || monitor.type === 5
            ? null
            : safeMonitorUrl(monitor.url)
      }
    };
  }
  async listIncidents(
    params: {
      cursor?: string;
      monitor_id?: number;
      monitor_name?: string;
      started_after?: string;
      started_before?: string;
      status?: 'open';
    } = {}
  ) {
    if (params.cursor !== undefined && !/^\d+$/.test(params.cursor))
      invalidInput('cursor must be a numeric cursor returned by the previous page.');
    if (params.monitor_id !== undefined) positiveId(params.monitor_id, 'monitorId');
    for (let value of [params.started_after, params.started_before])
      if (
        value !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))
      )
        invalidInput('Incident dates must be ISO 8601 timestamps.');
    if (
      params.started_after &&
      params.started_before &&
      Date.parse(params.started_after) >= Date.parse(params.started_before)
    )
      invalidInput('startedAfter must be before startedBefore.');
    let page = readResponse(
      z.object({ data: z.array(incidentSchema), nextLink: z.string().nullable() }),
      await this.currentRequest('GET', '/incidents', undefined, params),
      'incidents'
    );
    return { incidents: page.data, nextCursor: this.nextCursor(page.nextLink, '/incidents') };
  }
}
