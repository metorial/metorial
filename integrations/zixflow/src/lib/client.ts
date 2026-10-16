import { createAuthenticatedAxios, isApiErrorRecord } from 'slates';
import { zixflowError } from './error';
import { requireInput, validatePage } from './response';

export class ZixflowClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    requireInput(config.token, 'API key');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.zixflow.com/api/v1',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: zixflowError
    });
    this.axios.interceptors.response.use(response => {
      let body = response.data;
      if (!isApiErrorRecord(body) || (body.status !== true && body.status !== 'success')) {
        throw zixflowError({ response: { status: response.status, data: body } });
      }
      return response;
    });
  }

  // ── WhatsApp ──────────────────────────────────────────────

  async sendWhatsAppTemplate(params: {
    to: string;
    phoneId: string;
    templateName: string;
    language: string;
    variables?: Record<string, any>;
    source?: string;
    linkWithRecord?: boolean;
    reportUrl?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      to: params.to,
      phoneId: params.phoneId,
      templateName: params.templateName,
      language: params.language,
      variables: params.variables ?? {},
      submissionStatus: true
    };
    if (params.source) body.source = params.source;
    if (params.linkWithRecord !== undefined) body.linkWithRecord = params.linkWithRecord;
    if (params.reportUrl) body.reportURL = params.reportUrl;

    let response = await this.axios.post('/campaign/whatsapp/send', body);
    return response.data;
  }

  async sendWhatsAppDirectMessage(params: {
    to: string;
    phoneId: string;
    type: string;
    content: Record<string, any>;
    source?: string;
    linkWithRecord?: boolean;
    reportUrl?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      to: params.to,
      phoneId: params.phoneId,
      type: params.type,
      ...params.content,
      submissionStatus: true
    };
    if (params.source) body.source = params.source;
    if (params.linkWithRecord !== undefined) body.linkWithRecord = params.linkWithRecord;
    if (params.reportUrl) body.reportURL = params.reportUrl;

    let response = await this.axios.post('/campaign/whatsapp/message/send', body);
    return response.data;
  }

  async getWhatsAppAccounts(): Promise<any> {
    let response = await this.axios.get('/campaign/whatsapp/accounts');
    return response.data;
  }

  async getWhatsAppTemplates(
    phoneId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<any> {
    validatePage(limit, offset);
    let response = await this.axios.get(
      `/campaign/whatsapp/templates/${encodeURIComponent(phoneId)}`,
      {
        params: { limit, offset }
      }
    );
    return response.data;
  }

  async getWhatsAppTemplateVariables(
    phoneId: string,
    templateName: string,
    language: string
  ): Promise<any> {
    let response = await this.axios.get('/campaign/whatsapp/variable-keys', {
      params: { phoneId, templateName, language }
    });
    return response.data;
  }

  // ── SMS ───────────────────────────────────────────────────

  async sendSms(params: {
    senderId: string;
    route: string;
    number: string;
    message: string;
    isFlash?: boolean;
    dltTemplateId?: string;
    dltEntityId?: string;
    reportUrl?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      senderId: params.senderId,
      route: params.route,
      number: params.number,
      message: params.message,
      submissionStatus: true
    };
    if (params.isFlash !== undefined) body.isFlash = params.isFlash;
    if (params.dltTemplateId) body.dltTemplateId = params.dltTemplateId;
    if (params.dltEntityId) body.dltEntityId = params.dltEntityId;
    if (params.reportUrl) body.reportURL = params.reportUrl;

    let response = await this.axios.post('/campaign/sms/send', body);
    return response.data;
  }

  // ── RCS ───────────────────────────────────────────────────

  async sendRcsTemplate(params: {
    to: string;
    botId: string;
    templateName: string;
    variables?: Record<string, any>;
    source?: string;
    linkWithRecord?: boolean;
    reportUrl?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      to: params.to,
      botId: params.botId,
      templateName: params.templateName,
      variables: params.variables ?? {},
      submissionStatus: true
    };
    if (params.source) body.source = params.source;
    if (params.linkWithRecord !== undefined) body.linkWithRecord = params.linkWithRecord;
    if (params.reportUrl) body.reportURL = params.reportUrl;

    let response = await this.axios.post('/campaign/rcs/message/template', body);
    return response.data;
  }

  async sendRcsDirectMessage(params: {
    to: string;
    botId: string;
    type: string;
    content: Record<string, any>;
    suggestions?: Record<string, any>[];
    source?: string;
    linkWithRecord?: boolean;
    reportUrl?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      to: params.to,
      botId: params.botId,
      suggestions: params.suggestions ?? [],
      ...params.content,
      submissionStatus: true
    };
    if (params.source) body.source = params.source;
    if (params.linkWithRecord !== undefined) body.linkWithRecord = params.linkWithRecord;
    if (params.reportUrl) body.reportURL = params.reportUrl;

    let response = await this.axios.post(`/campaign/rcs/message/${params.type}`, body);
    return response.data;
  }

  // ── Email ─────────────────────────────────────────────────

  async sendEmail(params: {
    to: string[];
    subject: string;
    from: string;
    fromName: string;
    bodyHtml?: string;
    bodyText?: string;
    trackClicks?: boolean;
    trackOpens?: boolean;
    replyToEmail?: string;
    replyToName?: string;
    attachments?: string[];
    reportUrl?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      to: params.to,
      subject: params.subject,
      from: params.from,
      fromName: params.fromName
    };
    if (params.bodyHtml) body.bodyHtml = params.bodyHtml;
    if (params.bodyText) body.bodyText = params.bodyText;
    if (params.trackClicks !== undefined) body.trackClicks = params.trackClicks;
    if (params.trackOpens !== undefined) body.trackOpens = params.trackOpens;
    if (params.replyToEmail) body.replyToEmail = params.replyToEmail;
    if (params.replyToName) body.replyToName = params.replyToName;
    if (params.attachments && params.attachments.length > 0)
      body.attachments = params.attachments;
    if (params.reportUrl) body.reportUrl = params.reportUrl;

    let response = await this.axios.post('/campaign/email/send', body);
    return response.data;
  }

  // ── OTPflow ───────────────────────────────────────────────

  async sendOtp(params: {
    messages: Array<{
      channel: string;
      timeout: number;
      messageType?: string;
      data: Record<string, any>;
    }>;
    webhookUrl?: string;
    callbackData?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      messages: params.messages
    };
    if (params.webhookUrl) body.webhookurl = params.webhookUrl;
    if (params.callbackData) body.callbackData = params.callbackData;

    let response = await this.axios.post('/campaign/otp-flow', body);
    return response.data;
  }

  // ── Campaign Reports ──────────────────────────────────────

  async getMessageReport(channel: string, messageId: string): Promise<any> {
    let response = await this.axios.get(
      `/campaign/report/${channel}/${encodeURIComponent(messageId)}`
    );
    return response.data;
  }

  // ── Collections ───────────────────────────────────────────

  async getCollections(): Promise<any> {
    let response = await this.axios.get('/collections');
    return response.data;
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await this.axios.get(`/collections/${encodeURIComponent(collectionId)}`);
    return response.data;
  }

  // ── Collection Records ────────────────────────────────────

  async createRecord(collectionId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/collection-records/${encodeURIComponent(collectionId)}`,
      data
    );
    return response.data;
  }

  async getRecords(
    collectionId: string,
    params: {
      limit: number;
      offset: number;
      filter?: any[];
      filterObject?: Record<string, any>;
      sort?: any[];
    }
  ): Promise<any> {
    validatePage(params.limit, params.offset);
    let response = await this.axios.post(
      `/collection-records/${encodeURIComponent(collectionId)}/query`,
      {
        filter: params.filterObject ?? (params.filter?.length ? { $and: params.filter } : {}),
        sort: params.sort ?? [],
        limit: params.limit,
        offset: params.offset
      }
    );
    return response.data;
  }

  async getRecord(collectionId: string, recordId: string): Promise<any> {
    let response = await this.axios.get(
      `/collection-records/${encodeURIComponent(collectionId)}/${encodeURIComponent(recordId)}`
    );
    return response.data;
  }

  async updateRecord(
    collectionId: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/collection-records/${encodeURIComponent(collectionId)}/${encodeURIComponent(recordId)}`,
      data
    );
    return response.data;
  }

  async deleteRecord(collectionId: string, recordId: string): Promise<any> {
    let response = await this.axios.delete(
      `/collection-records/${encodeURIComponent(collectionId)}/${encodeURIComponent(recordId)}`
    );
    return response.data;
  }

  // ── Lists ─────────────────────────────────────────────────

  async getLists(): Promise<any> {
    let response = await this.axios.get('/lists');
    return response.data;
  }

  async getList(listId: string): Promise<any> {
    let response = await this.axios.get(`/lists/${encodeURIComponent(listId)}`);
    return response.data;
  }

  // ── List Entries ──────────────────────────────────────────

  async createListEntry(
    listId: string,
    recordId: string,
    data?: Record<string, any>
  ): Promise<any> {
    let body: Record<string, any> = { recordId };
    if (data) body.data = data;
    let response = await this.axios.post(`/list-entries/${encodeURIComponent(listId)}`, body);
    return response.data;
  }

  async getListEntries(
    listId: string,
    params: {
      limit: number;
      offset: number;
      filter?: any[];
      filterObject?: Record<string, any>;
      sort?: any[];
    }
  ): Promise<any> {
    validatePage(params.limit, params.offset);
    let response = await this.axios.post(`/list-entries/${encodeURIComponent(listId)}/query`, {
      filter: params.filterObject ?? (params.filter?.length ? { $and: params.filter } : {}),
      sort: params.sort ?? [],
      limit: params.limit,
      offset: params.offset
    });
    return response.data;
  }

  async getListEntry(listId: string, entryId: string): Promise<any> {
    let response = await this.axios.get(
      `/list-entries/${encodeURIComponent(listId)}/${encodeURIComponent(entryId)}`
    );
    return response.data;
  }

  async updateListEntry(
    listId: string,
    entryId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/list-entries/${encodeURIComponent(listId)}/${encodeURIComponent(entryId)}`,
      { data }
    );
    return response.data;
  }

  async deleteListEntry(listId: string, entryId: string): Promise<any> {
    let response = await this.axios.delete(
      `/list-entries/${encodeURIComponent(listId)}/${encodeURIComponent(entryId)}`
    );
    return response.data;
  }

  // ── Activities ────────────────────────────────────────────

  async createActivity(params: {
    name: string;
    iconType: string;
    iconValue: string;
    scheduleAt: string;
    description?: string;
    associated?: string;
    status?: string;
  }): Promise<any> {
    let response = await this.axios.post('/collection-records/activity-list', params);
    return response.data;
  }

  async getActivities(params: {
    limit: number;
    offset: number;
    filter?: any[];
    sort?: any[];
  }): Promise<any> {
    validatePage(params.limit, params.offset);
    let response = await this.axios.post('/collection-records/activity-list/query', {
      filter: params.filter ?? [],
      sort: params.sort ?? [],
      limit: params.limit,
      offset: params.offset
    });
    return response.data;
  }

  async getActivity(activityId: string): Promise<any> {
    let response = await this.axios.get(
      `/collection-records/activity-list/${encodeURIComponent(activityId)}`
    );
    return response.data;
  }

  async updateActivity(activityId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/collection-records/activity-list/${encodeURIComponent(activityId)}`,
      data
    );
    return response.data;
  }

  async deleteActivity(activityId: string): Promise<any> {
    let response = await this.axios.delete(
      `/collection-records/activity-list/${encodeURIComponent(activityId)}`
    );
    return response.data;
  }

  // ── Workspace Members ─────────────────────────────────────

  async getWorkspaceMembers(): Promise<any> {
    let response = await this.axios.get('/workspace-members');
    return response.data;
  }

  async getWorkspaceMember(memberId: string): Promise<any> {
    let response = await this.axios.get(`/workspace-members/${encodeURIComponent(memberId)}`);
    return response.data;
  }

  async getAttributes(target: string, targetId: string, attributeId?: string): Promise<any> {
    let path = `/attributes/${target}/${encodeURIComponent(targetId)}`;
    if (attributeId !== undefined) path += `/${encodeURIComponent(attributeId)}`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async getAttributeOptions(
    target: string,
    targetId: string,
    attributeId: string,
    optionType: 'select' | 'status' = 'select'
  ): Promise<any> {
    let response = await this.axios.get(
      `/attributes/${target}/${encodeURIComponent(targetId)}/${encodeURIComponent(attributeId)}/${optionType === 'status' ? 'status' : 'options'}`
    );
    return response.data;
  }

  async getRcsTemplateVariables(botId: string, templateName: string): Promise<any> {
    let response = await this.axios.get(
      `/campaign/rcs/variable-keys/${encodeURIComponent(botId)}`,
      { params: { templateName } }
    );
    return response.data;
  }
}
