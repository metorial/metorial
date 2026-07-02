import { createApiServiceError, createAxios } from 'slates';
import { notionApiError } from './errors';

let NOTION_API_VERSION = '2022-06-28';

export interface PaginatedResponse<T> {
  object: 'list';
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export class NotionClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.notion.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => {
        throw notionApiError(error);
      }
    );
  }

  // --- Pages ---

  async createPage(params: {
    parent: Record<string, any>;
    properties: Record<string, any>;
    children?: any[];
    icon?: Record<string, any>;
    cover?: Record<string, any>;
  }): Promise<any> {
    let body: Record<string, any> = {
      parent: params.parent,
      properties: params.properties
    };
    if (params.children) body.children = params.children;
    if (params.icon) body.icon = params.icon;
    if (params.cover) body.cover = params.cover;

    let response = await this.axios.post('/pages', body);
    return response.data;
  }

  async getPage(pageId: string): Promise<any> {
    let response = await this.axios.get(`/pages/${pageId}`);
    return response.data;
  }

  async updatePage(
    pageId: string,
    params: {
      properties?: Record<string, any>;
      icon?: Record<string, any> | null;
      cover?: Record<string, any> | null;
      archived?: boolean;
      inTrash?: boolean;
      isLocked?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.properties !== undefined) body.properties = params.properties;
    if (params.icon !== undefined) body.icon = params.icon;
    if (params.cover !== undefined) body.cover = params.cover;
    if (params.archived !== undefined) body.archived = params.archived;
    if (params.inTrash !== undefined) body.in_trash = params.inTrash;
    if (params.isLocked !== undefined) body.is_locked = params.isLocked;

    let response = await this.axios.patch(`/pages/${pageId}`, body);
    return response.data;
  }

  async getPageProperty(
    pageId: string,
    propertyId: string,
    startCursor?: string
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (startCursor) params.start_cursor = startCursor;

    let response = await this.axios.get(`/pages/${pageId}/properties/${propertyId}`, {
      params
    });
    return response.data;
  }

  // --- Blocks ---

  async getBlock(blockId: string): Promise<any> {
    let response = await this.axios.get(`/blocks/${blockId}`);
    return response.data;
  }

  async getBlockChildren(
    blockId: string,
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = {};
    if (startCursor) params.start_cursor = startCursor;
    if (pageSize) params.page_size = pageSize;

    let response = await this.axios.get(`/blocks/${blockId}/children`, { params });
    return response.data;
  }

  async appendBlockChildren(
    blockId: string,
    children: any[],
    position?: Record<string, any>
  ): Promise<PaginatedResponse<any>> {
    let body: Record<string, any> = { children };
    if (position) body.position = position;

    let response = await this.axios.patch(`/blocks/${blockId}/children`, body);
    return response.data;
  }

  async updateBlock(blockId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/blocks/${blockId}`, data);
    return response.data;
  }

  async deleteBlock(blockId: string): Promise<any> {
    let response = await this.axios.delete(`/blocks/${blockId}`);
    return response.data;
  }

  // --- Databases ---

  async getDatabase(databaseId: string): Promise<any> {
    let response = await this.axios.get(`/databases/${databaseId}`);
    return response.data;
  }

  async createDatabase(params: {
    parent: Record<string, any>;
    title: any[];
    properties: Record<string, any>;
    description?: any[];
    isInline?: boolean;
    icon?: Record<string, any>;
    cover?: Record<string, any>;
  }): Promise<any> {
    let body: Record<string, any> = {
      parent: params.parent,
      title: params.title,
      properties: params.properties
    };
    if (params.description) body.description = params.description;
    if (params.isInline !== undefined) body.is_inline = params.isInline;
    if (params.icon) body.icon = params.icon;
    if (params.cover) body.cover = params.cover;

    let response = await this.axios.post('/databases', body);
    return response.data;
  }

  async updateDatabase(
    databaseId: string,
    params: {
      title?: any[];
      description?: any[];
      properties?: Record<string, any>;
      icon?: Record<string, any> | null;
      cover?: Record<string, any> | null;
      isInline?: boolean;
      archived?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.description !== undefined) body.description = params.description;
    if (params.properties !== undefined) body.properties = params.properties;
    if (params.icon !== undefined) body.icon = params.icon;
    if (params.cover !== undefined) body.cover = params.cover;
    if (params.isInline !== undefined) body.is_inline = params.isInline;
    if (params.archived !== undefined) body.archived = params.archived;

    let response = await this.axios.patch(`/databases/${databaseId}`, body);
    return response.data;
  }

  async queryDatabase(
    databaseId: string,
    params?: {
      filter?: Record<string, any>;
      sorts?: any[];
      startCursor?: string;
      pageSize?: number;
    }
  ): Promise<PaginatedResponse<any>> {
    let body: Record<string, any> = {};
    if (params?.filter) body.filter = params.filter;
    if (params?.sorts) body.sorts = params.sorts;
    if (params?.startCursor) body.start_cursor = params.startCursor;
    if (params?.pageSize) body.page_size = params.pageSize;

    let response = await this.axios.post(`/databases/${databaseId}/query`, body);
    return response.data;
  }

  // --- Search ---

  async search(params?: {
    query?: string;
    filter?: Record<string, any>;
    sort?: Record<string, any>;
    startCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    let body: Record<string, any> = {};
    if (params?.query) body.query = params.query;
    if (params?.filter) body.filter = params.filter;
    if (params?.sort) body.sort = params.sort;
    if (params?.startCursor) body.start_cursor = params.startCursor;
    if (params?.pageSize) body.page_size = params.pageSize;

    let response = await this.axios.post('/search', body);
    return response.data;
  }

  // --- Comments ---

  async createComment(params: {
    parentPageId?: string;
    parentBlockId?: string;
    discussionId?: string;
    richText: any[];
  }): Promise<any> {
    let targetCount = [params.parentPageId, params.parentBlockId, params.discussionId].filter(
      value => value !== undefined
    ).length;
    if (targetCount !== 1) {
      throw createApiServiceError(
        'Provide exactly one of parentPageId, parentBlockId, or discussionId'
      );
    }

    let body: Record<string, any> = {
      rich_text: params.richText
    };
    if (params.parentPageId) {
      body.parent = { page_id: params.parentPageId };
    } else if (params.parentBlockId) {
      body.parent = { block_id: params.parentBlockId };
    }
    if (params.discussionId) {
      body.discussion_id = params.discussionId;
    }

    let response = await this.axios.post('/comments', body);
    return response.data;
  }

  async listComments(
    blockId: string,
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = { block_id: blockId };
    if (startCursor) params.start_cursor = startCursor;
    if (pageSize) params.page_size = pageSize;

    let response = await this.axios.get('/comments', { params });
    return response.data;
  }

  // --- Users ---

  async listUsers(startCursor?: string, pageSize?: number): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = {};
    if (startCursor) params.start_cursor = startCursor;
    if (pageSize) params.page_size = pageSize;

    let response = await this.axios.get('/users', { params });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  async getMe(): Promise<any> {
    let response = await this.axios.get('/users/me');
    return response.data;
  }
}
