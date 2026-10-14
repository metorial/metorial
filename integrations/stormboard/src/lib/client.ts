import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export class StormboardClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(opts: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.stormboard.com',
      authHeader: { name: 'X-API-Key', value: opts.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Stormboard',
          reason: 'stormboard_api_error'
        })
    });
  }

  private readCollection(value: unknown, resource: string, objects = false): any[] {
    if (!Array.isArray(value) || (objects && value.some(item => !isApiErrorRecord(item)))) {
      throw createApiServiceError(`Stormboard returned an unexpected ${resource} list.`, {
        reason: 'stormboard_invalid_response'
      });
    }
    return value;
  }

  private readObject(value: unknown, resource: string): any {
    if (!isApiErrorRecord(value)) {
      throw createApiServiceError(`Stormboard returned unexpected ${resource} data.`, {
        reason: 'stormboard_invalid_response'
      });
    }
    return value;
  }

  // ─── Storms ──────────────────────────────────────────

  async listStorms(): Promise<any[]> {
    let response = await this.http.get('/storms/list');
    return this.readCollection(response.data, 'Storms', true);
  }

  async getStorm(stormId: string): Promise<any> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}`);
    return this.readObject(response.data, 'Storm');
  }

  async createStorm(params: {
    title: string;
    plan: string;
    goals?: string;
    votesperuser?: number;
    avatars?: boolean;
    ideacreator?: boolean;
    team_id?: string;
  }): Promise<any> {
    let response = await this.http.post('/storms', params);
    return this.readObject(response.data, 'Storm');
  }

  async duplicateStorm(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${encodeURIComponent(stormId)}/duplicate`);
    return response.data;
  }

  async closeStorm(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${encodeURIComponent(stormId)}/close`);
    return response.data;
  }

  async reopenStorm(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${encodeURIComponent(stormId)}/reopen`);
    return response.data;
  }

  async addFavorite(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${encodeURIComponent(stormId)}/favorite`);
    return response.data;
  }

  async removeFavorite(stormId: string): Promise<any> {
    let response = await this.http.delete(`/storms/${encodeURIComponent(stormId)}/favorite`);
    return response.data;
  }

  async getStormAccess(stormId: string): Promise<any> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}/access`);
    return response.data;
  }

  async getStormTemplate(stormId: string): Promise<any> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}/template`);
    return response.data;
  }

  // ─── Ideas ───────────────────────────────────────────

  async listIdeas(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}/ideas`);
    return this.readCollection(response.data, 'ideas', true);
  }

  async getIdea(stormId: string, ideaId: string): Promise<any> {
    let response = await this.http.get(
      `/storms/${encodeURIComponent(stormId)}/ideas/${encodeURIComponent(ideaId)}`
    );
    return this.readObject(response.data, 'idea');
  }

  async createIdea(params: {
    stormid: string;
    type: string;
    data: string;
    color: string;
  }): Promise<any> {
    let response = await this.http.post('/ideas', params);
    return this.readObject(response.data, 'idea');
  }

  // ─── Sections & Legend ───────────────────────────────

  async updateSection(
    stormId: string,
    sectionChar: string,
    params: {
      title?: string;
      description?: string;
      char?: string;
    }
  ): Promise<any> {
    let response = await this.http.put(
      `/storms/${encodeURIComponent(stormId)}/sections/${encodeURIComponent(sectionChar)}`,
      params
    );
    return response.data;
  }

  async updateLegend(
    stormId: string,
    params: {
      colour: string;
      name: string;
    }
  ): Promise<any> {
    let response = await this.http.put(
      `/storms/${encodeURIComponent(stormId)}/legend`,
      params
    );
    return response.data;
  }

  // ─── Connectors ──────────────────────────────────────

  async listConnectors(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}/connectors`);
    return this.readCollection(response.data, 'connectors');
  }

  async createConnector(
    stormId: string,
    params: {
      from: string;
      to: string;
      label?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/storms/${encodeURIComponent(stormId)}/connectors`,
      params
    );
    return response.data;
  }

  async updateConnector(
    stormId: string,
    connectorId: string,
    params: {
      label?: string;
    }
  ): Promise<any> {
    let response = await this.http.put(
      `/storms/${encodeURIComponent(stormId)}/connectors/${encodeURIComponent(connectorId)}`,
      params
    );
    return response.data;
  }

  async deleteConnector(stormId: string, connectorId: string): Promise<any> {
    let response = await this.http.delete(
      `/storms/${encodeURIComponent(stormId)}/connectors/${encodeURIComponent(connectorId)}`
    );
    return response.data;
  }

  // ─── Tags ────────────────────────────────────────────

  async listTags(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}/tags`);
    return this.readCollection(response.data, 'tags');
  }

  async createTag(
    stormId: string,
    params: {
      name: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/storms/${encodeURIComponent(stormId)}/tags`, params);
    return response.data;
  }

  async createIdeaTagData(
    stormId: string,
    ideaId: string,
    params: {
      tag_id: string;
      value?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/storms/${encodeURIComponent(stormId)}/ideas/${encodeURIComponent(ideaId)}/tags`,
      params
    );
    return response.data;
  }

  async getIdeaTagData(stormId: string, ideaId: string): Promise<any> {
    let response = await this.http.get(
      `/storms/${encodeURIComponent(stormId)}/ideas/${encodeURIComponent(ideaId)}/tags`
    );
    return response.data;
  }

  // ─── Chat ────────────────────────────────────────────

  async getChatMessages(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}/chat`);
    return this.readCollection(response.data, 'chat messages');
  }

  async getUnreadChatMessages(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}/chat/unread`);
    return this.readCollection(response.data, 'unread chat messages');
  }

  async createChatMessage(
    stormId: string,
    params: {
      message: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/storms/${encodeURIComponent(stormId)}/chat`, params);
    return response.data;
  }

  async markChatMessagesRead(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${encodeURIComponent(stormId)}/chat/read`);
    return response.data;
  }

  // ─── Participants & Invitations ──────────────────────

  async listParticipants(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${encodeURIComponent(stormId)}/participants`);
    return this.readCollection(response.data, 'participants');
  }

  async inviteParticipant(
    stormId: string,
    params: {
      email: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/storms/${encodeURIComponent(stormId)}/invite`,
      params
    );
    return response.data;
  }

  async listInvites(): Promise<any[]> {
    let response = await this.http.get('/storms/invites');
    return this.readCollection(response.data, 'invitations');
  }

  async acceptInvite(stormId: string): Promise<any> {
    let response = await this.http.post(
      `/storms/${encodeURIComponent(stormId)}/invite/accept`
    );
    return response.data;
  }

  async declineInvite(stormId: string): Promise<any> {
    let response = await this.http.post(
      `/storms/${encodeURIComponent(stormId)}/invite/decline`
    );
    return response.data;
  }

  async joinStorm(stormId: string, accessKey: string): Promise<any> {
    let response = await this.http.post(`/storms/${encodeURIComponent(stormId)}/join`, {
      access_key: accessKey
    });
    return response.data;
  }

  // ─── Users ───────────────────────────────────────────

  async getUser(): Promise<any> {
    let response = await this.http.get('/users');
    return this.readObject(response.data, 'user profile');
  }

  async updateProfile(params: { firstname?: string; lastname?: string }): Promise<any> {
    let response = await this.http.put('/users', params);
    return response.data;
  }

  async updateNotifications(params: { email_notifications?: boolean }): Promise<any> {
    let response = await this.http.put('/users/notifications', params);
    return response.data;
  }
}
