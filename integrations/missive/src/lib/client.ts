import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://public.missiveapp.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Conversations ───

  async listConversations(params: Record<string, string | number | boolean>) {
    let res = await this.axios.get('/conversations', { params });
    return res.data;
  }

  async getConversation(conversationId: string) {
    let res = await this.axios.get(`/conversations/${conversationId}`);
    return res.data;
  }

  async mergeConversations(conversationId: string, targetId: string, subject?: string) {
    let body: Record<string, string> = { target: targetId };
    if (subject) body.subject = subject;
    let res = await this.axios.post(`/conversations/${conversationId}/merge`, body);
    return res.data;
  }

  // ─── Messages ───

  async listConversationMessages(
    conversationId: string,
    params?: Record<string, string | number>
  ) {
    let res = await this.axios.get(`/conversations/${conversationId}/messages`, { params });
    return res.data;
  }

  async getMessages(messageIds: string[]) {
    let res = await this.axios.get(`/messages/${messageIds.join(',')}`);
    return res.data;
  }

  async createMessage(message: Record<string, any>) {
    let res = await this.axios.post('/messages', { messages: message });
    return res.data;
  }

  // ─── Drafts ───

  async listConversationDrafts(
    conversationId: string,
    params?: Record<string, string | number>
  ) {
    let res = await this.axios.get(`/conversations/${conversationId}/drafts`, { params });
    return res.data;
  }

  async createDraft(draft: Record<string, any>) {
    let res = await this.axios.post('/drafts', { drafts: draft });
    return res.data;
  }

  async deleteDraft(draftId: string) {
    let res = await this.axios.delete(`/drafts/${draftId}`);
    return res.data;
  }

  // ─── Posts ───

  async listConversationPosts(
    conversationId: string,
    params?: Record<string, string | number>
  ) {
    let res = await this.axios.get(`/conversations/${conversationId}/posts`, { params });
    return res.data;
  }

  async createPost(post: Record<string, any>) {
    let res = await this.axios.post('/posts', { posts: post });
    return res.data;
  }

  async deletePost(postId: string) {
    let res = await this.axios.delete(`/posts/${postId}`);
    return res.data;
  }

  // ─── Comments ───

  async listConversationComments(
    conversationId: string,
    params?: Record<string, string | number>
  ) {
    let res = await this.axios.get(`/conversations/${conversationId}/comments`, { params });
    return res.data;
  }

  // ─── Contacts ───

  async listContacts(params: Record<string, string | number | boolean>) {
    let res = await this.axios.get('/contacts', { params });
    return res.data;
  }

  async getContact(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}`);
    return res.data;
  }

  async createContacts(contacts: Record<string, any>) {
    let res = await this.axios.post('/contacts', { contacts });
    return res.data;
  }

  async updateContacts(contactIds: string[], data: Record<string, any>) {
    let res = await this.axios.patch(`/contacts/${contactIds.join(',')}`, { contacts: data });
    return res.data;
  }

  // ─── Contact Books ───

  async listContactBooks(params?: Record<string, string | number>) {
    let res = await this.axios.get('/contact_books', { params });
    return res.data;
  }

  // ─── Contact Groups ───

  async listContactGroups(params: Record<string, string | number>) {
    let res = await this.axios.get('/contact_groups', { params });
    return res.data;
  }

  // ─── Shared Labels ───

  async listSharedLabels(params?: Record<string, string | number>) {
    let res = await this.axios.get('/shared_labels', { params });
    return res.data;
  }

  async createSharedLabels(labels: Record<string, any>) {
    let res = await this.axios.post('/shared_labels', { shared_labels: labels });
    return res.data;
  }

  async updateSharedLabels(labelIds: string[], data: Record<string, any>) {
    let res = await this.axios.patch(`/shared_labels/${labelIds.join(',')}`, {
      shared_labels: data
    });
    return res.data;
  }

  // ─── Teams ───

  async listTeams(params?: Record<string, string | number>) {
    let res = await this.axios.get('/teams', { params });
    return res.data;
  }

  async createTeams(teams: Record<string, any>) {
    let res = await this.axios.post('/teams', { teams });
    return res.data;
  }

  async updateTeams(teamIds: string[], data: Record<string, any>) {
    let res = await this.axios.patch(`/teams/${teamIds.join(',')}`, { teams: data });
    return res.data;
  }

  // ─── Tasks ───

  async listTasks(params?: Record<string, string | number | boolean>) {
    let res = await this.axios.get('/tasks', { params });
    return res.data;
  }

  async getTask(taskId: string) {
    let res = await this.axios.get(`/tasks/${taskId}`);
    return res.data;
  }

  async createTask(task: Record<string, any>) {
    let res = await this.axios.post('/tasks', { tasks: task });
    return res.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let res = await this.axios.patch(`/tasks/${taskId}`, { tasks: data });
    return res.data;
  }

  // ─── Responses (Templates) ───

  async listResponses(params?: Record<string, string | number>) {
    let res = await this.axios.get('/responses', { params });
    return res.data;
  }

  async getResponse(responseId: string) {
    let res = await this.axios.get(`/responses/${responseId}`);
    return res.data;
  }

  async createResponses(responses: Record<string, any>) {
    let res = await this.axios.post('/responses', { responses });
    return res.data;
  }

  async updateResponses(responseIds: string[], data: Record<string, any>) {
    let res = await this.axios.patch(`/responses/${responseIds.join(',')}`, {
      responses: data
    });
    return res.data;
  }

  async deleteResponses(responseIds: string[]) {
    let res = await this.axios.delete(`/responses/${responseIds.join(',')}`);
    return res.data;
  }

  // ─── Analytics ───

  async createAnalyticsReport(report: Record<string, any>) {
    let res = await this.axios.post('/analytics/reports', report);
    return res.data;
  }

  async getAnalyticsReport(reportId: string) {
    let res = await this.axios.get(`/analytics/reports/${reportId}`);
    return res.data;
  }

  // ─── Organizations ───

  async listOrganizations(params?: Record<string, string | number>) {
    let res = await this.axios.get('/organizations', { params });
    return res.data;
  }

  // ─── Users ───

  async listUsers(params?: Record<string, string | number>) {
    let res = await this.axios.get('/users', { params });
    return res.data;
  }

  // ─── Hooks (Webhooks) ───

  async createHook(hook: Record<string, any>) {
    let res = await this.axios.post('/hooks', { hooks: hook });
    return res.data;
  }

  async deleteHook(hookId: string) {
    let res = await this.axios.delete(`/hooks/${hookId}`);
    return res.data;
  }
}
