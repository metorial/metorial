import { createAxios } from 'slates';

export class ZixflowClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.zixflow.com/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
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

    let response = await this.axios.post(`/campaign/whatsapp/messages/${params.type}`, body);
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
    let response = await this.axios.get(`/campaign/whatsapp/templates/${phoneId}`, {
      params: { limit, offset }
    });
    return response.data;
  }

  async getWhatsAppTemplateVariables(phoneId: string, templateName: string): Promise<any> {
    let response = await this.axios.get(
      `/campaign/whatsapp/template-variables/${phoneId}/${templateName}`
    );
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

    let response = await this.axios.post('/campaign/rcs/send', body);
    return response.data;
  }

  async sendRcsDirectMessage(params: {
    to: string;
    botId: string;
    type: string;
    content: Record<string, any>;
    source?: string;
    linkWithRecord?: boolean;
    reportUrl?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      to: params.to,
      botId: params.botId,
      ...params.content,
      submissionStatus: true
    };
    if (params.source) body.source = params.source;
    if (params.linkWithRecord !== undefined) body.linkWithRecord = params.linkWithRecord;
    if (params.reportUrl) body.reportURL = params.reportUrl;

    let response = await this.axios.post(`/campaign/rcs/messages/${params.type}`, body);
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
    let response = await this.axios.get(`/campaign/${channel}/report/${messageId}`);
    return response.data;
  }

  // ── Collections ───────────────────────────────────────────

  async getCollections(): Promise<any> {
    let response = await this.axios.get('/collection');
    return response.data;
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await this.axios.get(`/collection/${collectionId}`);
    return response.data;
  }

  // ── Collection Records ────────────────────────────────────

  async createRecord(collectionId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/collection-record/${collectionId}`, data);
    return response.data;
  }

  async getRecords(
    collectionId: string,
    params: {
      limit: number;
      offset: number;
      filter?: any[];
      sort?: any[];
    }
  ): Promise<any> {
    let response = await this.axios.post(`/collection-record/${collectionId}/list`, {
      filter: params.filter ?? [],
      sort: params.sort ?? [],
      limit: params.limit,
      offset: params.offset
    });
    return response.data;
  }

  async getRecord(collectionId: string, recordId: string): Promise<any> {
    let response = await this.axios.get(`/collection-record/${collectionId}/${recordId}`);
    return response.data;
  }

  async updateRecord(
    collectionId: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/collection-record/${collectionId}/${recordId}`,
      data
    );
    return response.data;
  }

  async deleteRecord(collectionId: string, recordId: string): Promise<any> {
    let response = await this.axios.delete(`/collection-record/${collectionId}/${recordId}`);
    return response.data;
  }

  // ── Lists ─────────────────────────────────────────────────

  async getLists(): Promise<any> {
    let response = await this.axios.get('/list');
    return response.data;
  }

  async getList(listId: string): Promise<any> {
    let response = await this.axios.get(`/list/${listId}`);
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
    let response = await this.axios.post(`/list-entry/${listId}`, body);
    return response.data;
  }

  async getListEntries(
    listId: string,
    params: {
      limit: number;
      offset: number;
      filter?: any[];
      sort?: any[];
    }
  ): Promise<any> {
    let response = await this.axios.post(`/list-entry/${listId}/list`, {
      filter: params.filter ?? [],
      sort: params.sort ?? [],
      limit: params.limit,
      offset: params.offset
    });
    return response.data;
  }

  async getListEntry(listId: string, entryId: string): Promise<any> {
    let response = await this.axios.get(`/list-entry/${listId}/${entryId}`);
    return response.data;
  }

  async updateListEntry(
    listId: string,
    entryId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(`/list-entry/${listId}/${entryId}`, data);
    return response.data;
  }

  async deleteListEntry(listId: string, entryId: string): Promise<any> {
    let response = await this.axios.delete(`/list-entry/${listId}/${entryId}`);
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
    let response = await this.axios.post('/activity', params);
    return response.data;
  }

  async getActivities(params: {
    limit: number;
    offset: number;
    filter?: any[];
    sort?: any[];
  }): Promise<any> {
    let response = await this.axios.post('/activity/list', {
      filter: params.filter ?? [],
      sort: params.sort ?? [],
      limit: params.limit,
      offset: params.offset
    });
    return response.data;
  }

  async getActivity(activityId: string): Promise<any> {
    let response = await this.axios.get(`/activity/${activityId}`);
    return response.data;
  }

  async updateActivity(activityId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/activity/${activityId}`, data);
    return response.data;
  }

  async deleteActivity(activityId: string): Promise<any> {
    let response = await this.axios.delete(`/activity/${activityId}`);
    return response.data;
  }

  // ── Workspace Members ─────────────────────────────────────

  async getWorkspaceMembers(): Promise<any> {
    let response = await this.axios.get('/workspace-member');
    return response.data;
  }

  async getWorkspaceMember(memberId: string): Promise<any> {
    let response = await this.axios.get(`/workspace-member/${memberId}`);
    return response.data;
  }
}
