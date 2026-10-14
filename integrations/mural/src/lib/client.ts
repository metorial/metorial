import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

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
  description?: string;
  locked?: boolean;
  suspended?: boolean;
  companyId?: string;
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

let normalizeResource = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(normalizeResource) as T;
  if (!value || typeof value !== 'object') return value;
  let resource = { ...value } as Record<string, unknown>;
  for (let [key, field] of Object.entries(resource)) {
    if (field === null) resource[key] = undefined;
    if ((key === 'id' || key === 'roomId') && typeof field === 'number')
      resource[key] = String(field);
    if (
      ['createdOn', 'updatedOn', 'endedOn', 'startedOn'].includes(key) &&
      typeof field === 'number'
    ) {
      resource[key] = new Date(field).toISOString();
    }
  }
  return resource as T;
};

let numericRoomId = (roomId?: string) => {
  let id = Number(roomId);
  if (!roomId || !Number.isSafeInteger(id) || id < 1) {
    throw createApiServiceError(
      'Provide a numeric roomId from list_rooms or get_room. Mural creation requires a destination room.'
    );
  }
  return id;
};

let assertRecipientResults = (value: unknown, operation: 'invitation' | 'removal') => {
  if (!Array.isArray(value))
    throw createApiServiceError(
      `Mural did not return recipient results for the ${operation}. Check the resource before retrying.`
    );
  let rejected = value.filter((result: { rejected?: boolean }) => result.rejected);
  if (rejected.length)
    throw createApiServiceError(
      `Mural rejected ${rejected.length} ${operation}(s): ${rejected.map((result: { email: string; reason?: string }) => `${result.email}: ${result.reason ?? 'rejected'}`).join('; ')}. Other recipients may already have succeeded; retry only rejected recipients.`
    );
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string; authType?: 'oauth' | 'apikey' }) {
    if (params.authType === 'apikey') {
      throw createApiServiceError(
        'These canvas tools require Mural OAuth. Reconnect using OAuth; enterprise API keys belong to the separate Enterprise API.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.mural.co/api/public/v1',
      authHeader: { value: `Bearer ${params.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Mural', reason: 'mural_api_error' })
    });
  }

  // ─── Workspaces ────────────────────────────────────────────────

  async listWorkspaces(
    limit?: number,
    next?: string
  ): Promise<PaginatedResponse<WorkspaceSummary>> {
    let params: Record<string, any> = {};
    if (limit !== undefined) params.limit = limit;
    if (next !== undefined) params.next = next;
    let response = await this.axios.get('/workspaces', { params });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceSummary> {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return normalizeResource(response.data.value);
  }

  // ─── Rooms ─────────────────────────────────────────────────────

  async listRooms(
    workspaceId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<RoomSummary>> {
    let params: Record<string, any> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/workspaces/${workspaceId}/rooms`, { params });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async getRoom(roomId: string): Promise<RoomSummary> {
    let response = await this.axios.get(`/rooms/${roomId}`);
    return normalizeResource(response.data);
  }

  async createRoom(body: {
    workspaceId: string;
    name: string;
    description?: string;
    type?: string;
  }): Promise<RoomSummary> {
    let response = await this.axios.post('/rooms', {
      ...pickDefined(body),
      type: body.type ?? 'private'
    });
    return normalizeResource(response.data.value);
  }

  async updateRoom(
    roomId: string,
    body: { name?: string; description?: string }
  ): Promise<RoomSummary> {
    let response = await this.axios.patch(`/rooms/${roomId}`, body);
    return normalizeResource(response.data.value);
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.axios.delete(`/rooms/${roomId}`);
  }

  async listRoomFolders(roomId: string): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/rooms/${roomId}/folders`);
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async createRoomFolder(roomId: string, body: { name: string }): Promise<any> {
    let response = await this.axios.post(`/rooms/${roomId}/folders`, body);
    return normalizeResource(response.data.value);
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
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/workspaces/${workspaceId}/murals`, { params });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async listMuralsInRoom(
    roomId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<MuralSummary>> {
    let params: Record<string, any> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/rooms/${roomId}/murals`, { params });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async getMural(muralId: string): Promise<MuralSummary> {
    let response = await this.axios.get(`/murals/${muralId}`);
    return normalizeResource(response.data.value);
  }

  async createMural(body: {
    workspaceId?: string;
    roomId?: string;
    title?: string;
  }): Promise<MuralSummary> {
    let response = await this.axios.post(
      '/murals',
      pickDefined({ roomId: numericRoomId(body.roomId), title: body.title })
    );
    return normalizeResource(response.data.value);
  }

  async updateMural(
    muralId: string,
    body: { title?: string; description?: string }
  ): Promise<MuralSummary> {
    if (body.description !== undefined)
      throw createApiServiceError(
        'Mural does not support mural descriptions in this API. Provide title instead.'
      );
    if (body.title === undefined)
      throw createApiServiceError('Provide a title to update the mural.');
    let response = await this.axios.patch(`/murals/${muralId}`, { title: body.title });
    return normalizeResource(response.data.value);
  }

  async deleteMural(muralId: string): Promise<void> {
    await this.axios.delete(`/murals/${muralId}`);
  }

  async duplicateMural(
    muralId: string,
    body: { roomId?: string; title?: string } = {}
  ): Promise<MuralSummary> {
    let source = await this.getMural(muralId);
    let response = await this.axios.post(`/murals/${muralId}/duplicate`, {
      roomId: numericRoomId(body.roomId ?? source.roomId),
      title: body.title ?? `${source.title} (copy)`
    });
    return normalizeResource(response.data.value);
  }

  // ─── Widgets ───────────────────────────────────────────────────

  async listWidgets(
    muralId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<Widget>> {
    let params: Record<string, any> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/murals/${muralId}/widgets`, { params });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async getWidget(muralId: string, widgetId: string): Promise<Widget> {
    let response = await this.axios.get(`/murals/${muralId}/widgets/${widgetId}`);
    return normalizeResource(response.data.value);
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
    let response = await this.axios.post(`/murals/${muralId}/widgets/sticky-note`, [
      pickDefined(body)
    ]);
    let widget = response.data.value?.[0];
    if (!widget) throw createApiServiceError('Mural did not return the created widget.');
    return normalizeResource(widget);
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
    return normalizeResource(response.data.value);
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
    let response = await this.axios.post(`/murals/${muralId}/widgets/shape`, [
      pickDefined(body)
    ]);
    let widget = response.data.value?.[0];
    if (!widget) throw createApiServiceError('Mural did not return the created widget.');
    return normalizeResource(widget);
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
    return normalizeResource(response.data.value);
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
    let response = await this.axios.post(`/murals/${muralId}/widgets/textbox`, [
      pickDefined(body)
    ]);
    let widget = response.data.value?.[0];
    if (!widget) throw createApiServiceError('Mural did not return the created widget.');
    return normalizeResource(widget);
  }

  async updateTextBox(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(
      `/murals/${muralId}/widgets/textbox/${widgetId}`,
      body
    );
    return normalizeResource(response.data.value);
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
    let response = await this.axios.post(`/murals/${muralId}/widgets/title`, [
      pickDefined(body)
    ]);
    let widget = response.data.value?.[0];
    if (!widget) throw createApiServiceError('Mural did not return the created widget.');
    return normalizeResource(widget);
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
    return normalizeResource(response.data.value);
  }

  async createImage(
    muralId: string,
    body: {
      url?: string;
      name?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      title?: string;
    }
  ): Promise<Widget> {
    if (!body.name)
      throw createApiServiceError(
        'Image creation requires assetName returned by the Mural asset-upload API. A source URL alone is unsupported.'
      );
    let response = await this.axios.post(
      `/murals/${muralId}/widgets/image`,
      pickDefined({
        name: body.name,
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height,
        caption: body.title
      })
    );
    return normalizeResource(response.data.value);
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
    return normalizeResource(response.data.value);
  }

  async createArrow(
    muralId: string,
    body: {
      startWidgetId?: string;
      endWidgetId?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      points?: { x: number; y: number }[];
      style?: Record<string, any>;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(
      `/murals/${muralId}/widgets/arrow`,
      pickDefined({
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height,
        points: body.points,
        startRefId: body.startWidgetId,
        endRefId: body.endWidgetId,
        style: body.style
      })
    );
    return normalizeResource(response.data.value);
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
    return normalizeResource(response.data.value);
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
    return normalizeResource(response.data.value);
  }

  async updateArea(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let response = await this.axios.patch(`/murals/${muralId}/widgets/area/${widgetId}`, body);
    return normalizeResource(response.data.value);
  }

  async createComment(
    muralId: string,
    body: {
      text?: string;
      x?: number;
      y?: number;
    }
  ): Promise<Widget> {
    let response = await this.axios.post(
      `/murals/${muralId}/widgets/comment`,
      pickDefined({ message: body.text, x: body.x, y: body.y })
    );
    return normalizeResource(response.data.value);
  }

  async updateComment(
    muralId: string,
    widgetId: string,
    body: Record<string, any>
  ): Promise<Widget> {
    let { text, ...properties } = body;
    let response = await this.axios.patch(
      `/murals/${muralId}/widgets/comment/${widgetId}`,
      pickDefined({ ...properties, message: text })
    );
    return normalizeResource(response.data.value);
  }

  async deleteWidget(muralId: string, widgetId: string): Promise<void> {
    await this.axios.delete(`/murals/${muralId}/widgets/${widgetId}`);
  }

  // ─── Tags ──────────────────────────────────────────────────────

  async listTags(muralId: string): Promise<PaginatedResponse<Tag>> {
    let response = await this.axios.get(`/murals/${muralId}/tags`);
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async getTag(muralId: string, tagId: string): Promise<Tag> {
    let response = await this.axios.get(`/murals/${muralId}/tags/${tagId}`);
    return normalizeResource(response.data.value);
  }

  async createTag(muralId: string, body: { text: string; color?: string }): Promise<Tag> {
    let response = await this.axios.post(`/murals/${muralId}/tags`, body);
    return normalizeResource(response.data.value);
  }

  async updateTag(
    muralId: string,
    tagId: string,
    body: { text?: string; color?: string }
  ): Promise<Tag> {
    let response = await this.axios.patch(`/murals/${muralId}/tags/${tagId}`, body);
    return normalizeResource(response.data.value);
  }

  async deleteTag(muralId: string, tagId: string): Promise<void> {
    await this.axios.delete(`/murals/${muralId}/tags/${tagId}`);
  }

  // ─── Voting Sessions ──────────────────────────────────────────

  async startVotingSession(
    muralId: string,
    body?: { votesPerUser?: number; title?: string }
  ): Promise<VotingSession> {
    let response = await this.axios.post(`/murals/${muralId}/voting-sessions/start`, {
      numberOfVotes: body?.votesPerUser ?? 5,
      title: body?.title ?? 'Voting session'
    });
    return normalizeResource(response.data.value);
  }

  async listVotingSessions(muralId: string): Promise<PaginatedResponse<VotingSession>> {
    let response = await this.axios.get(`/murals/${muralId}/voting-sessions`);
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async getVotingSession(muralId: string, votingSessionId: string): Promise<VotingSession> {
    let response = await this.axios.get(
      `/murals/${muralId}/voting-sessions/${votingSessionId}`
    );
    return normalizeResource(response.data.value);
  }

  async getVotingSessionResults(muralId: string, votingSessionId: string): Promise<any> {
    let response = await this.axios.get(
      `/murals/${muralId}/voting-sessions/${votingSessionId}/results`
    );
    return normalizeResource(response.data.value);
  }

  async deleteVotingSession(muralId: string, votingSessionId: string): Promise<void> {
    await this.axios.delete(`/murals/${muralId}/voting-sessions/${votingSessionId}`);
  }

  // ─── Timer ─────────────────────────────────────────────────────

  async getTimer(muralId: string): Promise<any> {
    let response = await this.axios.get(`/murals/${muralId}/timer`);
    return normalizeResource(response.data.value);
  }

  async startTimer(
    muralId: string,
    body: { durationInSeconds: number; soundEnabled?: boolean }
  ): Promise<any> {
    let response = await this.axios.post(`/murals/${muralId}/timer/start`, {
      duration: body.durationInSeconds,
      soundEnabled: body.soundEnabled ?? true
    });
    return normalizeResource(response.data.value);
  }

  async updateTimer(
    muralId: string,
    body: { status?: string; extraTimeInSeconds?: number }
  ): Promise<any> {
    let response = await this.axios.patch(
      `/murals/${muralId}/timer`,
      pickDefined({
        paused: body.status === undefined ? undefined : body.status === 'paused',
        delta: body.extraTimeInSeconds
      })
    );
    return normalizeResource(response.data.value);
  }

  // ─── Private Mode ─────────────────────────────────────────────

  async getPrivateMode(muralId: string): Promise<any> {
    let response = await this.axios.get(`/murals/${muralId}/private-mode`);
    return normalizeResource(response.data.value);
  }

  async startPrivateMode(muralId: string, hideAuthors = false): Promise<any> {
    await this.axios.post(`/murals/${muralId}/private-mode/start`, { hideAuthors });
    return this.getPrivateMode(muralId);
  }

  async endPrivateMode(muralId: string): Promise<any> {
    await this.axios.post(`/murals/${muralId}/private-mode/end`, {});
    return this.getPrivateMode(muralId);
  }

  // ─── Chat ──────────────────────────────────────────────────────

  async getChat(muralId: string): Promise<any[]> {
    let response = await this.axios.get(`/murals/${muralId}/chat`);
    return normalizeResource(response.data.value);
  }

  // ─── Templates ─────────────────────────────────────────────────

  async listTemplates(
    workspaceId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<TemplateSummary>> {
    let params: Record<string, any> = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.next) params.next = options.next;
    let response = await this.axios.get(`/workspaces/${workspaceId}/templates`, { params });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async createTemplateFromMural(
    muralId: string,
    body: { name: string; description?: string }
  ): Promise<TemplateSummary> {
    let response = await this.axios.post(
      '/templates',
      pickDefined({ title: body.name, description: body.description, muralId })
    );
    return normalizeResource(response.data.value);
  }

  async createMuralFromTemplate(
    templateId: string,
    body: { workspaceId?: string; roomId?: string; title?: string }
  ): Promise<MuralSummary> {
    if (!body.title?.trim())
      throw createApiServiceError('Provide a title for the mural created from a template.');
    let response = await this.axios.post(`/templates/${templateId}/murals`, {
      roomId: numericRoomId(body.roomId),
      title: body.title
    });
    return normalizeResource(response.data.value);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/templates/${templateId}`);
  }

  // ─── Users ─────────────────────────────────────────────────────

  async getCurrentUser(): Promise<UserSummary> {
    let response = await this.axios.get('/users/me');
    return normalizeResource(response.data.value);
  }

  async listMuralUsers(
    muralId: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<UserSummary>> {
    let response = await this.axios.get(`/murals/${muralId}/users`, {
      params: pickDefined(options ?? {})
    });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async inviteToMural(
    muralId: string,
    body: { emails: string[]; role?: string; message?: string }
  ): Promise<any> {
    let response = await this.axios.post(
      `/murals/${muralId}/users/invite`,
      pickDefined({
        message: body.message,
        invitations: body.emails.map(email => ({
          email,
          editPermission: body.role === 'viewer' || body.role === 'view' ? 'view' : 'edit'
        }))
      })
    );
    assertRecipientResults(response.data.value, 'invitation');
    return response.data;
  }

  async removeFromMural(muralId: string, body: { emails: string[] }): Promise<void> {
    let response = await this.axios.post(`/murals/${muralId}/users/remove`, body);
    assertRecipientResults(response.data.value, 'removal');
  }

  async listRoomUsers(roomId: string): Promise<PaginatedResponse<UserSummary>> {
    let response = await this.axios.get(`/rooms/${roomId}/users`);
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async inviteToRoom(
    roomId: string,
    body: { emails: string[]; role?: string; message?: string }
  ): Promise<any> {
    let response = await this.axios.post(
      `/rooms/${roomId}/users/invite`,
      pickDefined({
        message: body.message,
        invitations: body.emails.map(email => ({ email }))
      })
    );
    assertRecipientResults(response.data.value, 'invitation');
    return response.data;
  }

  async removeFromRoom(roomId: string, body: { emails: string[] }): Promise<void> {
    let response = await this.axios.post(`/rooms/${roomId}/users/remove`, body);
    assertRecipientResults(response.data.value, 'removal');
  }

  async inviteToWorkspace(
    workspaceId: string,
    body: { emails: string[]; role?: string; message?: string }
  ): Promise<any> {
    let response = await this.axios.post(
      `/workspaces/${workspaceId}/users/invite`,
      pickDefined({
        message: body.message,
        invitations: body.emails.map(email => ({ email }))
      })
    );
    assertRecipientResults(response.data.value, 'invitation');
    return response.data;
  }

  // ─── Search ────────────────────────────────────────────────────

  async searchMurals(
    workspaceId: string,
    query: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<MuralSummary>> {
    let response = await this.axios.get(`/search/${workspaceId}/murals`, {
      params: pickDefined({ q: query, ...options })
    });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async searchRooms(
    workspaceId: string,
    query: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<RoomSummary>> {
    let response = await this.axios.get(`/search/${workspaceId}/rooms`, {
      params: pickDefined({ q: query, ...options })
    });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }

  async searchTemplates(
    workspaceId: string,
    query: string,
    options?: { limit?: number; next?: string }
  ): Promise<PaginatedResponse<TemplateSummary>> {
    let response = await this.axios.get(`/search/${workspaceId}/templates`, {
      params: pickDefined({ q: query, ...options })
    });
    return { ...response.data, value: normalizeResource(response.data.value) };
  }
}
