import { createAxios } from 'slates';

export interface CreateNoteParams {
  title: string;
  parentNoteId?: string;
  templateId?: string;
  markdown?: string;
  html?: string;
  attributes?: string[];
}

export interface UpdateNoteParams {
  title?: string;
  markdown?: string;
  html?: string;
  attributes?: string[];
}

export interface SearchNotesParams {
  query?: string;
  parentNoteId?: string;
  depth?: number;
  reviewState?: string;
  page?: number;
  hitsPerPage?: number;
  highlightPreTag?: string;
  highlightPostTag?: string;
  lastEditedAfter?: string;
  lastUpdatedAfter?: string;
  includeArchived?: boolean;
}

export interface ListNotesParams {
  ownerId?: string;
  parentNoteId?: string;
  orderBy?: string;
  cursor?: string;
}

export interface AskParams {
  question: string;
  parentNoteId?: string;
  assistantId?: string;
}

export interface IndexCustomContentParams {
  rootId: string;
  contentId: string;
  title: string;
  content: string;
  type: 'markdown' | 'html';
  updatedAt: string;
  url: string;
}

export interface UpdateTileParams {
  title?: string | null;
  iconURL?: string | null;
  status?: { label: string; colorHex: string } | null;
  url?: string | null;
  content?: string | null;
}

export interface KnowledgeManagementParams {
  reviewStateList?: string[];
  ownerIdList?: string[];
  channelIdList?: string[];
  sinceDaysAgo?: number;
  first?: number;
  cursor?: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.slite.com/v1',
      headers: {
        'x-slite-api-key': token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // === Notes ===

  async createNote(params: CreateNoteParams) {
    let response = await this.http.post('/notes', params);
    return response.data;
  }

  async getNote(noteId: string, format?: string) {
    let response = await this.http.get(`/notes/${noteId}`, {
      params: format ? { format } : undefined
    });
    return response.data;
  }

  async updateNote(noteId: string, params: UpdateNoteParams) {
    let response = await this.http.put(`/notes/${noteId}`, params);
    return response.data;
  }

  async deleteNote(noteId: string) {
    await this.http.delete(`/notes/${noteId}`);
  }

  async getNoteChildren(noteId: string, cursor?: string) {
    let response = await this.http.get(`/notes/${noteId}/children`, {
      params: cursor ? { cursor } : undefined
    });
    return response.data;
  }

  async listNotes(params: ListNotesParams = {}) {
    let response = await this.http.get('/notes', { params });
    return response.data;
  }

  // === Search ===

  async searchNotes(params: SearchNotesParams) {
    let response = await this.http.get('/search-notes', { params });
    return response.data;
  }

  // === Ask ===

  async ask(params: AskParams) {
    let response = await this.http.get('/ask', { params });
    return response.data;
  }

  // === Note Lifecycle ===

  async verifyNote(noteId: string, until?: string | null) {
    let response = await this.http.put(`/notes/${noteId}/verify`, {
      until: until ?? null
    });
    return response.data;
  }

  async flagNoteAsOutdated(noteId: string, reason: string) {
    let response = await this.http.put(`/notes/${noteId}/flag-as-outdated`, {
      reason
    });
    return response.data;
  }

  async setNoteArchived(noteId: string, archived: boolean) {
    let response = await this.http.put(`/notes/${noteId}/archived`, {
      archived
    });
    return response.data;
  }

  async updateNoteOwner(noteId: string, owner: { userId?: string; groupId?: string }) {
    let response = await this.http.put(`/notes/${noteId}/owner`, owner);
    return response.data;
  }

  // === Tile Updates ===

  async updateTile(noteId: string, tileId: string, params: UpdateTileParams) {
    let response = await this.http.put(`/notes/${noteId}/tiles/${tileId}`, params);
    return response.data;
  }

  // === Custom Content Indexing ===

  async indexCustomContent(params: IndexCustomContentParams) {
    let response = await this.http.post('/ask/index', {
      rootId: params.rootId,
      id: params.contentId,
      title: params.title,
      content: params.content,
      type: params.type,
      updatedAt: params.updatedAt,
      url: params.url
    });
    return response.data;
  }

  async deleteCustomContent(rootId: string, contentId: string) {
    let response = await this.http.delete('/ask/index', {
      data: { rootId, id: contentId }
    });
    return response.data;
  }

  async listCustomContent(rootId: string, page?: number, hitsPerPage?: number) {
    let response = await this.http.get('/ask/index', {
      params: { rootId, page, hitsPerPage }
    });
    return response.data;
  }

  // === Knowledge Management ===

  async listKnowledgeManagementNotes(params: KnowledgeManagementParams = {}) {
    let response = await this.http.get('/knowledge-management/notes', { params });
    return response.data;
  }

  async listPublicNotes(params: KnowledgeManagementParams = {}) {
    let response = await this.http.get('/knowledge-management/notes/public', { params });
    return response.data;
  }

  async listInactiveNotes(params: KnowledgeManagementParams = {}) {
    let response = await this.http.get('/knowledge-management/notes/inactive', { params });
    return response.data;
  }

  async listEmptyNotes(params: KnowledgeManagementParams = {}) {
    let response = await this.http.get('/knowledge-management/notes/empty', { params });
    return response.data;
  }

  // === Users ===

  async getUser(userId: string) {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async searchUsers(query: string, includeArchived?: boolean, cursor?: string) {
    let response = await this.http.get('/users', {
      params: { query, includeArchived, cursor }
    });
    return response.data;
  }

  // === Groups ===

  async getGroup(groupId: string) {
    let response = await this.http.get(`/groups/${groupId}`);
    return response.data;
  }

  async searchGroups(query: string, cursor?: string) {
    let response = await this.http.get('/groups', {
      params: { query, cursor }
    });
    return response.data;
  }

  // === Me ===

  async getMe() {
    let response = await this.http.get('/me');
    return response.data;
  }
}
