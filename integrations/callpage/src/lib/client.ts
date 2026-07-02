import { createAxios } from 'slates';

export class CallPageClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://core.callpage.io',
      headers: {
        Authorization: config.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
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
    if (params.dateFrom) query.date_from = params.dateFrom;
    if (params.dateTo) query.date_to = params.dateTo;
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
      meta: response.data.meta || { offset: 0, limit: 100, count: 0 }
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
      meta: response.data.meta || {}
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
    let body: Record<string, any> = { id: data.widgetId };
    if (data.url) body.url = data.url;
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
    if (data.departmentId) body.department_id = data.departmentId;

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
    if (data.departmentId) body.department_id = data.departmentId;

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
      meta: response.data.meta || {}
    };
  }

  async getUser(params: { userId?: number; email?: string }): Promise<any> {
    let query: Record<string, any> = {};
    if (params.userId) query.id = params.userId;
    if (params.email) query.email = params.email;

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
      meta: response.data.meta || {}
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
    businessTimes?: any[];
  }): Promise<{ managerId: number }> {
    let body: Record<string, any> = {
      user_id: data.userId,
      widget_id: data.widgetId,
      enabled: data.enabled
    };
    if (data.businessTimes) body.business_times = data.businessTimes;

    let response = await this.axios.post('/api/v1/external/managers/create', body);
    return { managerId: response.data.data.id };
  }

  async updateManager(data: {
    userId: number;
    widgetId: number;
    enabled?: boolean;
    businessTimes?: any[];
  }): Promise<{ managerId: number }> {
    let body: Record<string, any> = {
      user_id: data.userId,
      widget_id: data.widgetId
    };
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.businessTimes) body.business_times = data.businessTimes;

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
    let response = await this.axios.post('/api/v1/external/sms/create', {
      widget_id: data.widgetId,
      message_id: data.messageId,
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
    let body: Record<string, any> = {
      widget_id: data.widgetId,
      message_id: data.messageId
    };
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.text) body.text = data.text;

    let response = await this.axios.post('/api/v1/external/sms/update', body);
    return { smsId: response.data.data.id };
  }

  async resetSmsMessage(widgetId: number, messageId?: string): Promise<void> {
    let body: Record<string, any> = { widget_id: widgetId };
    if (messageId) body.message_id = messageId;

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
      message_id: data.messageId,
      enabled: data.enabled
    };
    if (data.fileUrl) body.file = data.fileUrl;

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
      message_id: data.messageId
    };
    if (data.enabled !== undefined) body.enabled = data.enabled;
    if (data.fileUrl) body.file = data.fileUrl;

    let response = await this.axios.post('/api/v1/external/voice/update', body);
    return { voiceId: response.data.data.id };
  }

  async resetVoiceMessage(widgetId: number, messageId?: string): Promise<void> {
    let body: Record<string, any> = { widget_id: widgetId };
    if (messageId) body.message_id = messageId;

    await this.axios.post('/api/v1/external/voice/reset', body);
  }
}
