import { createAxios } from 'slates';

export class StormboardClient {
  private token: string;
  private http: ReturnType<typeof createAxios>;

  constructor(opts: { token: string }) {
    this.token = opts.token;
    this.http = createAxios({
      baseURL: 'https://api.stormboard.com',
      headers: {
        'X-API-Key': opts.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Storms ──────────────────────────────────────────

  async listStorms(): Promise<any[]> {
    let response = await this.http.get('/storms/list');
    return response.data;
  }

  async getStorm(stormId: string): Promise<any> {
    let response = await this.http.get(`/storms/${stormId}`);
    return response.data;
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
    return response.data;
  }

  async duplicateStorm(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/duplicate`);
    return response.data;
  }

  async closeStorm(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/close`);
    return response.data;
  }

  async reopenStorm(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/reopen`);
    return response.data;
  }

  async addFavorite(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/favorite`);
    return response.data;
  }

  async removeFavorite(stormId: string): Promise<any> {
    let response = await this.http.delete(`/storms/${stormId}/favorite`);
    return response.data;
  }

  async getStormAccess(stormId: string): Promise<any> {
    let response = await this.http.get(`/storms/${stormId}/access`);
    return response.data;
  }

  async getStormTemplate(stormId: string): Promise<any> {
    let response = await this.http.get(`/storms/${stormId}/template`);
    return response.data;
  }

  // ─── Ideas ───────────────────────────────────────────

  async listIdeas(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${stormId}/ideas`);
    return response.data;
  }

  async getIdea(stormId: string, ideaId: string): Promise<any> {
    let response = await this.http.get(`/storms/${stormId}/ideas/${ideaId}`);
    return response.data;
  }

  async createIdea(params: {
    stormid: string;
    type: string;
    data: string;
    color: string;
  }): Promise<any> {
    let response = await this.http.post('/ideas', params);
    return response.data;
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
    let response = await this.http.put(`/storms/${stormId}/sections/${sectionChar}`, params);
    return response.data;
  }

  async updateLegend(
    stormId: string,
    params: {
      colour: string;
      name: string;
    }
  ): Promise<any> {
    let response = await this.http.put(`/storms/${stormId}/legend`, params);
    return response.data;
  }

  // ─── Connectors ──────────────────────────────────────

  async listConnectors(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${stormId}/connectors`);
    return response.data;
  }

  async createConnector(
    stormId: string,
    params: {
      from: string;
      to: string;
      label?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/connectors`, params);
    return response.data;
  }

  async updateConnector(
    stormId: string,
    connectorId: string,
    params: {
      label?: string;
    }
  ): Promise<any> {
    let response = await this.http.put(`/storms/${stormId}/connectors/${connectorId}`, params);
    return response.data;
  }

  async deleteConnector(stormId: string, connectorId: string): Promise<any> {
    let response = await this.http.delete(`/storms/${stormId}/connectors/${connectorId}`);
    return response.data;
  }

  // ─── Tags ────────────────────────────────────────────

  async listTags(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${stormId}/tags`);
    return response.data;
  }

  async createTag(
    stormId: string,
    params: {
      name: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/tags`, params);
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
    let response = await this.http.post(`/storms/${stormId}/ideas/${ideaId}/tags`, params);
    return response.data;
  }

  async getIdeaTagData(stormId: string, ideaId: string): Promise<any> {
    let response = await this.http.get(`/storms/${stormId}/ideas/${ideaId}/tags`);
    return response.data;
  }

  // ─── Chat ────────────────────────────────────────────

  async getChatMessages(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${stormId}/chat`);
    return response.data;
  }

  async getUnreadChatMessages(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${stormId}/chat/unread`);
    return response.data;
  }

  async createChatMessage(
    stormId: string,
    params: {
      message: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/chat`, params);
    return response.data;
  }

  async markChatMessagesRead(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/chat/read`);
    return response.data;
  }

  // ─── Participants & Invitations ──────────────────────

  async listParticipants(stormId: string): Promise<any[]> {
    let response = await this.http.get(`/storms/${stormId}/participants`);
    return response.data;
  }

  async inviteParticipant(
    stormId: string,
    params: {
      email: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/invite`, params);
    return response.data;
  }

  async listInvites(): Promise<any[]> {
    let response = await this.http.get('/storms/invites');
    return response.data;
  }

  async acceptInvite(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/invite/accept`);
    return response.data;
  }

  async declineInvite(stormId: string): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/invite/decline`);
    return response.data;
  }

  async joinStorm(stormId: string, accessKey: string): Promise<any> {
    let response = await this.http.post(`/storms/${stormId}/join`, {
      access_key: accessKey
    });
    return response.data;
  }

  // ─── Users ───────────────────────────────────────────

  async getUser(): Promise<any> {
    let response = await this.http.get('/users');
    return response.data;
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
