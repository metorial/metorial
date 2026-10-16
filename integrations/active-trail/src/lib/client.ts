import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let BASE_URL = 'https://webapi.mymarketing.co.il/api';

export let requireInteger = (
  value: unknown,
  field: string,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw createApiServiceError(
      `${field} must be an integer between ${minimum} and ${maximum}.`
    );
  }
  return value;
};

export let readRecord = (value: unknown): Record<string, any> => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError('ActiveTrail returned an invalid object response.');
  return value;
};

export let readList = (value: unknown, field?: string): any[] => {
  let list = field && !Array.isArray(value) ? readRecord(value)[field] : value;
  if (!Array.isArray(list))
    throw createApiServiceError('ActiveTrail returned an invalid collection response.');
  return list;
};

export let readId = (value: unknown): number =>
  requireInteger(readRecord(value).id, 'ActiveTrail response ID');

export let toCustomerState = (status?: string) => {
  if (status === 'Active') return 'ACTIVE';
  if (status === 'Unsubscribed') return 'CUSTOMER_REQUEST';
  if (status === 'Bounced') return 'BOUNCED';
  return status;
};

export let readString = (value: unknown, field: string): string => {
  if (typeof value !== 'string')
    throw createApiServiceError(`ActiveTrail returned an invalid ${field}.`);
  return value;
};

export let readMailingList = (value: unknown) => {
  let raw = readRecord(value);
  return {
    mailingListId: requireInteger(
      Object.hasOwn(raw, 'Id') ? raw.Id : raw.id,
      'ActiveTrail mailing list ID'
    ),
    name: readString(Object.hasOwn(raw, 'Name') ? raw.Name : raw.name, 'mailing list name')
  };
};

export let toContactStatus = (status?: string) => {
  if (status === 'Bounced')
    throw createApiServiceError(
      'A bounced status is assigned by ActiveTrail and cannot be set as a subscription status.'
    );
  return status === 'Active' ? 'Subscribed' : status;
};

export let requireContactAddress = (value: { email?: string; sms?: string }) => {
  if (!value.email?.trim() && !value.sms?.trim())
    throw createApiServiceError('Provide at least one non-empty email address or SMS number.');
};

let isCredentialName = (name: string) =>
  /^(?:authorization|proxy-authorization|access[_-]?token|refresh[_-]?token|api[_-]?(?:key|token)|token|secret|client[_-]?secret|password|x-api-key|x-auth-token|x-access-token|cookie|set-cookie)$/i.test(
    name.trim()
  );

export let redactProviderData = <T>(value: T, token: string): T => {
  let redact = (item: unknown): unknown => {
    if (typeof item === 'string')
      return item
        .split(token)
        .join('[REDACTED]')
        .replace(
          /([?&](?:access_token|refresh_token|api[_-]?(?:key|token)|token|client_secret|secret|password|authorization)=)[^&#\s]*/gi,
          '$1[REDACTED]'
        );
    if (Array.isArray(item)) return item.map(redact);
    if (isApiErrorRecord(item))
      return Object.fromEntries(
        Object.entries(item).map(([key, field]) => [
          key,
          (isCredentialName(key) ||
            (key === 'value' && typeof item.key === 'string' && isCredentialName(item.key))) &&
          field !== null &&
          field !== undefined
            ? '[REDACTED]'
            : redact(field)
        ])
      );
    return item;
  };
  return redact(value) as T;
};

let validatePagination = (params: { page?: number; limit?: number }) => {
  if (params.page !== undefined) requireInteger(params.page, 'page', 1, 2147483647);
  if (params.limit !== undefined) requireInteger(params.limit, 'limit', 1, 100);
};

let validateProviderInput = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(validateProviderInput);
    return;
  }
  if (!isApiErrorRecord(value)) return;
  for (let [key, item] of Object.entries(value)) {
    if (item === undefined || item === null) continue;
    if (/_id$/.test(key) && typeof item === 'number') requireInteger(item, key);
    if (/_ids$/.test(key) && Array.isArray(item)) item.forEach(id => requireInteger(id, key));
    validateProviderInput(item);
  }
};

