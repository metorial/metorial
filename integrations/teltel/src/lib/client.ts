import {
  type ApiErrorBuildHelpers,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

let getTelTelErrorMessage = (body: unknown): string | undefined => {
  if (!isApiErrorRecord(body) || !Array.isArray(body.errors)) return undefined;
  let details: string[] = [];
  for (let error of body.errors) {
    if (!isApiErrorRecord(error)) continue;
    if (typeof error.title === 'string' && error.title.trim())
      details.push(error.title.trim());
    let validation =
      isApiErrorRecord(error.detail) && isApiErrorRecord(error.detail.validation)
        ? error.detail.validation
        : undefined;
    for (let [field, values] of Object.entries(validation ?? {})) {
      let messages = (Array.isArray(values) ? values : [values]).filter(
        (value): value is string => typeof value === 'string' && value !== '[truncated]'
      );
      if (messages.length) details.push(`${field}: ${messages.join(', ')}`);
    }
  }
  return details.length ? [...new Set(details)].join('; ') : undefined;
};

let getTelTelErrorCode = (body: unknown): string | undefined => {
  if (!isApiErrorRecord(body) || !Array.isArray(body.errors)) return undefined;
  let error = body.errors.find(
    error => isApiErrorRecord(error) && typeof error.code === 'string'
  );
  return isApiErrorRecord(error) && typeof error.code === 'string' ? error.code : undefined;
};

let getTelTelErrorResponse = (error: unknown, helpers: ApiErrorBuildHelpers) => {
  let response = helpers.getResponse(error);
  let data = isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  let baggage = isApiErrorRecord(data?.baggage) ? data.baggage : undefined;
  return { ...response, data: response?.data ?? baggage?.response };
};

export let buildTelTelApiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'TelTel',
    reason: 'teltel_api_error',
    operation,
    extractResponse: getTelTelErrorResponse,
    extractMessage: (error, helpers) => {
      let details = getTelTelErrorMessage(getTelTelErrorResponse(error, helpers).data);
      let data =
        isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
      let normalizedMessage =
        isApiErrorRecord(error) &&
        error.name === 'SlateError' &&
        typeof data?.message === 'string'
          ? data.message
          : undefined;
      if (details && normalizedMessage) {
        if (normalizedMessage.includes(details)) return normalizedMessage;
        if (details.includes(normalizedMessage)) return details;
        return `${normalizedMessage}; ${details}`;
      }
      return details ?? normalizedMessage ?? helpers.extractMessage(error);
    },
    extractUpstreamCode: (error, response) => {
      let data =
        isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
      let upstream = isApiErrorRecord(data?.upstream) ? data.upstream : undefined;
      return (
        getTelTelErrorCode(response?.data) ??
        (typeof upstream?.code === 'string' ? upstream.code : undefined)
      );
    }
  });

type CampaignContact = {
  phone: string;
  name?: string;
  param1?: string;
  param2?: string;
  param3?: string;
  param4?: string;
  param5?: string;
};

export class TelTelClient {
  private axios;

