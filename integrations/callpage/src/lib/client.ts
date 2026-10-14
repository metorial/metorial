import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

type BusinessTime = {
  day: string;
  from: string;
  to: string;
  timezone?: string;
};

type Pagination = { offset: number; limit: number; count: number };

let weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let smsMessageIds: Record<string, string> = {
  post_call_visitor: 'visitor.dial-completed',
  scheduled_call_reminder: 'visitor.call-scheduled',
  post_call_manager: 'manager.call-completed',
  missed_call_notification: 'user.missed-call-complaint'
};
let voiceMessageIds: Record<string, string> = {
  manager_greeting: 'manager.call',
  visitor_greeting: 'visitor.call'
};

let toUnixTimestamp = (value: string) => {
  if (/^-?\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value))) return value;
  let timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw createApiServiceError(
      'Use an ISO 8601 date or Unix timestamp for call history dates.'
    );
  }
  return String(Math.floor(timestamp / 1000));
};

let toBusinessTimes = (times: BusinessTime[]) =>
  times.map(time => ({
    day_of_week: weekdays.indexOf(time.day),
    enabled: true,
    start_time: time.from,
    end_time: time.to,
    ...pickDefined({ timezone: time.timezone })
  }));

let paginationNumber = (value: unknown, fallback: number) => {
  if (typeof value !== 'number' && typeof value !== 'string') return fallback;
  if (typeof value === 'string' && !value.trim()) return fallback;
  let number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

let getPagination = (
  meta: unknown,
  params: { limit?: number; offset?: number },
  count: number
): Pagination => {
  let values = isApiErrorRecord(meta) ? meta : {};
  return {
    count: paginationNumber(values.count, count),
    limit: paginationNumber(values.limit, params.limit ?? 100),
    offset: paginationNumber(values.offset, params.offset ?? 0)
  };
};

export class CallPageClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A CallPage API key is required. Reconnect with a valid key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://core.callpage.io',
      authHeader: { value: config.token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'CallPage',
          reason: 'callpage_api_error',
          detailKeys: ['message', 'errorCode', 'error'],
          extractResponse: (error, helpers) => {
            let response = helpers.getResponse(error);
            if (response?.data !== undefined) return response;
            if (!helpers.isRecord(error) || error.name !== 'SlateError') return response;
            let data = helpers.isRecord(error.data) ? error.data : undefined;
            let baggage = data && helpers.isRecord(data.baggage) ? data.baggage : undefined;
            // The shared HTTP client normalizes errors before this adapter runs.
            return baggage?.response !== undefined
              ? { ...response, data: baggage.response }
              : response;
          },
          extractUpstreamCode: (_error, response) => {
            let data = response?.data;
            return isApiErrorRecord(data) && data.errorCode != null
              ? String(data.errorCode)
              : undefined;
          }
        })
    });
    this.axios.interceptors.response.use(response => {
      let data: unknown = response.data;
      if (isApiErrorRecord(data) && data.hasError === true) {
        let message =
          typeof data.message === 'string' && data.message.trim()
            ? data.message
            : 'The provider rejected the request.';
        throw createApiServiceError(`CallPage API request failed: ${message}`, {
          reason: 'callpage_api_error',
          upstreamStatus: response.status,
          upstreamCode: data.errorCode != null ? String(data.errorCode) : undefined
        });
      }
      return response;
    });
  }

  // =====================
  // CALLS
  // =====================

  async getCallHistory(
    params: {
      widgetIds?: number[];
      statuses?: string[];
      phoneNumber?: string;
      userIds?: number[];
      callIds?: number[];
      tagIds?: number[];
      dateFrom?: string;
      dateTo?: string;
      url?: string;
      incomingNumberIds?: number[];
      displayHidden?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ calls: any[]; meta: { offset: number; limit: number; count: number } }> {
    let query: Record<string, any> = {};

    if (params.widgetIds?.length) query['widget_ids[]'] = params.widgetIds;
    if (params.statuses?.length) query['statuses[]'] = params.statuses;
    if (params.phoneNumber) query.phone_number = params.phoneNumber;
    if (params.userIds?.length) query['user_ids[]'] = params.userIds;
    if (params.callIds?.length) query['call_id[]'] = params.callIds;
    if (params.tagIds?.length) query['tag_ids[]'] = params.tagIds;
    if (params.dateFrom !== undefined) query.date_from = toUnixTimestamp(params.dateFrom);
    if (params.dateTo !== undefined) query.date_to = toUnixTimestamp(params.dateTo);
    if (params.url) query.url = params.url;
    if (params.incomingNumberIds?.length)
      query['incoming_number_ids[]'] = params.incomingNumberIds;
    if (params.displayHidden !== undefined)
      query.display_hidden = params.displayHidden ? 1 : 0;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;

    let response = await this.axios.get('/api/v3/external/calls/history', { params: query });
    return {
      calls: response.data.data || [],
      meta: getPagination(response.data.meta, params, response.data.data?.length ?? 0)
    };
  }

  async getCall(callId: number): Promise<any> {
    let response = await this.axios.get(`/api/v3/external/calls/${callId}`);
    return response.data.data;
  }

  async updateCallField(
    callId: number,
    fieldId: number,
    value: string | number | boolean
  ): Promise<void> {
    await this.axios.patch(`/api/v1/external/calls/${callId}/fields/${fieldId}`, { value });
  }

  // =====================
  // WIDGETS
  // =====================

  async getWidgets(
    params: { limit?: number; offset?: number } = {}
  ): Promise<{ widgets: any[]; meta: any }> {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;

    let response = await this.axios.get('/api/v1/external/widgets/all', { params: query });
    return {
      widgets: response.data.data || [],
      meta: getPagination(response.data.meta, params, response.data.data?.length ?? 0)
    };
  }

  async getWidget(widgetId: number): Promise<any> {
    let response = await this.axios.get('/api/v1/external/widgets/get', {
      params: { widget_id: widgetId }
    });
    return response.data.data;
  }

  async createWidget(data: {
    url: string;
    description?: string;
    localeCode?: string;
  }): Promise<{ widgetId: number }> {
    let body: Record<string, any> = { url: data.url };
    if (data.description) body.description = data.description;
    if (data.localeCode) body.locale_code = data.localeCode;

    let response = await this.axios.post('/api/v1/external/widgets/create', body);
    return { widgetId: response.data.data.id };
  }

  async updateWidget(data: {
    widgetId: number;
    url?: string;
    description?: string;
    localeCode?: string;
    enabled?: boolean;
    settings?: Record<string, any>;
  }): Promise<{ widgetId: number }> {
    let url = data.url;
    if (url === undefined) {
      let widget = await this.getWidget(data.widgetId);
      if (typeof widget?.url !== 'string' || !widget.url) {
        throw createApiServiceError(
          'The widget has no website URL. Provide url when updating it.'
        );
      }
      url = widget.url;
    }
    let body: Record<string, any> = { id: data.widgetId, url };
    if (data.description !== undefined) body.description = data.description;
    if (data.localeCode) body.locale_code = data.localeCode;
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.settings) body.settings = data.settings;

    let response = await this.axios.post('/api/v1/external/widgets/update', body);
    return { widgetId: response.data.data.id };
  }

  async deleteWidget(widgetId: number): Promise<void> {
    await this.axios.post('/api/v1/external/widgets/delete', { id: widgetId });
  }

  async addUsersToWidget(data: {
    widgetId: number;
    userIds: number[];
    businessTimes?: any[];
  }): Promise<Array<{ userId: number; managerId: number }>> {
    if (!data.userIds.length) {
      throw createApiServiceError('Provide at least one user ID to assign to the widget.');
    }
    if (
      data.userIds.length > 1 &&
      data.businessTimes !== undefined &&
      data.businessTimes.length !== data.userIds.length
    ) {
      throw createApiServiceError('Provide one business-hours array for each user ID.');
    }
    let body: Record<string, any> = {
      id: data.widgetId,
      user_id: data.userIds.length === 1 ? data.userIds[0] : data.userIds
    };
    if (data.businessTimes) body.business_times = data.businessTimes;

    let response = await this.axios.post('/api/v1/external/widgets/add-users', body);
    let result = response.data.data || [];
    return result.map((r: any) => ({ userId: r.user_id, managerId: r.manager_id }));
  }

  // =====================
  // CALLS / WIDGET CALLS
  // =====================

  async simpleCall(data: {
    widgetId: number;
    phoneNumber: string;
    departmentId?: number;
  }): Promise<{ callId: number }> {
    let body: Record<string, any> = {
      id: data.widgetId,
      tel: data.phoneNumber
    };
    if (data.departmentId !== undefined) body.department_id = data.departmentId;

    let response = await this.axios.post('/api/v1/external/widgets/call', body);
    return { callId: response.data.data.id };
  }

  async callOrSchedule(data: {
    widgetId: number;
    phoneNumber: string;
    departmentId?: number;
  }): Promise<{ callId: number }> {
    let body: Record<string, any> = {
      id: data.widgetId,
      tel: data.phoneNumber
    };
    if (data.departmentId !== undefined) body.department_id = data.departmentId;

    let response = await this.axios.post('/api/v1/external/widgets/call-or-schedule', body);
    return { callId: response.data.data.id };
  }

  // =====================
  // USERS
  // =====================

  async getUsers(
    params: { limit?: number; offset?: number } = {}
  ): Promise<{ users: any[]; meta: any }> {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;

    let response = await this.axios.get('/api/v1/external/users/all', { params: query });
    return {
      users: response.data.data || [],
      meta: getPagination(response.data.meta, params, response.data.data?.length ?? 0)
    };
  }

  async getUser(params: { userId?: number; email?: string }): Promise<any> {
    if (params.userId === undefined && !params.email?.trim()) {
      throw createApiServiceError('Provide a user ID or email address to retrieve a user.');
    }
    let query = pickDefined({ id: params.userId, email: params.email });

    let response = await this.axios.get('/api/v1/external/users/get', { params: query });
    return response.data.data;
  }

  async createUser(data: {
    name: string;
    phoneNumber: string;
    email?: string;
    role?: string;
  }): Promise<{ userId: number }> {
    let body: Record<string, any> = {
      name: data.name,
      tel: data.phoneNumber
    };
    if (data.email) body.email = data.email;
    if (data.role) body.role = data.role;

    let response = await this.axios.post('/api/v1/external/users/create', body);
    return { userId: response.data.data.id };
  }

  async updateUser(data: {
    userId: number;
    name: string;
    phoneNumber: string;
    email?: string;
    role?: string;
  }): Promise<{ userId: number }> {
    let body: Record<string, any> = {
      id: data.userId,
      name: data.name,
      tel: data.phoneNumber
    };
    if (data.email) body.email = data.email;
    if (data.role) body.role = data.role;

    let response = await this.axios.post('/api/v1/external/users/update', body);
    return { userId: response.data.data.id };
  }

  async deleteUser(userId: number): Promise<void> {
    await this.axios.post('/api/v1/external/users/delete', { id: userId });
  }

  // =====================
  // MANAGERS
  // =====================

  async getManagers(params: {
    widgetId: number;
    limit?: number;
    offset?: number;
  }): Promise<{ managers: any[]; meta: any }> {
    let query: Record<string, any> = { widget_id: params.widgetId };
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;

    let response = await this.axios.get('/api/v1/external/managers/all', { params: query });
    return {
      managers: response.data.data || [],
      meta: getPagination(response.data.meta, params, response.data.data?.length ?? 0)
    };
  }

  async getManager(widgetId: number, userId: number): Promise<any> {
    let response = await this.axios.get('/api/v1/external/managers/get', {
      params: { widget_id: widgetId, user_id: userId }
    });
    return response.data.data;
  }

  async createManager(data: {
    userId: number;
    widgetId: number;
    enabled: boolean;
    businessTimes?: BusinessTime[];
  }): Promise<{ managerId: number }> {
    let body: Record<string, any> = {
      user_id: data.userId,
      widget_id: data.widgetId,
      enabled: data.enabled
    };
    if (data.businessTimes) body.business_times = toBusinessTimes(data.businessTimes);

    let response = await this.axios.post('/api/v1/external/managers/create', body);
    return { managerId: response.data.data.id };
  }

  async updateManager(data: {
    userId: number;
    widgetId: number;
    enabled?: boolean;
    businessTimes?: BusinessTime[];
  }): Promise<{ managerId: number }> {
    let body: Record<string, any> = {
      user_id: data.userId,
      widget_id: data.widgetId
    };
    let enabled = data.enabled;
    if (enabled === undefined) {
      let manager = await this.getManager(data.widgetId, data.userId);
      if (
        manager?.enabled !== true &&
        manager?.enabled !== false &&
        manager?.enabled !== 0 &&
        manager?.enabled !== 1
      ) {
        throw createApiServiceError(
          'The manager enabled state is unavailable. Provide enabled when updating it.'
        );
      }
      enabled = Boolean(manager.enabled);
    }
    body.enabled = enabled;
    if (data.businessTimes) body.business_times = toBusinessTimes(data.businessTimes);

    let response = await this.axios.post('/api/v1/external/managers/update', body);
    return { managerId: response.data.data.id };
  }

  async deleteManager(widgetId: number, userId: number): Promise<void> {
    await this.axios.post('/api/v1/external/managers/delete', {
      widget_id: widgetId,
      user_id: userId
    });
  }

  // =====================
  // SMS
  // =====================

  async getSmsMessages(widgetId: number): Promise<any[]> {
    let response = await this.axios.get('/api/v1/external/sms/all', {
      params: { widget_id: widgetId }
    });
    return response.data.data || [];
  }

  async createSmsMessage(data: {
    widgetId: number;
    messageId: string;
    enabled: boolean;
    text: string;
  }): Promise<{ smsId: number }> {
    if (data.text.length > 240) {
      throw createApiServiceError('SMS text must not exceed 240 characters.');
    }
    let response = await this.axios.post('/api/v1/external/sms/create', {
      widget_id: data.widgetId,
      message_id: smsMessageIds[data.messageId] ?? data.messageId,
      enabled: data.enabled,
      text: data.text
    });
    return { smsId: response.data.data.id };
  }

  async updateSmsMessage(data: {
    widgetId: number;
    messageId: string;
    enabled?: boolean;
    text?: string;
  }): Promise<{ smsId: number }> {
    if (data.text !== undefined && data.text.length > 240) {
      throw createApiServiceError('SMS text must not exceed 240 characters.');
    }
    let body: Record<string, any> = {
      widget_id: data.widgetId,
      message_id: smsMessageIds[data.messageId] ?? data.messageId
    };
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.text !== undefined) body.text = data.text;

    let response = await this.axios.post('/api/v1/external/sms/update', body);
    return { smsId: response.data.data.id };
  }

  async resetSmsMessage(widgetId: number, messageId?: string): Promise<void> {
    let body: Record<string, any> = { widget_id: widgetId };
    if (messageId) body.message_id = smsMessageIds[messageId] ?? messageId;

    await this.axios.post('/api/v1/external/sms/reset', body);
  }

  // =====================
  // VOICE MESSAGES
  // =====================

  async getVoiceMessages(widgetId: number): Promise<any[]> {
    let response = await this.axios.get('/api/v1/external/voice/all', {
      params: { widget_id: widgetId }
    });
    return response.data.data || [];
  }

  async createVoiceMessage(data: {
    widgetId: number;
    messageId: string;
    enabled: boolean;
    fileUrl?: string;
  }): Promise<{ voiceId: number }> {
    let body: Record<string, any> = {
      widget_id: data.widgetId,
      message_id: voiceMessageIds[data.messageId] ?? data.messageId,
      enabled: data.enabled
    };
    if (data.fileUrl !== undefined) body.file = data.fileUrl;

    let response = await this.axios.post('/api/v1/external/voice/create', body);
    return { voiceId: response.data.data.id };
  }

  async updateVoiceMessage(data: {
    widgetId: number;
    messageId: string;
    enabled?: boolean;
    fileUrl?: string;
  }): Promise<{ voiceId: number }> {
    let body: Record<string, any> = {
      widget_id: data.widgetId,
      message_id: voiceMessageIds[data.messageId] ?? data.messageId
    };
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.fileUrl !== undefined) body.file = data.fileUrl;

    let response = await this.axios.post('/api/v1/external/voice/update', body);
    return { voiceId: response.data.data.id };
  }

  async resetVoiceMessage(widgetId: number, messageId?: string): Promise<void> {
    let body: Record<string, any> = { widget_id: widgetId };
    if (messageId) body.message_id = voiceMessageIds[messageId] ?? messageId;

    await this.axios.post('/api/v1/external/voice/reset', body);
  }
}
