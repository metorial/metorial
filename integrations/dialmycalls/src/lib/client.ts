import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import type {
  AccessAccount,
  Account,
  CallerId,
  CallRecipient,
  Callservice,
  Contact,
  CreateAccessAccountParams,
  CreateCallerIdParams,
  CreateCallParams,
  CreateContactParams,
  CreateGroupParams,
  CreateRecordingByPhoneParams,
  CreateRecordingByUrlParams,
  CreateRecordingTtsParams,
  CreateTextParams,
  DoNotContact,
  Group,
  IncomingText,
  Keyword,
  Recording,
  Shortcode,
  TextRecipient,
  TextService,
  UpdateAccessAccountParams,
  UpdateContactParams,
  UpdateGroupParams,
  UpdateVanityNumberParams,
  VanityNumber
} from './types';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A DialMyCalls API key is required. Reconnect your account.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.dialmycalls.com/2.0',
      timeout: 30000,
      authHeader: { name: 'X-Auth-ApiKey', value: config.token },
      headers: {
        Accept: 'application/json'
      },
      errorMapping: {
        extractResponseData: response =>
          isApiErrorRecord(response.data)
            ? (response.data.results ?? response.data)
            : response.data
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'DialMyCalls',
          reason: 'dialmycalls_api_error'
        })
    });

    this.axios.interceptors.response.use(response => {
      let data = response.data;
      if (isApiErrorRecord(data)) {
        let meta = isApiErrorRecord(data.meta) ? data.meta : undefined;
        if (
          meta?.result === 'failure' ||
          (typeof meta?.status === 'number' && meta.status >= 400)
        ) {
          throw buildApiServiceError(
            { response: { status: meta.status, data: data.results } },
            {
              providerLabel: 'DialMyCalls',
              reason: 'dialmycalls_api_error',
              nestedKeys: ['error', 'errors']
            }
          );
        }

        if ('results' in data) response.data = data.results;
      }
      return response;
    });
  }

  private rangeHeaders(range?: string): Record<string, string> {
    if (range === undefined) return {};
    let match = /^records=(\d+)-(\d+)$/.exec(range);
    let first = Number(match?.[1]);
    let last = Number(match?.[2]);
    if (
      !match ||
      !Number.isSafeInteger(first) ||
      !Number.isSafeInteger(last) ||
      first < 1 ||
      last < first ||
      last - first >= 100
    ) {
      throw createApiServiceError(
        'Range must use records=1-100 format with positive positions and at most 100 records.'
      );
    }
    return { Range: range };
  }

  // --- Contacts ---

  async listContacts(range?: string): Promise<Contact[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/contacts', { headers });
    return res.data?.contacts ?? res.data ?? [];
  }

  async listContactsByGroup(groupId: string, range?: string): Promise<Contact[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get(`/contacts/${encodeURIComponent(groupId)}`, { headers });
    return res.data?.contacts ?? res.data ?? [];
  }

  async getContact(contactId: string): Promise<Contact> {
    let res = await this.axios.get(`/contact/${encodeURIComponent(contactId)}`);
    return res.data?.contact ?? res.data;
  }

  async createContact(params: CreateContactParams): Promise<Contact> {
    let res = await this.axios.post('/contact', params);
    return res.data?.contact ?? res.data;
  }

  async updateContact(contactId: string, params: UpdateContactParams): Promise<Contact> {
    let phone = params.phone ?? (await this.getContact(contactId)).phone;
    if (!phone) {
      throw createApiServiceError(
        'The contact has no phone number. Provide phone to update it.'
      );
    }
    let res = await this.axios.put(`/contact/${encodeURIComponent(contactId)}`, {
      ...params,
      phone
    });
    return res.data?.contact ?? res.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/contact/${encodeURIComponent(contactId)}`);
  }

  // --- Groups ---

  async listGroups(range?: string): Promise<Group[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/groups', { headers });
    return res.data?.groups ?? res.data ?? [];
  }

  async getGroup(groupId: string): Promise<Group> {
    let res = await this.axios.get(`/group/${encodeURIComponent(groupId)}`);
    return res.data?.group ?? res.data;
  }

  async createGroup(params: CreateGroupParams): Promise<Group> {
    let res = await this.axios.post('/group', params);
    return res.data?.group ?? res.data;
  }

  async updateGroup(groupId: string, params: UpdateGroupParams): Promise<Group> {
    let res = await this.axios.put(`/group/${encodeURIComponent(groupId)}`, params);
    return res.data?.group ?? res.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.axios.delete(`/group/${encodeURIComponent(groupId)}`);
  }

  // --- Voice Broadcasts (Call Service) ---

  async listCalls(range?: string): Promise<Callservice[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/service/calls', { headers });
    return res.data?.callservices ?? res.data?.calls ?? res.data ?? [];
  }

  async getCall(callId: string): Promise<Callservice> {
    let res = await this.axios.get(`/service/call/${encodeURIComponent(callId)}`);
    return res.data?.callservice ?? res.data;
  }

  async createCall(params: CreateCallParams): Promise<Callservice> {
    let res = await this.axios.post('/service/call', params);
    return res.data?.callservice ?? res.data;
  }

  async cancelCall(callId: string): Promise<void> {
    await this.axios.delete(`/service/call/${encodeURIComponent(callId)}`);
  }

  async getCallRecipients(callId: string, range?: string): Promise<CallRecipient[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get(`/service/call/${encodeURIComponent(callId)}/recipients`, {
      headers
    });
    return res.data?.recipients ?? res.data ?? [];
  }

  // --- Text Broadcasts (Text Service) ---

  async listTexts(range?: string): Promise<TextService[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/service/texts', { headers });
    return res.data?.services ?? res.data?.texts ?? res.data ?? [];
  }

  async getText(textId: string): Promise<TextService> {
    let res = await this.axios.get(`/service/text/${encodeURIComponent(textId)}`);
    return res.data?.service ?? res.data;
  }

  async createText(params: CreateTextParams): Promise<TextService> {
    let res = await this.axios.post('/service/text', params);
    return res.data?.service ?? res.data;
  }

  async cancelText(textId: string): Promise<void> {
    await this.axios.delete(`/service/text/${encodeURIComponent(textId)}`);
  }

  async getTextRecipients(textId: string, range?: string): Promise<TextRecipient[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get(`/service/text/${encodeURIComponent(textId)}/recipients`, {
      headers
    });
    return res.data?.recipients ?? res.data ?? [];
  }

  // --- Incoming Texts ---

  async listIncomingTexts(range?: string): Promise<IncomingText[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/incoming/texts', { headers });
    return res.data?.incoming_texts ?? res.data?.texts ?? res.data ?? [];
  }

  async getIncomingText(textId: string): Promise<IncomingText> {
    let res = await this.axios.get(`/incoming/text/${encodeURIComponent(textId)}`);
    return res.data?.incoming_text ?? res.data;
  }

  async deleteIncomingText(textId: string): Promise<void> {
    await this.axios.delete(`/incoming/text/${encodeURIComponent(textId)}`);
  }

  // --- Recordings ---

  async listRecordings(range?: string): Promise<Recording[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/recordings', { headers });
    return res.data?.recordings ?? res.data ?? [];
  }

  async getRecording(recordingId: string): Promise<Recording> {
    let res = await this.axios.get(`/recording/${encodeURIComponent(recordingId)}`);
    return res.data?.recording ?? res.data;
  }

  async createRecordingTts(params: CreateRecordingTtsParams): Promise<Recording> {
    let res = await this.axios.post('/recording/tts', params);
    return res.data?.recording ?? res.data;
  }

  async createRecordingByUrl(params: CreateRecordingByUrlParams): Promise<Recording> {
    let res = await this.axios.post('/recording/url', params);
    return res.data?.recording ?? res.data;
  }

  async createRecordingByPhone(params: CreateRecordingByPhoneParams): Promise<Recording> {
    let res = await this.axios.post('/recording/phone', params);
    return res.data?.recording ?? res.data;
  }

  async updateRecording(recordingId: string, params: { name: string }): Promise<Recording> {
    let res = await this.axios.put(`/recording/${encodeURIComponent(recordingId)}`, params);
    return res.data?.recording ?? res.data;
  }

  async deleteRecording(recordingId: string): Promise<void> {
    await this.axios.delete(`/recording/${encodeURIComponent(recordingId)}`);
  }

  // --- Caller IDs ---

  async listCallerIds(range?: string): Promise<CallerId[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/callerids', { headers });
    return res.data?.callerids ?? res.data ?? [];
  }

  async getCallerId(callerIdId: string): Promise<CallerId> {
    let res = await this.axios.get(`/callerid/${encodeURIComponent(callerIdId)}`);
    return res.data?.callerid ?? res.data;
  }

  async createCallerId(params: CreateCallerIdParams): Promise<CallerId> {
    let res = await this.axios.post('/callerid', params);
    return res.data?.callerid ?? res.data;
  }

  async createUnverifiedCallerId(params: CreateCallerIdParams): Promise<CallerId> {
    let res = await this.axios.post('/verify/callerid', params);
    return res.data?.callerid ?? res.data;
  }

  async verifyCallerId(callerIdId: string, pin: string): Promise<CallerId> {
    let res = await this.axios.put(`/verify/callerid/${encodeURIComponent(callerIdId)}`, {
      pin
    });
    return res.data?.callerid ?? res.data;
  }

  async updateCallerId(callerIdId: string, params: { name: string }): Promise<CallerId> {
    let res = await this.axios.put(`/callerid/${encodeURIComponent(callerIdId)}`, params);
    return res.data?.callerid ?? res.data;
  }

  async deleteCallerId(callerIdId: string): Promise<void> {
    await this.axios.delete(`/callerid/${encodeURIComponent(callerIdId)}`);
  }

  // --- Keywords ---

  async listKeywords(range?: string): Promise<Keyword[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/keywords', { headers });
    return res.data?.keywords ?? res.data ?? [];
  }

  async getKeyword(keywordId: string): Promise<Keyword> {
    let res = await this.axios.get(`/keyword/${encodeURIComponent(keywordId)}`);
    return res.data?.keyword ?? res.data;
  }

  async deleteKeyword(keywordId: string): Promise<void> {
    await this.axios.delete(`/keyword/${encodeURIComponent(keywordId)}`);
  }

  // --- Vanity Numbers ---

  async listVanityNumbers(range?: string): Promise<VanityNumber[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/vanitynumbers', { headers });
    return res.data?.vanitynumbers ?? res.data ?? [];
  }

  async getVanityNumber(vanityNumberId: string): Promise<VanityNumber> {
    let res = await this.axios.get(`/vanitynumber/${encodeURIComponent(vanityNumberId)}`);
    return res.data?.vanitynumber ?? res.data;
  }

  async updateVanityNumber(
    vanityNumberId: string,
    params: UpdateVanityNumberParams
  ): Promise<VanityNumber> {
    let res = await this.axios.put(
      `/vanitynumber/${encodeURIComponent(vanityNumberId)}`,
      params
    );
    return res.data?.vanitynumber ?? res.data;
  }

  async deleteVanityNumber(vanityNumberId: string): Promise<void> {
    await this.axios.delete(`/vanitynumber/${encodeURIComponent(vanityNumberId)}`);
  }

  // --- Do Not Contact ---

  async listDoNotContacts(range?: string): Promise<DoNotContact[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/donotcontacts', { headers });
    return res.data?.donotcontacts ?? res.data ?? [];
  }

  // --- Access Accounts ---

  async listAccessAccounts(range?: string): Promise<AccessAccount[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/accessaccounts', { headers });
    return res.data?.accessaccounts ?? res.data ?? [];
  }

  async getAccessAccount(accountId: string): Promise<AccessAccount> {
    let res = await this.axios.get(`/accessaccount/${encodeURIComponent(accountId)}`);
    return res.data?.accessaccount ?? res.data;
  }

  async createAccessAccount(params: CreateAccessAccountParams): Promise<AccessAccount> {
    let res = await this.axios.post('/accessaccount', params);
    return res.data?.accessaccount ?? res.data;
  }

  async updateAccessAccount(
    accountId: string,
    params: UpdateAccessAccountParams
  ): Promise<AccessAccount> {
    let res = await this.axios.put(`/accessaccount/${encodeURIComponent(accountId)}`, params);
    return res.data?.accessaccount ?? res.data;
  }

  async deleteAccessAccount(accountId: string): Promise<void> {
    await this.axios.delete(`/accessaccount/${encodeURIComponent(accountId)}`);
  }

  // --- Account ---

  async getAccount(): Promise<Account> {
    let res = await this.axios.get('/account');
    return res.data?.account ?? res.data;
  }

  // --- Shortcodes ---

  async listShortcodes(range?: string): Promise<Shortcode[]> {
    let headers = this.rangeHeaders(range);
    let res = await this.axios.get('/shortcodes', { headers });
    return res.data?.shortcodes ?? res.data ?? [];
  }
}
