import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; subdomain: string }) {
    this.http = createAxios({
      baseURL: `https://${config.subdomain}.kanbanize.com/api/v2`,
      headers: {
        apikey: config.token
      }
    });
  }

  // ── Workspaces ──

  async listWorkspaces(params?: { isArchived?: number }) {
    let response = await this.http.get('/workspaces', { params });
    return response.data?.data ?? [];
  }

  async getWorkspace(workspaceId: number) {
    let response = await this.http.get(`/workspaces/${workspaceId}`);
    return response.data?.data;
  }

  // ── Boards ──

  async listBoards(params?: {
    boardIds?: number[];
    workspaceId?: number;
    isArchived?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.workspaceId) queryParams.workspace_id = params.workspaceId;
    if (params?.isArchived !== undefined) queryParams.is_archived = params.isArchived;
    if (params?.boardIds?.length) queryParams.board_ids = params.boardIds.join(',');
    let response = await this.http.get('/boards', { params: queryParams });
    return response.data?.data ?? [];
  }

  async getBoard(boardId: number) {
    let response = await this.http.get(`/boards/${boardId}`);
    return response.data?.data;
  }

  async getBoardStructure(boardId: number) {
    let response = await this.http.get(`/boards/${boardId}/currentStructure`);
    return response.data?.data;
  }

  async getBoardWorkflows(boardId: number) {
    let response = await this.http.get(`/boards/${boardId}/workflows`);
    return response.data?.data ?? [];
  }

  async getBoardColumns(boardId: number) {
    let response = await this.http.get(`/boards/${boardId}/columns`);
    return response.data?.data ?? [];
  }

  async getBoardLanes(boardId: number) {
    let response = await this.http.get(`/boards/${boardId}/lanes`);
    return response.data?.data ?? [];
  }

  // ── Cards ──

  async listCards(params?: {
    boardIds?: number[];
    cardIds?: number[];
    page?: number;
    isArchived?: number;
    columnId?: number;
    laneId?: number;
    workflowId?: number;
    ownerId?: number;
    typeId?: number;
    expandFields?: string[];
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.boardIds?.length) queryParams.board_ids = params.boardIds.join(',');
    if (params?.cardIds?.length) queryParams.card_ids = params.cardIds.join(',');
    if (params?.page) queryParams.page = params.page;
    if (params?.isArchived !== undefined) queryParams.is_archived = params.isArchived;
    if (params?.columnId) queryParams.column_id = params.columnId;
    if (params?.laneId) queryParams.lane_id = params.laneId;
    if (params?.workflowId) queryParams.workflow_id = params.workflowId;
    if (params?.ownerId) queryParams.owner_user_id = params.ownerId;
    if (params?.typeId) queryParams.type_id = params.typeId;
    if (params?.expandFields?.length) queryParams.fields = params.expandFields.join(',');
    let response = await this.http.get('/cards', { params: queryParams });
    return response.data?.data;
  }

  async getCard(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}`);
    return response.data?.data;
  }

  async createCard(data: {
    boardId: number;
    workflowId: number;
    columnId: number;
    laneId: number;
    title: string;
    description?: string;
    customId?: string;
    ownerUserId?: number;
    typeId?: number;
    size?: number;
    priority?: number;
    color?: string;
    deadline?: string;
  }) {
    let body: Record<string, any> = {
      board_id: data.boardId,
      workflow_id: data.workflowId,
      column_id: data.columnId,
      lane_id: data.laneId,
      title: data.title
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.customId !== undefined) body.custom_id = data.customId;
    if (data.ownerUserId !== undefined) body.owner_user_id = data.ownerUserId;
    if (data.typeId !== undefined) body.type_id = data.typeId;
    if (data.size !== undefined) body.size = data.size;
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.color !== undefined) body.color = data.color;
    if (data.deadline !== undefined) body.deadline = data.deadline;
    let response = await this.http.post('/cards', body);
    return response.data?.data;
  }

  async updateCard(
    cardId: number,
    data: {
      title?: string;
      description?: string;
      ownerUserId?: number;
      typeId?: number;
      size?: number;
      priority?: number;
      color?: string;
      deadline?: string;
      columnId?: number;
      laneId?: number;
      workflowId?: number;
      boardId?: number;
      position?: number;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.ownerUserId !== undefined) body.owner_user_id = data.ownerUserId;
    if (data.typeId !== undefined) body.type_id = data.typeId;
    if (data.size !== undefined) body.size = data.size;
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.color !== undefined) body.color = data.color;
    if (data.deadline !== undefined) body.deadline = data.deadline;
    if (data.columnId !== undefined) body.column_id = data.columnId;
    if (data.laneId !== undefined) body.lane_id = data.laneId;
    if (data.workflowId !== undefined) body.workflow_id = data.workflowId;
    if (data.boardId !== undefined) body.board_id = data.boardId;
    if (data.position !== undefined) body.position = data.position;
    let response = await this.http.patch(`/cards/${cardId}`, body);
    return response.data?.data;
  }

  async deleteCard(cardId: number) {
    let response = await this.http.delete(`/cards/${cardId}`);
    return response.data;
  }

  async archiveCard(cardId: number) {
    let response = await this.http.patch(`/cards/${cardId}`, { is_archived: 1 });
    return response.data?.data;
  }

  async unarchiveCard(cardId: number) {
    let response = await this.http.patch(`/cards/${cardId}`, { is_archived: 0 });
    return response.data?.data;
  }

  // ── Card Comments ──

  async listComments(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/comments`);
    return response.data?.data ?? [];
  }

  async getComment(cardId: number, commentId: number) {
    let response = await this.http.get(`/cards/${cardId}/comments/${commentId}`);
    return response.data?.data;
  }

  async createComment(cardId: number, text: string) {
    let response = await this.http.post(`/cards/${cardId}/comments`, { text });
    return response.data?.data;
  }

  async updateComment(cardId: number, commentId: number, text: string) {
    let response = await this.http.patch(`/cards/${cardId}/comments/${commentId}`, { text });
    return response.data?.data;
  }

  async deleteComment(cardId: number, commentId: number) {
    let response = await this.http.delete(`/cards/${cardId}/comments/${commentId}`);
    return response.data;
  }

  // ── Subtasks ──

  async listSubtasks(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/subtasks`);
    return response.data?.data ?? [];
  }

  async getSubtask(cardId: number, subtaskId: number) {
    let response = await this.http.get(`/cards/${cardId}/subtasks/${subtaskId}`);
    return response.data?.data;
  }

  async createSubtask(
    cardId: number,
    data: {
      description: string;
      ownerUserId?: number;
      isFinished?: number;
    }
  ) {
    let body: Record<string, any> = { description: data.description };
    if (data.ownerUserId !== undefined) body.owner_user_id = data.ownerUserId;
    if (data.isFinished !== undefined) body.is_finished = data.isFinished;
    let response = await this.http.post(`/cards/${cardId}/subtasks`, body);
    return response.data?.data;
  }

  async updateSubtask(
    cardId: number,
    subtaskId: number,
    data: {
      description?: string;
      ownerUserId?: number;
      isFinished?: number;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description !== undefined) body.description = data.description;
    if (data.ownerUserId !== undefined) body.owner_user_id = data.ownerUserId;
    if (data.isFinished !== undefined) body.is_finished = data.isFinished;
    let response = await this.http.patch(`/cards/${cardId}/subtasks/${subtaskId}`, body);
    return response.data?.data;
  }

  async deleteSubtask(cardId: number, subtaskId: number) {
    let response = await this.http.delete(`/cards/${cardId}/subtasks/${subtaskId}`);
    return response.data;
  }

  // ── Card Relationships ──

  async listLinkedCards(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/linkedCards`);
    return response.data?.data ?? [];
  }

  async linkCard(cardId: number, linkedCardId: number, linkType: number) {
    let response = await this.http.post(`/cards/${cardId}/linkedCards`, {
      linked_card_id: linkedCardId,
      link_type: linkType
    });
    return response.data?.data;
  }

  async unlinkCard(cardId: number, linkedCardId: number) {
    let response = await this.http.delete(`/cards/${cardId}/linkedCards`, {
      data: { linked_card_id: linkedCardId }
    });
    return response.data;
  }

  async listChildCards(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/children`);
    return response.data?.data ?? [];
  }

  async listParentCards(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/parents`);
    return response.data?.data ?? [];
  }

  async addParentCard(cardId: number, parentCardId: number) {
    let response = await this.http.post(`/cards/${cardId}/parents`, {
      parent_card_id: parentCardId
    });
    return response.data?.data;
  }

  async removeParentCard(cardId: number, parentCardId: number) {
    let response = await this.http.delete(`/cards/${cardId}/parents/${parentCardId}`);
    return response.data;
  }

  // ── Card Tags ──

  async listCardTags(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/tags`);
    return response.data?.data ?? [];
  }

  async addCardTag(cardId: number, tagId: number) {
    let response = await this.http.post(`/cards/${cardId}/tags`, { tag_id: tagId });
    return response.data?.data;
  }

  async removeCardTag(cardId: number, tagId: number) {
    let response = await this.http.delete(`/cards/${cardId}/tags/${tagId}`);
    return response.data;
  }

  // ── Custom Fields ──

  async listCustomFields(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/customFields`);
    return response.data?.data ?? [];
  }

  async updateCustomField(cardId: number, fieldId: number, value: any) {
    let response = await this.http.patch(`/cards/${cardId}/customFields/${fieldId}`, {
      value
    });
    return response.data?.data;
  }

  // ── Card Attachments ──

  async listAttachments(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/attachments`);
    return response.data?.data ?? [];
  }

  // ── Users ──

  async listUsers(params?: { isEnabled?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.isEnabled !== undefined) queryParams.is_enabled = params.isEnabled;
    let response = await this.http.get('/users', { params: queryParams });
    return response.data?.data ?? [];
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data?.data;
  }

  // ── Card Types ──

  async listCardTypes() {
    let response = await this.http.get('/cardTypes');
    return response.data?.data ?? [];
  }

  // ── Tags ──

  async listTags() {
    let response = await this.http.get('/tags');
    return response.data?.data ?? [];
  }

  // ── Logged Time ──

  async logTime(cardId: number, data: { time: number; timeUnit?: string; comment?: string }) {
    let body: Record<string, any> = { time: data.time };
    if (data.timeUnit) body.time_unit = data.timeUnit;
    if (data.comment) body.comment = data.comment;
    let response = await this.http.post(`/cards/${cardId}/loggedTime`, body);
    return response.data?.data;
  }

  // ── Block / Unblock ──

  async blockCard(
    cardId: number,
    data: { boardId: number; reasonId: number; comment?: string }
  ) {
    let body: Record<string, any> = { board_id: data.boardId, reason_id: data.reasonId };
    if (data.comment) body.comment = data.comment;
    let response = await this.http.post(`/cards/${cardId}/block`, body);
    return response.data?.data;
  }

  async unblockCard(cardId: number) {
    let response = await this.http.delete(`/cards/${cardId}/block`);
    return response.data;
  }

  // ── Block Reasons ──

  async listBlockReasons() {
    let response = await this.http.get('/blockReasons');
    return response.data?.data ?? [];
  }

  // ── Discard / Restore ──

  async discardCard(cardId: number) {
    let response = await this.http.patch(`/cards/${cardId}`, { is_discarded: 1 });
    return response.data?.data;
  }

  async restoreCard(cardId: number) {
    let response = await this.http.patch(`/cards/${cardId}`, { is_discarded: 0 });
    return response.data?.data;
  }
}
