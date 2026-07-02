import { createAxios } from 'slates';
import type {
  DovetailChannel,
  DovetailContact,
  DovetailData,
  DovetailDoc,
  DovetailFolder,
  DovetailFolderContent,
  DovetailHighlight,
  DovetailInsight,
  DovetailNote,
  DovetailProject,
  DovetailTag,
  DovetailTopic,
  PaginationParams,
  PaginationResponse,
  SearchResults,
  SummarizeResult
} from './types';

interface PaginatedResponse<T> {
  data: T[];
  page: PaginationResponse;
}

let buildPaginationParams = (params?: PaginationParams): Record<string, string> => {
  let result: Record<string, string> = {};
  if (params?.limit) result['page[limit]'] = String(params.limit);
  if (params?.startCursor) result['page[start_cursor]'] = params.startCursor;
  return result;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://dovetail.com/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ---- Projects ----

  async listProjects(
    params?: PaginationParams & {
      folderId?: string;
      titleContains?: string;
      titleEqualTo?: string;
      sort?: string;
    }
  ): Promise<PaginatedResponse<DovetailProject>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.folderId) queryParams['filter[folder_id]'] = params.folderId;
    if (params?.titleContains) queryParams['filter[title][contains]'] = params.titleContains;
    if (params?.titleEqualTo) queryParams['filter[title][equal_to]'] = params.titleEqualTo;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get('/projects', { params: queryParams });
    return response.data;
  }

  async createProject(title?: string): Promise<DovetailProject> {
    let response = await this.axios.post('/projects', title ? { title } : {});
    return response.data.data;
  }

  async getProject(projectId: string): Promise<DovetailProject> {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data.data;
  }

  // ---- Notes ----

  async listNotes(
    params?: PaginationParams & {
      titleContains?: string;
      titleEqualTo?: string;
      contentContains?: string;
      authors?: string[];
      createdAfter?: string;
      createdBefore?: string;
      sort?: string;
    }
  ): Promise<PaginatedResponse<DovetailNote>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.titleContains) queryParams['filter[title][contains]'] = params.titleContains;
    if (params?.titleEqualTo) queryParams['filter[title][equal_to]'] = params.titleEqualTo;
    if (params?.contentContains)
      queryParams['filter[content][contains]'] = params.contentContains;
    if (params?.createdAfter)
      queryParams['filter[created_at][greater_than]'] = params.createdAfter;
    if (params?.createdBefore)
      queryParams['filter[created_at][less_than]'] = params.createdBefore;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get('/notes', { params: queryParams });
    return response.data;
  }

  async createNote(data: {
    title?: string;
    content?: string;
    fields?: { label: string; value?: string }[];
  }): Promise<DovetailNote> {
    let response = await this.axios.post('/notes', data);
    return response.data.data;
  }

  async getNote(noteId: string): Promise<DovetailNote> {
    let response = await this.axios.get(`/notes/${noteId}`);
    return response.data.data;
  }

  async updateNote(
    noteId: string,
    data: {
      title?: string;
      content?: string;
      fields?: { label: string; value?: string }[];
    }
  ): Promise<DovetailNote> {
    let response = await this.axios.patch(`/notes/${noteId}`, data);
    return response.data.data;
  }

  async deleteNote(
    noteId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/notes/${noteId}`);
    return response.data.data;
  }

  async exportNote(noteId: string, format: 'html' | 'markdown'): Promise<any> {
    let response = await this.axios.get(`/notes/${noteId}/export/${format}`);
    return response.data.data;
  }

  async importNoteFromFile(url: string, mimeType?: string): Promise<DovetailNote> {
    let body: Record<string, string> = { url };
    if (mimeType) body.mime_type = mimeType;
    let response = await this.axios.post('/notes/import/file', body);
    return response.data.data;
  }

  // ---- Data ----

  async listData(
    params?: PaginationParams & {
      projectId?: string;
      folderId?: string;
      titleContains?: string;
      titleEqualTo?: string;
      createdAfter?: string;
      createdBefore?: string;
      sort?: string;
    }
  ): Promise<PaginatedResponse<DovetailData>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.projectId) queryParams['filter[project_id]'] = params.projectId;
    if (params?.folderId) queryParams['filter[folder_id]'] = params.folderId;
    if (params?.titleContains) queryParams['filter[title][contains]'] = params.titleContains;
    if (params?.titleEqualTo) queryParams['filter[title][equal_to]'] = params.titleEqualTo;
    if (params?.createdAfter) queryParams['filter[created_at][gt]'] = params.createdAfter;
    if (params?.createdBefore) queryParams['filter[created_at][lt]'] = params.createdBefore;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get('/data', { params: queryParams });
    return response.data;
  }

  async createData(data: {
    title?: string;
    content?: string;
    fields?: Record<string, unknown>;
    projectId?: string;
  }): Promise<DovetailData> {
    let body: Record<string, unknown> = {};
    if (data.title) body.title = data.title;
    if (data.content) body.content = data.content;
    if (data.fields) body.fields = data.fields;
    if (data.projectId) body.project_id = data.projectId;
    let response = await this.axios.post('/data', body);
    return response.data.data;
  }

  async getData(dataId: string): Promise<DovetailData> {
    let response = await this.axios.get(`/data/${dataId}`);
    return response.data.data;
  }

  async updateData(dataId: string, data: { title?: string }): Promise<DovetailData> {
    let response = await this.axios.patch(`/data/${dataId}`, data);
    return response.data.data;
  }

  async deleteData(
    dataId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/data/${dataId}`);
    return response.data.data;
  }

  async exportData(dataId: string, format: 'html' | 'markdown'): Promise<any> {
    let response = await this.axios.get(`/data/${dataId}/export/${format}`);
    return response.data.data;
  }

  async importDataFromFile(
    url: string,
    projectId?: string,
    mimeType?: string
  ): Promise<DovetailData> {
    let body: Record<string, string> = { url };
    if (projectId) body.project_id = projectId;
    if (mimeType) body.mime_type = mimeType;
    let response = await this.axios.post('/data/import/file', body);
    return response.data.data;
  }

  // ---- Insights ----

  async listInsights(
    params?: PaginationParams & {
      sort?: string;
    }
  ): Promise<PaginatedResponse<DovetailInsight>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get('/insights', { params: queryParams });
    return response.data;
  }

  async createInsight(data: {
    title?: string;
    content?: string;
    fields?: { label: string; value?: string | null }[];
  }): Promise<DovetailInsight> {
    let response = await this.axios.post('/insights', data);
    return response.data.data;
  }

  async getInsight(insightId: string): Promise<DovetailInsight> {
    let response = await this.axios.get(`/insights/${insightId}`);
    return response.data.data;
  }

  async updateInsight(
    insightId: string,
    data: {
      title?: string;
      content?: string;
      published?: boolean;
      contributors?: string[];
    }
  ): Promise<DovetailInsight> {
    let response = await this.axios.patch(`/insights/${insightId}`, data);
    return response.data.data;
  }

  async deleteInsight(
    insightId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/insights/${insightId}`);
    return response.data.data;
  }

  async listUserInsights(userId: string): Promise<DovetailInsight[]> {
    let response = await this.axios.get(`/insights/user/${userId}`);
    return response.data.data?.insights ?? [];
  }

  async exportInsight(insightId: string, format: 'html' | 'markdown'): Promise<any> {
    let response = await this.axios.get(`/insights/${insightId}/export/${format}`);
    return response.data.data;
  }

  async importInsightFromFile(
    url: string,
    title?: string,
    mimeType?: string
  ): Promise<DovetailInsight> {
    let body: Record<string, string> = { url };
    if (title) body.title = title;
    if (mimeType) body.mime_type = mimeType;
    let response = await this.axios.post('/insights/import/file', body);
    return response.data.data;
  }

  // ---- Highlights ----

  async listHighlights(
    params?: PaginationParams
  ): Promise<{ highlights: DovetailHighlight[] }> {
    let queryParams = buildPaginationParams(params);
    let response = await this.axios.get('/highlights', { params: queryParams });
    return response.data.data;
  }

  async getHighlight(highlightId: string): Promise<DovetailHighlight> {
    let response = await this.axios.get(`/highlights/${highlightId}`);
    return response.data.data;
  }

  // ---- Tags ----

  async listTags(params?: PaginationParams): Promise<PaginatedResponse<DovetailTag>> {
    let queryParams = buildPaginationParams(params);
    let response = await this.axios.get('/tags', { params: queryParams });
    return response.data;
  }

  async getTag(tagId: string): Promise<DovetailTag> {
    let response = await this.axios.get(`/tags/${tagId}`);
    return response.data.data;
  }

  // ---- Contacts ----

  async listContacts(): Promise<{ total: number; contacts: DovetailContact[] }> {
    let response = await this.axios.get('/contacts');
    return response.data.data;
  }

  async createContact(data: Record<string, unknown>): Promise<DovetailContact> {
    let response = await this.axios.post('/contacts', data);
    return response.data.data;
  }

  async getContact(contactId: string): Promise<DovetailContact> {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data.data;
  }

  async updateContact(
    contactId: string,
    data: Record<string, unknown>
  ): Promise<DovetailContact> {
    let response = await this.axios.patch(`/contacts/${contactId}`, data);
    return response.data.data;
  }

  // ---- Docs ----

  async listDocs(
    params?: PaginationParams & {
      projectId?: string;
      folderId?: string;
      titleContains?: string;
      titleEqualTo?: string;
      sort?: string;
    }
  ): Promise<PaginatedResponse<DovetailDoc>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.projectId) queryParams['filter[project_id]'] = params.projectId;
    if (params?.folderId) queryParams['filter[folder_id]'] = params.folderId;
    if (params?.titleContains) queryParams['filter[title][contains]'] = params.titleContains;
    if (params?.titleEqualTo) queryParams['filter[title][equal_to]'] = params.titleEqualTo;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get('/docs', { params: queryParams });
    return response.data;
  }

  async createDoc(data: {
    title?: string;
    content?: string;
    fields?: { label: string; value?: string }[];
  }): Promise<DovetailDoc> {
    let response = await this.axios.post('/docs', data);
    return response.data.data;
  }

  async getDoc(docId: string): Promise<DovetailDoc> {
    let response = await this.axios.get(`/docs/${docId}`);
    return response.data.data;
  }

  async updateDoc(
    docId: string,
    data: {
      title?: string;
      content?: string;
    }
  ): Promise<DovetailDoc> {
    let response = await this.axios.patch(`/docs/${docId}`, data);
    return response.data.data;
  }

  async deleteDoc(
    docId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/docs/${docId}`);
    return response.data.data;
  }

  async listUserDocs(userId: string): Promise<DovetailDoc[]> {
    let response = await this.axios.get(`/docs/user/${userId}`);
    return response.data.data;
  }

  async exportDoc(docId: string, format: 'html' | 'markdown'): Promise<any> {
    let response = await this.axios.get(`/docs/${docId}/export/${format}`);
    return response.data.data;
  }

  async importDocFromFile(url: string, mimeType?: string): Promise<DovetailDoc> {
    let body: Record<string, string> = { url };
    if (mimeType) body.mime_type = mimeType;
    let response = await this.axios.post('/docs/import/file', body);
    return response.data.data;
  }

  // ---- Channels ----

  async listChannels(
    params?: PaginationParams & {
      folderId?: string;
      sort?: string;
    }
  ): Promise<PaginatedResponse<DovetailChannel>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.folderId) queryParams['filter[folder_id]'] = params.folderId;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get('/channels', { params: queryParams });
    return response.data;
  }

  async createChannel(data: {
    title: string;
    contentType: string;
    folderId?: string;
  }): Promise<DovetailChannel> {
    let body: Record<string, string> = {
      title: data.title,
      content_type: data.contentType
    };
    if (data.folderId) body.project_category_id = data.folderId;
    let response = await this.axios.post('/channels', body);
    return response.data.data;
  }

  async getChannel(channelId: string): Promise<DovetailChannel> {
    let response = await this.axios.get(`/channels/${channelId}`);
    return response.data.data;
  }

  async updateChannel(
    channelId: string,
    data: {
      title: string;
      context?: string;
    }
  ): Promise<DovetailChannel> {
    let response = await this.axios.patch(`/channels/${channelId}`, data);
    return response.data.data;
  }

  async deleteChannel(
    channelId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/channels/${channelId}`);
    return response.data.data;
  }

  // ---- Topics ----

  async createTopic(data: {
    title: string;
    description: string;
    channelId: string;
  }): Promise<DovetailTopic> {
    let response = await this.axios.post('/channels/topic', {
      title: data.title,
      description: data.description,
      channel_id: data.channelId
    });
    return response.data.data;
  }

  async updateTopic(
    topicId: string,
    data: {
      title?: string;
      description?: string;
    }
  ): Promise<DovetailTopic> {
    let response = await this.axios.patch(`/channels/topic/${topicId}`, data);
    return response.data.data;
  }

  async deleteTopic(topicId: string): Promise<any> {
    let response = await this.axios.delete(`/channels/topic/${topicId}`);
    return response.data.data;
  }

  // ---- Channel Data Points ----

  async createChannelDataPoint(data: {
    text: string;
    channelId: string;
    timestamp: string;
    sourceTitle?: string;
    sourceUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string; channel: { id: string }; timestamp: string; created_at: string }> {
    let body: Record<string, unknown> = {
      text: data.text,
      channel_id: data.channelId,
      timestamp: data.timestamp
    };
    if (data.sourceTitle) body.source_title = data.sourceTitle;
    if (data.sourceUrl) body.source_url = data.sourceUrl;
    if (data.metadata) body.metadata = data.metadata;
    let response = await this.axios.post('/channels/data', body);
    return response.data.data;
  }

  // ---- Folders ----

  async listFolders(
    params?: PaginationParams & {
      titleContains?: string;
      titleEqualTo?: string;
      parentFolderId?: string | null;
      sort?: string;
    }
  ): Promise<PaginatedResponse<DovetailFolder>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.titleContains) queryParams['filter[title][contains]'] = params.titleContains;
    if (params?.titleEqualTo) queryParams['filter[title][equal_to]'] = params.titleEqualTo;
    if (params?.parentFolderId !== undefined) {
      queryParams['filter[parent_folder_id]'] =
        params.parentFolderId === null ? 'null' : params.parentFolderId;
    }
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get('/folders', { params: queryParams });
    return response.data;
  }

  async getFolder(folderId: string): Promise<DovetailFolder> {
    let response = await this.axios.get(`/folders/${folderId}`);
    return response.data.data;
  }

  async getFolderContents(
    folderId: string,
    params?: PaginationParams & {
      sort?: string;
    }
  ): Promise<PaginatedResponse<DovetailFolderContent>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get(`/folders/${folderId}/contents`, {
      params: queryParams
    });
    return response.data;
  }

  // ---- Files ----

  async getFile(fileId: string): Promise<any> {
    let response = await this.axios.get(`/files/${fileId}`);
    return response.data.data;
  }

  // ---- Search ----

  async search(
    query: string,
    params?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<SearchResults> {
    let body: Record<string, unknown> = { query };
    if (params?.offset !== undefined) body.offset = params.offset;
    if (params?.limit !== undefined) body.limit = params.limit;

    let response = await this.axios.post('/search', body);
    return response.data.data;
  }

  // ---- Summarize ----

  async summarize(data: {
    highlightIds?: string[];
    noteIds?: string[];
    insightIds?: string[];
    themeIds?: string[];
    tagIds?: string[];
    withCitations?: boolean;
  }): Promise<SummarizeResult> {
    let body: Record<string, unknown> = {};
    if (data.highlightIds?.length) body.highlight_ids = data.highlightIds;
    if (data.noteIds?.length) body.note_ids = data.noteIds;
    if (data.insightIds?.length) body.insight_ids = data.insightIds;
    if (data.themeIds?.length) body.theme_ids = data.themeIds;
    if (data.tagIds?.length) body.tag_ids = data.tagIds;
    if (data.withCitations !== undefined) body.with_citations = data.withCitations;

    let response = await this.axios.post('/summarize', body);
    return response.data.data;
  }

  // ---- Token Info ----

  async getTokenInfo(): Promise<{ id: string; subdomain: string }> {
    let response = await this.axios.get('/token/info');
    return response.data.data;
  }
}