export class ActiveTrailClient {
  private axios;

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('An ActiveTrail API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30000,
      authHeader: { value: token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ActiveTrail',
          reason: 'activetrail_api_error',
          detailKeys: [
            'message',
            'Message',
            'detail',
            'error',
            'error_description',
            'ExceptionMessage'
          ],
          nestedKeys: ['errors', 'Errors', 'ModelState'],
          extractMessage: (error, helpers) => {
            let body = redactProviderData(helpers.getResponseWithBody(error)?.data, token);
            let details: string[] = [];
            helpers.collectDetails(body, details, {
              detailKeys: ['message', 'Message', 'detail', 'error', 'ExceptionMessage'],
              nestedKeys: ['errors', 'Errors']
            });
            if (isApiErrorRecord(body) && isApiErrorRecord(body.ModelState)) {
              for (let value of Object.values(body.ModelState))
                helpers.collectDetails(value, details);
            }
            return details.length ? details.join('; ') : undefined;
          },
          extractResponse: (error, helpers) => {
            let response = helpers.getResponseWithBody(error);
            return response
              ? { ...response, data: redactProviderData(response.data, token) }
              : undefined;
          },
          formatMessage: ({ statusLabel, message }) =>
            redactProviderData(
              `ActiveTrail API request failed: ${statusLabel}${message}`,
              token
            ),
          parent: { name: 'ActiveTrailApiError' }
        })
    });
  }

  // ─── Contacts ───

  async listContacts(
    params: {
      customerStates?: string;
      searchTerm?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    validatePagination(params);
    let response = await this.axios.get('/contacts', {
      params: {
        CustomerStates: params.customerStates,
        SearchTerm: params.searchTerm,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return readList(response.data);
  }

  async getContact(contactId: number) {
    requireInteger(contactId, 'contactId');
    let response = await this.axios.get(`/contacts/${contactId}`);
    return readRecord(response.data);
  }

  async createContact(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/contacts', data);
    return readRecord(response.data);
  }

  async updateContact(contactId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(contactId, 'contactId');
    await this.axios.put(`/contacts/${contactId}`, data);
    return this.getContact(contactId);
  }

  async deleteContact(contactId: number) {
    requireInteger(contactId, 'contactId');
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async importContacts(groupId: number, contacts: Record<string, any>[]) {
    requireInteger(groupId, 'groupId');
    let response = await this.axios.post('/contacts/Import', {
      group: groupId,
      contacts
    });
    return response.data;
  }

  async getContactGroups(contactId: number) {
    requireInteger(contactId, 'contactId');
    let response = await this.axios.get(`/contacts/${contactId}/groups`);
    return readList(response.data);
  }

  async getContactActivity(contactId: number) {
    requireInteger(contactId, 'contactId');
    let response = await this.axios.get(`/contacts/${contactId}/activity`);
    return readList(response.data);
  }

  async getContactBounces(contactId: number) {
    requireInteger(contactId, 'contactId');
    let response = await this.axios.get(`/contacts/${contactId}/errors`);
    return response.data;
  }

  async getContactMailingLists(contactId: number) {
    requireInteger(contactId, 'contactId');
    let response = await this.axios.get(`/contacts/${contactId}/mailinglists`);
    return readList(response.data);
  }

  async getSubscribers(
    params: { fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    let response = await this.axios.get('/contacts/Subscription/Subscribers', {
      params: {
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return readList(response.data, 'subscription_statistics');
  }

  async getUnsubscribers(
    params: { fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    let response = await this.axios.get('/contacts/Subscription/Unsubscribers', {
      params: {
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return readList(response.data, 'subscription_statistics');
  }

  // ─── Groups ───

  async listGroups(params: { page?: number; limit?: number } = {}) {
    validatePagination(params);
    let response = await this.axios.get('/groups', {
      params: { Page: params.page, Limit: params.limit }
    });
    return readList(response.data);
  }

  async getGroup(groupId: number) {
    requireInteger(groupId, 'groupId');
    let response = await this.axios.get(`/groups/${groupId}`);
    return readRecord(response.data);
  }

  async createGroup(data: { name: string }) {
    validateProviderInput(data);
    let response = await this.axios.post('/groups', data);
    return readRecord(response.data);
  }

  async updateGroup(groupId: number, data: { name: string }) {
    validateProviderInput(data);
    requireInteger(groupId, 'groupId');
    await this.axios.put(`/groups/${groupId}`, data);
    return this.getGroup(groupId);
  }

  async deleteGroup(groupId: number) {
    requireInteger(groupId, 'groupId');
    let response = await this.axios.delete(`/groups/${groupId}`);
    return response.data;
  }

  async getGroupMembers(
    groupId: number,
    params: {
      customerStates?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    validatePagination(params);
    requireInteger(groupId, 'groupId');
    let response = await this.axios.get(`/groups/${groupId}/members`, {
      params: {
        CustomerStates: params.customerStates,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return readList(response.data);
  }

  async addContactToGroup(groupId: number, contact: Record<string, any>) {
    validateProviderInput(contact);
    requireInteger(groupId, 'groupId');
    let response = await this.axios.post(`/groups/${groupId}/members`, contact);
    return readRecord(response.data);
  }

  async removeContactFromGroup(groupId: number, memberId: number) {
    requireInteger(groupId, 'groupId');
    requireInteger(memberId, 'memberId');
    let response = await this.axios.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  }

  async getGroupEvents(groupId: number, eventType: string) {
    requireInteger(groupId, 'groupId');
    let response = await this.axios.get(`/groups/${groupId}/events`, {
      params: { EventType: eventType }
    });
    return response.data;
  }

  // ─── Mailing Lists ───

  async listMailingLists(params: { page?: number; limit?: number } = {}) {
    validatePagination(params);
    let response = await this.axios.get('/mailinglist', {});
    return readList(response.data);
  }

  async getMailingList(mailingListId: number) {
    requireInteger(mailingListId, 'mailingListId');
    let response = await this.axios.get(`/mailinglist/${mailingListId}`);
    return readRecord(response.data);
  }

  async createMailingList(data: { name: string }) {
    validateProviderInput(data);
    let response = await this.axios.post('/mailinglist', { Name: data.name });
    return readRecord(response.data);
  }

  async deleteMailingList(mailingListId: number) {
    requireInteger(mailingListId, 'mailingListId');
    let response = await this.axios.delete(`/mailinglist/${mailingListId}`);
    return response.data;
  }

  async getMailingListMembers(
    mailingListId: number,
    params: {
      customerStates?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    validatePagination(params);
    requireInteger(mailingListId, 'mailingListId');
    let response = await this.axios.get(`/mailinglist/${mailingListId}/members`, {
      params: {
        CustomerStates: params.customerStates,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return readList(response.data);
  }

  async addContactToMailingList(mailingListId: number, contact: Record<string, any>) {
    validateProviderInput(contact);
    requireInteger(mailingListId, 'mailingListId');
    let response = await this.axios.post(`/mailinglist/${mailingListId}/members`, contact);
    return readRecord(response.data);
  }

  async removeContactFromMailingList(mailingListId: number, memberId: number) {
    requireInteger(mailingListId, 'mailingListId');
    requireInteger(memberId, 'memberId');
    let response = await this.axios.delete(
      `/mailinglist/${mailingListId}/members/${memberId}`
    );
    return response.data;
  }

  // ─── Email Campaigns ───

  async listCampaigns(
    params: {
      mailingListId?: number;
      contentCategoryId?: number;
      searchTerm?: string;
      sendType?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    validatePagination(params);
    let response = await this.axios.get('/campaigns', {
      params: {
        MailingListId: params.mailingListId,
        ContentCategoryId: params.contentCategoryId,
        SearchTerm: params.searchTerm,
        SendType: params.sendType,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return readList(response.data, 'items');
  }

  async getCampaign(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaigns/${campaignId}`);
    return readRecord(response.data);
  }

  async createCampaign(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/campaigns', data);
    return readRecord(response.data);
  }

  async updateCampaign(campaignId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.put(`/campaigns/${campaignId}`, data);
    return response.data;
  }

  async deleteCampaign(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.delete(`/campaigns/${campaignId}`);
    return response.data;
  }

  async getCampaignDetails(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaigns/${campaignId}/details`);
    return readRecord(response.data);
  }

  async updateCampaignDetails(campaignId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(campaignId, 'campaignId');
    let current = readRecord(await this.getCampaignDetails(campaignId));
    let changes = pickDefined(data);
    let response = await this.axios.put(`/campaigns/${campaignId}/details`, {
      ...current,
      ...changes
    });
    return response.data;
  }

  async getCampaignDesign(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaigns/${campaignId}/design`);
    return readRecord(response.data);
  }

  async updateCampaignDesign(campaignId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(campaignId, 'campaignId');
    let current = readRecord(await this.getCampaignDesign(campaignId));
    let changes = pickDefined(data);
    let response = await this.axios.put(`/campaigns/${campaignId}/design`, {
      ...current,
      ...changes
    });
    return response.data;
  }

  async getCampaignSegment(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaigns/${campaignId}/segment`);
    return readRecord(response.data);
  }

  async updateCampaignSegment(campaignId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(campaignId, 'campaignId');
    let current = readRecord(await this.getCampaignSegment(campaignId));
    let changes = pickDefined(data);
    let response = await this.axios.put(`/campaigns/${campaignId}/segment`, {
      ...current,
      ...changes
    });
    return response.data;
  }

  async getCampaignScheduling(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaigns/${campaignId}/scheduling`);
    return readRecord(response.data);
  }

  async updateCampaignScheduling(campaignId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(campaignId, 'campaignId');
    let current = readRecord(await this.getCampaignScheduling(campaignId));
    let changes = pickDefined(data);
    let response = await this.axios.put(`/campaigns/${campaignId}/scheduling`, {
      ...current,
      ...changes
    });
    return response.data;
  }

  async createCampaignForContacts(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/campaigns/Contacts', data);
    return response.data;
  }

  // ─── SMS Campaigns ───

  async listSmsCampaigns(
    params: { page?: number; limit?: number; includeNotSent?: boolean } = {}
  ) {
    validatePagination(params);
    let response = await this.axios.get('/smscampaign/Campaign', {
      params: pickDefined({
        Page: params.page,
        Limit: params.limit,
        IsIncludeNotSent: params.includeNotSent
      })
    });
    return readList(response.data, 'sms_campaign');
  }

  async getSmsCampaign(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/smscampaign/Campaign/${campaignId}`);
    return readRecord(response.data);
  }

  async createSmsCampaign(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/smscampaign/Campaign', data);
    return readRecord(response.data);
  }

  async updateSmsCampaign(campaignId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.put(`/smscampaign/Campaign/${campaignId}`, data);
    return response.data;
  }

  async estimateSmsCampaign(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/smscampaign/Campaign/${campaignId}/estimate`);
    return response.data;
  }

  // ─── SMS Operational Messages ───

  async sendSmsOperationalMessage(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/smscampaign/OperationalMessage', data);
    return response.data;
  }

  // ─── WhatsApp ───

  async sendWhatsAppCampaign(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/whatsappcampaign/SendCampaign', data);
    return response.data;
  }

  async sendWhatsAppOperationalMessage(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/whatsappcampaign/SendOperationalMessage', data);
    return response.data;
  }

  async listWhatsAppTemplates() {
    let response = await this.axios.get('/whatsappcampaign/templates');
    return readList(response.data);
  }

  async getWhatsAppTemplate(templateId: number) {
    requireInteger(templateId, 'templateId');
    let response = await this.axios.get(`/whatsappcampaign/templates/${templateId}`);
    return response.data;
  }

  async listWhatsAppProfiles() {
    let response = await this.axios.get('/whatsappcampaign/profiles');
    return readList(response.data);
  }

  async listTemplateCategories() {
    let response = await this.axios.get('/templates/TemplateCategory');
    return readList(response.data);
  }

  // ─── Operational Messages (Email) ───

  async sendOperationalMessage(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/OperationalMessage/Message', data);
    return readRecord(response.data);
  }

  async getOperationalMessageClassifications() {
    let response = await this.axios.get('/OperationalMessage/Classification');
    return response.data;
  }

  // ─── Campaign Reports ───

  async getCampaignReport(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaignreports/${campaignId}`);
    return response.data;
  }

  async listCampaignReports(
    params: { fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    let response = await this.axios.get('/campaignreports', {
      params: {
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return readList(response.data);
  }

  async getCampaignReportOpens(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaignreports/${campaignId}/opens`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return readList(response.data, 'campaign_opens');
  }

  async getCampaignReportClicks(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaignreports/${campaignId}/clickdetails`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return readList(response.data, 'urls_clicked');
  }

  async getCampaignReportBounces(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaignreports/${campaignId}/bounces`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return Array.isArray(response.data) ? response.data : [readRecord(response.data)];
  }

  async getCampaignReportUnsubscribed(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaignreports/${campaignId}/unsubscribed`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return readList(response.data, 'unsubscribes');
  }

  async getCampaignReportComplaints(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaignreports/${campaignId}/complaints`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return Array.isArray(response.data) ? response.data : [readRecord(response.data)];
  }

  async getCampaignReportDomains(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/campaignreports/${campaignId}/domains`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return Array.isArray(response.data) ? response.data : [readRecord(response.data)];
  }

  // ─── SMS Campaign Reports ───

  async getSmsCampaignReport(campaignId: number) {
    requireInteger(campaignId, 'campaignId');
    let response = await this.axios.get(`/smscampaignreport/${campaignId}`);
    return response.data;
  }

  async listSmsCampaignReports(
    params: { fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    let response = await this.axios.get('/smscampaignreport', {
      params: {
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  // ─── Automations ───

  async listAutomations(params: { page?: number; limit?: number } = {}) {
    validatePagination(params);
    let response = await this.axios.get('/automations', {
      params: { Page: params.page, Limit: params.limit }
    });
    return readList(response.data);
  }

  async getAutomation(automationId: number) {
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(`/automations/${automationId}`);
    return readRecord(response.data);
  }

  async getAutomationDetails(automationId: number) {
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(`/automations/${automationId}/details`);
    return readRecord(response.data);
  }

  async updateAutomationDetails(automationId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(automationId, 'automationId');
    let response = await this.axios.put(`/automations/${automationId}/details`, data);
    return response.data;
  }

  async getAutomationDesign(automationId: number) {
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(`/automations/${automationId}/design`);
    return response.data;
  }

  async getAutomationActivation(automationId: number) {
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(`/automations/${automationId}/activation`);
    return readRecord(response.data);
  }

  async setAutomationActivation(automationId: number, data: { is_published: boolean }) {
    validateProviderInput(data);
    requireInteger(automationId, 'automationId');
    let response = await this.axios.put(`/automations/${automationId}/activation`, data);
    return response.data;
  }

  async deleteAutomations(ids: string) {
    let response = await this.axios.delete(`/automations/${ids}`);
    return response.data;
  }

  async sendAutomationTest(automationId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(automationId, 'automationId');
    let response = await this.axios.post(`/automations/${automationId}/test`, data);
    return response.data;
  }

  // ─── Automation Reports ───

  async getAutomationReport(automationId: number) {
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(`/automationreports/${automationId}/OverviewReport`);
    return readRecord(response.data);
  }

  async getAutomationEmailStats(automationId: number) {
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(
      `/automationreports/${automationId}/automationemailscampaignstatistic`
    );
    return response.data;
  }

  async getAutomationSmsStats(automationId: number) {
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(
      `/automationreports/${automationId}/automationsmscampaignstatistic`
    );
    return response.data;
  }

  async getAutomationContactsStarted(
    automationId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(`/automationreports/${automationId}/ContactsStarted`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return readList(response.data, 'contacts_steps');
  }

  async getAutomationContactsEnded(
    automationId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    validatePagination(params);
    requireInteger(automationId, 'automationId');
    let response = await this.axios.get(`/automationreports/${automationId}/ContactsEnded`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return readList(response.data, 'contacts_steps');
  }

  // ─── Webhooks ───

  async listWebhooks() {
    let response = await this.axios.get('/webhooks');
    return readList(response.data);
  }

  async getWebhook(webhookId: number) {
    requireInteger(webhookId, 'webhookId');
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return readRecord(response.data);
  }

  async createWebhook(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/webhooks', data);
    return readRecord(response.data);
  }

  async updateWebhook(webhookId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(webhookId, 'webhookId');
    let current = await this.getWebhook(webhookId);
    await this.axios.put(`/webhooks/${webhookId}`, { ...current, ...data });
    return this.getWebhook(webhookId);
  }

  async deleteWebhook(webhookId: number) {
    requireInteger(webhookId, 'webhookId');
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  async testWebhook(webhookId: number) {
    requireInteger(webhookId, 'webhookId');
    let response = await this.axios.post(`/webhooks/${webhookId}/Test`);
    return response.data;
  }

  // ─── Account ───

  async getAccountBalance() {
    let response = await this.axios.get('/account/balance');
    return readRecord(response.data);
  }

  async getContactFields(params: { type?: string } = {}) {
    let response = await this.axios.get('/account/contactFields', {
      params: { FieldsType: params.type }
    });
    return readList(response.data);
  }

  async getSendingProfiles() {
    let response = await this.axios.get('/account/sendingprofiles');
    return readList(response.data);
  }

  async getSmsSendingProfiles() {
    let response = await this.axios.get('/account/sms-sendingprofiles');
    return readList(response.data);
  }

  async getContentCategories() {
    let response = await this.axios.get('/account/contentCategories');
    return readList(response.data);
  }

  async getExecutiveReport() {
    let response = await this.axios.get('/account/executivereport');
    return response.data;
  }

  async getContactGrowthReport() {
    let response = await this.axios.get('/account/executivereport/contactgrowth');
    return response.data;
  }

  // ─── Templates ───

  async listTemplates(params: { page?: number; limit?: number } = {}) {
    validatePagination(params);
    let response = await this.axios.get('/templates', {});
    return readList(response.data);
  }

  async getTemplate(templateId: number) {
    requireInteger(templateId, 'templateId');
    let response = await this.axios.get(`/templates/${templateId}`);
    return readRecord(response.data);
  }

  async createTemplate(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/templates', data);
    return readRecord(response.data);
  }

  async updateTemplate(templateId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(templateId, 'templateId');
    let response = await this.axios.put(`/templates/${templateId}`, data);
    return response.data;
  }

  async deleteTemplate(templateId: number) {
    requireInteger(templateId, 'templateId');
    let response = await this.axios.delete(`/templates/${templateId}`);
    return response.data;
  }

  async getTemplateContent(templateId: number) {
    requireInteger(templateId, 'templateId');
    let response = await this.axios.get(`/templates/${templateId}/content`);
    return response.data;
  }

  async updateTemplateContent(templateId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(templateId, 'templateId');
    let response = await this.axios.put(`/templates/${templateId}/content`, data);
    return response.data;
  }

  async createCampaignFromTemplate(templateId: number, data: Record<string, any>) {
    validateProviderInput(data);
    requireInteger(templateId, 'templateId');
    let response = await this.axios.post(`/templates/${templateId}/campaign`, data);
    return readRecord(response.data);
  }

  // ─── Commerce ───

  async createOrder(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/commerce/Order', data);
    return response.data;
  }

  async updateOrder(orderId: string, data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.put(`/commerce/Order/${orderId}`, data);
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await this.axios.get(`/commerce/Order/${orderId}`);
    return response.data;
  }

  async createCart(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/commerce/Cart', data);
    return response.data;
  }

  // ─── Sales Lifecycle ───

  async createLead(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/salesLifeCycle/Lead', data);
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.put(`/salesLifeCycle/Lead/${leadId}`, data);
    return response.data;
  }

  async getLead(leadId: string) {
    let response = await this.axios.get(`/salesLifeCycle/Lead/${leadId}`);
    return response.data;
  }

  async createOpportunity(data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.post('/salesLifeCycle/Opportunity', data);
    return response.data;
  }

  async updateOpportunity(opportunityId: string, data: Record<string, any>) {
    validateProviderInput(data);
    let response = await this.axios.put(`/salesLifeCycle/Opportunity/${opportunityId}`, data);
    return response.data;
  }

  async getOpportunity(opportunityId: string) {
    let response = await this.axios.get(`/salesLifeCycle/Opportunity/${opportunityId}`);
    return response.data;
  }

  // ─── Signup Forms & Landing Pages ───

  async listSignupForms() {
    let response = await this.axios.get('/signupforms');
    return response.data;
  }

  async getSignupForm(formId: number) {
    requireInteger(formId, 'formId');
    let response = await this.axios.get(`/signupforms/${formId}`);
    return response.data;
  }

  async listLandingPages() {
    let response = await this.axios.get('/landingpage');
    return response.data;
  }
}
