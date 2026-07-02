import { createAxios } from 'slates';

export class CapsuleClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.capsulecrm.com/api/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ── Parties ──────────────────────────────────────────────

  async listParties(params?: {
    since?: string;
    page?: number;
    perPage?: number;
    embed?: string[];
  }) {
    let response = await this.axios.get('/parties', {
      params: {
        since: params?.since,
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  async getParty(partyId: number, embed?: string[]) {
    let response = await this.axios.get(`/parties/${partyId}`, {
      params: { embed: embed?.join(',') }
    });
    return response.data.party;
  }

  async createParty(party: Record<string, any>) {
    let response = await this.axios.post('/parties', { party });
    return response.data.party;
  }

  async updateParty(partyId: number, party: Record<string, any>) {
    let response = await this.axios.put(`/parties/${partyId}`, { party });
    return response.data.party;
  }

  async deleteParty(partyId: number) {
    await this.axios.delete(`/parties/${partyId}`);
  }

  async searchParties(
    query: string,
    params?: {
      page?: number;
      perPage?: number;
      embed?: string[];
    }
  ) {
    let response = await this.axios.get('/parties/search', {
      params: {
        q: query,
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  async listEmployees(
    organisationId: number,
    params?: {
      page?: number;
      perPage?: number;
    }
  ) {
    let response = await this.axios.get(`/parties/${organisationId}/people`, {
      params: {
        page: params?.page,
        perPage: params?.perPage
      }
    });
    return response.data;
  }

  // ── Opportunities ────────────────────────────────────────

  async listOpportunities(params?: {
    since?: string;
    page?: number;
    perPage?: number;
    embed?: string[];
  }) {
    let response = await this.axios.get('/opportunities', {
      params: {
        since: params?.since,
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  async getOpportunity(opportunityId: number, embed?: string[]) {
    let response = await this.axios.get(`/opportunities/${opportunityId}`, {
      params: { embed: embed?.join(',') }
    });
    return response.data.opportunity;
  }

  async createOpportunity(opportunity: Record<string, any>) {
    let response = await this.axios.post('/opportunities', { opportunity });
    return response.data.opportunity;
  }

  async updateOpportunity(opportunityId: number, opportunity: Record<string, any>) {
    let response = await this.axios.put(`/opportunities/${opportunityId}`, { opportunity });
    return response.data.opportunity;
  }

  async deleteOpportunity(opportunityId: number) {
    await this.axios.delete(`/opportunities/${opportunityId}`);
  }

  async searchOpportunities(
    query: string,
    params?: {
      page?: number;
      perPage?: number;
      embed?: string[];
    }
  ) {
    let response = await this.axios.get('/opportunities/search', {
      params: {
        q: query,
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  async listOpportunitiesByParty(
    partyId: number,
    params?: {
      page?: number;
      perPage?: number;
      embed?: string[];
    }
  ) {
    let response = await this.axios.get(`/parties/${partyId}/opportunities`, {
      params: {
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  // ── Projects (Cases/Kases) ──────────────────────────────

  async listProjects(params?: {
    since?: string;
    page?: number;
    perPage?: number;
    embed?: string[];
  }) {
    let response = await this.axios.get('/kases', {
      params: {
        since: params?.since,
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  async getProject(projectId: number, embed?: string[]) {
    let response = await this.axios.get(`/kases/${projectId}`, {
      params: { embed: embed?.join(',') }
    });
    return response.data.kase;
  }

  async createProject(kase: Record<string, any>) {
    let response = await this.axios.post('/kases', { kase });
    return response.data.kase;
  }

  async updateProject(projectId: number, kase: Record<string, any>) {
    let response = await this.axios.put(`/kases/${projectId}`, { kase });
    return response.data.kase;
  }

  async deleteProject(projectId: number) {
    await this.axios.delete(`/kases/${projectId}`);
  }

  async searchProjects(
    query: string,
    params?: {
      page?: number;
      perPage?: number;
      embed?: string[];
    }
  ) {
    let response = await this.axios.get('/kases/search', {
      params: {
        q: query,
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  async listProjectsByParty(
    partyId: number,
    params?: {
      page?: number;
      perPage?: number;
      embed?: string[];
    }
  ) {
    let response = await this.axios.get(`/parties/${partyId}/kases`, {
      params: {
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  // ── Tasks ────────────────────────────────────────────────

  async listTasks(params?: {
    page?: number;
    perPage?: number;
    embed?: string[];
    status?: string;
  }) {
    let response = await this.axios.get('/tasks', {
      params: {
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(','),
        status: params?.status
      }
    });
    return response.data;
  }

  async getTask(taskId: number, embed?: string[]) {
    let response = await this.axios.get(`/tasks/${taskId}`, {
      params: { embed: embed?.join(',') }
    });
    return response.data.task;
  }

  async createTask(task: Record<string, any>) {
    let response = await this.axios.post('/tasks', { task });
    return response.data.task;
  }

  async updateTask(taskId: number, task: Record<string, any>) {
    let response = await this.axios.put(`/tasks/${taskId}`, { task });
    return response.data.task;
  }

  async deleteTask(taskId: number) {
    await this.axios.delete(`/tasks/${taskId}`);
  }

  // ── Entries ──────────────────────────────────────────────

  async listEntries(params?: { page?: number; perPage?: number; embed?: string[] }) {
    let response = await this.axios.get('/entries', {
      params: {
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  async listEntriesForEntity(
    entityType: string,
    entityId: number,
    params?: {
      page?: number;
      perPage?: number;
      embed?: string[];
    }
  ) {
    let response = await this.axios.get(`/${entityType}/${entityId}/entries`, {
      params: {
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }

  async getEntry(entryId: number, embed?: string[]) {
    let response = await this.axios.get(`/entries/${entryId}`, {
      params: { embed: embed?.join(',') }
    });
    return response.data.entry;
  }

  async createEntry(entry: Record<string, any>) {
    let response = await this.axios.post('/entries', { entry });
    return response.data.entry;
  }

  async updateEntry(entryId: number, entry: Record<string, any>) {
    let response = await this.axios.put(`/entries/${entryId}`, { entry });
    return response.data.entry;
  }

  async deleteEntry(entryId: number) {
    await this.axios.delete(`/entries/${entryId}`);
  }

  // ── Tags ─────────────────────────────────────────────────

  async listTags(
    entityType: string,
    params?: {
      page?: number;
      perPage?: number;
    }
  ) {
    let response = await this.axios.get(`/${entityType}/tags`, {
      params: {
        page: params?.page,
        perPage: params?.perPage
      }
    });
    return response.data;
  }

  async createTag(entityType: string, tag: Record<string, any>) {
    let response = await this.axios.post(`/${entityType}/tags`, { tag });
    return response.data.tag;
  }

  async updateTag(entityType: string, tagId: number, tag: Record<string, any>) {
    let response = await this.axios.put(`/${entityType}/tags/${tagId}`, { tag });
    return response.data.tag;
  }

  async deleteTag(entityType: string, tagId: number) {
    await this.axios.delete(`/${entityType}/tags/${tagId}`);
  }

  // ── Users ────────────────────────────────────────────────

  async listUsers() {
    let response = await this.axios.get('/users');
    return response.data;
  }

  async getCurrentUser() {
    let response = await this.axios.get('/users/current');
    return response.data.user;
  }

  async getUser(userId: number) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data.user;
  }

  // ── Site ─────────────────────────────────────────────────

  async getSite() {
    let response = await this.axios.get('/site');
    return response.data.site;
  }

  // ── Pipelines & Milestones ──────────────────────────────

  async listPipelines() {
    let response = await this.axios.get('/pipelines');
    return response.data;
  }

  async listMilestones(pipelineId: number) {
    let response = await this.axios.get(`/pipelines/${pipelineId}/milestones`);
    return response.data;
  }

  // ── Boards & Stages ─────────────────────────────────────

  async listBoards() {
    let response = await this.axios.get('/boards');
    return response.data;
  }

  // ── REST Hooks (Webhooks) ────────────────────────────────

  async listRestHooks() {
    let response = await this.axios.get('/resthooks');
    return response.data;
  }

  async createRestHook(restHook: { event: string; targetUrl: string; description?: string }) {
    let response = await this.axios.post('/resthooks', { restHook });
    return response.data.restHook;
  }

  async deleteRestHook(restHookId: number) {
    await this.axios.delete(`/resthooks/${restHookId}`);
  }

  // ── Task Categories ──────────────────────────────────────

  async listTaskCategories() {
    let response = await this.axios.get('/tasks/categories');
    return response.data;
  }

  // ── Filters ──────────────────────────────────────────────

  async listFilters(entityType: string) {
    let response = await this.axios.get(`/${entityType}/filters`);
    return response.data;
  }

  async listByFilter(
    entityType: string,
    filterId: number,
    params?: {
      page?: number;
      perPage?: number;
      embed?: string[];
    }
  ) {
    let response = await this.axios.get(`/${entityType}/filters/${filterId}`, {
      params: {
        page: params?.page,
        perPage: params?.perPage,
        embed: params?.embed?.join(',')
      }
    });
    return response.data;
  }
}
