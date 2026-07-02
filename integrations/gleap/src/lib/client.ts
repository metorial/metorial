import { createAxios } from 'slates';

export class GleapClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; projectId: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.gleap.io/v3',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Project: config.projectId,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Tickets ---

  async listTickets(params?: {
    type?: string;
    status?: string;
    priority?: string;
    sort?: string;
    limit?: number;
    skip?: number;
    archived?: boolean;
    isSpam?: boolean;
  }): Promise<{ tickets: any[]; count: number; totalCount: number }> {
    let response = await this.axios.get('/tickets', { params });
    return response.data;
  }

  async getTicket(ticketId: string): Promise<any> {
    let response = await this.axios.get(`/tickets/${ticketId}`);
    return response.data;
  }

  async createTicket(data: {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    priority?: string;
    plainContent?: string;
    content?: any;
    tags?: string[];
    processingUser?: string;
    processingTeam?: string;
    customData?: Record<string, any>;
    formData?: Record<string, any>;
    session?: string;
    [key: string]: any;
  }): Promise<any> {
    let response = await this.axios.post('/tickets', data);
    return response.data;
  }

  async updateTicket(
    ticketId: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      plainContent?: string;
      content?: any;
      tags?: string[];
      processingUser?: string;
      processingTeam?: string;
      customData?: Record<string, any>;
      formData?: Record<string, any>;
      archived?: boolean;
      snoozedUntil?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/tickets/${ticketId}`, data);
    return response.data;
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await this.axios.delete(`/tickets/${ticketId}`);
  }

  async archiveTicket(ticketId: string): Promise<any> {
    let response = await this.axios.put(`/tickets/${ticketId}`, { archived: true });
    return response.data;
  }

  async getTicketCount(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/tickets/count', { params });
    return response.data;
  }

  // --- Sessions ---

  async listSessions(params?: { limit?: number; skip?: number; sort?: string }): Promise<any> {
    let response = await this.axios.get('/sessions', { params });
    return response.data;
  }

  async getSession(sessionId: string): Promise<any> {
    let response = await this.axios.get(`/sessions/${sessionId}`);
    return response.data;
  }

  async getSessionByUserId(userId: string): Promise<any> {
    let response = await this.axios.get(`/sessions/userid/${userId}`);
    return response.data;
  }

  async createSession(data: {
    userId?: string;
    email?: string;
    name?: string;
    phone?: string;
    companyId?: string;
    companyName?: string;
    plan?: string;
    value?: number;
    customData?: Record<string, any>;
    tags?: string[];
    lang?: string;
    [key: string]: any;
  }): Promise<any> {
    let response = await this.axios.post('/sessions', data);
    return response.data;
  }

  async updateSession(
    sessionId: string,
    data: {
      userId?: string;
      email?: string;
      name?: string;
      phone?: string;
      companyId?: string;
      companyName?: string;
      plan?: string;
      value?: number;
      customData?: Record<string, any>;
      tags?: string[];
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/sessions/${sessionId}`, data);
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.axios.delete(`/sessions/${sessionId}`);
  }

  async searchSessions(params?: {
    searchTerm?: string;
    limit?: number;
    skip?: number;
  }): Promise<any> {
    let response = await this.axios.get('/sessions/search', { params });
    return response.data;
  }

  // --- Messages ---

  async getMessages(params?: {
    ticket?: string;
    limit?: number;
    skip?: number;
    sort?: string;
  }): Promise<any> {
    let response = await this.axios.get('/messages', { params });
    return response.data;
  }

  async createMessage(data: {
    ticket: string;
    comment?: any;
    type?: string;
    attachments?: Array<{ name: string; url: string; type?: string }>;
    isNote?: boolean;
    session?: string;
    user?: string;
    bot?: boolean;
    [key: string]: any;
  }): Promise<any> {
    let response = await this.axios.post('/messages', data);
    return response.data;
  }

  async updateMessage(messageId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/messages/${messageId}`, data);
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.axios.delete(`/messages/${messageId}`);
  }

  // --- Help Center Collections ---

  async listCollections(): Promise<any[]> {
    let response = await this.axios.get('/helpcenter/collections');
    return response.data;
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await this.axios.get(`/helpcenter/collections/${collectionId}`);
    return response.data;
  }

  async createCollection(data: {
    title: string;
    description?: string;
    iconUrl?: string;
    parent?: string;
    targetAudience?: string;
  }): Promise<any> {
    let response = await this.axios.post('/helpcenter/collections', data);
    return response.data;
  }

  async updateCollection(
    collectionId: string,
    data: {
      title?: string;
      description?: string;
      iconUrl?: string;
      targetAudience?: string;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/helpcenter/collections/${collectionId}`, data);
    return response.data;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.axios.delete(`/helpcenter/collections/${collectionId}`);
  }

  // --- Help Center Articles ---

  async listArticles(collectionId: string): Promise<any[]> {
    let response = await this.axios.get(`/helpcenter/collections/${collectionId}/articles`);
    return response.data;
  }

  async getArticle(collectionId: string, articleId: string): Promise<any> {
    let response = await this.axios.get(
      `/helpcenter/collections/${collectionId}/articles/${articleId}`
    );
    return response.data;
  }

  async createArticle(
    collectionId: string,
    data: {
      title: string;
      description?: string;
      content?: any;
      plainContent?: string;
      isDraft?: boolean;
      tags?: string[];
      targetAudience?: string;
      author?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/helpcenter/collections/${collectionId}/articles`,
      data
    );
    return response.data;
  }

  async updateArticle(
    collectionId: string,
    articleId: string,
    data: {
      title?: string;
      description?: string;
      content?: any;
      plainContent?: string;
      isDraft?: boolean;
      tags?: string[];
      targetAudience?: string;
    }
  ): Promise<any> {
    let response = await this.axios.put(
      `/helpcenter/collections/${collectionId}/articles/${articleId}`,
      data
    );
    return response.data;
  }

  async deleteArticle(collectionId: string, articleId: string): Promise<void> {
    await this.axios.delete(`/helpcenter/collections/${collectionId}/articles/${articleId}`);
  }

  async searchArticles(params?: { searchTerm?: string }): Promise<any> {
    let response = await this.axios.get('/helpcenter/search', { params });
    return response.data;
  }

  // --- Message Templates ---

  async listMessageTemplates(params?: {
    limit?: number;
    skip?: number;
    searchTerm?: string;
  }): Promise<any> {
    let response = await this.axios.get('/message-templates', { params });
    return response.data;
  }

  async createMessageTemplate(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/message-templates', data);
    return response.data;
  }

  async updateMessageTemplate(templateId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/message-templates/${templateId}`, data);
    return response.data;
  }

  async deleteMessageTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/message-templates/${templateId}`);
  }

  // --- Teams ---

  async listTeams(): Promise<any[]> {
    let response = await this.axios.get('/teams');
    return response.data;
  }

  async createTeam(data: { name: string; [key: string]: any }): Promise<any> {
    let response = await this.axios.post('/teams', data);
    return response.data;
  }

  async updateTeam(teamId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/teams/${teamId}`, data);
    return response.data;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.axios.delete(`/teams/${teamId}`);
  }

  // --- AI Content ---

  async createAiContent(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/ai-content', data);
    return response.data;
  }

  async getAiContent(contentId: string): Promise<any> {
    let response = await this.axios.get(`/ai-content/${contentId}`);
    return response.data;
  }

  async updateAiContent(contentId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/ai-content/${contentId}`, data);
    return response.data;
  }

  async deleteAiContent(contentId: string): Promise<void> {
    await this.axios.delete(`/ai-content/${contentId}`);
  }

  // --- Engagements (generic CRUD for various engagement types) ---

  async listEngagements(engagementType: string): Promise<any[]> {
    let response = await this.axios.get(`/${engagementType}`);
    return response.data;
  }

  async getEngagement(engagementType: string, engagementId: string): Promise<any> {
    let response = await this.axios.get(`/${engagementType}/${engagementId}`);
    return response.data;
  }

  async createEngagement(engagementType: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/${engagementType}`, data);
    return response.data;
  }

  async updateEngagement(
    engagementType: string,
    engagementId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(`/${engagementType}/${engagementId}`, data);
    return response.data;
  }

  async deleteEngagement(engagementType: string, engagementId: string): Promise<void> {
    await this.axios.delete(`/${engagementType}/${engagementId}`);
  }

  // --- Project Users ---

  async listProjectUsers(): Promise<any[]> {
    let response = await this.axios.get('/projects/users');
    return response.data;
  }

  // --- Statistics ---

  async getStatisticsFacts(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/statistics/facts', { params });
    return response.data;
  }

  async getStatisticsHeatmap(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/statistics/heatmap', { params });
    return response.data;
  }
}
