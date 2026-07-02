import { createAxios } from 'slates';
import { activeCampaignApiError, activeCampaignServiceError } from './errors';

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface ContactInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  fieldValues?: Array<{ field: string; value: string }>;
}

export interface DealInput {
  title?: string;
  contactId?: string;
  accountId?: string;
  description?: string;
  currency?: string;
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  value?: number;
  percent?: number;
  status?: number;
  fields?: Array<{ customFieldId: number; fieldValue: string; fieldCurrency?: string }>;
}

export interface TagInput {
  tag: string;
  tagType: string;
  description?: string;
}

export interface ListInput {
  name: string;
  stringid: string;
  senderUrl: string;
  senderReminder: string;
  channel?: 'email' | 'sms';
  sendLastBroadcast?: boolean;
  carboncopy?: string;
  subscription_notify?: string;
  unsubscription_notify?: string;
  user?: number;
}

export interface AccountInput {
  name: string;
  accountUrl?: string;
  fields?: Array<{ customFieldId: number; fieldValue: string }>;
}

export interface WebhookInput {
  name: string;
  url: string;
  events: string[];
  sources: string[];
  listid?: string;
}

export interface TaskInput {
  title?: string;
  relType?: string;
  relId?: string;
  duedate?: string;
  dealTasktype?: string;
  note?: string;
  ownerId?: string;
  outcomeId?: number;
  status?: number;
}

export class Client {
  private axios;

  constructor(params: { token: string; apiUrl: string }) {
    if (!params.token?.trim()) {
      throw activeCampaignServiceError('ActiveCampaign API key is required.');
    }

    if (!params.apiUrl?.trim()) {
      throw activeCampaignServiceError('ActiveCampaign API URL is required.');
    }

    let baseUrl = params.apiUrl
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/api\/3$/i, '');
    if (!/^https:\/\//i.test(baseUrl)) {
      throw activeCampaignServiceError(
        'ActiveCampaign API URL must be the full HTTPS URL from Settings > Developer.'
      );
    }