  constructor(token: string) {
    if (!token) throw createApiServiceError('A TelTel API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.teltel.io/v2',
      authHeader: { name: 'X-API-KEY', value: token },
      timeout: 30000,
      errorMapping: {
        mapAxiosError: (error, inferred) => ({
          message: getTelTelErrorMessage(error.response?.data) ?? inferred.message,
          upstream: {
            ...inferred.upstream,
            code: getTelTelErrorCode(error.response?.data) ?? inferred.upstream?.code
          }
        })
      }
    });
  }

  private request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<any> {
    return requestAxiosData(
      `${method} ${url}`,
      () => this.axios.request({ method, url, data, params }),
      buildTelTelApiError
    );
  }

  async listUsers(): Promise<any[]> {
    let result = await this.request('GET', '/users');
    let users = Array.isArray(result) ? result : result?.data;
    if (!Array.isArray(users)) {
      throw createApiServiceError('TelTel returned an invalid users response.');
    }
    return users;
  }

  getUserCallerIdGroups(userId: string): Promise<any> {
    return this.request('GET', `/users/${encodeURIComponent(userId)}/cidgroups`);
  }

  getAccountBalance(): Promise<any> {
    return this.request('GET', '/account/balance');
  }

  getCampaignStats(campaignId: string): Promise<any> {
    return this.request('GET', `/autodialers/${encodeURIComponent(campaignId)}/livestats`);
  }

  initiateCallback(params: {
    called: string;
    calling: string;
    callerId?: string;
    callerIdB?: string;
  }): Promise<any> {
    return this.request('POST', '/calls', {
      data: pickDefined({
        caller_number: params.called,
        destination_number: params.calling,
        destination_displayname: params.callerId ?? params.calling,
        caller_displayname: params.callerIdB
      })
    });
  }

  sendSms(params: { to: string; text: string; from?: string }): Promise<any> {
    if (!params.from) {
      throw createApiServiceError('Provide senderId when sending an SMS message.');
    }
    return this.request('POST', '/sms/text', {
      data: { to: params.to, message: params.text, from: params.from }
    });
  }

  sendBulkSms(params: { to: string[]; text: string; from?: string }): Promise<any> {
    if (!params.from) {
      throw createApiServiceError('Provide senderId when sending SMS messages.');
    }
    if (!params.to.length || params.to.length > 1000) {
      throw createApiServiceError('Provide between 1 and 1000 SMS recipients per request.');
    }
    return this.request('POST', '/sms/bulk/text', {
      data: params.to.map(to => ({ to, message: params.text, from: params.from }))
    });
  }

  listSms(params?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    direction?: 'outbound' | 'inbound';
  }): Promise<any> {
    let filters: string[] = [];
    let dateField = params?.direction === 'inbound' ? 'received_at' : 'created_at';
    if (params?.dateFrom) filters.push(`${dateField}>${params.dateFrom}`);
    if (params?.dateTo) filters.push(`${dateField}<${params.dateTo}`);
    return this.request(
      'GET',
      params?.direction === 'inbound' ? '/sms/inbox/reports' : '/sms/reports',
      undefined,
      pickDefined({
        limit: params?.limit,
        offset: params?.offset,
        filter: filters.join(',') || undefined,
        sort: `-${dateField}`
      })
    );
  }

  hlrLookup(phoneNumber: string): Promise<any> {
    return this.request('GET', `/numbers/lookup/${encodeURIComponent(phoneNumber)}`);
  }

  async listCalls(params?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    userId?: string;
  }): Promise<any> {
    let filters: string[] = [];
    if (params?.dateFrom) filters.push(`starttime>${params.dateFrom}`);
    if (params?.dateTo) filters.push(`starttime<${params.dateTo}`);
    let result = await this.request(
      'GET',
      '/calls',
      undefined,
      pickDefined({
        limit: params?.limit,
        offset: params?.offset,
        filter: filters.join(',') || undefined
      })
    );
    if (params?.userId) {
      let calls = Array.isArray(result) ? result : result?.data;
      if (!Array.isArray(calls)) {
        throw createApiServiceError('TelTel returned an invalid calls response.');
      }
      let userId = params.userId;
      let filtered = calls.filter(
        call =>
          String(call?.caller?.user_id) === userId || String(call?.callee?.user_id) === userId
      );
      return Array.isArray(result) ? filtered : { ...result, data: filtered };
    }
    return result;
  }

  listCampaigns(params?: { fields?: string }): Promise<any> {
    return this.request('GET', '/autodialers', undefined, { fields: params?.fields });
  }

  getCampaign(campaignId: string): Promise<any> {
    return this.request('GET', `/autodialers/${encodeURIComponent(campaignId)}`);
  }

  createCampaign(data: {
    name: string;
    campaignType?: string;
    callflowId?: string;
    callerIdGroupId?: string;
    callerIds?: string[];
    settings?: Record<string, any>;
  }): Promise<any> {
    let body = pickDefined({
      ...data.settings,
      name: data.name,
      campaign_type: data.campaignType ?? data.settings?.campaign_type,
      caller_id: data.callerIds ?? data.settings?.caller_id,
      callflow_id: data.callflowId ?? data.settings?.callflow_id,
      callerid_group_id: data.callerIdGroupId ?? data.settings?.callerid_group_id
    });
    if (!body.campaign_type || !Array.isArray(body.caller_id) || !body.caller_id.length) {
      throw createApiServiceError(
        'Provide campaignType and callerIds when creating a campaign, or set campaign_type and caller_id in settings.'
      );
    }
    return this.request('POST', '/autodialers', { data: body });
  }

  updateCampaign(
    campaignId: string,
    data: {
      name?: string;
      status?: string;
      callerIds?: string[];
      settings?: Record<string, any>;
    }
  ): Promise<any> {
    let body = pickDefined({
      ...data.settings,
      name: data.name ?? data.settings?.name,
      status: data.status ?? data.settings?.status,
      caller_id: data.callerIds ?? data.settings?.caller_id
    });
    return this.request('PATCH', `/autodialers/${encodeURIComponent(campaignId)}`, body);
  }

  deleteCampaign(campaignId: string): Promise<any> {
    return this.request('DELETE', `/autodialers/${encodeURIComponent(campaignId)}`);
  }

  async listCampaignContacts(
    campaignId: string,
    params?: { limit?: number; offset?: number; status?: string }
  ): Promise<any> {
    let result = await this.request(
      'GET',
      `/autodialers/${encodeURIComponent(campaignId)}/contacts`,
      undefined,
      pickDefined({
        limit: params?.limit,
        offset: params?.offset
      })
    );
    if (params?.status) {
      let contacts = Array.isArray(result) ? result : result?.data;
      if (!Array.isArray(contacts)) {
        throw createApiServiceError('TelTel returned an invalid campaign contacts response.');
      }
      let status = params.status;
      let filtered = contacts.filter(
        contact => contact?.status_leg_1 === status || contact?.status_leg_2 === status
      );
      return Array.isArray(result) ? filtered : { ...result, data: filtered };
    }
    return result;
  }

  addCampaignContact(campaignId: string, data: CampaignContact): Promise<any> {
    return this.addCampaignContactsBulk(campaignId, [data]);
  }

  addCampaignContactsBulk(campaignId: string, contacts: CampaignContact[]): Promise<any> {
    return this.request('POST', `/autodialers/${encodeURIComponent(campaignId)}/contacts`, {
      data: contacts.map(contact =>
        pickDefined({
          phone_number: contact.phone,
          name: contact.name,
          custom_field_1: contact.param1,
          custom_field_2: contact.param2,
          custom_field_3: contact.param3,
          custom_field_4: contact.param4,
          custom_field_5: contact.param5
        })
      )
    });
  }

  deleteCampaignContact(campaignId: string, contactId: string): Promise<any> {
    return this.request(
      'DELETE',
      `/autodialers/${encodeURIComponent(campaignId)}/contacts/${encodeURIComponent(contactId)}`
    );
  }
}
