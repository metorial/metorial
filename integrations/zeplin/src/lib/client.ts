import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export class ZeplinClient {
  private api: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: 'https://api.zeplin.dev/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Users ─────────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.api.get('/users/me');
    return response.data;
  }

  // ─── Organizations ────────────────────────────────────

  async listOrganizations(params?: { role?: string[] }) {
    let response = await this.api.get('/organizations', { params });
    return response.data;
  }

  async getOrganization(organizationId: string) {
    let response = await this.api.get(`/organizations/${organizationId}`);
    return response.data;
  }

  async listOrganizationMembers(organizationId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/organizations/${organizationId}/members`, {
      params: pagination
    });
    return response.data;
  }

  // ─── Projects ─────────────────────────────────────────

  async listProjects(params?: PaginationParams & { status?: string; workspace?: string }) {
    let response = await this.api.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.api.get(`/projects/${projectId}`);
    return response.data;
  }

  async updateProject(projectId: string, data: { name?: string; description?: string }) {
    let response = await this.api.patch(`/projects/${projectId}`, data);
    return response.data;
  }

  // ─── Project Members ──────────────────────────────────

  async listProjectMembers(projectId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/projects/${projectId}/members`, {
      params: pagination
    });
    return response.data;
  }

  async inviteProjectMember(projectId: string, data: { handle: string; role?: string }) {
    let response = await this.api.post(`/projects/${projectId}/members`, data);
    return response.data;
  }

  async removeProjectMember(projectId: string, memberId: string) {
    await this.api.delete(`/projects/${projectId}/members/${memberId}`);
  }

  // ─── Screens ──────────────────────────────────────────

  async listScreens(projectId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/projects/${projectId}/screens`, {
      params: pagination
    });
    return response.data;
  }

  async getScreen(projectId: string, screenId: string) {
    let response = await this.api.get(`/projects/${projectId}/screens/${screenId}`);
    return response.data;
  }

  async updateScreen(
    projectId: string,
    screenId: string,
    data: { name?: string; description?: string; tags?: string[] }
  ) {
    let response = await this.api.patch(`/projects/${projectId}/screens/${screenId}`, data);
    return response.data;
  }

  async listScreenVersions(
    projectId: string,
    screenId: string,
    pagination?: PaginationParams
  ) {
    let response = await this.api.get(`/projects/${projectId}/screens/${screenId}/versions`, {
      params: pagination
    });
    return response.data;
  }

  // ─── Notes ────────────────────────────────────────────

  async listScreenNotes(projectId: string, screenId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/projects/${projectId}/screens/${screenId}/notes`, {
      params: pagination
    });
    return response.data;
  }

  async createScreenNote(
    projectId: string,
    screenId: string,
    data: {
      content: string;
      position?: { x: number; y: number };
      color?: string;
    }
  ) {
    let response = await this.api.post(
      `/projects/${projectId}/screens/${screenId}/notes`,
      data
    );
    return response.data;
  }

  async updateScreenNote(
    projectId: string,
    screenId: string,
    noteId: string,
    data: {
      content?: string;
      position?: { x: number; y: number };
      color?: string;
      status?: string;
    }
  ) {
    let response = await this.api.patch(
      `/projects/${projectId}/screens/${screenId}/notes/${noteId}`,
      data
    );
    return response.data;
  }

  async deleteScreenNote(projectId: string, screenId: string, noteId: string) {
    await this.api.delete(`/projects/${projectId}/screens/${screenId}/notes/${noteId}`);
  }

  // ─── Note Comments ────────────────────────────────────

  async listNoteComments(
    projectId: string,
    screenId: string,
    noteId: string,
    pagination?: PaginationParams
  ) {
    let response = await this.api.get(
      `/projects/${projectId}/screens/${screenId}/notes/${noteId}/comments`,
      { params: pagination }
    );
    return response.data;
  }

  async createNoteComment(
    projectId: string,
    screenId: string,
    noteId: string,
    data: { content: string }
  ) {
    let response = await this.api.post(
      `/projects/${projectId}/screens/${screenId}/notes/${noteId}/comments`,
      data
    );
    return response.data;
  }

  // ─── Colors ───────────────────────────────────────────

  async listProjectColors(projectId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/projects/${projectId}/colors`, { params: pagination });
    return response.data;
  }

  async createProjectColor(
    projectId: string,
    data: { name: string; r: number; g: number; b: number; a: number }
  ) {
    let response = await this.api.post(`/projects/${projectId}/colors`, data);
    return response.data;
  }

  async listStyleguideColors(styleguideId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/styleguides/${styleguideId}/colors`, {
      params: pagination
    });
    return response.data;
  }

  // ─── Text Styles ──────────────────────────────────────

  async listProjectTextStyles(projectId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/projects/${projectId}/text_styles`, {
      params: pagination
    });
    return response.data;
  }

  async listStyleguideTextStyles(styleguideId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/styleguides/${styleguideId}/text_styles`, {
      params: pagination
    });
    return response.data;
  }

  // ─── Spacing Tokens ───────────────────────────────────

  async listProjectSpacingTokens(projectId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/projects/${projectId}/spacing_tokens`, {
      params: pagination
    });
    return response.data;
  }

  async listStyleguideSpacingTokens(styleguideId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/styleguides/${styleguideId}/spacing_tokens`, {
      params: pagination
    });
    return response.data;
  }

  // ─── Design Tokens ────────────────────────────────────

  async getProjectDesignTokens(projectId: string) {
    let response = await this.api.get(`/projects/${projectId}/design_tokens`);
    return response.data;
  }

  async getStyleguideDesignTokens(styleguideId: string) {
    let response = await this.api.get(`/styleguides/${styleguideId}/design_tokens`);
    return response.data;
  }

  // ─── Components ───────────────────────────────────────

  async listProjectComponents(projectId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/projects/${projectId}/components`, {
      params: pagination
    });
    return response.data;
  }

  async getProjectComponent(projectId: string, componentId: string) {
    let response = await this.api.get(`/projects/${projectId}/components/${componentId}`);
    return response.data;
  }

  async listStyleguideComponents(styleguideId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/styleguides/${styleguideId}/components`, {
      params: pagination
    });
    return response.data;
  }

  async getStyleguideComponent(styleguideId: string, componentId: string) {
    let response = await this.api.get(
      `/styleguides/${styleguideId}/components/${componentId}`
    );
    return response.data;
  }

  // ─── Styleguides ──────────────────────────────────────

  async listStyleguides(
    params?: PaginationParams & {
      linkedProject?: string;
      linkedStyleguide?: string;
      workspace?: string;
    }
  ) {
    let queryParams: Record<string, string | number | undefined> = {
      limit: params?.limit,
      offset: params?.offset,
      linked_project: params?.linkedProject,
      linked_styleguide: params?.linkedStyleguide,
      workspace: params?.workspace
    };
    let response = await this.api.get('/styleguides', { params: queryParams });
    return response.data;
  }

  async getStyleguide(styleguideId: string) {
    let response = await this.api.get(`/styleguides/${styleguideId}`);
    return response.data;
  }

  async updateStyleguide(styleguideId: string, data: { name?: string; description?: string }) {
    let response = await this.api.patch(`/styleguides/${styleguideId}`, data);
    return response.data;
  }

  // ─── Styleguide Members ───────────────────────────────

  async listStyleguideMembers(styleguideId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/styleguides/${styleguideId}/members`, {
      params: pagination
    });
    return response.data;
  }

  async inviteStyleguideMember(styleguideId: string, data: { handle: string; role?: string }) {
    let response = await this.api.post(`/styleguides/${styleguideId}/members`, data);
    return response.data;
  }

  async removeStyleguideMember(styleguideId: string, memberId: string) {
    await this.api.delete(`/styleguides/${styleguideId}/members/${memberId}`);
  }

  // ─── Flow Boards ──────────────────────────────────────

  async listFlowBoards(projectId: string, pagination?: PaginationParams) {
    let response = await this.api.get(`/projects/${projectId}/flow_boards`, {
      params: pagination
    });
    return response.data;
  }

  async getFlowBoard(projectId: string, flowBoardId: string) {
    let response = await this.api.get(`/projects/${projectId}/flow_boards/${flowBoardId}`);
    return response.data;
  }

  async listFlowBoardNodes(
    projectId: string,
    flowBoardId: string,
    pagination?: PaginationParams
  ) {
    let response = await this.api.get(
      `/projects/${projectId}/flow_boards/${flowBoardId}/nodes`,
      { params: pagination }
    );
    return response.data;
  }

  async listFlowBoardConnectors(
    projectId: string,
    flowBoardId: string,
    pagination?: PaginationParams
  ) {
    let response = await this.api.get(
      `/projects/${projectId}/flow_boards/${flowBoardId}/connectors`,
      { params: pagination }
    );
    return response.data;
  }

  // ─── Variable Collections ─────────────────────────────

  async listProjectVariableCollections(projectId: string) {
    let response = await this.api.get(`/projects/${projectId}/variable_collections`);
    return response.data;
  }

  async listStyleguideVariableCollections(styleguideId: string) {
    let response = await this.api.get(`/styleguides/${styleguideId}/variable_collections`);
    return response.data;
  }

  // ─── Notifications ────────────────────────────────────

  async listNotifications(pagination?: PaginationParams) {
    let response = await this.api.get('/users/me/notifications', { params: pagination });
    return response.data;
  }

  async markNotificationsRead(notificationIds: string[]) {
    let response = await this.api.patch('/users/me/notifications', {
      notification_ids: notificationIds,
      is_read: true
    });
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────

  async createOrganizationWebhook(
    organizationId: string,
    data: {
      url: string;
      secret: string;
      events: string[];
      projectIds?: string[];
      styleguideIds?: string[];
    }
  ) {
    let response = await this.api.post(`/organizations/${organizationId}/webhooks`, {
      url: data.url,
      secret: data.secret,
      events: data.events,
      project_ids: data.projectIds || ['*'],
      styleguide_ids: data.styleguideIds || ['*']
    });
    return response.data;
  }

  async deleteOrganizationWebhook(organizationId: string, webhookId: string) {
    await this.api.delete(`/organizations/${organizationId}/webhooks/${webhookId}`);
  }

  async createProjectWebhook(
    projectId: string,
    data: {
      url: string;
      secret: string;
      events: string[];
    }
  ) {
    let response = await this.api.post(`/projects/${projectId}/webhooks`, {
      url: data.url,
      secret: data.secret,
      events: data.events
    });
    return response.data;
  }

  async deleteProjectWebhook(projectId: string, webhookId: string) {
    await this.api.delete(`/projects/${projectId}/webhooks/${webhookId}`);
  }

  async createStyleguideWebhook(
    styleguideId: string,
    data: {
      url: string;
      secret: string;
      events: string[];
    }
  ) {
    let response = await this.api.post(`/styleguides/${styleguideId}/webhooks`, {
      url: data.url,
      secret: data.secret,
      events: data.events
    });
    return response.data;
  }

  async deleteStyleguideWebhook(styleguideId: string, webhookId: string) {
    await this.api.delete(`/styleguides/${styleguideId}/webhooks/${webhookId}`);
  }
}
