import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  value: T[];
  next?: string;
}

export interface MuralSummary {
  id: string;
  title: string;
  description?: string;
  workspaceId: string;
  roomId?: string;
  createdOn?: string;
  updatedOn?: string;
  createdBy?: { id: string; firstName?: string; lastName?: string };
  thumbnailUrl?: string;
  status?: string;
  favorite?: boolean;
  visitorsSettings?: Record<string, any>;
}

export interface RoomSummary {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  createdOn?: string;
  updatedOn?: string;
  type?: string;
  status?: string;
  sharingSettings?: Record<string, any>;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  createdOn?: string;
  updatedOn?: string;
  status?: string;
}

export interface Widget {
  id: string;
  type: string;
  text?: string;
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: Record<string, any>;
  [key: string]: any;
}

export interface Tag {
  id: string;
  text: string;
  color?: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  createdOn?: string;
  updatedOn?: string;
  workspaceId?: string;
}

export interface UserSummary {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  role?: string;
  type?: string;
}

export interface VotingSession {
  id: string;
  status?: string;
  votesPerUser?: number;
  createdOn?: string;
  endedOn?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; authType?: 'oauth' | 'apikey' }) {
    let authHeader =
      params.authType === 'apikey' ? `apikey ${params.token}` : `Bearer ${params.token}`;

    this.axios = createAxios({
      baseURL: 'https://app.mural.co/api/public/v1',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ─── Workspaces ────────────────────────────────────────────────

  async listWorkspaces(limit?: number): Promise<PaginatedResponse<WorkspaceSummary>> {
    let params: Record<string, any> = {};
    if (limit) params.limit = limit;
    let response = await this.axios.get('/workspaces', { params });
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceSummary> {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return response.data.value;
  }

  // ─── Rooms ─────────────────────────────────────────────────────

  async listRooms(
    workspaceId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<RoomSummary>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/workspaces/${workspaceId}/rooms`, { params });
    return response.data;
  }

  async getRoom(roomId: string): Promise<RoomSummary> {
    let response = await this.axios.get(`/rooms/${roomId}`);
    return response.data.value;
  }

  async createRoom(body: {
    workspaceId: string;
    name: string;
    description?: string;
    type?: string;
  }): Promise<RoomSummary> {
    let response = await this.axios.post('/rooms', body);
    return response.data.value;
  }

  async updateRoom(
    roomId: string,
    body: { name?: string; description?: string }
  ): Promise<RoomSummary> {
    let response = await this.axios.patch(`/rooms/${roomId}`, body);
    return response.data.value;
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.axios.delete(`/rooms/${roomId}`);
  }

  async listRoomFolders(roomId: string): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/rooms/${roomId}/folders`);
    return response.data;
  }

  async createRoomFolder(roomId: string, body: { name: string }): Promise<any> {
    let response = await this.axios.post(`/rooms/${roomId}/folders`, body);
    return response.data.value;
  }

  async deleteRoomFolder(roomId: string, folderId: string): Promise<void> {
    await this.axios.delete(`/rooms/${roomId}/folders/${folderId}`);
  }

  // ─── Murals ────────────────────────────────────────────────────

  async listMuralsInWorkspace(
    workspaceId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<MuralSummary>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/workspaces/${workspaceId}/murals`, { params });
    return response.data;
  }

  async listMuralsInRoom(
    roomId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<MuralSummary>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/rooms/${roomId}/murals`, { params });
    return response.data;
  }

  async getMural(muralId: string): Promise<MuralSummary> {
    let response = await this.axios.get(`/murals/${muralId}`);
    return response.data.value;
  }

  async createMural(body: {
    workspaceId: string;
    roomId?: string;
    title?: string;
  }): Promise<MuralSummary> {
    let response = await this.axios.post('/murals', body);
    return response.data.value;
  }

  async updateMural(
    muralId: string,
    body: { title?: string; description?: string }
  ): Promise<MuralSummary> {
    let response = await this.axios.patch(`/murals/${muralId}`, body);
    return response.data.value;
  }

  async deleteMural(muralId: string): Promise<void> {
    await this.axios.delete(`/murals/${muralId}`);
  }

  async duplicateMural(muralId: string): Promise<MuralSummary> {
    let response = await this.axios.post(`/murals/${muralId}/duplicate`);
    return response.data.value;
  }

  // ─── Widgets ───────────────────────────────────────────────────

  async listWidgets(
    muralId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<Widget>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/murals/${muralId}/widgets`, { params });
    return response.data;
  }

  async getWidget(muralId: string, widgetId: string): Promise<Widget> {
    let response = await this.axios.get(`/murals/${muralId}/widgets/${widgetId}`);
    return response.data.value;
  }

  async createStickyNote(
    muralId: string,
    body: {
      text?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      style?: { backgroundColor?: string };
      shape?: string;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(`/murals/${muralId}/widgets/sticky-note`, body);
    return response.data.value;
  }

  async updateStickyNote(
    muralId: string,
    widgetId: string,
    body: {
      text?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      style?: { backgroundColor?: string };
    }
  ): Promise<Widget> {
    let response = await this.axios.patch(
      `/murals/${muralId}/widgets/sticky-note/${widgetId}`,
      body
    );
    return response.data.value;
  }

  async createShape(
    muralId: string,
    body: {
      text?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      shape?: string;
      style?: Record<string, any>;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(`/murals/${muralId}/widgets/shape`, body);
    return response.data.value;
  }

  async updateShape(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(
      `/murals/${muralId}/widgets/shape/${widgetId}`,
      body
    );
    return response.data.value;
  }

  async createTextBox(
    muralId: string,
    body: {
      text?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      style?: Record<string, any>;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(`/murals/${muralId}/widgets/text`, body);
    return response.data.value;
  }

  async updateTextBox(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(`/murals/${muralId}/widgets/text/${widgetId}`, body);
    return response.data.value;
  }

  async createTitle(
    muralId: string,
    body: {
      text?: string;
      x?: number;
      y?: number;
      style?: Record<string, any>;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(`/murals/${muralId}/widgets/title`, body);
    return response.data.value;
  }

  async updateTitle(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(
      `/murals/${muralId}/widgets/title/${widgetId}`,
      body
    );
    return response.data.value;
  }

  async createImage(
    muralId: string,
    body: {
      url?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      title?: string;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(`/murals/${muralId}/widgets/image`, body);
    return response.data.value;
  }

  async updateImage(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(
      `/murals/${muralId}/widgets/image/${widgetId}`,
      body
    );
    return response.data.value;
  }

  async createArrow(
    muralId: string,
    body: {
      startWidgetId?: string;
      endWidgetId?: string;
      style?: Record<string, any>;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(`/murals/${muralId}/widgets/arrow`, body);
    return response.data.value;
  }

  async updateArrow(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(
      `/murals/${muralId}/widgets/arrow/${widgetId}`,
      body
    );
    return response.data.value;
  }

  async createArea(
    muralId: string,
    body: {
      title?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      style?: Record<string, any>;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(`/murals/${muralId}/widgets/area`, body);
    return response.data.value;
  }

  async updateArea(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(`/murals/${muralId}/widgets/area/${widgetId}`, body);
    return response.data.value;
  }

  async createComment(
    muralId: string,
    body: {
      text?: string;
      x?: number;
      y?: number;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(`/murals/${muralId}/widgets/comment`, body);
    return response.data.value;
  }

  async updateComment(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(
      `/murals/${muralId}/widgets/comment/${widgetId}`,
      body
    );
    return response.data.value;
  }

  // ─── Tags ──────────────────────────────────────────────────────

  async listTags(muralId: string): Promise<PaginatedResponse<Tag>> {
    let response = await this.axios.get(`/murals/${muralId}/tags`);
    return response.data;
  }

  async getTag(muralId: string, tagId: string): Promise<Tag> {
    let response = await this.axios.get(`/murals/${muralId}/tags/${tagId}`);
    return response.data.value;
  }

  async createTag(muralId: string, body: { text: string; color?: string }): Promise<Tag> {
    let response = await this.axios.post(`/murals/${muralId}/tags`, body);
    return response.data.value;
  }

  async updateTag(
    muralId: string,
    tagId: string,
    body: { text?: string; color?: string }
  ): Promise<Tag> {
    let response = await this.axios.patch(`/murals/${muralId}/tags/${tagId}`, body);
    return response.data.value;
  }

  async deleteTag(muralId: string, tagId: string): Promise<void> {
    await this.axios.delete(`/murals/${muralId}/tags/${tagId}`);
  }

  // ─── Voting Sessions ──────────────────────────────────────────

  async startVotingSession(
    muralId: string,
    body?: { votesPerUser?: number }
  ): Promise<VotingSession> {
    let response = await this.axios.post(
      `/murals/${muralId}/voting-sessions/start`,
      body || {}
    );
    return response.data.value;
  }

  async listVotingSessions(muralId: string): Promise<PaginatedResponse<VotingSession>> {
    let response = await this.axios.get(`/murals/${muralId}/voting-sessions`);
    return response.data;
  }

  async getVotingSession(muralId: string, votingSessionId: string): Promise<VotingSession> {
    let response = await this.axios.get(
      `/murals/${muralId}/voting-sessions/${votingSessionId}`
    );
    return response.data.value;
  }

  async getVotingSessionResults(muralId: string, votingSessionId: string): Promise<any> {
    let response = await this.axios.get(
      `/murals/${muralId}/voting-sessions/${votingSessionId}/results`
    );
    return response.data.value;
  }

  async deleteVotingSession(muralId: string, votingSessionId: string): Promise<void> {
    await this.axios.delete(`/murals/${muralId}/voting-sessions/${votingSessionId}`);
  }

  // ─── Timer ─────────────────────────────────────────────────────

  async getTimer(muralId: string): Promise<any> {
    let response = await this.axios.get(`/murals/${muralId}/timer`);
    return response.data.value;
  }

  async startTimer(muralId: string, body: { durationInSeconds: number }): Promise<any> {
    let response = await this.axios.post(`/murals/${muralId}/timer/start`, body);
    return response.data.value;
  }

  async updateTimer(
    muralId: string,
    body: { status?: string; extraTimeInSeconds?: number }
  ): Promise<any> {
    let response = await this.axios.patch(`/murals/${muralId}/timer`, body);
    return response.data.value;
  }

  // ─── Private Mode ─────────────────────────────────────────────

  async getPrivateMode(muralId: string): Promise<any> {
    let response = await this.axios.get(`/murals/${muralId}/private-mode`);
    return response.data.value;
  }

  async startPrivateMode(muralId: string): Promise<any> {
    let response = await this.axios.post(`/murals/${muralId}/private-mode/start`, {});
    return response.data.value;
  }

  async endPrivateMode(muralId: string): Promise<any> {
    let response = await this.axios.post(`/murals/${muralId}/private-mode/end`, {});
    return response.data.value;
  }

  // ─── Chat ──────────────────────────────────────────────────────

  async getChat(muralId: string): Promise<any[]> {
    let response = await this.axios.get(`/murals/${muralId}/chat`);
    return response.data.value;
  }

  // ─── Templates ─────────────────────────────────────────────────

  async listTemplates(
    workspaceId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<TemplateSummary>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/workspaces/${workspaceId}/templates`, { params });
    return response.data;
  }

  async createTemplateFromMural(
    muralId: string,
    body: { name: string; description?: string }
  ): Promise<TemplateSummary> {
    let response = await this.axios.post('/templates', { ...body, muralId });
    return response.data.value;
  }

  async createMuralFromTemplate(
    templateId: string,
    body: { workspaceId: string; roomId?: string; title?: string }
  ): Promise<MuralSummary> {
    let response = await this.axios.post(`/templates/${templateId}/murals`, body);
    return response.data.value;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/templates/${templateId}`);
  }

  // ─── Users ─────────────────────────────────────────────────────

  async getCurrentUser(): Promise<UserSummary> {
    let response = await this.axios.get('/users/me');
    return response.data.value;
  }

  async listMuralUsers(muralId: string): Promise<PaginatedResponse<UserSummary>> {
    let response = await this.axios.get(`/murals/${muralId}/users`);
    return response.data;
  }

  async inviteToMural(
    muralId: string,
    body: { emails: string[]; role?: string; message?: string }
  ): Promise<any> {
    let response = await this.axios.post(`/murals/${muralId}/users/invite`, body);
    return response.data;
  }

  async removeFromMural(muralId: string, body: { emails: string[] }): Promise<void> {
    await this.axios.post(`/murals/${muralId}/users/remove`, body);
  }

  async listRoomUsers(roomId: string): Promise<PaginatedResponse<UserSummary>> {
    let response = await this.axios.get(`/rooms/${roomId}/users`);
    return response.data;
  }

  async inviteToRoom(
    roomId: string,
    body: { emails: string[]; role?: string; message?: string }
  ): Promise<any> {
    let response = await this.axios.post(`/rooms/${roomId}/users/invite`, body);
    return response.data;
  }

  async removeFromRoom(roomId: string, body: { emails: string[] }): Promise<void> {
    await this.axios.post(`/rooms/${roomId}/users/remove`, body);
  }

  async inviteToWorkspace(
    workspaceId: string,
    body: { emails: string[]; role?: string; message?: string }
  ): Promise<any> {
    let response = await this.axios.post(`/workspaces/${workspaceId}/users/invite`, body);
    return response.data;
  }

  // ─── Search ────────────────────────────────────────────────────

  async searchMurals(
    workspaceId: string,
    query: string
  ): Promise<PaginatedResponse<MuralSummary>> {
    let response = await this.axios.get(`/search/${workspaceId}/murals`, {
      params: { query }
    });
    return response.data;
  }

  async searchRooms(
    workspaceId: string,
    query: string
  ): Promise<PaginatedResponse<RoomSummary>> {
    let response = await this.axios.get(`/search/${workspaceId}/rooms`, { params: { query } });
    return response.data;
  }

  async searchTemplates(
    workspaceId: string,
    query: string
  ): Promise<PaginatedResponse<TemplateSummary>> {
    let response = await this.axios.get(`/search/${workspaceId}/templates`, {
      params: { query }
    });
    return response.data;
  }
}
