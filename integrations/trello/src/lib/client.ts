import { createAxios } from 'slates';

export class TrelloClient {
  private http: ReturnType<typeof createAxios>;
  private apiKey: string;
  private token: string;

  constructor(config: { apiKey: string; token: string }) {
    this.apiKey = config.apiKey;
    this.token = config.token;
    this.http = createAxios({
      baseURL: 'https://api.trello.com/1',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private params(extra?: Record<string, any>): Record<string, any> {
    return {
      key: this.apiKey,
      token: this.token,
      ...extra
    };
  }

  // ─── Boards ───────────────────────────────────────────────────

  async getBoard(boardId: string, fields?: string): Promise<any> {
    let response = await this.http.get(`/boards/${boardId}`, {
      params: this.params({
        fields: fields || 'id,name,desc,closed,url,shortUrl,idOrganization,prefs,labelNames'
      })
    });
    return response.data;
  }

  async getBoards(memberId: string = 'me', filter?: string): Promise<any[]> {
    let response = await this.http.get(`/members/${memberId}/boards`, {
      params: this.params({
        filter: filter || 'open',
        fields: 'id,name,desc,closed,url,shortUrl,idOrganization'
      })
    });
    return response.data;
  }

  async createBoard(data: {
    name: string;
    desc?: string;
    idOrganization?: string;
    defaultLists?: boolean;
    prefs_permissionLevel?: string;
    prefs_background?: string;
  }): Promise<any> {
    let response = await this.http.post('/boards', null, {
      params: this.params({
        name: data.name,
        desc: data.desc,
        idOrganization: data.idOrganization,
        defaultLists: data.defaultLists,
        prefs_permissionLevel: data.prefs_permissionLevel,
        prefs_background: data.prefs_background
      })
    });
    return response.data;
  }

  async updateBoard(boardId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/boards/${boardId}`, null, {
      params: this.params(data)
    });
    return response.data;
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.http.delete(`/boards/${boardId}`, {
      params: this.params()
    });
  }

  async getBoardMembers(boardId: string): Promise<any[]> {
    let response = await this.http.get(`/boards/${boardId}/members`, {
      params: this.params({ fields: 'id,fullName,username,avatarUrl' })
    });
    return response.data;
  }

  async addBoardMember(
    boardId: string,
    memberId: string,
    memberType: string = 'normal'
  ): Promise<any> {
    let response = await this.http.put(`/boards/${boardId}/members/${memberId}`, null, {
      params: this.params({ type: memberType })
    });
    return response.data;
  }

  async removeBoardMember(boardId: string, memberId: string): Promise<void> {
    await this.http.delete(`/boards/${boardId}/members/${memberId}`, {
      params: this.params()
    });
  }

  // ─── Lists ────────────────────────────────────────────────────

  async getLists(boardId: string, filter?: string): Promise<any[]> {
    let response = await this.http.get(`/boards/${boardId}/lists`, {
      params: this.params({
        filter: filter || 'open',
        fields: 'id,name,closed,pos,idBoard'
      })
    });
    return response.data;
  }

  async getList(listId: string): Promise<any> {
    let response = await this.http.get(`/lists/${listId}`, {
      params: this.params({ fields: 'id,name,closed,pos,idBoard' })
    });
    return response.data;
  }

  async createList(data: { name: string; idBoard: string; pos?: string }): Promise<any> {
    let response = await this.http.post('/lists', null, {
      params: this.params(data)
    });
    return response.data;
  }

  async updateList(listId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/lists/${listId}`, null, {
      params: this.params(data)
    });
    return response.data;
  }

  async archiveList(listId: string, closed: boolean = true): Promise<any> {
    return this.updateList(listId, { closed });
  }

  // ─── Cards ────────────────────────────────────────────────────

  async getCard(cardId: string, fields?: string): Promise<any> {
    let response = await this.http.get(`/cards/${cardId}`, {
      params: this.params({
        fields:
          fields ||
          'id,name,desc,closed,url,shortUrl,idBoard,idList,idMembers,idLabels,due,dueComplete,start,pos,cover',
        members: true,
        member_fields: 'id,fullName,username',
        attachments: true,
        attachment_fields: 'id,name,url,mimeType'
      })
    });
    return response.data;
  }

  async getCards(listId: string, fields?: string): Promise<any[]> {
    let response = await this.http.get(`/lists/${listId}/cards`, {
      params: this.params({
        fields:
          fields ||
          'id,name,desc,closed,url,idBoard,idList,idMembers,idLabels,due,dueComplete,start,pos'
      })
    });
    return response.data;
  }

  async getBoardCards(boardId: string, filter?: string): Promise<any[]> {
    let response = await this.http.get(`/boards/${boardId}/cards`, {
      params: this.params({
        filter: filter || 'open',
        fields:
          'id,name,desc,closed,url,idBoard,idList,idMembers,idLabels,due,dueComplete,start,pos'
      })
    });
    return response.data;
  }

  async createCard(data: {
    name: string;
    idList: string;
    desc?: string;
    pos?: string;
    due?: string;
    start?: string;
    idMembers?: string;
    idLabels?: string;
    urlSource?: string;
  }): Promise<any> {
    let response = await this.http.post('/cards', null, {
      params: this.params(data)
    });
    return response.data;
  }

  async updateCard(cardId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/cards/${cardId}`, null, {
      params: this.params(data)
    });
    return response.data;
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}`, {
      params: this.params()
    });
  }

  async addCardMember(cardId: string, memberId: string): Promise<any> {
    let response = await this.http.post(`/cards/${cardId}/idMembers`, null, {
      params: this.params({ value: memberId })
    });
    return response.data;
  }

  async removeCardMember(cardId: string, memberId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}/idMembers/${memberId}`, {
      params: this.params()
    });
  }

  async addCardLabel(cardId: string, labelId: string): Promise<any> {
    let response = await this.http.post(`/cards/${cardId}/idLabels`, null, {
      params: this.params({ value: labelId })
    });
    return response.data;
  }

  async removeCardLabel(cardId: string, labelId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}/idLabels/${labelId}`, {
      params: this.params()
    });
  }

  // ─── Attachments ──────────────────────────────────────────────

  async getAttachments(cardId: string): Promise<any[]> {
    let response = await this.http.get(`/cards/${cardId}/attachments`, {
      params: this.params({ fields: 'id,name,url,mimeType,bytes,date' })
    });
    return response.data;
  }

  async addUrlAttachment(cardId: string, url: string, name?: string): Promise<any> {
    let response = await this.http.post(`/cards/${cardId}/attachments`, null, {
      params: this.params({ url, name })
    });
    return response.data;
  }

  async deleteAttachment(cardId: string, attachmentId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}/attachments/${attachmentId}`, {
      params: this.params()
    });
  }

  // ─── Comments ─────────────────────────────────────────────────

  async addComment(cardId: string, text: string): Promise<any> {
    let response = await this.http.post(`/cards/${cardId}/actions/comments`, null, {
      params: this.params({ text })
    });
    return response.data;
  }

  async updateComment(cardId: string, actionId: string, text: string): Promise<any> {
    let response = await this.http.put(`/cards/${cardId}/actions/${actionId}/comments`, null, {
      params: this.params({ text })
    });
    return response.data;
  }

  async deleteComment(cardId: string, actionId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}/actions/${actionId}/comments`, {
      params: this.params()
    });
  }

  async getCardComments(cardId: string, limit: number = 50): Promise<any[]> {
    let response = await this.http.get(`/cards/${cardId}/actions`, {
      params: this.params({ filter: 'commentCard', limit })
    });
    return response.data;
  }

  // ─── Checklists ───────────────────────────────────────────────

  async getChecklists(cardId: string): Promise<any[]> {
    let response = await this.http.get(`/cards/${cardId}/checklists`, {
      params: this.params()
    });
    return response.data;
  }

  async createChecklist(cardId: string, name: string, pos?: string): Promise<any> {
    let response = await this.http.post('/checklists', null, {
      params: this.params({ idCard: cardId, name, pos })
    });
    return response.data;
  }

  async deleteChecklist(checklistId: string): Promise<void> {
    await this.http.delete(`/checklists/${checklistId}`, {
      params: this.params()
    });
  }

  async addCheckItem(
    checklistId: string,
    name: string,
    checked?: boolean,
    pos?: string
  ): Promise<any> {
    let response = await this.http.post(`/checklists/${checklistId}/checkItems`, null, {
      params: this.params({ name, checked, pos })
    });
    return response.data;
  }

  async updateCheckItem(
    cardId: string,
    checkItemId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(`/cards/${cardId}/checkItem/${checkItemId}`, null, {
      params: this.params(data)
    });
    return response.data;
  }

  async deleteCheckItem(checklistId: string, checkItemId: string): Promise<void> {
    await this.http.delete(`/checklists/${checklistId}/checkItems/${checkItemId}`, {
      params: this.params()
    });
  }

  // ─── Labels ───────────────────────────────────────────────────

  async getBoardLabels(boardId: string): Promise<any[]> {
    let response = await this.http.get(`/boards/${boardId}/labels`, {
      params: this.params({ fields: 'id,name,color,idBoard,uses' })
    });
    return response.data;
  }

  async createLabel(data: { name: string; color: string; idBoard: string }): Promise<any> {
    let response = await this.http.post('/labels', null, {
      params: this.params(data)
    });
    return response.data;
  }

  async updateLabel(labelId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/labels/${labelId}`, null, {
      params: this.params(data)
    });
    return response.data;
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.http.delete(`/labels/${labelId}`, {
      params: this.params()
    });
  }

  // ─── Members ──────────────────────────────────────────────────

  async getMember(memberId: string = 'me', fields?: string): Promise<any> {
    let response = await this.http.get(`/members/${memberId}`, {
      params: this.params({
        fields: fields || 'id,fullName,username,email,avatarUrl,avatarHash,bio,url'
      })
    });
    return response.data;
  }

  async getMemberOrganizations(memberId: string = 'me'): Promise<any[]> {
    let response = await this.http.get(`/members/${memberId}/organizations`, {
      params: this.params({ fields: 'id,name,displayName,url,desc' })
    });
    return response.data;
  }

  // ─── Actions ──────────────────────────────────────────────────

  async getBoardActions(
    boardId: string,
    options?: {
      filter?: string;
      limit?: number;
      before?: string;
      since?: string;
    }
  ): Promise<any[]> {
    let response = await this.http.get(`/boards/${boardId}/actions`, {
      params: this.params({
        limit: options?.limit || 50,
        filter: options?.filter,
        before: options?.before,
        since: options?.since
      })
    });
    return response.data;
  }

  async getCardActions(
    cardId: string,
    options?: {
      filter?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    let response = await this.http.get(`/cards/${cardId}/actions`, {
      params: this.params({
        limit: options?.limit || 50,
        filter: options?.filter
      })
    });
    return response.data;
  }

  // ─── Search ───────────────────────────────────────────────────

  async search(
    query: string,
    options?: {
      modelTypes?: string;
      boardIds?: string;
      cardsLimit?: number;
      boardsLimit?: number;
      partial?: boolean;
    }
  ): Promise<any> {
    let response = await this.http.get('/search', {
      params: this.params({
        query,
        modelTypes: options?.modelTypes || 'cards,boards',
        idBoards: options?.boardIds,
        cards_limit: options?.cardsLimit || 10,
        boards_limit: options?.boardsLimit || 10,
        partial: options?.partial ?? true
      })
    });
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────────

  async createWebhook(
    callbackURL: string,
    idModel: string,
    description?: string
  ): Promise<any> {
    let response = await this.http.post('/webhooks', null, {
      params: this.params({ callbackURL, idModel, description })
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`, {
      params: this.params()
    });
  }

  async getWebhooks(tokenValue: string): Promise<any[]> {
    let response = await this.http.get(`/tokens/${tokenValue}/webhooks`, {
      params: this.params()
    });
    return response.data;
  }

  // ─── Organizations (Workspaces) ───────────────────────────────

  async getOrganization(orgId: string): Promise<any> {
    let response = await this.http.get(`/organizations/${orgId}`, {
      params: this.params({ fields: 'id,name,displayName,url,desc,memberships' })
    });
    return response.data;
  }

  async getOrganizationMembers(orgId: string): Promise<any[]> {
    let response = await this.http.get(`/organizations/${orgId}/members`, {
      params: this.params({ fields: 'id,fullName,username,avatarUrl' })
    });
    return response.data;
  }

  async getOrganizationBoards(orgId: string, filter?: string): Promise<any[]> {
    let response = await this.http.get(`/organizations/${orgId}/boards`, {
      params: this.params({
        filter: filter || 'open',
        fields: 'id,name,desc,closed,url,shortUrl'
      })
    });
    return response.data;
  }

  // ─── Notifications ────────────────────────────────────────────

  async getNotifications(
    memberId: string = 'me',
    options?: {
      readFilter?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    let response = await this.http.get(`/members/${memberId}/notifications`, {
      params: this.params({
        read_filter: options?.readFilter || 'all',
        limit: options?.limit || 50
      })
    });
    return response.data;
  }

  async markNotificationRead(notificationId: string, unread: boolean = false): Promise<any> {
    let response = await this.http.put(`/notifications/${notificationId}`, null, {
      params: this.params({ unread })
    });
    return response.data;
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.http.post('/notifications/all/read', null, {
      params: this.params()
    });
  }

  // ─── Custom Fields ────────────────────────────────────────────

  async getBoardCustomFields(boardId: string): Promise<any[]> {
    let response = await this.http.get(`/boards/${boardId}/customFields`, {
      params: this.params()
    });
    return response.data;
  }

  async getCardCustomFieldItems(cardId: string): Promise<any[]> {
    let response = await this.http.get(`/cards/${cardId}/customFieldItems`, {
      params: this.params()
    });
    return response.data;
  }

  async setCardCustomFieldValue(
    cardId: string,
    customFieldId: string,
    value: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(
      `/cards/${cardId}/customField/${customFieldId}/item`,
      { value },
      { params: this.params() }
    );
    return response.data;
  }
}
