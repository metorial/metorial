import { createAxios } from 'slates';

export class MiroClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.miro.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Boards ────────────────────────────────────────────────────────

  async createBoard(params: {
    name: string;
    description?: string;
    teamId?: string;
    policy?: {
      sharingPolicy?: {
        access?: string;
        inviteToAccountAndBoardLinkAccess?: string;
        organizationAccess?: string;
        teamAccess?: string;
      };
      permissionsPolicy?: {
        collaborationToolsStartAccess?: string;
        copyAccess?: string;
        sharingAccess?: string;
      };
    };
  }) {
    let body: Record<string, any> = {
      name: params.name
    };
    if (params.description) body.description = params.description;
    if (params.teamId) body.teamId = params.teamId;
    if (params.policy) body.policy = params.policy;

    let response = await this.axios.post('/boards', body);
    return response.data;
  }

  async getBoard(boardId: string) {
    let response = await this.axios.get(`/boards/${boardId}`);
    return response.data;
  }

  async getBoards(params?: {
    teamId?: string;
    projectId?: string;
    query?: string;
    sort?: string;
    limit?: number;
    offset?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.teamId) queryParams.team_id = params.teamId;
    if (params?.projectId) queryParams.project_id = params.projectId;
    if (params?.query) queryParams.query = params.query;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/boards', { params: queryParams });
    return response.data;
  }

  async updateBoard(
    boardId: string,
    params: {
      name?: string;
      description?: string;
      policy?: {
        sharingPolicy?: {
          access?: string;
          inviteToAccountAndBoardLinkAccess?: string;
          organizationAccess?: string;
          teamAccess?: string;
        };
        permissionsPolicy?: {
          collaborationToolsStartAccess?: string;
          copyAccess?: string;
          sharingAccess?: string;
        };
      };
    }
  ) {
    let response = await this.axios.patch(`/boards/${boardId}`, params);
    return response.data;
  }

  async copyBoard(
    boardId: string,
    params?: {
      name?: string;
      description?: string;
      teamId?: string;
    }
  ) {
    let response = await this.axios.put(`/boards/${boardId}/copy`, params || {});
    return response.data;
  }

  async deleteBoard(boardId: string) {
    await this.axios.delete(`/boards/${boardId}`);
  }

  // ── Board Items ───────────────────────────────────────────────────

  async getItems(
    boardId: string,
    params?: {
      type?: string;
      limit?: number;
      cursor?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.cursor) queryParams.cursor = params.cursor;

    let response = await this.axios.get(`/boards/${boardId}/items`, { params: queryParams });
    return response.data;
  }

  async getItem(boardId: string, itemId: string) {
    let response = await this.axios.get(`/boards/${boardId}/items/${itemId}`);
    return response.data;
  }

  async updateItemPosition(
    boardId: string,
    itemId: string,
    params: {
      position?: { x?: number; y?: number; origin?: string };
      parent?: { id?: string };
    }
  ) {
    let response = await this.axios.patch(`/boards/${boardId}/items/${itemId}`, params);
    return response.data;
  }

  async deleteItem(boardId: string, itemId: string) {
    await this.axios.delete(`/boards/${boardId}/items/${itemId}`);
  }

  // ── Sticky Notes ──────────────────────────────────────────────────

  async createStickyNote(
    boardId: string,
    params: {
      content: string;
      shape?: string;
      fillColor?: string;
      textAlign?: string;
      textAlignVertical?: string;
      x?: number;
      y?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {
      data: { content: params.content }
    };
    if (params.shape) body.data.shape = params.shape;
    if (params.fillColor || params.textAlign || params.textAlignVertical) {
      body.style = {};
      if (params.fillColor) body.style.fillColor = params.fillColor;
      if (params.textAlign) body.style.textAlign = params.textAlign;
      if (params.textAlignVertical) body.style.textAlignVertical = params.textAlignVertical;
    }
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.post(`/boards/${boardId}/sticky_notes`, body);
    return response.data;
  }

  async updateStickyNote(
    boardId: string,
    itemId: string,
    params: {
      content?: string;
      shape?: string;
      fillColor?: string;
      textAlign?: string;
      textAlignVertical?: string;
      x?: number;
      y?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.content !== undefined || params.shape !== undefined) {
      body.data = {};
      if (params.content !== undefined) body.data.content = params.content;
      if (params.shape !== undefined) body.data.shape = params.shape;
    }
    if (params.fillColor || params.textAlign || params.textAlignVertical) {
      body.style = {};
      if (params.fillColor) body.style.fillColor = params.fillColor;
      if (params.textAlign) body.style.textAlign = params.textAlign;
      if (params.textAlignVertical) body.style.textAlignVertical = params.textAlignVertical;
    }
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.patch(`/boards/${boardId}/sticky_notes/${itemId}`, body);
    return response.data;
  }

  // ── Cards ─────────────────────────────────────────────────────────

  async createCard(
    boardId: string,
    params: {
      title?: string;
      description?: string;
      dueDate?: string;
      assigneeId?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = { data: {} };
    if (params.title) body.data.title = params.title;
    if (params.description) body.data.description = params.description;
    if (params.dueDate) body.data.dueDate = params.dueDate;
    if (params.assigneeId) body.data.assigneeId = params.assigneeId;
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (params.width !== undefined || params.height !== undefined) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.post(`/boards/${boardId}/cards`, body);
    return response.data;
  }

  async updateCard(
    boardId: string,
    itemId: string,
    params: {
      title?: string;
      description?: string;
      dueDate?: string;
      assigneeId?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (
      params.title !== undefined ||
      params.description !== undefined ||
      params.dueDate !== undefined ||
      params.assigneeId !== undefined
    ) {
      body.data = {};
      if (params.title !== undefined) body.data.title = params.title;
      if (params.description !== undefined) body.data.description = params.description;
      if (params.dueDate !== undefined) body.data.dueDate = params.dueDate;
      if (params.assigneeId !== undefined) body.data.assigneeId = params.assigneeId;
    }
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (params.width !== undefined || params.height !== undefined) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.patch(`/boards/${boardId}/cards/${itemId}`, body);
    return response.data;
  }

  // ── Text Items ────────────────────────────────────────────────────

  async createText(
    boardId: string,
    params: {
      content: string;
      fontSize?: number;
      fillColor?: string;
      textAlign?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {
      data: { content: params.content }
    };
    if (params.fillColor || params.textAlign || params.fontSize) {
      body.style = {};
      if (params.fillColor) body.style.fillColor = params.fillColor;
      if (params.textAlign) body.style.textAlign = params.textAlign;
      if (params.fontSize) body.style.fontSize = String(params.fontSize);
    }
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (
      params.width !== undefined ||
      params.height !== undefined ||
      params.rotation !== undefined
    ) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
      if (params.rotation !== undefined) body.geometry.rotation = params.rotation;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.post(`/boards/${boardId}/texts`, body);
    return response.data;
  }

  async updateText(
    boardId: string,
    itemId: string,
    params: {
      content?: string;
      fontSize?: number;
      fillColor?: string;
      textAlign?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.content !== undefined) {
      body.data = { content: params.content };
    }
    if (params.fillColor || params.textAlign || params.fontSize) {
      body.style = {};
      if (params.fillColor) body.style.fillColor = params.fillColor;
      if (params.textAlign) body.style.textAlign = params.textAlign;
      if (params.fontSize) body.style.fontSize = String(params.fontSize);
    }
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (
      params.width !== undefined ||
      params.height !== undefined ||
      params.rotation !== undefined
    ) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
      if (params.rotation !== undefined) body.geometry.rotation = params.rotation;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.patch(`/boards/${boardId}/texts/${itemId}`, body);
    return response.data;
  }

  // ── Shapes ────────────────────────────────────────────────────────

  async createShape(
    boardId: string,
    params: {
      content?: string;
      shape?: string;
      fillColor?: string;
      fillOpacity?: string;
      fontFamily?: string;
      fontSize?: string;
      borderColor?: string;
      borderWidth?: string;
      borderOpacity?: string;
      borderStyle?: string;
      textAlign?: string;
      textAlignVertical?: string;
      color?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = { data: {} };
    if (params.content) body.data.content = params.content;
    if (params.shape) body.data.shape = params.shape;

    let style: Record<string, any> = {};
    if (params.fillColor) style.fillColor = params.fillColor;
    if (params.fillOpacity) style.fillOpacity = params.fillOpacity;
    if (params.fontFamily) style.fontFamily = params.fontFamily;
    if (params.fontSize) style.fontSize = params.fontSize;
    if (params.borderColor) style.borderColor = params.borderColor;
    if (params.borderWidth) style.borderWidth = params.borderWidth;
    if (params.borderOpacity) style.borderOpacity = params.borderOpacity;
    if (params.borderStyle) style.borderStyle = params.borderStyle;
    if (params.textAlign) style.textAlign = params.textAlign;
    if (params.textAlignVertical) style.textAlignVertical = params.textAlignVertical;
    if (params.color) style.color = params.color;
    if (Object.keys(style).length > 0) body.style = style;

    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (
      params.width !== undefined ||
      params.height !== undefined ||
      params.rotation !== undefined
    ) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
      if (params.rotation !== undefined) body.geometry.rotation = params.rotation;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.post(`/boards/${boardId}/shapes`, body);
    return response.data;
  }

  async updateShape(
    boardId: string,
    itemId: string,
    params: {
      content?: string;
      shape?: string;
      fillColor?: string;
      fillOpacity?: string;
      fontFamily?: string;
      fontSize?: string;
      borderColor?: string;
      borderWidth?: string;
      borderOpacity?: string;
      borderStyle?: string;
      textAlign?: string;
      textAlignVertical?: string;
      color?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.content !== undefined || params.shape !== undefined) {
      body.data = {};
      if (params.content !== undefined) body.data.content = params.content;
      if (params.shape !== undefined) body.data.shape = params.shape;
    }

    let style: Record<string, any> = {};
    if (params.fillColor) style.fillColor = params.fillColor;
    if (params.fillOpacity) style.fillOpacity = params.fillOpacity;
    if (params.fontFamily) style.fontFamily = params.fontFamily;
    if (params.fontSize) style.fontSize = params.fontSize;
    if (params.borderColor) style.borderColor = params.borderColor;
    if (params.borderWidth) style.borderWidth = params.borderWidth;
    if (params.borderOpacity) style.borderOpacity = params.borderOpacity;
    if (params.borderStyle) style.borderStyle = params.borderStyle;
    if (params.textAlign) style.textAlign = params.textAlign;
    if (params.textAlignVertical) style.textAlignVertical = params.textAlignVertical;
    if (params.color) style.color = params.color;
    if (Object.keys(style).length > 0) body.style = style;

    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (
      params.width !== undefined ||
      params.height !== undefined ||
      params.rotation !== undefined
    ) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
      if (params.rotation !== undefined) body.geometry.rotation = params.rotation;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.patch(`/boards/${boardId}/shapes/${itemId}`, body);
    return response.data;
  }

  // ── Images ────────────────────────────────────────────────────────

  async createImageFromUrl(
    boardId: string,
    params: {
      url: string;
      title?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {
      data: { url: params.url }
    };
    if (params.title) body.data.title = params.title;
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (
      params.width !== undefined ||
      params.height !== undefined ||
      params.rotation !== undefined
    ) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
      if (params.rotation !== undefined) body.geometry.rotation = params.rotation;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.post(`/boards/${boardId}/images`, body);
    return response.data;
  }

  // ── Embeds ────────────────────────────────────────────────────────

  async createEmbed(
    boardId: string,
    params: {
      url: string;
      mode?: string;
      previewUrl?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {
      data: { url: params.url }
    };
    if (params.mode) body.data.mode = params.mode;
    if (params.previewUrl) body.data.previewUrl = params.previewUrl;
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (params.width !== undefined || params.height !== undefined) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.post(`/boards/${boardId}/embeds`, body);
    return response.data;
  }

  // ── Frames ────────────────────────────────────────────────────────

  async createFrame(
    boardId: string,
    params: {
      title?: string;
      format?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = { data: {} };
    if (params.title) body.data.title = params.title;
    if (params.format) body.data.format = params.format;
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (params.width !== undefined || params.height !== undefined) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.post(`/boards/${boardId}/frames`, body);
    return response.data;
  }

  async getFrameItems(
    boardId: string,
    frameId: string,
    params?: {
      limit?: number;
      cursor?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.cursor) queryParams.cursor = params.cursor;

    let response = await this.axios.get(`/boards/${boardId}/frames/${frameId}/items`, {
      params: queryParams
    });
    return response.data;
  }

  // ── Connectors ────────────────────────────────────────────────────

  async createConnector(
    boardId: string,
    params: {
      startItemId: string;
      endItemId: string;
      shape?: string;
      captions?: Array<{ content: string; textAlignVertical?: string }>;
      style?: {
        strokeColor?: string;
        strokeWidth?: string;
        strokeStyle?: string;
        startStrokeCap?: string;
        endStrokeCap?: string;
        color?: string;
      };
    }
  ) {
    let body: Record<string, any> = {
      startItem: { id: params.startItemId },
      endItem: { id: params.endItemId }
    };
    if (params.shape) body.shape = params.shape;
    if (params.captions) body.captions = params.captions;
    if (params.style) body.style = params.style;

    let response = await this.axios.post(`/boards/${boardId}/connectors`, body);
    return response.data;
  }

  async getConnectors(
    boardId: string,
    params?: {
      limit?: number;
      cursor?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.cursor) queryParams.cursor = params.cursor;

    let response = await this.axios.get(`/boards/${boardId}/connectors`, {
      params: queryParams
    });
    return response.data;
  }

  async getConnector(boardId: string, connectorId: string) {
    let response = await this.axios.get(`/boards/${boardId}/connectors/${connectorId}`);
    return response.data;
  }

  async updateConnector(
    boardId: string,
    connectorId: string,
    params: {
      startItemId?: string;
      endItemId?: string;
      shape?: string;
      captions?: Array<{ content: string; textAlignVertical?: string }>;
      style?: {
        strokeColor?: string;
        strokeWidth?: string;
        strokeStyle?: string;
        startStrokeCap?: string;
        endStrokeCap?: string;
        color?: string;
      };
    }
  ) {
    let body: Record<string, any> = {};
    if (params.startItemId) body.startItem = { id: params.startItemId };
    if (params.endItemId) body.endItem = { id: params.endItemId };
    if (params.shape) body.shape = params.shape;
    if (params.captions) body.captions = params.captions;
    if (params.style) body.style = params.style;

    let response = await this.axios.patch(
      `/boards/${boardId}/connectors/${connectorId}`,
      body
    );
    return response.data;
  }

  async deleteConnector(boardId: string, connectorId: string) {
    await this.axios.delete(`/boards/${boardId}/connectors/${connectorId}`);
  }

  // ── Tags ──────────────────────────────────────────────────────────

  async createTag(
    boardId: string,
    params: {
      title: string;
      fillColor?: string;
    }
  ) {
    let body: Record<string, any> = {
      title: params.title
    };
    if (params.fillColor) body.fillColor = params.fillColor;

    let response = await this.axios.post(`/boards/${boardId}/tags`, body);
    return response.data;
  }

  async getTags(
    boardId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;

    let response = await this.axios.get(`/boards/${boardId}/tags`, { params: queryParams });
    return response.data;
  }

  async getTag(boardId: string, tagId: string) {
    let response = await this.axios.get(`/boards/${boardId}/tags/${tagId}`);
    return response.data;
  }

  async updateTag(
    boardId: string,
    tagId: string,
    params: {
      title?: string;
      fillColor?: string;
    }
  ) {
    let response = await this.axios.patch(`/boards/${boardId}/tags/${tagId}`, params);
    return response.data;
  }

  async deleteTag(boardId: string, tagId: string) {
    await this.axios.delete(`/boards/${boardId}/tags/${tagId}`);
  }

  async attachTag(boardId: string, itemId: string, tagId: string) {
    await this.axios.post(`/boards/${boardId}/items/${itemId}/tags`, { tagId });
    return { success: true };
  }

  async detachTag(boardId: string, itemId: string, tagId: string) {
    await this.axios.delete(`/boards/${boardId}/items/${itemId}/tags/${tagId}`);
  }

  async getItemTags(boardId: string, itemId: string) {
    let response = await this.axios.get(`/boards/${boardId}/items/${itemId}/tags`);
    return response.data;
  }

  // ── Board Members ─────────────────────────────────────────────────

  async shareBoard(
    boardId: string,
    params: {
      emails: string[];
      role?: string;
      message?: string;
    }
  ) {
    let body: Record<string, any> = {
      emails: params.emails
    };
    if (params.role) body.role = params.role;
    if (params.message) body.message = params.message;

    let response = await this.axios.post(`/boards/${boardId}/members`, body);
    return response.data;
  }

  async getBoardMembers(
    boardId: string,
    params?: {
      limit?: number;
      offset?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;

    let response = await this.axios.get(`/boards/${boardId}/members`, { params: queryParams });
    return response.data;
  }

  async getBoardMember(boardId: string, memberId: string) {
    let response = await this.axios.get(`/boards/${boardId}/members/${memberId}`);
    return response.data;
  }

  async updateBoardMember(
    boardId: string,
    memberId: string,
    params: {
      role: string;
    }
  ) {
    let response = await this.axios.patch(`/boards/${boardId}/members/${memberId}`, params);
    return response.data;
  }

  async removeBoardMember(boardId: string, memberId: string) {
    await this.axios.delete(`/boards/${boardId}/members/${memberId}`);
  }

  // ── Groups ────────────────────────────────────────────────────────

  async createGroup(
    boardId: string,
    params: {
      itemIds: string[];
    }
  ) {
    let body = { items: params.itemIds.map(id => id) };
    let response = await this.axios.post(`/boards/${boardId}/groups`, body);
    return response.data;
  }

  async getGroups(
    boardId: string,
    params?: {
      limit?: number;
      cursor?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.cursor) queryParams.cursor = params.cursor;

    let response = await this.axios.get(`/boards/${boardId}/groups`, { params: queryParams });
    return response.data;
  }

  async getGroup(boardId: string, groupId: string) {
    let response = await this.axios.get(`/boards/${boardId}/groups/${groupId}`);
    return response.data;
  }

  async getGroupItems(boardId: string, groupId: string) {
    let response = await this.axios.get(`/boards/${boardId}/groups/${groupId}/items`);
    return response.data;
  }

  async deleteGroup(boardId: string, groupId: string) {
    await this.axios.delete(`/boards/${boardId}/groups/${groupId}`);
  }

  // ── App Cards ─────────────────────────────────────────────────────

  async createAppCard(
    boardId: string,
    params: {
      title?: string;
      description?: string;
      status?: string;
      fields?: Array<{
        value: string;
        fillColor?: string;
        iconShape?: string;
        iconUrl?: string;
        textColor?: string;
        tooltip?: string;
      }>;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = { data: {} };
    if (params.title) body.data.title = params.title;
    if (params.description) body.data.description = params.description;
    if (params.status) body.data.status = params.status;
    if (params.fields) body.data.fields = params.fields;
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (params.width !== undefined || params.height !== undefined) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.post(`/boards/${boardId}/app_cards`, body);
    return response.data;
  }

  async updateAppCard(
    boardId: string,
    itemId: string,
    params: {
      title?: string;
      description?: string;
      status?: string;
      fields?: Array<{
        value: string;
        fillColor?: string;
        iconShape?: string;
        iconUrl?: string;
        textColor?: string;
        tooltip?: string;
      }>;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      parentId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (
      params.title !== undefined ||
      params.description !== undefined ||
      params.status !== undefined ||
      params.fields !== undefined
    ) {
      body.data = {};
      if (params.title !== undefined) body.data.title = params.title;
      if (params.description !== undefined) body.data.description = params.description;
      if (params.status !== undefined) body.data.status = params.status;
      if (params.fields !== undefined) body.data.fields = params.fields;
    }
    if (params.x !== undefined || params.y !== undefined) {
      body.position = {};
      if (params.x !== undefined) body.position.x = params.x;
      if (params.y !== undefined) body.position.y = params.y;
    }
    if (params.width !== undefined || params.height !== undefined) {
      body.geometry = {};
      if (params.width !== undefined) body.geometry.width = params.width;
      if (params.height !== undefined) body.geometry.height = params.height;
    }
    if (params.parentId) body.parent = { id: params.parentId };

    let response = await this.axios.patch(`/boards/${boardId}/app_cards/${itemId}`, body);
    return response.data;
  }
}
