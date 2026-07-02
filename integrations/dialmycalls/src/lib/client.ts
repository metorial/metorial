import { createAxios } from 'slates';
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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.dialmycalls.com/2.0',
      headers: {
        'X-Auth-ApiKey': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // --- Contacts ---

  async listContacts(range?: string): Promise<Contact[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/contacts', { headers });
    return res.data?.contacts ?? [];
  }

  async listContactsByGroup(groupId: string, range?: string): Promise<Contact[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get(`/contacts/${groupId}`, { headers });
    return res.data?.contacts ?? [];
  }

  async getContact(contactId: string): Promise<Contact> {
    let res = await this.axios.get(`/contact/${contactId}`);
    return res.data?.contact ?? res.data;
  }

  async createContact(params: CreateContactParams): Promise<Contact> {
    let res = await this.axios.post('/contact', params);
    return res.data?.contact ?? res.data;
  }

  async updateContact(contactId: string, params: UpdateContactParams): Promise<Contact> {
    let res = await this.axios.put(`/contact/${contactId}`, params);
    return res.data?.contact ?? res.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/contact/${contactId}`);
  }

  // --- Groups ---

  async listGroups(range?: string): Promise<Group[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/groups', { headers });
    return res.data?.groups ?? [];
  }

  async getGroup(groupId: string): Promise<Group> {
    let res = await this.axios.get(`/group/${groupId}`);
    return res.data?.group ?? res.data;
  }

  async createGroup(params: CreateGroupParams): Promise<Group> {
    let res = await this.axios.post('/group', params);
    return res.data?.group ?? res.data;
  }

  async updateGroup(groupId: string, params: UpdateGroupParams): Promise<Group> {
    let res = await this.axios.put(`/group/${groupId}`, params);
    return res.data?.group ?? res.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.axios.delete(`/group/${groupId}`);
  }

  // --- Voice Broadcasts (Call Service) ---

  async listCalls(range?: string): Promise<Callservice[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/service/calls', { headers });
    return res.data?.callservices ?? res.data?.calls ?? [];
  }

  async getCall(callId: string): Promise<Callservice> {
    let res = await this.axios.get(`/service/call/${callId}`);
    return res.data?.callservice ?? res.data;
  }

  async createCall(params: CreateCallParams): Promise<Callservice> {
    let res = await this.axios.post('/service/call', params);
    return res.data?.callservice ?? res.data;
  }

  async cancelCall(callId: string): Promise<void> {
    await this.axios.delete(`/service/call/${callId}`);
  }

  async getCallRecipients(callId: string, range?: string): Promise<CallRecipient[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get(`/service/call/${callId}/recipients`, { headers });
    return res.data?.recipients ?? [];
  }

  // --- Text Broadcasts (Text Service) ---

  async listTexts(range?: string): Promise<TextService[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/service/texts', { headers });
    return res.data?.services ?? res.data?.texts ?? [];
  }

  async getText(textId: string): Promise<TextService> {
    let res = await this.axios.get(`/service/text/${textId}`);
    return res.data?.service ?? res.data;
  }

  async createText(params: CreateTextParams): Promise<TextService> {
    let res = await this.axios.post('/service/text', params);
    return res.data?.service ?? res.data;
  }

  async cancelText(textId: string): Promise<void> {
    await this.axios.delete(`/service/text/${textId}`);
  }

  async getTextRecipients(textId: string, range?: string): Promise<TextRecipient[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get(`/service/text/${textId}/recipients`, { headers });
    return res.data?.recipients ?? [];
  }

  // --- Incoming Texts ---

  async listIncomingTexts(range?: string): Promise<IncomingText[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/incoming/texts', { headers });
    return res.data?.incoming_texts ?? res.data?.texts ?? [];
  }

  async getIncomingText(textId: string): Promise<IncomingText> {
    let res = await this.axios.get(`/incoming/text/${textId}`);
    return res.data?.incoming_text ?? res.data;
  }

  async deleteIncomingText(textId: string): Promise<void> {
    await this.axios.delete(`/incoming/text/${textId}`);
  }

  // --- Recordings ---

  async listRecordings(range?: string): Promise<Recording[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/recordings', { headers });
    return res.data?.recordings ?? [];
  }

  async getRecording(recordingId: string): Promise<Recording> {
    let res = await this.axios.get(`/recording/${recordingId}`);
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
    let res = await this.axios.put(`/recording/${recordingId}`, params);
    return res.data?.recording ?? res.data;
  }

  async deleteRecording(recordingId: string): Promise<void> {
    await this.axios.delete(`/recording/${recordingId}`);
  }

  // --- Caller IDs ---

  async listCallerIds(range?: string): Promise<CallerId[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/callerids', { headers });
    return res.data?.callerids ?? [];
  }

  async getCallerId(callerIdId: string): Promise<CallerId> {
    let res = await this.axios.get(`/callerid/${callerIdId}`);
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
    let res = await this.axios.put(`/verify/callerid/${callerIdId}`, { pin });
    return res.data?.callerid ?? res.data;
  }

  async updateCallerId(callerIdId: string, params: { name: string }): Promise<CallerId> {
    let res = await this.axios.put(`/callerid/${callerIdId}`, params);
    return res.data?.callerid ?? res.data;
  }

  async deleteCallerId(callerIdId: string): Promise<void> {
    await this.axios.delete(`/callerid/${callerIdId}`);
  }

  // --- Keywords ---

  async listKeywords(range?: string): Promise<Keyword[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/keywords', { headers });
    return res.data?.keywords ?? [];
  }

  async getKeyword(keywordId: string): Promise<Keyword> {
    let res = await this.axios.get(`/keyword/${keywordId}`);
    return res.data?.keyword ?? res.data;
  }

  async deleteKeyword(keywordId: string): Promise<void> {
    await this.axios.delete(`/keyword/${keywordId}`);
  }

  // --- Vanity Numbers ---

  async listVanityNumbers(range?: string): Promise<VanityNumber[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/vanitynumbers', { headers });
    return res.data?.vanitynumbers ?? [];
  }

  async getVanityNumber(vanityNumberId: string): Promise<VanityNumber> {
    let res = await this.axios.get(`/vanitynumber/${vanityNumberId}`);
    return res.data?.vanitynumber ?? res.data;
  }

  async updateVanityNumber(
    vanityNumberId: string,
    params: UpdateVanityNumberParams
  ): Promise<VanityNumber> {
    let res = await this.axios.put(`/vanitynumber/${vanityNumberId}`, params);
    return res.data?.vanitynumber ?? res.data;
  }

  async deleteVanityNumber(vanityNumberId: string): Promise<void> {
    await this.axios.delete(`/vanitynumber/${vanityNumberId}`);
  }

  // --- Do Not Contact ---

  async listDoNotContacts(range?: string): Promise<DoNotContact[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/donotcontacts', { headers });
    return res.data?.donotcontacts ?? [];
  }

  // --- Access Accounts ---

  async listAccessAccounts(range?: string): Promise<AccessAccount[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/accessaccounts', { headers });
    return res.data?.accessaccounts ?? [];
  }

  async getAccessAccount(accountId: string): Promise<AccessAccount> {
    let res = await this.axios.get(`/accessaccount/${accountId}`);
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
    let res = await this.axios.put(`/accessaccount/${accountId}`, params);
    return res.data?.accessaccount ?? res.data;
  }

  async deleteAccessAccount(accountId: string): Promise<void> {
    await this.axios.delete(`/accessaccount/${accountId}`);
  }

  // --- Account ---

  async getAccount(): Promise<Account> {
    let res = await this.axios.get('/account');
    return res.data?.account ?? res.data;
  }

  // --- Shortcodes ---

  async listShortcodes(range?: string): Promise<Shortcode[]> {
    let headers: Record<string, string> = {};
    if (range) headers.Range = range;
    let res = await this.axios.get('/shortcodes', { headers });
    return res.data?.shortcodes ?? [];
  }
}
