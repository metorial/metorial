import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.reply.io'
});

export interface SequenceListParams {
  top?: number;
  skip?: number;
  name?: string;
  status?: 'Active' | 'Paused' | 'New' | 'Archived';
}

export interface ContactListParams {
  top?: number;
  skip?: number;
  email?: string;
  linkedIn?: string;
}

export interface ContactData {
  firstName: string;
  email?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  company?: string;
  companySize?: string;
  industry?: string;
  linkedInProfile?: string;
  linkedInSalesNavigator?: string;
  linkedInRecruiter?: string;
  city?: string;
  state?: string;
  country?: string;
  timeZone?: string;
  notes?: string;
  customFields?: Array<{ key: string; value: string }>;
}

export interface TaskListParams {
  status?: string;
  taskType?: string;
  dueDate?: string;
}

export interface WebhookCreateParams {
  targetUrl: string;
  eventTypes: string[];
  secret?: string;
  subscriptionLevel?: 'sequence' | 'account' | 'team' | 'organization';
  sequenceIds?: number[];
  teamIds?: number[];
  accountId?: number;
  organizationId?: number;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return { 'X-API-Key': this.token };
  }

  // ---- Sequences (Campaigns) ----

  async listSequences(params?: SequenceListParams) {
    let response = await http.get('/v3/sequences', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getSequence(sequenceId: number) {
    let response = await http.get(`/v3/sequences/${sequenceId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createSequence(data: Record<string, any>) {
    let response = await http.post('/v3/sequences', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateSequence(sequenceId: number, data: Record<string, any>) {
    let response = await http.patch(`/v3/sequences/${sequenceId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteSequence(sequenceId: number) {
    await http.delete(`/v3/sequences/${sequenceId}`, {
      headers: this.headers()
    });
  }

  async startSequence(sequenceId: number) {
    let response = await http.post(
      `/v3/sequences/${sequenceId}/start`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async pauseSequence(sequenceId: number) {
    let response = await http.post(
      `/v3/sequences/${sequenceId}/pause`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async archiveSequence(sequenceId: number) {
    let response = await http.post(
      `/v3/sequences/${sequenceId}/archive`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // ---- Sequence Steps ----

  async listSequenceSteps(sequenceId: number) {
    let response = await http.get(`/v3/sequences/${sequenceId}/steps`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getSequenceStep(sequenceId: number, stepId: number) {
    let response = await http.get(`/v3/sequences/${sequenceId}/steps/${stepId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Sequence Contacts ----

  async listSequenceContacts(
    sequenceId: number,
    params?: { top?: number; skip?: number; additionalColumns?: string }
  ) {
    let response = await http.get(`/v3/sequences/${sequenceId}/contacts/extended`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async addContactToSequence(sequenceId: number, data: Record<string, any>) {
    let response = await http.post(`/v3/sequences/${sequenceId}/contacts`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async removeContactFromSequence(sequenceId: number, data: Record<string, any>) {
    let response = await http.delete(`/v3/sequences/${sequenceId}/contacts`, {
      headers: this.headers(),
      data
    });
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params?: ContactListParams) {
    let response = await http.get('/v3/contacts', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getContact(contactId: number) {
    let response = await http.get(`/v3/contacts/${contactId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async searchContacts(email: string) {
    let response = await http.get('/v3/contacts/search', {
      headers: this.headers(),
      params: { email }
    });
    return response.data;
  }

  async createContact(data: ContactData) {
    let response = await http.post('/v3/contacts', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateContact(contactId: number, data: Partial<ContactData>) {
    let response = await http.patch(`/v3/contacts/${contactId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteContact(contactId: number) {
    await http.delete(`/v3/contacts/${contactId}`, {
      headers: this.headers()
    });
  }

  // ---- Contact Lists ----

  async listContactLists() {
    let response = await http.get('/v3/lists', {
      headers: this.headers()
    });
    return response.data;
  }

  async getContactList(listId: number) {
    let response = await http.get(`/v3/lists/${listId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createContactList(name: string) {
    let response = await http.post(
      '/v3/lists',
      { name },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async updateContactList(listId: number, name: string) {
    let response = await http.patch(
      `/v3/lists/${listId}`,
      { name },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async deleteContactList(listId: number) {
    await http.delete(`/v3/lists/${listId}`, {
      headers: this.headers()
    });
  }

  // ---- Templates ----

  async listTemplates() {
    let response = await http.get('/v3/templates', {
      headers: this.headers()
    });
    return response.data;
  }

  async getTemplate(templateId: number) {
    let response = await http.get(`/v3/templates/${templateId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createTemplate(data: {
    name: string;
    subject?: string;
    body?: string;
    categoryId?: number;
  }) {
    let response = await http.post('/v3/templates', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateTemplate(
    templateId: number,
    data: { name?: string; subject?: string; body?: string; categoryId?: number }
  ) {
    let response = await http.patch(`/v3/templates/${templateId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteTemplate(templateId: number) {
    await http.delete(`/v3/templates/${templateId}`, {
      headers: this.headers()
    });
  }

  // ---- Email Accounts ----

  async listEmailAccounts() {
    let response = await http.get('/v3/email-accounts', {
      headers: this.headers()
    });
    return response.data;
  }

  async getEmailAccount(emailAccountId: number) {
    let response = await http.get(`/v3/email-accounts/${emailAccountId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async listDisconnectedEmailAccounts() {
    let response = await http.get('/v3/email-accounts/disconnected', {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Blacklist ----

  async listBlacklist(type?: 'domain' | 'email') {
    let response = await http.get('/v3/blacklists', {
      headers: this.headers(),
      params: type ? { type } : undefined
    });
    return response.data;
  }

  async addToBlacklist(data: { domains?: string[]; emails?: string[] }) {
    let response = await http.post('/v3/blacklists', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async removeFromBlacklist(data: { domains?: string[]; emails?: string[] }) {
    let response = await http.delete('/v3/blacklists', {
      headers: this.headers(),
      data
    });
    return response.data;
  }

  // ---- Tasks ----

  async listTasks(params?: TaskListParams) {
    let response = await http.get('/v3/tasks', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await http.get(`/v3/tasks/${taskId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await http.post('/v3/tasks', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let response = await http.patch(`/v3/tasks/${taskId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteTask(taskId: string) {
    await http.delete(`/v3/tasks/${taskId}`, {
      headers: this.headers()
    });
  }

  // ---- Statistics ----

  async getSequenceStatistics(params?: { sequenceId?: number }) {
    let response = await http.get('/v3/statistics/sequences', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getSequenceEmailStatistics(params?: { sequenceId?: number }) {
    let response = await http.get('/v3/statistics/sequences/emails', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getSequenceContactStatistics(params?: { sequenceId?: number }) {
    let response = await http.get('/v3/statistics/sequences/contacts', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getTeamPerformance(params: { from: string; to?: string; filter?: string }) {
    let response = await http.get('/v3/reports/team-performance', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ---- Schedules ----

  async listSchedules(params?: { name?: string; isDefault?: boolean; sequenceId?: string }) {
    let response = await http.get('/v3/schedules', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getSchedule(scheduleId: string) {
    let response = await http.get(`/v3/schedules/${scheduleId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createSchedule(data: Record<string, any>) {
    let response = await http.post('/v3/schedules', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateSchedule(scheduleId: string, data: Record<string, any>) {
    let response = await http.patch(`/v3/schedules/${scheduleId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteSchedule(scheduleId: string) {
    await http.delete(`/v3/schedules/${scheduleId}`, {
      headers: this.headers()
    });
  }

  // ---- Branded Links ----

  async listBrandedLinks() {
    let response = await http.get('/v3/branded-links', {
      headers: this.headers()
    });
    return response.data;
  }

  async getBrandedLink(linkId: number) {
    let response = await http.get(`/v3/branded-links/${linkId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks() {
    let response = await http.get('/v3/webhooks', {
      headers: this.headers()
    });
    return response.data;
  }

  async createWebhook(data: WebhookCreateParams) {
    let response = await http.post('/v3/webhooks', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await http.get(`/v3/webhooks/${webhookId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await http.delete(`/v3/webhooks/${webhookId}`, {
      headers: this.headers()
    });
  }

  async enableWebhook(webhookId: string) {
    let response = await http.post(
      `/v3/webhooks/${webhookId}/enable`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async disableWebhook(webhookId: string) {
    let response = await http.post(
      `/v3/webhooks/${webhookId}/disable`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // ---- V1 Actions (Legacy) ----

  async addAndPushToCampaign(data: Record<string, any>) {
    let response = await http.post('/v1/actions/addandpushtocampaign', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async markAsReplied(data: { email: string; campaignId?: number }) {
    let response = await http.post('/v1/actions/markasreplied', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async markAsFinished(data: { email: string; campaignId?: number }) {
    let response = await http.post('/v1/actions/markasfinished', data, {
      headers: this.headers()
    });
    return response.data;
  }
}
