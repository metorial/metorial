import { createAxios } from 'slates';
import { brevoApiError } from './errors';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; authType?: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.brevo.com/v3'
    });

    this.axios.interceptors.request.use((reqConfig: any) => {
      reqConfig.headers ??= {};
      if (config.authType === 'oauth') {
        reqConfig.headers.Authorization = `Bearer ${config.token}`;
      } else {
        reqConfig.headers['api-key'] = config.token;
      }
      reqConfig.headers.Accept = 'application/json';
      return reqConfig;
    });

    this.axios.interceptors.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(brevoApiError(error))
    );
  }

  // ---- Account ----

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account');
    return response.data;
  }

  // ---- Contacts ----

  async createContact(params: {
    email?: string;
    extId?: string;
    attributes?: Record<string, any>;
    listIds?: number[];
    emailBlacklisted?: boolean;
    smsBlacklisted?: boolean;
    updateEnabled?: boolean;
    forceMerge?: boolean;
    getId?: boolean;
  }): Promise<{ contactId: number }> {
    let body: Record<string, any> = {};
    if (params.email) body.email = params.email;
    if (params.extId) body.ext_id = params.extId;
    if (params.attributes) body.attributes = params.attributes;
    if (params.listIds) body.listIds = params.listIds;
    if (params.emailBlacklisted !== undefined) body.emailBlacklisted = params.emailBlacklisted;
    if (params.smsBlacklisted !== undefined) body.smsBlacklisted = params.smsBlacklisted;
    if (params.updateEnabled !== undefined) body.updateEnabled = params.updateEnabled;
    if (params.forceMerge !== undefined) body.forceMerge = params.forceMerge;
    if (params.getId !== undefined) body.getId = params.getId;

    let response = await this.axios.post('/contacts', body);
    return { contactId: response.data.id };
  }

  async getContact(identifier: string, identifierType?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (identifierType) params.identifierType = identifierType;
    let response = await this.axios.get(`/contacts/${encodeURIComponent(identifier)}`, {
      params
    });
    return response.data;
  }

  async updateContact(
    identifier: string,
    data: {
      identifierType?: string;
      attributes?: Record<string, any>;
      emailBlacklisted?: boolean;
      smsBlacklisted?: boolean;
      listIds?: number[];
      unlinkListIds?: number[];
      extId?: string;
    }
  ): Promise<void> {
    let params: Record<string, string> = {};
    if (data.identifierType) params.identifierType = data.identifierType;

    let body: Record<string, any> = {};
    if (data.attributes) body.attributes = data.attributes;
    if (data.emailBlacklisted !== undefined) body.emailBlacklisted = data.emailBlacklisted;
    if (data.smsBlacklisted !== undefined) body.smsBlacklisted = data.smsBlacklisted;
    if (data.listIds) body.listIds = data.listIds;
    if (data.unlinkListIds) body.unlinkListIds = data.unlinkListIds;
    if (data.extId) body.ext_id = data.extId;

    await this.axios.put(`/contacts/${encodeURIComponent(identifier)}`, body, { params });
  }

  async deleteContact(identifier: string, identifierType?: string): Promise<void> {
    let params: Record<string, string> = {};
    if (identifierType) params.identifierType = identifierType;
    await this.axios.delete(`/contacts/${encodeURIComponent(identifier)}`, { params });
  }

  async listContacts(params: {
    limit?: number;
    offset?: number;
    modifiedSince?: string;
    createdSince?: string;
    sort?: string;
    segmentId?: number;
    listIds?: number[];
  }): Promise<{ contacts: any[]; count: number }> {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.modifiedSince) query.modifiedSince = params.modifiedSince;
    if (params.createdSince) query.createdSince = params.createdSince;
    if (params.sort) query.sort = params.sort;
    if (params.segmentId !== undefined) query.segmentId = params.segmentId;
    if (params.listIds) query.listIds = params.listIds.join(',');

    let response = await this.axios.get('/contacts', { params: query });
    return response.data;
  }

  // ---- Contact Lists ----

  async listContactLists(params: {
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<{ lists: any[]; count: number }> {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.sort) query.sort = params.sort;

    let response = await this.axios.get('/contacts/lists', { params: query });
    return response.data;
  }

  async getContactList(listId: number): Promise<any> {
    let response = await this.axios.get(`/contacts/lists/${listId}`);
    return response.data;
  }

  async createContactList(params: {
    name: string;
    folderId: number;
  }): Promise<{ listId: number }> {
    let response = await this.axios.post('/contacts/lists', {
      name: params.name,
      folderId: params.folderId
    });
    return { listId: response.data.id };
  }

  async updateContactList(
    listId: number,
    params: {
      name?: string;
      folderId?: number;
    }
  ): Promise<void> {
    await this.axios.put(`/contacts/lists/${listId}`, params);
  }

  async deleteContactList(listId: number): Promise<void> {
    await this.axios.delete(`/contacts/lists/${listId}`);
  }

  async addContactsToList(
    listId: number,
    params: {
      emails?: string[];
      ids?: number[];
    }
  ): Promise<any> {
    let response = await this.axios.post(`/contacts/lists/${listId}/contacts/add`, params);
    return response.data;
  }

  async removeContactsFromList(
    listId: number,
    params: {
      emails?: string[];
      ids?: number[];
    }
  ): Promise<any> {
    let response = await this.axios.post(`/contacts/lists/${listId}/contacts/remove`, params);
    return response.data;
  }

  // ---- Transactional Email ----

  async sendTransactionalEmail(params: {
    sender: { name?: string; email: string };
    to: { email: string; name?: string }[];
    cc?: { email: string; name?: string }[];
    bcc?: { email: string; name?: string }[];
    replyTo?: { email: string; name?: string };
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    templateId?: number;
    params?: Record<string, any>;
    tags?: string[];
    scheduledAt?: string;
    attachment?: { url?: string; content?: string; name: string }[];
    headers?: Record<string, string>;
  }): Promise<{ messageId: string }> {
    let body: Record<string, any> = {
      sender: params.sender,
      to: params.to
    };
    if (params.cc) body.cc = params.cc;
    if (params.bcc) body.bcc = params.bcc;
    if (params.replyTo) body.replyTo = params.replyTo;
    if (params.subject) body.subject = params.subject;
    if (params.htmlContent) body.htmlContent = params.htmlContent;
    if (params.textContent) body.textContent = params.textContent;
    if (params.templateId !== undefined) body.templateId = params.templateId;
    if (params.params) body.params = params.params;
    if (params.tags) body.tags = params.tags;
    if (params.scheduledAt) body.scheduledAt = params.scheduledAt;
    if (params.attachment) body.attachment = params.attachment;
    if (params.headers) body.headers = params.headers;

    let response = await this.axios.post('/smtp/email', body);
    return { messageId: response.data.messageId };
  }

  // ---- Transactional SMS ----

  async sendTransactionalSms(params: {
    sender: string;
    recipient: string;
    content?: string;
    templateId?: number;
    type?: string;
    tag?: string;
    webUrl?: string;
    unicodeEnabled?: boolean;
    organisationPrefix?: string;
  }): Promise<{ messageId: number }> {
    let body: Record<string, any> = {
      sender: params.sender,
      recipient: params.recipient
    };
    if (params.content) body.content = params.content;
    if (params.templateId !== undefined) body.templateId = params.templateId;
    if (params.type) body.type = params.type;
    if (params.tag) body.tag = params.tag;
    if (params.webUrl) body.webUrl = params.webUrl;
    if (params.unicodeEnabled !== undefined) body.unicodeEnabled = params.unicodeEnabled;
    if (params.organisationPrefix) body.organisationPrefix = params.organisationPrefix;

    let response = await this.axios.post('/transactionalSMS/send', body);
    return { messageId: response.data.messageId };
  }

  // ---- Email Campaigns ----

  async createEmailCampaign(params: {
    name: string;
    sender: { name?: string; email?: string; id?: number };
    subject?: string;
    htmlContent?: string;
    htmlUrl?: string;
    templateId?: number;
    scheduledAt?: string;
    replyTo?: string;
    recipients?: { listIds?: number[]; exclusionListIds?: number[] };
    tag?: string;
    inlineImageActivation?: boolean;
    params?: Record<string, any>;
  }): Promise<{ campaignId: number }> {
    let response = await this.axios.post('/emailCampaigns', params);
    return { campaignId: response.data.id };
  }

  async updateEmailCampaign(
    campaignId: number,
    params: {
      name?: string;
      sender?: { name?: string; email?: string; id?: number };
      subject?: string;
      htmlContent?: string;
      htmlUrl?: string;
      templateId?: number;
      scheduledAt?: string;
      replyTo?: string;
      recipients?: { listIds?: number[]; exclusionListIds?: number[] };
      tag?: string;
      inlineImageActivation?: boolean;
      params?: Record<string, any>;
    }
  ): Promise<void> {
    await this.axios.put(`/emailCampaigns/${campaignId}`, params);
  }

  async getEmailCampaign(campaignId: number): Promise<any> {
    let response = await this.axios.get(`/emailCampaigns/${campaignId}`);
    return response.data;
  }

  async listEmailCampaigns(params: {
    type?: string;
    status?: string;
    statistics?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<{ campaigns: any[]; count: number }> {
    let query: Record<string, any> = {};
    if (params.type) query.type = params.type;
    if (params.status) query.status = params.status;
    if (params.statistics) query.statistics = params.statistics;
    if (params.startDate) query.startDate = params.startDate;
    if (params.endDate) query.endDate = params.endDate;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.sort) query.sort = params.sort;

    let response = await this.axios.get('/emailCampaigns', { params: query });
    return response.data;
  }

  async sendEmailCampaignNow(campaignId: number): Promise<void> {
    await this.axios.post(`/emailCampaigns/${campaignId}/sendNow`);
  }

  async deleteEmailCampaign(campaignId: number): Promise<void> {
    await this.axios.delete(`/emailCampaigns/${campaignId}`);
  }

  async sendTestEmail(campaignId: number, emailTo: string[]): Promise<void> {
    await this.axios.post(`/emailCampaigns/${campaignId}/sendTest`, { emailTo });
  }

  // ---- Deals (CRM) ----

  async createDeal(params: {
    name: string;
    attributes?: Record<string, any>;
    linkedContactsIds?: number[];
    linkedCompaniesIds?: string[];
  }): Promise<{ dealId: string }> {
    let response = await this.axios.post('/crm/deals', params);
    return { dealId: response.data.id };
  }

  async getDeal(dealId: string): Promise<any> {
    let response = await this.axios.get(`/crm/deals/${dealId}`);
    return response.data;
  }

  async updateDeal(
    dealId: string,
    params: {
      name?: string;
      attributes?: Record<string, any>;
      linkedContactsIds?: number[];
      linkedCompaniesIds?: string[];
    }
  ): Promise<void> {
    await this.axios.patch(`/crm/deals/${dealId}`, params);
  }

  async deleteDeal(dealId: string): Promise<void> {
    await this.axios.delete(`/crm/deals/${dealId}`);
  }

  async listDeals(params: {
    limit?: number;
    offset?: number;
    sort?: string;
    modifiedSince?: string;
    createdSince?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.sort) query.sort = params.sort;
    if (params.modifiedSince) query.modifiedSince = params.modifiedSince;
    if (params.createdSince) query.createdSince = params.createdSince;

    let response = await this.axios.get('/crm/deals', { params: query });
    return response.data;
  }

  // ---- Pipelines ----

  async listPipelines(): Promise<any[]> {
    let response = await this.axios.get('/crm/pipeline/details/all');
    return response.data;
  }

  // ---- Companies (CRM) ----

  async createCompany(params: {
    name: string;
    attributes?: Record<string, any>;
    countryCode?: number;
    linkedContactsIds?: number[];
    linkedDealsIds?: string[];
  }): Promise<{ companyId: string }> {
    let response = await this.axios.post('/companies', params);
    return { companyId: response.data.id };
  }

  async listCompanies(params: {
    limit?: number;
    page?: number;
    sort?: string;
    sortBy?: string;
    modifiedSince?: string;
    createdSince?: string;
    name?: string;
    linkedContactId?: number;
    linkedDealId?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.page !== undefined) query.page = params.page;
    if (params.sort) query.sort = params.sort;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.modifiedSince) query.modifiedSince = params.modifiedSince;
    if (params.createdSince) query.createdSince = params.createdSince;
    if (params.name) query['filters[attributes.name]'] = params.name;
    if (params.linkedContactId !== undefined) query.linkedContactsIds = params.linkedContactId;
    if (params.linkedDealId) query.linkedDealsIds = params.linkedDealId;

    let response = await this.axios.get('/companies', { params: query });
    return response.data;
  }

  async getCompany(companyId: string): Promise<any> {
    let response = await this.axios.get(`/companies/${companyId}`);
    return response.data;
  }

  async updateCompany(
    companyId: string,
    params: {
      name?: string;
      attributes?: Record<string, any>;
      linkedContactsIds?: number[];
      linkedDealsIds?: string[];
    }
  ): Promise<void> {
    await this.axios.patch(`/companies/${companyId}`, params);
  }

  async deleteCompany(companyId: string): Promise<void> {
    await this.axios.delete(`/companies/${companyId}`);
  }

  // ---- Webhooks ----

  async createWebhook(params: {
    url: string;
    events: string[];
    type?: string;
    channel?: string;
    description?: string;
    batched?: boolean;
    auth?: { type: string; token: string };
    headers?: { key: string; value: string }[];
    domain?: string;
  }): Promise<{ webhookId: number }> {
    let response = await this.axios.post('/webhooks', params);
    return { webhookId: response.data.id };
  }

  async getWebhooks(type?: string): Promise<{ webhooks: any[] }> {
    let params: Record<string, string> = {};
    if (type) params.type = type;
    let response = await this.axios.get('/webhooks', { params });
    return response.data;
  }

  async getWebhook(webhookId: number): Promise<any> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  async updateWebhook(
    webhookId: number,
    params: {
      url?: string;
      events?: string[];
      type?: string;
      channel?: string;
      description?: string;
      batched?: boolean;
      auth?: { type: string; token: string };
      headers?: { key: string; value: string }[];
      domain?: string;
    }
  ): Promise<void> {
    await this.axios.put(`/webhooks/${webhookId}`, params);
  }

  // ---- Senders ----

  async listSenders(): Promise<{ senders: any[] }> {
    let response = await this.axios.get('/senders');
    return response.data;
  }

  // ---- Event Tracking ----

  async trackEvent(params: {
    email?: string;
    contactId?: number;
    extId?: string;
    phone?: string;
    whatsapp?: string;
    landlineNumber?: string;
    eventName: string;
    eventDate?: string;
    contactProperties?: Record<string, string | number | boolean>;
    eventProperties?: Record<string, any>;
    object?: Record<string, any>;
  }): Promise<void> {
    let identifiers: Record<string, string | number> = {};
    if (params.email) identifiers.email_id = params.email;
    if (params.contactId !== undefined) identifiers.contact_id = params.contactId;
    if (params.extId) identifiers.ext_id = params.extId;
    if (params.phone) identifiers.phone_id = params.phone;
    if (params.whatsapp) identifiers.whatsapp_id = params.whatsapp;
    if (params.landlineNumber) identifiers.landline_number_id = params.landlineNumber;

    let body: Record<string, any> = {
      event_name: params.eventName,
      identifiers
    };
    if (params.contactProperties) body.contact_properties = params.contactProperties;
    if (params.eventDate) body.event_date = params.eventDate;
    if (params.eventProperties) body.event_properties = params.eventProperties;
    if (params.object) body.object = params.object;

    await this.axios.post('/events', body);
  }

  // ---- Folders ----

  async listFolders(params: {
    limit?: number;
    offset?: number;
  }): Promise<{ folders: any[]; count: number }> {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    let response = await this.axios.get('/contacts/folders', { params: query });
    return response.data;
  }

  async createFolder(name: string): Promise<{ folderId: number }> {
    let response = await this.axios.post('/contacts/folders', { name });
    return { folderId: response.data.id };
  }

  async getFolder(folderId: number): Promise<any> {
    let response = await this.axios.get(`/contacts/folders/${folderId}`);
    return response.data;
  }

  async updateFolder(folderId: number, name: string): Promise<void> {
    await this.axios.put(`/contacts/folders/${folderId}`, { name });
  }

  async deleteFolder(folderId: number): Promise<void> {
    await this.axios.delete(`/contacts/folders/${folderId}`);
  }

  async getListsInFolder(params: {
    folderId: number;
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<{ lists: any[]; count: number }> {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.sort) query.sort = params.sort;

    let response = await this.axios.get(`/contacts/folders/${params.folderId}/lists`, {
      params: query
    });
    return response.data;
  }
}
