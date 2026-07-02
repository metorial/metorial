import { createAxios } from 'slates';

let BASE_URL = 'https://withpersona.com/api/v1';

export class PersonaClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Key-Inflection': 'snake'
      }
    });
  }

  // ── Inquiries ────────────────────────────────────────────

  async listInquiries(params?: {
    pageAfter?: string;
    pageBefore?: string;
    pageSize?: number;
    filterReferenceId?: string;
    filterAccountId?: string;
    filterStatus?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.filterReferenceId) query['filter[reference-id]'] = params.filterReferenceId;
    if (params?.filterAccountId) query['filter[account-id]'] = params.filterAccountId;
    if (params?.filterStatus) query['filter[status]'] = params.filterStatus;
    let res = await this.axios.get('/inquiries', { params: query });
    return res.data;
  }

  async createInquiry(body: {
    inquiryTemplateId?: string;
    templateId?: string;
    referenceId?: string;
    accountId?: string;
    note?: string;
    fields?: Record<string, any>;
    [key: string]: any;
  }): Promise<any> {
    let attributes: Record<string, any> = {};
    if (body.inquiryTemplateId) attributes['inquiry-template-id'] = body.inquiryTemplateId;
    if (body.templateId) attributes['template-id'] = body.templateId;
    if (body.referenceId) attributes['reference-id'] = body.referenceId;
    if (body.accountId) attributes['account-id'] = body.accountId;
    if (body.note) attributes.note = body.note;
    if (body.fields) attributes.fields = body.fields;

    let res = await this.axios.post('/inquiries', {
      data: {
        attributes
      }
    });
    return res.data;
  }

  async getInquiry(inquiryId: string): Promise<any> {
    let res = await this.axios.get(`/inquiries/${inquiryId}`);
    return res.data;
  }

  async updateInquiry(inquiryId: string, attributes: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/inquiries/${inquiryId}`, {
      data: { attributes }
    });
    return res.data;
  }

  async approveInquiry(inquiryId: string, comment?: string): Promise<any> {
    let body: Record<string, any> = {};
    if (comment) body.meta = { comment };
    let res = await this.axios.post(`/inquiries/${inquiryId}/approve`, body);
    return res.data;
  }

  async declineInquiry(inquiryId: string, comment?: string): Promise<any> {
    let body: Record<string, any> = {};
    if (comment) body.meta = { comment };
    let res = await this.axios.post(`/inquiries/${inquiryId}/decline`, body);
    return res.data;
  }

  async resumeInquiry(inquiryId: string): Promise<any> {
    let res = await this.axios.post(`/inquiries/${inquiryId}/resume`);
    return res.data;
  }

  async redactInquiry(inquiryId: string): Promise<any> {
    let res = await this.axios.delete(`/inquiries/${inquiryId}`);
    return res.data;
  }

  async generateInquiryLink(inquiryId: string, expiresIn?: number): Promise<any> {
    let body: Record<string, any> = {};
    if (expiresIn)
      body.meta = { 'auto-create-account-reference-id': undefined, 'expires-in': expiresIn };
    let res = await this.axios.post(`/inquiries/${inquiryId}/generate-one-time-link`, body);
    return res.data;
  }

  async addInquiryTag(inquiryId: string, tag: string): Promise<any> {
    let res = await this.axios.post(`/inquiries/${inquiryId}/add-tag`, {
      meta: { 'tag-name': tag }
    });
    return res.data;
  }

  async removeInquiryTag(inquiryId: string, tag: string): Promise<any> {
    let res = await this.axios.post(`/inquiries/${inquiryId}/remove-tag`, {
      meta: { 'tag-name': tag }
    });
    return res.data;
  }

  async setInquiryTags(inquiryId: string, tags: string[]): Promise<any> {
    let res = await this.axios.post(`/inquiries/${inquiryId}/set-tags`, {
      meta: { 'tag-name': tags }
    });
    return res.data;
  }

  // ── Accounts ─────────────────────────────────────────────

  async listAccounts(params?: {
    pageAfter?: string;
    pageBefore?: string;
    pageSize?: number;
    filterReferenceId?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.filterReferenceId) query['filter[reference-id]'] = params.filterReferenceId;
    let res = await this.axios.get('/accounts', { params: query });
    return res.data;
  }

  async createAccount(attributes: {
    referenceId?: string;
    nameFirst?: string;
    nameLast?: string;
    emailAddress?: string;
    phoneNumber?: string;
    tags?: string[];
    [key: string]: any;
  }): Promise<any> {
    let apiAttrs: Record<string, any> = {};
    if (attributes.referenceId) apiAttrs['reference-id'] = attributes.referenceId;
    if (attributes.nameFirst) apiAttrs['name-first'] = attributes.nameFirst;
    if (attributes.nameLast) apiAttrs['name-last'] = attributes.nameLast;
    if (attributes.emailAddress) apiAttrs['email-address'] = attributes.emailAddress;
    if (attributes.phoneNumber) apiAttrs['phone-number'] = attributes.phoneNumber;
    if (attributes.tags) apiAttrs.tags = attributes.tags;

    let res = await this.axios.post('/accounts', {
      data: { attributes: apiAttrs }
    });
    return res.data;
  }

  async getAccount(accountId: string): Promise<any> {
    let res = await this.axios.get(`/accounts/${accountId}`);
    return res.data;
  }

  async updateAccount(accountId: string, attributes: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/accounts/${accountId}`, {
      data: { attributes }
    });
    return res.data;
  }

  async redactAccount(accountId: string): Promise<any> {
    let res = await this.axios.delete(`/accounts/${accountId}`);
    return res.data;
  }

  async consolidateAccounts(
    primaryAccountId: string,
    secondaryAccountIds: string[]
  ): Promise<any> {
    let res = await this.axios.post(`/accounts/${primaryAccountId}/consolidate`, {
      meta: {
        'account-ids': secondaryAccountIds
      }
    });
    return res.data;
  }

  async addAccountTag(accountId: string, tag: string): Promise<any> {
    let res = await this.axios.post(`/accounts/${accountId}/add-tag`, {
      meta: { 'tag-name': tag }
    });
    return res.data;
  }

  async removeAccountTag(accountId: string, tag: string): Promise<any> {
    let res = await this.axios.post(`/accounts/${accountId}/remove-tag`, {
      meta: { 'tag-name': tag }
    });
    return res.data;
  }

  async setAccountTags(accountId: string, tags: string[]): Promise<any> {
    let res = await this.axios.post(`/accounts/${accountId}/set-tags`, {
      meta: { 'tag-name': tags }
    });
    return res.data;
  }

  // ── Verifications ────────────────────────────────────────

  async listVerifications(params?: {
    pageAfter?: string;
    pageBefore?: string;
    pageSize?: number;
    filterInquiryId?: string;
    filterStatus?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.filterInquiryId) query['filter[inquiry-id]'] = params.filterInquiryId;
    if (params?.filterStatus) query['filter[status]'] = params.filterStatus;
    let res = await this.axios.get('/verifications', { params: query });
    return res.data;
  }

  async getVerification(verificationId: string): Promise<any> {
    let res = await this.axios.get(`/verifications/${verificationId}`);
    return res.data;
  }

  async redactVerification(verificationId: string): Promise<any> {
    let res = await this.axios.delete(`/verifications/${verificationId}`);
    return res.data;
  }

  // ── Reports ──────────────────────────────────────────────

  async listReports(params?: {
    pageAfter?: string;
    pageBefore?: string;
    pageSize?: number;
    filterReportTemplateId?: string;
    filterReferenceId?: string;
    filterAccountId?: string;
    filterStatus?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.filterReportTemplateId)
      query['filter[report-template-id]'] = params.filterReportTemplateId;
    if (params?.filterReferenceId) query['filter[reference-id]'] = params.filterReferenceId;
    if (params?.filterAccountId) query['filter[account-id]'] = params.filterAccountId;
    if (params?.filterStatus) query['filter[status]'] = params.filterStatus;
    let res = await this.axios.get('/reports', { params: query });
    return res.data;
  }

  async createReport(reportTemplateId: string, attributes: Record<string, any>): Promise<any> {
    let res = await this.axios.post(`/reports`, {
      data: {
        attributes: {
          'report-template-id': reportTemplateId,
          ...attributes
        }
      }
    });
    return res.data;
  }

  async getReport(reportId: string): Promise<any> {
    let res = await this.axios.get(`/reports/${reportId}`);
    return res.data;
  }

  async redactReport(reportId: string): Promise<any> {
    let res = await this.axios.delete(`/reports/${reportId}`);
    return res.data;
  }

  // ── Transactions ─────────────────────────────────────────

  async listTransactions(params?: {
    pageAfter?: string;
    pageBefore?: string;
    pageSize?: number;
    filterReferenceId?: string;
    filterStatus?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.filterReferenceId) query['filter[reference-id]'] = params.filterReferenceId;
    if (params?.filterStatus) query['filter[status]'] = params.filterStatus;
    let res = await this.axios.get('/transactions', { params: query });
    return res.data;
  }

  async createTransaction(attributes: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/transactions', {
      data: { attributes }
    });
    return res.data;
  }

  async getTransaction(transactionId: string): Promise<any> {
    let res = await this.axios.get(`/transactions/${transactionId}`);
    return res.data;
  }

  async updateTransaction(
    transactionId: string,
    attributes: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.patch(`/transactions/${transactionId}`, {
      data: { attributes }
    });
    return res.data;
  }

  async redactTransaction(transactionId: string): Promise<any> {
    let res = await this.axios.delete(`/transactions/${transactionId}`);
    return res.data;
  }

  async addTransactionTag(transactionId: string, tag: string): Promise<any> {
    let res = await this.axios.post(`/transactions/${transactionId}/add-tag`, {
      meta: { 'tag-name': tag }
    });
    return res.data;
  }

  async removeTransactionTag(transactionId: string, tag: string): Promise<any> {
    let res = await this.axios.post(`/transactions/${transactionId}/remove-tag`, {
      meta: { 'tag-name': tag }
    });
    return res.data;
  }

  // ── Cases ────────────────────────────────────────────────

  async listCases(params?: {
    pageAfter?: string;
    pageBefore?: string;
    pageSize?: number;
    filterStatus?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.filterStatus) query['filter[status]'] = params.filterStatus;
    let res = await this.axios.get('/cases', { params: query });
    return res.data;
  }

  async createCase(attributes: {
    caseName?: string;
    caseTemplateId?: string;
    creatorId?: string;
    [key: string]: any;
  }): Promise<any> {
    let res = await this.axios.post('/cases', {
      data: { attributes }
    });
    return res.data;
  }

  async getCase(caseId: string): Promise<any> {
    let res = await this.axios.get(`/cases/${caseId}`);
    return res.data;
  }

  async updateCase(caseId: string, attributes: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/cases/${caseId}`, {
      data: { attributes }
    });
    return res.data;
  }

  async setCaseStatus(caseId: string, status: string): Promise<any> {
    let res = await this.axios.patch(`/cases/${caseId}/set-status`, {
      meta: { status }
    });
    return res.data;
  }

  async assignCase(caseId: string, assigneeId: string): Promise<any> {
    let res = await this.axios.post(`/cases/${caseId}/assign`, {
      meta: { 'assignee-id': assigneeId }
    });
    return res.data;
  }

  async addCaseTag(caseId: string, tag: string): Promise<any> {
    let res = await this.axios.post(`/cases/${caseId}/add-tag`, {
      meta: { 'tag-name': tag }
    });
    return res.data;
  }

  async removeCaseTag(caseId: string, tag: string): Promise<any> {
    let res = await this.axios.post(`/cases/${caseId}/remove-tag`, {
      meta: { 'tag-name': tag }
    });
    return res.data;
  }

  async redactCase(caseId: string): Promise<any> {
    let res = await this.axios.delete(`/cases/${caseId}`);
    return res.data;
  }

  // ── Lists ────────────────────────────────────────────────

  async listLists(params?: {
    pageAfter?: string;
    pageBefore?: string;
    pageSize?: number;
    filterIdInList?: string[];
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.filterIdInList) query['filter[id]'] = params.filterIdInList.join(',');
    let res = await this.axios.get('/lists', { params: query });
    return res.data;
  }

  async getList(listId: string): Promise<any> {
    let res = await this.axios.get(`/lists/${listId}`);
    return res.data;
  }

  async createList(
    listType: string,
    attributes: {
      name: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let res = await this.axios.post(`/lists/${listType}`, {
      data: { attributes }
    });
    return res.data;
  }

  async archiveList(listId: string): Promise<any> {
    let res = await this.axios.patch(`/lists/${listId}`, {
      data: { attributes: { status: 'archived' } }
    });
    return res.data;
  }

  // ── List Items ───────────────────────────────────────────

  async listListItems(
    listId: string,
    params?: {
      pageAfter?: string;
      pageBefore?: string;
      pageSize?: number;
    }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    let res = await this.axios.get(`/list-items`, {
      params: { ...query, 'filter[list-id]': listId }
    });
    return res.data;
  }

  async createListItem(listId: string, attributes: Record<string, any>): Promise<any> {
    let res = await this.axios.post(`/list-items`, {
      data: {
        attributes: {
          'list-id': listId,
          ...attributes
        }
      }
    });
    return res.data;
  }

  async getListItem(listItemId: string): Promise<any> {
    let res = await this.axios.get(`/list-items/${listItemId}`);
    return res.data;
  }

  async updateListItem(listItemId: string, attributes: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/list-items/${listItemId}`, {
      data: { attributes }
    });
    return res.data;
  }

  async archiveListItem(listItemId: string): Promise<any> {
    let res = await this.axios.patch(`/list-items/${listItemId}`, {
      data: { attributes: { status: 'archived' } }
    });
    return res.data;
  }

  // ── Events ───────────────────────────────────────────────

  async listEvents(params?: {
    pageAfter?: string;
    pageBefore?: string;
    pageSize?: number;
    filterEventType?: string;
  }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageAfter) query['page[after]'] = params.pageAfter;
    if (params?.pageBefore) query['page[before]'] = params.pageBefore;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.filterEventType) query['filter[name]'] = params.filterEventType;
    let res = await this.axios.get('/events', { params: query });
    return res.data;
  }

  async getEvent(eventId: string): Promise<any> {
    let res = await this.axios.get(`/events/${eventId}`);
    return res.data;
  }

  // ── Webhooks ─────────────────────────────────────────────

  async createWebhook(attributes: {
    url: string;
    enabledEvents: string[];
    apiKeyInflection?: string;
    secret?: string;
  }): Promise<any> {
    let res = await this.axios.post('/webhooks', {
      data: {
        attributes: {
          url: attributes.url,
          'enabled-events': attributes.enabledEvents,
          'api-key-inflection': attributes.apiKeyInflection || 'snake'
        }
      }
    });
    return res.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }

  async listWebhooks(): Promise<any> {
    let res = await this.axios.get('/webhooks');
    return res.data;
  }

  // ── Graph ────────────────────────────────────────────────

  async getAccountRelations(accountId: string): Promise<any> {
    let res = await this.axios.get(`/accounts/${accountId}/relationships`);
    return res.data;
  }
}
