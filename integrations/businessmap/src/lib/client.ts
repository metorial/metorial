import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; subdomain: string; domain?: string }) {
    let subdomain = config.subdomain.trim();
    let domain = config.domain ?? 'kanbanize.com';
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(subdomain)) {
      throw createApiServiceError(
        'Enter only your Businessmap account subdomain, without a URL or domain.',
        { reason: 'invalid_subdomain' }
      );
    }
    if (!['kanbanize.com', 'businessmap.io'].includes(domain)) {
      throw createApiServiceError(
        'Choose kanbanize.com or businessmap.io as your account domain.',
        { reason: 'invalid_domain' }
      );
    }
    if (!config.token.trim()) {
      throw createApiServiceError('A Businessmap API key is required.', {
        reason: 'missing_api_key'
      });
    }
    this.http = createAuthenticatedAxios({
      baseURL: `https://${subdomain}.${domain}/api/v2`,
      authHeader: { name: 'apikey', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Businessmap',
          reason: 'businessmap_api_error',
          extractUpstreamCode: (value, response, helpers) => {
            if (helpers.isRecord(response?.data) && helpers.isRecord(response.data.error)) {
              let code = response.data.error.code;
              if (typeof code === 'string') return code;
            }
            if (
              helpers.isRecord(value) &&
              helpers.isRecord(value.data) &&
              helpers.isRecord(value.data.upstream)
            ) {
              let code = value.data.upstream.code;
              if (typeof code === 'string') return code;
            }
            return undefined;
          }
        })
    });
  }

  async getCurrentUser() {
    let response = await this.http.get('/me');
    let user = response.data?.data;
    if (!user || typeof user.user_id !== 'number') {
      throw createApiServiceError('Businessmap did not return a current user ID.', {
        reason: 'invalid_api_response'
      });
    }
    return user;
  }

  async listWorkspaces(params?: { isArchived?: number }) {
    let response = await this.http.get('/workspaces', {
      params: pickDefined({ is_archived: params?.isArchived })
    });
    return response.data?.data ?? [];
  }

  async getWorkspace(workspaceId: number) {
    let response = await this.http.get(`/workspaces/${workspaceId}`);
    return response.data?.data;
  }

  async listBoards(params?: {
    boardIds?: number[];
    workspaceId?: number;
    isArchived?: number;
  }) {
    let response = await this.http.get('/boards', {
      params: pickDefined({
        workspace_ids: params?.workspaceId,
        is_archived: params?.isArchived,
        board_ids: params?.boardIds?.length ? params.boardIds.join(',') : undefined
      })
    });
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

  async listCards(params?: {
    boardIds?: number[];
    cardIds?: number[];
    page?: number;
    state?: 'active' | 'archived' | 'discarded';
    columnId?: number;
    laneId?: number;
    workflowId?: number;
    ownerId?: number;
    typeId?: number;
    expandFields?: string[];
  }) {
    let archived = params?.state === 'archived';
    let response = await this.http.get('/cards', {
      params: pickDefined({
        board_ids: params?.boardIds?.length ? params.boardIds.join(',') : undefined,
        card_ids: params?.cardIds?.length ? params.cardIds.join(',') : undefined,
        page: params?.page,
        per_page: 200,
        state: params?.state ?? 'active',
        [archived ? 'last_column_ids' : 'column_ids']: params?.columnId,
        [archived ? 'last_lane_ids' : 'lane_ids']: params?.laneId,
        workflow_ids: params?.workflowId,
        owner_user_ids: params?.ownerId,
        type_ids: params?.typeId,
        fields: params?.expandFields?.length ? params.expandFields.join(',') : undefined
      })
    });
    return response.data?.data;
  }

  async getCard(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}`);
    return response.data?.data;
  }

  private async validatePlacement(data: {
    boardId: number;
    workflowId?: number;
    columnId?: number;
    laneId?: number;
  }) {
    let [columns, lanes] = await Promise.all([
      data.columnId === undefined ? [] : this.getBoardColumns(data.boardId),
      data.laneId === undefined ? [] : this.getBoardLanes(data.boardId)
    ]);
    let column = columns.find((item: any) => item.column_id === data.columnId);
    let lane = lanes.find((item: any) => item.lane_id === data.laneId);
    if (data.columnId !== undefined && !column) {
      throw createApiServiceError(
        'The column does not belong to the selected board. Call get_board to find its columns.',
        { reason: 'invalid_card_placement' }
      );
    }
    if (data.laneId !== undefined && !lane) {
      throw createApiServiceError(
        'The lane does not belong to the selected board. Call get_board to find its lanes.',
        { reason: 'invalid_card_placement' }
      );
    }
    if (
      (column && lane && column.workflow_id !== lane.workflow_id) ||
      (data.workflowId !== undefined &&
        (column?.workflow_id !== data.workflowId || lane?.workflow_id !== data.workflowId))
    ) {
      throw createApiServiceError(
        'Choose a column and lane from the same selected workflow. Call get_board to inspect the board structure.',
        { reason: 'invalid_card_placement' }
      );
    }
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
    await this.validatePlacement(data);
    let response = await this.http.post(
      '/cards',
      pickDefined({
        column_id: data.columnId,
        lane_id: data.laneId,
        title: data.title,
        description: data.description,
        custom_id: data.customId,
        owner_user_id: data.ownerUserId,
        type_id: data.typeId,
        size: data.size,
        priority: data.priority,
        color: data.color,
        deadline: data.deadline
      })
    );
    let card = Array.isArray(response.data?.data)
      ? response.data.data[0]
      : response.data?.data;
    if (!card || typeof card.card_id !== 'number') {
      throw createApiServiceError('Businessmap did not return the created card ID.', {
        reason: 'invalid_api_response'
      });
    }
    return card;
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
    if (data.boardId !== undefined || data.workflowId !== undefined) {
      if (data.columnId === undefined || data.laneId === undefined) {
        throw createApiServiceError(
          'Provide columnId and laneId when choosing a target board or workflow. Call get_board to find valid placement IDs.',
          { reason: 'invalid_card_placement' }
        );
      }
      let boardId = data.boardId ?? (await this.getCard(cardId)).board_id;
      await this.validatePlacement({ ...data, boardId });
    }
    let body = pickDefined({
      title: data.title,
      description: data.description,
      owner_user_id: data.ownerUserId,
      type_id: data.typeId,
      size: data.size,
      priority: data.priority,
      color: data.color,
      deadline: data.deadline,
      column_id: data.columnId,
      lane_id: data.laneId,
      position: data.position
    });
    if (!Object.keys(body).length) {
      throw createApiServiceError('Provide at least one card property to update.', {
        reason: 'empty_card_update'
      });
    }
    let response = await this.http.patch(`/cards/${cardId}`, body);
    let cards = response.data?.data;
    return Array.isArray(cards) ? cards.find((card: any) => card.card_id === cardId) : cards;
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
    data: { description: string; ownerUserId?: number; isFinished?: number }
  ) {
    let response = await this.http.post(
      `/cards/${cardId}/subtasks`,
      pickDefined({
        description: data.description,
        owner_user_id: data.ownerUserId,
        is_finished: data.isFinished
      })
    );
    return response.data?.data;
  }

  async updateSubtask(
    cardId: number,
    subtaskId: number,
    data: { description?: string; ownerUserId?: number; isFinished?: number }
  ) {
    let body = pickDefined({
      description: data.description,
      owner_user_id: data.ownerUserId,
      is_finished: data.isFinished
    });
    if (!Object.keys(body).length) {
      throw createApiServiceError(
        'Provide description, ownerUserId, or isFinished to update a subtask.',
        { reason: 'empty_subtask_update' }
      );
    }
    let response = await this.http.patch(`/cards/${cardId}/subtasks/${subtaskId}`, body);
    return response.data?.data;
  }

  async deleteSubtask(cardId: number, subtaskId: number) {
    let response = await this.http.delete(`/cards/${cardId}/subtasks/${subtaskId}`);
    return response.data;
  }

  async listLinkedCards(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/linkedCards`);
    return response.data?.data ?? [];
  }

  async linkCard(cardId: number, linkedCardId: number, linkType: number) {
    let relationship = ['relatives', 'predecessors', 'successors'][linkType];
    if (!relationship || !Number.isInteger(linkType)) {
      throw createApiServiceError(
        'linkType must be 0 (relative), 1 (predecessor), or 2 (successor).',
        { reason: 'invalid_link_type' }
      );
    }
    let response = await this.http.put(`/cards/${cardId}/${relationship}/${linkedCardId}`, {});
    return response.data?.data;
  }

  async unlinkCard(cardId: number, linkedCardId: number) {
    let links = await this.listLinkedCards(cardId);
    let relationships = new Set<string>();
    for (let link of links) {
      if ((link.card_id ?? link.linked_card_id) !== linkedCardId) continue;
      let type = link.link_type ?? link.type;
      if (type === 'relative') relationships.add('relatives');
      if (type === 'predecessor') relationships.add('predecessors');
      if (type === 'successor') relationships.add('successors');
    }
    if (!relationships.size) {
      throw createApiServiceError(
        'No relative, predecessor, or successor link exists for the target card. Use list to inspect its relationships; remove_parent removes a parent link.',
        { reason: 'card_link_not_found' }
      );
    }
    for (let relationship of relationships) {
      await this.http.delete(`/cards/${cardId}/${relationship}/${linkedCardId}`);
    }
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
    let response = await this.http.put(`/cards/${cardId}/parents/${parentCardId}`, {});
    return response.data?.data;
  }

  async removeParentCard(cardId: number, parentCardId: number) {
    let response = await this.http.delete(`/cards/${cardId}/parents/${parentCardId}`);
    return response.data;
  }

  async listCardTags(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/tags`);
    return response.data?.data ?? [];
  }

  async addCardTag(cardId: number, tagId: number) {
    let response = await this.http.put(`/cards/${cardId}/tags/${tagId}`, {});
    return response.data?.data;
  }

  async removeCardTag(cardId: number, tagId: number) {
    let response = await this.http.delete(`/cards/${cardId}/tags/${tagId}`);
    return response.data;
  }

  async listCustomFields(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/customFields`);
    return response.data?.data ?? [];
  }

  async updateCustomField(cardId: number, fieldId: number, value: unknown) {
    if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
      throw createApiServiceError(
        'Provide a string, number, or null for a text, number, date, or link custom field.',
        { reason: 'invalid_custom_field_value' }
      );
    }
    let response = await this.http.put(`/cards/${cardId}/customFields/${fieldId}`, {
      value: value === null ? null : String(value)
    });
    return response.data?.data;
  }

  async listAttachments(cardId: number) {
    let response = await this.http.get(`/cards/${cardId}/attachments`);
    return response.data?.data ?? [];
  }

  async listUsers(params?: { isEnabled?: number }) {
    let response = await this.http.get('/users', {
      params: pickDefined({ is_enabled: params?.isEnabled })
    });
    return response.data?.data ?? [];
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data?.data;
  }

  async listCardTypes(boardId?: number) {
    let response = await this.http.get('/cardTypes');
    let catalog = response.data?.data ?? [];
    if (boardId === undefined) return catalog;
    let assigned = await this.http.get(`/boards/${boardId}/cardTypes`);
    return (assigned.data?.data ?? []).map((item: any) => ({
      ...catalog.find((type: any) => type.type_id === item.type_id),
      ...item
    }));
  }

  async listTags() {
    let response = await this.http.get('/tags');
    return response.data?.data ?? [];
  }

  async logTime(cardId: number, data: { time: number; timeUnit?: string; comment?: string }) {
    let seconds = data.time * (data.timeUnit === 'minutes' ? 60 : 3600);
    if (seconds <= 0 || !Number.isSafeInteger(seconds) || seconds > 6000000) {
      throw createApiServiceError(
        'Time must convert to a positive whole number of seconds, up to 6000000 seconds.',
        { reason: 'invalid_logged_time' }
      );
    }
    let response = await this.http.post(
      '/loggedTime',
      pickDefined({
        card_id: cardId,
        time: seconds,
        comment: data.comment
      })
    );
    return response.data?.data;
  }

  async blockCard(
    cardId: number,
    data: { boardId?: number; reasonId: number; comment?: string }
  ) {
    if (data.boardId !== undefined) {
      let card = await this.getCard(cardId);
      if (card.board_id !== data.boardId) {
        throw createApiServiceError(
          'boardId does not match the card board. Call get_card to inspect its current board.',
          { reason: 'invalid_card_board' }
        );
      }
    }
    let response = await this.http.patch(`/cards/${cardId}`, {
      block_reason: pickDefined({ reason_id: data.reasonId, comment: data.comment })
    });
    return response.data?.data;
  }

  async unblockCard(cardId: number) {
    let response = await this.http.delete(`/cards/${cardId}/blockReason`);
    return response.data;
  }

  async listBlockReasons(boardId?: number) {
    let response = await this.http.get('/blockReasons');
    let catalog = response.data?.data ?? [];
    if (boardId === undefined) return catalog;
    let assigned = await this.http.get(`/boards/${boardId}/blockReasons`);
    return (assigned.data?.data ?? []).map((item: any) => ({
      ...catalog.find((reason: any) => reason.reason_id === item.reason_id),
      ...item
    }));
  }

  async discardCard(cardId: number) {
    let response = await this.http.patch(`/cards/${cardId}`, { is_discarded: 1 });
    return response.data?.data;
  }

  async restoreCard(cardId: number) {
    let response = await this.http.patch(`/cards/${cardId}`, { is_discarded: 0 });
    return response.data?.data;
  }
}
