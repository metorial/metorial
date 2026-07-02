import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.app.shortcut.com/api/v3',
      headers: {
        'Shortcut-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // Stories
  async createStory(params: Record<string, any>) {
    let response = await this.http.post('/stories', params);
    return response.data;
  }

  async getStory(storyId: number) {
    let response = await this.http.get(`/stories/${storyId}`);
    return response.data;
  }

  async updateStory(storyId: number, params: Record<string, any>) {
    let response = await this.http.put(`/stories/${storyId}`, params);
    return response.data;
  }

  async deleteStory(storyId: number) {
    await this.http.delete(`/stories/${storyId}`);
  }

  async searchStories(query: string, pageSize?: number, next?: string) {
    let params: Record<string, any> = { query };
    if (pageSize) params.page_size = pageSize;
    if (next) params.next = next;
    let response = await this.http.get('/search/stories', { params });
    return response.data;
  }

  async searchAll(query: string, pageSize?: number) {
    let params: Record<string, any> = { query };
    if (pageSize) params.page_size = pageSize;
    let response = await this.http.get('/search', { params });
    return response.data;
  }

  // Story Comments
  async listStoryComments(storyId: number) {
    let response = await this.http.get(`/stories/${storyId}/comments`);
    return response.data;
  }

  async createStoryComment(storyId: number, text: string, authorId?: string) {
    let body: Record<string, any> = { text };
    if (authorId) body.author_id = authorId;
    let response = await this.http.post(`/stories/${storyId}/comments`, body);
    return response.data;
  }

  async updateStoryComment(storyId: number, commentId: number, text: string) {
    let response = await this.http.put(`/stories/${storyId}/comments/${commentId}`, { text });
    return response.data;
  }

  async deleteStoryComment(storyId: number, commentId: number) {
    await this.http.delete(`/stories/${storyId}/comments/${commentId}`);
  }

  // Story Tasks
  async createStoryTask(storyId: number, params: Record<string, any>) {
    let response = await this.http.post(`/stories/${storyId}/tasks`, params);
    return response.data;
  }

  async updateStoryTask(storyId: number, taskId: number, params: Record<string, any>) {
    let response = await this.http.put(`/stories/${storyId}/tasks/${taskId}`, params);
    return response.data;
  }

  async deleteStoryTask(storyId: number, taskId: number) {
    await this.http.delete(`/stories/${storyId}/tasks/${taskId}`);
  }

  // Story Links
  async createStoryLink(params: Record<string, any>) {
    let response = await this.http.post('/story-links', params);
    return response.data;
  }

  async deleteStoryLink(storyLinkId: number) {
    await this.http.delete(`/story-links/${storyLinkId}`);
  }

  // Epics
  async listEpics() {
    let response = await this.http.get('/epics');
    return response.data;
  }

  async createEpic(params: Record<string, any>) {
    let response = await this.http.post('/epics', params);
    return response.data;
  }

  async getEpic(epicId: number) {
    let response = await this.http.get(`/epics/${epicId}`);
    return response.data;
  }

  async updateEpic(epicId: number, params: Record<string, any>) {
    let response = await this.http.put(`/epics/${epicId}`, params);
    return response.data;
  }

  async deleteEpic(epicId: number) {
    await this.http.delete(`/epics/${epicId}`);
  }

  // Epic Comments
  async createEpicComment(epicId: number, text: string, authorId?: string) {
    let body: Record<string, any> = { text };
    if (authorId) body.author_id = authorId;
    let response = await this.http.post(`/epics/${epicId}/comments`, body);
    return response.data;
  }

  // Iterations
  async listIterations() {
    let response = await this.http.get('/iterations');
    return response.data;
  }

  async createIteration(params: Record<string, any>) {
    let response = await this.http.post('/iterations', params);
    return response.data;
  }

  async getIteration(iterationId: number) {
    let response = await this.http.get(`/iterations/${iterationId}`);
    return response.data;
  }

  async updateIteration(iterationId: number, params: Record<string, any>) {
    let response = await this.http.put(`/iterations/${iterationId}`, params);
    return response.data;
  }

  async deleteIteration(iterationId: number) {
    await this.http.delete(`/iterations/${iterationId}`);
  }

  // Objectives (Milestones)
  async listObjectives() {
    let response = await this.http.get('/objectives');
    return response.data;
  }

  async createObjective(params: Record<string, any>) {
    let response = await this.http.post('/objectives', params);
    return response.data;
  }

  async getObjective(objectiveId: number) {
    let response = await this.http.get(`/objectives/${objectiveId}`);
    return response.data;
  }

  async updateObjective(objectiveId: number, params: Record<string, any>) {
    let response = await this.http.put(`/objectives/${objectiveId}`, params);
    return response.data;
  }

  async deleteObjective(objectiveId: number) {
    await this.http.delete(`/objectives/${objectiveId}`);
  }

  // Workflows
  async listWorkflows() {
    let response = await this.http.get('/workflows');
    return response.data;
  }

  async getEpicWorkflow() {
    let response = await this.http.get('/epic-workflow');
    return response.data;
  }

  // Teams (Groups)
  async listGroups() {
    let response = await this.http.get('/groups');
    return response.data;
  }

  async getGroup(groupId: string) {
    let response = await this.http.get(`/groups/${groupId}`);
    return response.data;
  }

  // Labels
  async listLabels() {
    let response = await this.http.get('/labels');
    return response.data;
  }

  async createLabel(params: Record<string, any>) {
    let response = await this.http.post('/labels', params);
    return response.data;
  }

  async updateLabel(labelId: number, params: Record<string, any>) {
    let response = await this.http.put(`/labels/${labelId}`, params);
    return response.data;
  }

  async deleteLabel(labelId: number) {
    await this.http.delete(`/labels/${labelId}`);
  }

  // Custom Fields
  async listCustomFields() {
    let response = await this.http.get('/custom-fields');
    return response.data;
  }

  // Members
  async listMembers() {
    let response = await this.http.get('/members');
    return response.data;
  }

  async getCurrentMember() {
    let response = await this.http.get('/member');
    return response.data;
  }

  // Documents
  async listDocuments() {
    let response = await this.http.get('/documents');
    return response.data;
  }

  async createDocument(params: Record<string, any>) {
    let response = await this.http.post('/documents', params);
    return response.data;
  }

  async getDocument(documentId: number) {
    let response = await this.http.get(`/documents/${documentId}`);
    return response.data;
  }

  async updateDocument(documentId: number, params: Record<string, any>) {
    let response = await this.http.put(`/documents/${documentId}`, params);
    return response.data;
  }

  async deleteDocument(documentId: number) {
    await this.http.delete(`/documents/${documentId}`);
  }

  // Webhooks
  async createWebhook(webhookUrl: string, secret?: string) {
    let body: Record<string, any> = { url: webhookUrl };
    if (secret) body.secret = secret;
    let response = await this.http.post('/webhooks', body);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  async listWebhooks() {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  // Projects
  async listProjects() {
    let response = await this.http.get('/projects');
    return response.data;
  }

  // Categories
  async listCategories() {
    let response = await this.http.get('/categories');
    return response.data;
  }
}