    this.axios = createAxios({
      baseURL: `${baseUrl}/api/3`,
      headers: {
        'Api-Token': params.token,
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors?.response?.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(activeCampaignApiError(error))
    );
  }

  // ─── Contacts ───────────────────────────────────────────────

  async createContact(contact: ContactInput) {
    let res = await this.axios.post('/contacts', { contact });
    return res.data;
  }

  async syncContact(contact: ContactInput) {
    let res = await this.axios.post('/contact/sync', { contact });
    return res.data;
  }

  async getContact(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}`);
    return res.data;
  }

  async updateContact(contactId: string, contact: ContactInput) {
    let res = await this.axios.put(`/contacts/${contactId}`, { contact });
    return res.data;
  }

  async deleteContact(contactId: string) {
    let res = await this.axios.delete(`/contacts/${contactId}`);
    return res.data;
  }

  async listContacts(
    params?: PaginationParams & {
      search?: string;
      email?: string;
      email_like?: string;
      listid?: string;
      tagid?: string;
      status?: number;
      id_greater?: number;
      'orders[id]'?: string;
      orderBy?: string;
    }
  ) {
    let res = await this.axios.get('/contacts', { params });
    return res.data;
  }

  async getContactFieldValues(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}/fieldValues`);
    return res.data;
  }

  async getContactTags(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}/contactTags`);
    return res.data;
  }

  async getContactLists(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}/contactLists`);
    return res.data;
  }

  async getContactDeals(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}/contactDeals`);
    return res.data;
  }

  async getContactAutomations(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}/contactAutomations`);
    return res.data;
  }

  // ─── Contact Tags ──────────────────────────────────────────

  async addTagToContact(contactId: string, tagId: string) {
    let res = await this.axios.post('/contactTags', {
      contactTag: { contact: contactId, tag: tagId }
    });
    return res.data;
  }

  async removeTagFromContact(contactTagId: string) {
    let res = await this.axios.delete(`/contactTags/${contactTagId}`);
    return res.data;
  }

  // ─── Contact List Subscriptions ────────────────────────────

  async updateContactListStatus(contactId: string, listId: string, status: number) {
    let res = await this.axios.post('/contactLists', {
      contactList: { list: listId, contact: contactId, status }
    });
    return res.data;
  }

  // ─── Contact Automations ──────────────────────────────────

  async addContactToAutomation(contactId: string, automationId: string) {
    let res = await this.axios.post('/contactAutomations', {
      contactAutomation: { contact: contactId, automation: automationId }
    });
    return res.data;
  }

  async removeContactFromAutomation(contactAutomationId: string) {
    let res = await this.axios.delete(`/contactAutomations/${contactAutomationId}`);
    return res.data;
  }

  // ─── Contact Notes ─────────────────────────────────────────

  async createContactNote(contactId: string, note: string) {
    let res = await this.axios.post(`/contacts/${contactId}/notes`, {
      note: { note }
    });
    return res.data;
  }

  // ─── Tags ──────────────────────────────────────────────────

  async createTag(tag: TagInput) {
    let res = await this.axios.post('/tags', { tag });
    return res.data;
  }

  async getTag(tagId: string) {
    let res = await this.axios.get(`/tags/${tagId}`);
    return res.data;
  }

  async updateTag(tagId: string, tag: Partial<TagInput>) {
    let res = await this.axios.put(`/tags/${tagId}`, { tag });
    return res.data;
  }

  async deleteTag(tagId: string) {
    let res = await this.axios.delete(`/tags/${tagId}`);
    return res.data;
  }

  async listTags(params?: PaginationParams & { search?: string }) {
    let res = await this.axios.get('/tags', { params });
    return res.data;
  }

  // ─── Deals ─────────────────────────────────────────────────

  async createDeal(deal: DealInput) {
    let payload: Record<string, any> = {};
    if (deal.title) payload.title = deal.title;
    if (deal.contactId) payload.contact = deal.contactId;
    if (deal.accountId) payload.account = deal.accountId;
    if (deal.description) payload.description = deal.description;
    if (deal.currency) payload.currency = deal.currency;
    if (deal.pipelineId) payload.group = deal.pipelineId;
    if (deal.stageId) payload.stage = deal.stageId;
    if (deal.ownerId) payload.owner = deal.ownerId;
    if (deal.value !== undefined) payload.value = deal.value;
    if (deal.percent !== undefined) payload.percent = deal.percent;
    if (deal.status !== undefined) payload.status = deal.status;
    if (deal.fields) payload.fields = deal.fields;

    let res = await this.axios.post('/deals', { deal: payload });
    return res.data;
  }

  async getDeal(dealId: string) {
    let res = await this.axios.get(`/deals/${dealId}`);
    return res.data;
  }

  async updateDeal(dealId: string, deal: DealInput) {
    let payload: Record<string, any> = {};
    if (deal.title) payload.title = deal.title;
    if (deal.contactId) payload.contact = deal.contactId;
    if (deal.accountId) payload.account = deal.accountId;
    if (deal.description !== undefined) payload.description = deal.description;
    if (deal.currency) payload.currency = deal.currency;
    if (deal.pipelineId) payload.group = deal.pipelineId;
    if (deal.stageId) payload.stage = deal.stageId;
    if (deal.ownerId) payload.owner = deal.ownerId;
    if (deal.value !== undefined) payload.value = deal.value;
    if (deal.percent !== undefined) payload.percent = deal.percent;
    if (deal.status !== undefined) payload.status = deal.status;
    if (deal.fields) payload.fields = deal.fields;

    let res = await this.axios.put(`/deals/${dealId}`, { deal: payload });
    return res.data;
  }

  async deleteDeal(dealId: string) {
    let res = await this.axios.delete(`/deals/${dealId}`);
    return res.data;
  }

  async listDeals(
    params?: PaginationParams & {
      search?: string;
      'filters[stage]'?: string;
      'filters[group]'?: string;
      'filters[status]'?: number;
      'filters[owner]'?: string;
      'filters[contact_id]'?: string;
    }
  ) {
    let res = await this.axios.get('/deals', { params });
    return res.data;
  }

  // ─── Deal Notes ────────────────────────────────────────────

  async createDealNote(dealId: string, note: string) {
    let res = await this.axios.post(`/deals/${dealId}/notes`, {
      note: { note }
    });
    return res.data;
  }

  // ─── Pipelines ─────────────────────────────────────────────

  async listPipelines(params?: PaginationParams) {
    let res = await this.axios.get('/dealGroups', { params });
    return res.data;
  }

  async getPipeline(pipelineId: string) {
    let res = await this.axios.get(`/dealGroups/${pipelineId}`);
    return res.data;
  }

  // ─── Stages ────────────────────────────────────────────────

  async listStages(params?: PaginationParams & { 'filters[d_groupid]'?: string }) {
    let res = await this.axios.get('/dealStages', { params });
    return res.data;
  }

  async getStage(stageId: string) {
    let res = await this.axios.get(`/dealStages/${stageId}`);
    return res.data;
  }

  // ─── Lists ─────────────────────────────────────────────────

  async createList(list: ListInput) {
    let payload: Record<string, any> = {
      name: list.name,
      stringid: list.stringid,
      sender_url: list.senderUrl,
      sender_reminder: list.senderReminder
    };

    if (list.channel) payload.channel = list.channel;
    if (list.sendLastBroadcast !== undefined)
      payload.send_last_broadcast = list.sendLastBroadcast;
    if (list.carboncopy !== undefined) payload.carboncopy = list.carboncopy;
    if (list.subscription_notify !== undefined)
      payload.subscription_notify = list.subscription_notify;
    if (list.unsubscription_notify !== undefined)
      payload.unsubscription_notify = list.unsubscription_notify;
    if (list.user !== undefined) payload.user = list.user;

    let res = await this.axios.post('/lists', { list: payload });
    return res.data;
  }

  async getList(listId: string) {
    let res = await this.axios.get(`/lists/${listId}`);
    return res.data;
  }

  async updateList(listId: string, list: Partial<ListInput>) {
    let payload: Record<string, any> = {};
    if (list.name !== undefined) payload.name = list.name;
    if (list.stringid !== undefined) payload.stringid = list.stringid;
    if (list.senderUrl !== undefined) payload.sender_url = list.senderUrl;
    if (list.senderReminder !== undefined) payload.sender_reminder = list.senderReminder;
    if (list.channel !== undefined) payload.channel = list.channel;
    if (list.sendLastBroadcast !== undefined)
      payload.send_last_broadcast = list.sendLastBroadcast;
    if (list.carboncopy !== undefined) payload.carboncopy = list.carboncopy;
    if (list.subscription_notify !== undefined)
      payload.subscription_notify = list.subscription_notify;
    if (list.unsubscription_notify !== undefined)
      payload.unsubscription_notify = list.unsubscription_notify;
    if (list.user !== undefined) payload.user = list.user;

    let res = await this.axios.put(`/lists/${listId}`, { list: payload });
    return res.data;
  }

  async deleteList(listId: string) {
    let res = await this.axios.delete(`/lists/${listId}`);
    return res.data;
  }

  async listLists(params?: PaginationParams & { 'filters[name]'?: string }) {
    let res = await this.axios.get('/lists', { params });
    return res.data;
  }

  // ─── Automations ──────────────────────────────────────────

  async listAutomations(params?: PaginationParams) {
    let res = await this.axios.get('/automations', { params });
    return res.data;
  }

  async getAutomation(automationId: string) {
    let res = await this.axios.get(`/automations/${automationId}`);
    return res.data;
  }

  // ─── Campaigns ─────────────────────────────────────────────

  async listCampaigns(params?: PaginationParams & { 'orders[sdate]'?: string }) {
    let res = await this.axios.get('/campaigns', { params });
    return res.data;
  }

  async getCampaign(campaignId: string) {
    let res = await this.axios.get(`/campaigns/${campaignId}`);
    return res.data;
  }

  // ─── Accounts (Companies) ─────────────────────────────────

  async createAccount(account: AccountInput) {
    let payload: Record<string, any> = { name: account.name };
    if (account.accountUrl) payload.accountUrl = account.accountUrl;
    if (account.fields) payload.fields = account.fields;

    let res = await this.axios.post('/accounts', { account: payload });
    return res.data;
  }

  async getAccount(accountId: string) {
    let res = await this.axios.get(`/accounts/${accountId}`);
    return res.data;
  }

  async updateAccount(accountId: string, account: Partial<AccountInput>) {
    let payload: Record<string, any> = {};
    if (account.name) payload.name = account.name;
    if (account.accountUrl !== undefined) payload.accountUrl = account.accountUrl;
    if (account.fields) payload.fields = account.fields;

    let res = await this.axios.put(`/accounts/${accountId}`, { account: payload });
    return res.data;
  }

  async deleteAccount(accountId: string) {
    let res = await this.axios.delete(`/accounts/${accountId}`);
    return res.data;
  }

  async listAccounts(params?: PaginationParams & { search?: string; count_deals?: boolean }) {
    let res = await this.axios.get('/accounts', { params });
    return res.data;
  }

  async associateContactWithAccount(contactId: string, accountId: string, jobTitle?: string) {
    let res = await this.axios.post('/accountContacts', {
      accountContact: {
        contact: contactId,
        account: accountId,
        ...(jobTitle ? { jobTitle } : {})
      }
    });
    return res.data;
  }

  // ─── Account Notes ─────────────────────────────────────────

  async createAccountNote(accountId: string, note: string) {
    let res = await this.axios.post(`/accounts/${accountId}/notes`, {
      note: { note }
    });
    return res.data;
  }

  // ─── Tasks ─────────────────────────────────────────────────

  async createTask(task: TaskInput) {
    let payload: Record<string, any> = {};
    if (task.title) payload.title = task.title;
    if (task.relType) payload.reltype = task.relType;
    if (task.relId) payload.relid = task.relId;
    if (task.duedate) payload.duedate = task.duedate;
    if (task.dealTasktype) payload.dealTasktype = task.dealTasktype;
    if (task.note) payload.note = task.note;
    if (task.ownerId) payload.assignee = task.ownerId;
    if (task.outcomeId !== undefined) payload.outcomeId = task.outcomeId;
    if (task.status !== undefined) payload.status = task.status;

    let res = await this.axios.post('/dealTasks', { dealTask: payload });
    return res.data;
  }

  async getTask(taskId: string) {
    let res = await this.axios.get(`/dealTasks/${taskId}`);
    return res.data;
  }

  async updateTask(taskId: string, task: TaskInput) {
    let payload: Record<string, any> = {};
    if (task.title) payload.title = task.title;
    if (task.relType) payload.reltype = task.relType;
    if (task.relId) payload.relid = task.relId;
    if (task.duedate) payload.duedate = task.duedate;
    if (task.dealTasktype) payload.dealTasktype = task.dealTasktype;
    if (task.note !== undefined) payload.note = task.note;
    if (task.ownerId) payload.assignee = task.ownerId;
    if (task.outcomeId !== undefined) payload.outcomeId = task.outcomeId;
    if (task.status !== undefined) payload.status = task.status;

    let res = await this.axios.put(`/dealTasks/${taskId}`, { dealTask: payload });
    return res.data;
  }

  async deleteTask(taskId: string) {
    let res = await this.axios.delete(`/dealTasks/${taskId}`);
    return res.data;
  }

  async listTasks(
    params?: PaginationParams & {
      'filters[title]'?: string;
      'filters[reltype]'?: string;
      'filters[relid]'?: string;
      'filters[status]'?: number;
      'filters[note]'?: string;
      'filters[duedate]'?: string;
      'filters[due_after]'?: string;
      'filters[due_before]'?: string;
      'filters[duedate_range]'?: string;
      'filters[d_tasktypeid]'?: string;
      'filters[assignee_userid]'?: string;
      'filters[outcome_id]'?: number;
    }
  ) {
    let res = await this.axios.get('/dealTasks', { params });
    return res.data;
  }

  // ─── Task Types ────────────────────────────────────────────

  async listTaskTypes() {
    let res = await this.axios.get('/dealTasktypes');
    return res.data;
  }

  // ─── Custom Fields ────────────────────────────────────────

  async listContactCustomFields(params?: PaginationParams) {
    let res = await this.axios.get('/fields', { params });
    return res.data;
  }

  async listDealCustomFields(params?: PaginationParams) {
    let res = await this.axios.get('/dealCustomFieldMeta', { params });
    return res.data;
  }

  async listAccountCustomFields(params?: PaginationParams) {
    let res = await this.axios.get('/accountCustomFieldMeta', { params });
    return res.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────

  async createWebhook(webhook: WebhookInput) {
    let res = await this.axios.post('/webhooks', { webhook });
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }

  async listWebhooks(params?: PaginationParams) {
    let res = await this.axios.get('/webhooks', { params });
    return res.data;
  }

  // ─── Users ─────────────────────────────────────────────────

  async listUsers() {
    let res = await this.axios.get('/users');
    return res.data;
  }

  async getCurrentUser() {
    let res = await this.axios.get('/users/me');
    return res.data;
  }

  // ─── Segments ──────────────────────────────────────────────

  async listSegments(params?: PaginationParams) {
    let res = await this.axios.get('/segments', { params });
    return res.data;
  }

  // ─── Scores ────────────────────────────────────────────────

  async listScores(params?: PaginationParams) {
    let res = await this.axios.get('/scores', { params });
    return res.data;
  }
}
