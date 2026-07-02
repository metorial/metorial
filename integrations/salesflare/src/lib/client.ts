import { createAxios } from 'slates';

let BASE_URL = 'https://api.salesflare.com';

export class Client {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Accounts ──

  async listAccounts(params: Record<string, any> = {}) {
    let response = await this.axios.get('/accounts', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getAccount(accountId: number) {
    let response = await this.axios.get(`/accounts/${accountId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createAccount(data: Record<string, any>, updateIfExists = false) {
    let response = await this.axios.post('/accounts', data, {
      headers: this.headers,
      params: { update_if_exists: updateIfExists }
    });
    return response.data;
  }

  async updateAccount(accountId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/accounts/${accountId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteAccount(accountId: number) {
    let response = await this.axios.delete(`/accounts/${accountId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateAccountContacts(
    accountId: number,
    contacts: Array<{ id: number; _dirty?: boolean; _deleted?: boolean }>
  ) {
    let response = await this.axios.put(`/accounts/${accountId}/contacts`, contacts, {
      headers: this.headers
    });
    return response.data;
  }

  async updateAccountUsers(
    accountId: number,
    users: Array<{ id: number; _dirty?: boolean; _deleted?: boolean }>
  ) {
    let response = await this.axios.put(`/accounts/${accountId}/users`, users, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Contacts ──

  async listContacts(params: Record<string, any> = {}) {
    let response = await this.axios.get('/contacts', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getContact(contactId: number) {
    let response = await this.axios.get(`/contacts/${contactId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createContact(data: Record<string, any>, force = true) {
    let response = await this.axios.post('/contacts', data, {
      headers: this.headers,
      params: { force }
    });
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/contacts/${contactId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteContact(contactId: number) {
    let response = await this.axios.delete(`/contacts/${contactId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Opportunities ──

  async listOpportunities(params: Record<string, any> = {}) {
    let response = await this.axios.get('/opportunities', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getOpportunity(opportunityId: number) {
    let response = await this.axios.get(`/opportunities/${opportunityId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createOpportunity(data: Record<string, any>) {
    let response = await this.axios.post('/opportunities', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateOpportunity(opportunityId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/opportunities/${opportunityId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteOpportunity(opportunityId: number) {
    let response = await this.axios.delete(`/opportunities/${opportunityId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Tasks ──

  async listTasks(params: Record<string, any> = {}) {
    let response = await this.axios.get('/tasks', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.axios.post('/tasks', [data], {
      headers: this.headers
    });
    return response.data;
  }

  async updateTask(taskId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/tasks/${taskId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteTask(taskId: number) {
    let response = await this.axios.delete(`/tasks/${taskId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Internal Notes (Messages) ──

  async createNote(data: {
    account: number;
    body: string;
    mentions?: number[];
    date?: string;
  }) {
    let response = await this.axios.post('/messages', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateNote(
    messageId: number,
    data: { account: number; body: string; mentions?: number[]; date?: string }
  ) {
    let response = await this.axios.put(`/messages/${messageId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteNote(messageId: number) {
    let response = await this.axios.delete(`/messages/${messageId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listAccountMessages(accountId: number, params: Record<string, any> = {}) {
    let response = await this.axios.get(`/accounts/${accountId}/messages`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ── Meetings ──

  async createMeeting(data: Record<string, any>) {
    let response = await this.axios.post('/meetings', [data], {
      headers: this.headers
    });
    return response.data;
  }

  async getMeeting(meetingId: number) {
    let response = await this.axios.get(`/meetings/${meetingId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateMeeting(meetingId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/meetings/${meetingId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteMeeting(meetingId: number) {
    let response = await this.axios.delete(`/meetings/${meetingId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Calls ──

  async createCall(data: Record<string, any>) {
    let response = await this.axios.post('/calls', [data], {
      headers: this.headers
    });
    return response.data;
  }

  async updateCall(callId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/calls/${callId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Tags ──

  async listTags(params: Record<string, any> = {}) {
    let response = await this.axios.get('/tags', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTag(tagId: number) {
    let response = await this.axios.get(`/tags/${tagId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTag(name: string) {
    let response = await this.axios.post(
      '/tags',
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateTag(tagId: number, name: string) {
    let response = await this.axios.put(
      `/tags/${tagId}`,
      { name },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteTag(tagId: number) {
    let response = await this.axios.delete(`/tags/${tagId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getTagUsage(tagId: number) {
    let response = await this.axios.get(`/tags/${tagId}/usage`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Pipelines & Stages ──

  async listPipelines(params: Record<string, any> = {}) {
    let response = await this.axios.get('/pipelines', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async listStages(params: Record<string, any> = {}) {
    let response = await this.axios.get('/stages', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getStage(stageId: number) {
    let response = await this.axios.get(`/stages/${stageId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Users ──

  async getMe() {
    let response = await this.axios.get('/me', {
      headers: this.headers
    });
    return response.data;
  }

  async listUsers(params: Record<string, any> = {}) {
    let response = await this.axios.get('/users', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.axios.get(`/users/${userId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Custom Fields ──

  async listCustomFields(itemClass: string, params: Record<string, any> = {}) {
    let response = await this.axios.get(`/customfields/${itemClass}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createCustomField(itemClass: string, data: Record<string, any>) {
    let response = await this.axios.post(`/customfields/${itemClass}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCustomField(itemClass: string, fieldId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/customfields/${itemClass}/${fieldId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCustomField(itemClass: string, fieldId: number) {
    let response = await this.axios.delete(`/customfields/${itemClass}/${fieldId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listCustomFieldTypes() {
    let response = await this.axios.get('/customfields/types', {
      headers: this.headers
    });
    return response.data;
  }

  // ── Workflows ──

  async listWorkflows(params: Record<string, any> = {}) {
    let response = await this.axios.get('/workflows', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getWorkflow(workflowId: number) {
    let response = await this.axios.get(`/workflows/${workflowId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createWorkflow(data: Record<string, any>) {
    let response = await this.axios.post('/workflows', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateWorkflow(workflowId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/workflows/${workflowId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateWorkflowAudience(
    workflowId: number,
    recordId: number,
    data: { exited?: boolean; met_goal?: boolean }
  ) {
    let response = await this.axios.put(
      `/workflows/${workflowId}/audience/${recordId}`,
      data,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ── Currencies ──

  async listCurrencies() {
    let response = await this.axios.get('/currencies', {
      headers: this.headers
    });
    return response.data;
  }

  // ── Groups ──

  async listGroups() {
    let response = await this.axios.get('/groups', {
      headers: this.headers
    });
    return response.data;
  }

  // ── Email Data Sources ──

  async listEmailDataSources(includeTeamDataSources = false) {
    let response = await this.axios.get('/datasources/email', {
      headers: this.headers,
      params: { includeTeamDataSources }
    });
    return response.data;
  }

  async updateEmailDataSource(id: number, data: Record<string, any>) {
    let response = await this.axios.put(`/datasources/email/${id}`, data, {
      headers: this.headers
    });
    return response.data;
  }
}
