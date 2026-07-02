import { createAxios } from 'slates';

export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface OutlineDocument {
  id: string;
  title: string;
  text: string;
  emoji?: string;
  color?: string;
  collectionId?: string;
  parentDocumentId?: string;
  templateId?: string;
  template: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  deletedAt?: string;
  revision: number;
  fullWidth: boolean;
  createdBy: { id: string; name: string };
  updatedBy: { id: string; name: string };
}

export interface OutlineCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  permission?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  archivedAt?: string;
  documents?: any[];
}

export interface OutlineUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: string;
  isSuspended: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface OutlineComment {
  id: string;
  data: any;
  documentId: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
}

export interface OutlineGroup {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OutlineEvent {
  id: string;
  name: string;
  modelId?: string;
  actorId: string;
  collectionId?: string;
  documentId?: string;
  createdAt: string;
  data: any;
  actor: { id: string; name: string };
}

export interface OutlineWebhookSubscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  ranking: number;
  context: string;
  document: OutlineDocument;
}

export class Client {
  private baseUrl: string;
  private token: string;

  constructor(config: { token: string; baseUrl: string }) {
    this.token = config.token;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  private getAxios() {
    return createAxios({
      baseURL: `${this.baseUrl}/api`,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async post<T = any>(endpoint: string, data: any = {}): Promise<T> {
    let axios = this.getAxios();
    let response = await axios.post(endpoint, data);
    return response.data;
  }

  // Documents

  async getDocument(documentId: string): Promise<OutlineDocument> {
    let result = await this.post<{ data: OutlineDocument }>('/documents.info', {
      id: documentId
    });
    return result.data;
  }

  async listDocuments(
    params: {
      collectionId?: string;
      parentDocumentId?: string;
      template?: boolean;
      sort?: string;
      direction?: 'ASC' | 'DESC';
    } & PaginationParams = {}
  ): Promise<{ data: OutlineDocument[]; pagination: any }> {
    return this.post('/documents.list', params);
  }

  async listDrafts(
    params: {
      collectionId?: string;
      sort?: string;
      direction?: 'ASC' | 'DESC';
    } & PaginationParams = {}
  ): Promise<{ data: OutlineDocument[]; pagination: any }> {
    return this.post('/documents.drafts', params);
  }

  async createDocument(params: {
    title: string;
    text?: string;
    collectionId?: string;
    parentDocumentId?: string;
    templateId?: string;
    template?: boolean;
    publish?: boolean;
    emoji?: string;
    fullWidth?: boolean;
  }): Promise<OutlineDocument> {
    let result = await this.post<{ data: OutlineDocument }>('/documents.create', params);
    return result.data;
  }

  async updateDocument(params: {
    id: string;
    title?: string;
    text?: string;
    emoji?: string;
    fullWidth?: boolean;
    append?: boolean;
    publish?: boolean;
    done?: boolean;
  }): Promise<OutlineDocument> {
    let result = await this.post<{ data: OutlineDocument }>('/documents.update', params);
    return result.data;
  }

  async deleteDocument(documentId: string, permanent?: boolean): Promise<void> {
    await this.post('/documents.delete', { id: documentId, permanent });
  }

  async archiveDocument(documentId: string): Promise<OutlineDocument> {
    let result = await this.post<{ data: OutlineDocument }>('/documents.archive', {
      id: documentId
    });
    return result.data;
  }

  async restoreDocument(documentId: string): Promise<OutlineDocument> {
    let result = await this.post<{ data: OutlineDocument }>('/documents.restore', {
      id: documentId
    });
    return result.data;
  }

  async moveDocument(
    documentId: string,
    collectionId?: string,
    parentDocumentId?: string
  ): Promise<OutlineDocument> {
    let result = await this.post<{ data: OutlineDocument }>('/documents.move', {
      id: documentId,
      collectionId,
      parentDocumentId
    });
    return result.data;
  }

  async searchDocuments(
    params: {
      query: string;
      collectionId?: string;
      userId?: string;
      dateFilter?: string;
      statusFilter?: string[];
      titleFilter?: boolean;
    } & PaginationParams
  ): Promise<{ data: SearchResult[]; pagination: any }> {
    return this.post('/documents.search', params);
  }

  // Collections

  async getCollection(collectionId: string): Promise<OutlineCollection> {
    let result = await this.post<{ data: OutlineCollection }>('/collections.info', {
      id: collectionId
    });
    return result.data;
  }

  async listCollections(
    params: PaginationParams = {}
  ): Promise<{ data: OutlineCollection[]; pagination: any }> {
    return this.post('/collections.list', params);
  }

  async createCollection(params: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    permission?: string;
  }): Promise<OutlineCollection> {
    let result = await this.post<{ data: OutlineCollection }>('/collections.create', params);
    return result.data;
  }

  async updateCollection(params: {
    id: string;
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    permission?: string;
  }): Promise<OutlineCollection> {
    let result = await this.post<{ data: OutlineCollection }>('/collections.update', params);
    return result.data;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.post('/collections.delete', { id: collectionId });
  }

  async getCollectionDocuments(collectionId: string): Promise<any> {
    let result = await this.post('/collections.documents', { id: collectionId });
    return result.data;
  }

  // Users

  async getUser(userId: string): Promise<OutlineUser> {
    let result = await this.post<{ data: OutlineUser }>('/users.info', { id: userId });
    return result.data;
  }

  async listUsers(
    params: {
      query?: string;
      filter?: string;
      role?: string;
    } & PaginationParams = {}
  ): Promise<{ data: OutlineUser[]; pagination: any }> {
    return this.post('/users.list', params);
  }

  // Comments

  async getComment(commentId: string): Promise<OutlineComment> {
    let result = await this.post<{ data: OutlineComment }>('/comments.info', {
      id: commentId
    });
    return result.data;
  }

  async listComments(
    params: {
      documentId?: string;
      collectionId?: string;
    } & PaginationParams = {}
  ): Promise<{ data: OutlineComment[]; pagination: any }> {
    return this.post('/comments.list', params);
  }

  async createComment(params: {
    documentId: string;
    parentCommentId?: string;
    data: any;
  }): Promise<OutlineComment> {
    let result = await this.post<{ data: OutlineComment }>('/comments.create', params);
    return result.data;
  }

  async updateComment(params: { id: string; data: any }): Promise<OutlineComment> {
    let result = await this.post<{ data: OutlineComment }>('/comments.update', params);
    return result.data;
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.post('/comments.delete', { id: commentId });
  }

  // Groups

  async getGroup(groupId: string): Promise<OutlineGroup> {
    let result = await this.post<{ data: OutlineGroup }>('/groups.info', { id: groupId });
    return result.data;
  }

  async listGroups(
    params: PaginationParams = {}
  ): Promise<{ data: OutlineGroup[]; pagination: any }> {
    return this.post('/groups.list', params);
  }

  async createGroup(params: { name: string }): Promise<OutlineGroup> {
    let result = await this.post<{ data: OutlineGroup }>('/groups.create', params);
    return result.data;
  }

  async updateGroup(params: { id: string; name: string }): Promise<OutlineGroup> {
    let result = await this.post<{ data: OutlineGroup }>('/groups.update', params);
    return result.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.post('/groups.delete', { id: groupId });
  }

  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    await this.post('/groups.add_user', { id: groupId, userId });
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    await this.post('/groups.remove_user', { id: groupId, userId });
  }

  // Events

  async listEvents(
    params: {
      name?: string;
      documentId?: string;
      collectionId?: string;
      auditLog?: boolean;
      sort?: string;
      direction?: 'ASC' | 'DESC';
    } & PaginationParams = {}
  ): Promise<{ data: OutlineEvent[]; pagination: any }> {
    return this.post('/events.list', params);
  }

  // Webhook Subscriptions

  async listWebhookSubscriptions(
    params: PaginationParams = {}
  ): Promise<{ data: OutlineWebhookSubscription[]; pagination: any }> {
    return this.post('/webhookSubscriptions.list', params);
  }

  async createWebhookSubscription(params: {
    name: string;
    url: string;
    secret?: string;
    events: string[];
  }): Promise<OutlineWebhookSubscription> {
    let result = await this.post<{ data: OutlineWebhookSubscription }>(
      '/webhookSubscriptions.create',
      params
    );
    return result.data;
  }

  async updateWebhookSubscription(params: {
    id: string;
    name?: string;
    url?: string;
    secret?: string;
    events?: string[];
  }): Promise<OutlineWebhookSubscription> {
    let result = await this.post<{ data: OutlineWebhookSubscription }>(
      '/webhookSubscriptions.update',
      params
    );
    return result.data;
  }

  async deleteWebhookSubscription(webhookId: string): Promise<void> {
    await this.post('/webhookSubscriptions.delete', { id: webhookId });
  }

  // Shares

  async createShare(documentId: string): Promise<any> {
    let result = await this.post('/shares.create', { documentId });
    return result.data;
  }

  async listShares(params: PaginationParams = {}): Promise<{ data: any[]; pagination: any }> {
    return this.post('/shares.list', params);
  }

  async revokeShare(shareId: string): Promise<void> {
    await this.post('/shares.revoke', { id: shareId });
  }

  // Templates

  async listTemplates(
    params: PaginationParams = {}
  ): Promise<{ data: OutlineDocument[]; pagination: any }> {
    return this.post('/templates.list', params);
  }

  // Collection memberships

  async addUserToCollection(
    collectionId: string,
    userId: string,
    permission?: string
  ): Promise<void> {
    await this.post('/collections.add_user', { id: collectionId, userId, permission });
  }

  async removeUserFromCollection(collectionId: string, userId: string): Promise<void> {
    await this.post('/collections.remove_user', { id: collectionId, userId });
  }

  async addGroupToCollection(
    collectionId: string,
    groupId: string,
    permission?: string
  ): Promise<void> {
    await this.post('/collections.add_group', { id: collectionId, groupId, permission });
  }

  async removeGroupFromCollection(collectionId: string, groupId: string): Promise<void> {
    await this.post('/collections.remove_group', { id: collectionId, groupId });
  }
}
