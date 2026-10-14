import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import type {
  DovetailChannel,
  DovetailContact,
  DovetailData,
  DovetailDoc,
  DovetailExport,
  DovetailField,
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
  if (params?.limit !== undefined && !Number.isSafeInteger(params.limit)) {
    throw createApiServiceError('limit must be a whole number.');
  }
  if (params?.limit !== undefined) result['page[limit]'] = String(params.limit);
  if (params?.startCursor) result['page[start_cursor]'] = params.startCursor;
  return result;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('A Dovetail API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://dovetail.com/api/v1',
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Dovetail',
          reason: 'dovetail_api_error'
        }),
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

  async createProject(title?: string, folderId?: string): Promise<DovetailProject> {
    let response = await this.axios.post(
      '/projects',
      pickDefined({ title, folder_id: folderId })
    );
    return response.data.data;
  }

  async getProject(projectId: string): Promise<DovetailProject> {
    let response = await this.axios.get(`/projects/${encodeURIComponent(projectId)}`);
    return response.data.data;
  }

  async updateProject(projectId: string, title: string): Promise<DovetailProject> {
    let response = await this.axios.patch(`/projects/${encodeURIComponent(projectId)}`, {
      title
    });
    return response.data.data;
  }

  async deleteProject(projectId: string): Promise<DovetailProject> {
    let response = await this.axios.delete(`/projects/${encodeURIComponent(projectId)}`);
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
    let queryParams: Record<string, string> = buildPaginationParams(params);
    if (params?.contentContains !== undefined) {
      if (params.sort)
        throw createApiServiceError(
          'Content filtering uses full-text search, which does not support sort. Omit sort or use list_data for sorted metadata.'
        );
      let cursor = params.startCursor;
      if (cursor && !/^notes-search:\d+$/.test(cursor))
        throw createApiServiceError(
          'Use the nextCursor returned by a notes content search, or omit startCursor to begin a new search.'
        );
      let offset = cursor ? Number(cursor.slice('notes-search:'.length)) : 0;
      if (!Number.isSafeInteger(offset))
        throw createApiServiceError(
          'Invalid notes search cursor. Omit startCursor to begin a new search.'
        );
      let limit = params.limit ?? 100;
      let filter = pickDefined({
        title:
          params.titleContains !== undefined || params.titleEqualTo !== undefined
            ? pickDefined({ contains: params.titleContains, equal_to: params.titleEqualTo })
            : undefined,
        content: { contains: params.contentContains },
        created_at:
          params.createdAfter !== undefined || params.createdBefore !== undefined
            ? pickDefined({
                greater_than: params.createdAfter,
                less_than: params.createdBefore
              })
            : undefined
      });
      let response = await this.axios.post('/search', {
        filter: { notes: [filter] },
        offset,
        limit
      });
      let result: SearchResults = response.data.data;
      let hasMore = offset + limit < result.total;
      return {
        data: result.notes,
        page: {
          total_count: result.total,
          has_more: hasMore,
          next_cursor: hasMore ? `notes-search:${offset + limit}` : null
        }
      };
    }
    if (params?.titleContains !== undefined)
      queryParams['filter[title][contains]'] = params.titleContains;
    if (params?.titleEqualTo !== undefined)
      queryParams['filter[title][equal_to]'] = params.titleEqualTo;
    if (params?.createdAfter) queryParams['filter[created_at][gt]'] = params.createdAfter;
    if (params?.createdBefore) queryParams['filter[created_at][lt]'] = params.createdBefore;
    if (params?.sort) queryParams.sort = params.sort;
    let path =
      params?.titleContains !== undefined || params?.titleEqualTo !== undefined
        ? '/data'
        : '/notes';
    let response = await this.axios.get(path, { params: queryParams });
    return response.data;
  }

  async createNote(data: {
    title?: string;
    content?: string;
    fields?: { label: string; value?: string }[];
    projectId?: string;
  }): Promise<DovetailNote> {
    let response = await this.axios.post(
      '/notes',
      pickDefined({
        title: data.title,
        content: data.content,
        project_id: data.projectId,
        fields: data.fields?.map(f => ({ label: f.label, value: f.value ?? null }))
      })
    );
    return response.data.data;
  }

  async getNote(noteId: string): Promise<DovetailNote> {
    let response = await this.axios.get(`/notes/${encodeURIComponent(noteId)}`);
    return response.data.data;
  }

  async updateNote(
    noteId: string,
    data: {
      title?: string;
      fields?: { label: string; value?: string }[];
    }
  ): Promise<DovetailNote> {
    let response = await this.axios.patch(
      `/notes/${encodeURIComponent(noteId)}`,
      pickDefined({
        title: data.title,
        fields: data.fields?.map(f => ({ label: f.label, value: f.value ?? null }))
      })
    );
    return response.data.data;
  }

  async deleteNote(
    noteId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/notes/${encodeURIComponent(noteId)}`);
    return response.data.data;
  }

  async exportNote(noteId: string, format: 'html' | 'markdown'): Promise<DovetailExport> {
    let response = await this.axios.get(
      `/notes/${encodeURIComponent(noteId)}/export/${format}`
    );
    return response.data.data;
  }

  async importNoteFromFile(
    url: string,
    title: string,
    projectId: string,
    mimeType?: string
  ): Promise<DovetailNote> {
    let response = await this.axios.post(
      '/notes/import/file',
      pickDefined({ url, title, project_id: projectId, mime_type: mimeType })
    );
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
    fields?: DovetailField[];
    projectId?: string;
  }): Promise<DovetailData> {
    let response = await this.axios.post(
      '/data',
      pickDefined({
        title: data.title,
        content: data.content,
        fields: data.fields,
        project_id: data.projectId
      })
    );
    return response.data.data;
  }

  async getData(dataId: string): Promise<DovetailData> {
    let response = await this.axios.get(`/data/${encodeURIComponent(dataId)}`);
    return response.data.data;
  }

  async updateData(dataId: string, data: { title?: string }): Promise<DovetailData> {
    let response = await this.axios.patch(`/data/${encodeURIComponent(dataId)}`, data);
    return response.data.data;
  }

  async deleteData(
    dataId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/data/${encodeURIComponent(dataId)}`);
    return response.data.data;
  }

  async exportData(dataId: string, format: 'html' | 'markdown'): Promise<DovetailExport> {
    let response = await this.axios.get(
      `/data/${encodeURIComponent(dataId)}/export/${format}`
    );
    return response.data.data;
  }

  async importDataFromFile(
    url: string,
    title: string,
    projectId: string,
    mimeType?: string
  ): Promise<DovetailData> {
    let response = await this.axios.post(
      '/data/import/file',
      pickDefined({ url, title, project_id: projectId, mime_type: mimeType })
    );
    return response.data.data;
  }

  // ---- Insights ----

  async listInsights(
    params?: PaginationParams & {
      sort?: string;
      userId?: string;
    }
  ): Promise<PaginatedResponse<DovetailInsight>> {
    let queryParams: Record<string, string> = {
      ...buildPaginationParams(params)
    };
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.axios.get(
      params?.userId ? `/insights/user/${encodeURIComponent(params.userId)}` : '/insights',
      { params: queryParams }
    );
    return response.data;
  }

  async createInsight(data: {
    title?: string;
    content?: string;
    fields?: { label: string; value?: string | null }[];
    contentType?: 'html' | 'markdown' | 'text';
    projectId?: string;
    folderId?: string;
  }): Promise<DovetailInsight> {
    let response = await this.axios.post(
      '/insights',
      pickDefined({
        title: data.title,
        content: data.content,
        content_type: data.contentType,
        project_id: data.projectId,
        folder_id: data.folderId,
        fields: data.fields?.map(f => ({ label: f.label, value: f.value ?? null }))
      })
    );
    return response.data.data;
  }

  async getInsight(insightId: string): Promise<DovetailInsight> {
    let response = await this.axios.get(`/insights/${encodeURIComponent(insightId)}`);
    return response.data.data;
  }

  async updateInsight(
    insightId: string,
    data: {
      title?: string;
      fields?: { label: string; value?: string | null }[];
    }
  ): Promise<DovetailInsight> {
    let response = await this.axios.patch(
      `/insights/${encodeURIComponent(insightId)}`,
      pickDefined({
        title: data.title,
        fields: data.fields?.map(f => ({ label: f.label, value: f.value ?? null }))
      })
    );
    return response.data.data;
  }

  async deleteInsight(
    insightId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/insights/${encodeURIComponent(insightId)}`);
    return response.data.data;
  }

  async exportInsight(
    insightId: string,
    format: 'html' | 'markdown'
  ): Promise<DovetailExport> {
    let response = await this.axios.get(
      `/insights/${encodeURIComponent(insightId)}/export/${format}`
    );
    return response.data.data;
  }

  async importInsightFromFile(
    url: string,
    title: string,
    mimeType?: string,
    projectId?: string,
    folderId?: string
  ): Promise<DovetailInsight> {
    let response = await this.axios.post(
      '/insights/import/file',
      pickDefined({
        url,
        title,
        mime_type: mimeType,
        project_id: projectId,
        folder_id: folderId
      })
    );
    return response.data.data;
  }

  // ---- Highlights ----

  async listHighlights(
    params?: PaginationParams
  ): Promise<PaginatedResponse<DovetailHighlight>> {
    let queryParams = buildPaginationParams(params);
    let response = await this.axios.get('/highlights', { params: queryParams });
    return response.data;
  }

  async getHighlight(highlightId: string): Promise<DovetailHighlight> {
    let response = await this.axios.get(`/highlights/${encodeURIComponent(highlightId)}`);
    return response.data.data;
  }

  // ---- Tags ----

  async listTags(params?: PaginationParams): Promise<PaginatedResponse<DovetailTag>> {
    let queryParams = buildPaginationParams(params);
    let response = await this.axios.get('/tags', { params: queryParams });
    return response.data;
  }

  async getTag(tagId: string): Promise<DovetailTag> {
    let response = await this.axios.get(`/tags/${encodeURIComponent(tagId)}`);
    return response.data.data;
  }

  // ---- Contacts ----

  async listContacts(params?: PaginationParams): Promise<PaginatedResponse<DovetailContact>> {
    let response = await this.axios.get('/contacts', {
      params: buildPaginationParams(params)
    });
    return response.data;
  }

  async createContact(data: Record<string, unknown>): Promise<DovetailContact> {
    let response = await this.axios.post('/contacts', data);
    return response.data.data;
  }

  async getContact(contactId: string): Promise<DovetailContact> {
    let response = await this.axios.get(`/contacts/${encodeURIComponent(contactId)}`);
    return response.data.data;
  }

  async updateContact(
    contactId: string,
    data: Record<string, unknown>
  ): Promise<DovetailContact> {
    let response = await this.axios.patch(`/contacts/${encodeURIComponent(contactId)}`, data);
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
      userId?: string;
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

    let response = await this.axios.get(
      params?.userId ? `/docs/user/${encodeURIComponent(params.userId)}` : '/docs',
      { params: queryParams }
    );
    return response.data;
  }

  async createDoc(data: {
    title?: string;
    content?: string;
    fields?: { label: string; value?: string }[];
    contentType?: 'html' | 'markdown' | 'text';
    projectId?: string;
    folderId?: string;
  }): Promise<DovetailDoc> {
    let response = await this.axios.post(
      '/docs',
      pickDefined({
        title: data.title,
        content: data.content,
        content_type: data.contentType,
        project_id: data.projectId,
        folder_id: data.folderId,
        fields: data.fields?.map(f => ({ label: f.label, value: f.value ?? null }))
      })
    );
    return response.data.data;
  }

  async getDoc(docId: string): Promise<DovetailDoc> {
    let response = await this.axios.get(`/docs/${encodeURIComponent(docId)}`);
    return response.data.data;
  }

  async updateDoc(
    docId: string,
    data: {
      title?: string;
      fields?: { label: string; value?: string }[];
    }
  ): Promise<DovetailDoc> {
    let response = await this.axios.patch(
      `/docs/${encodeURIComponent(docId)}`,
      pickDefined({
        title: data.title,
        fields: data.fields?.map(f => ({ label: f.label, value: f.value ?? null }))
      })
    );
    return response.data.data;
  }

  async deleteDoc(
    docId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/docs/${encodeURIComponent(docId)}`);
    return response.data.data;
  }

  async exportDoc(docId: string, format: 'html' | 'markdown'): Promise<DovetailExport> {
    let response = await this.axios.get(`/docs/${encodeURIComponent(docId)}/export/${format}`);
    return response.data.data;
  }

  async importDocFromFile(
    url: string,
    title: string,
    mimeType?: string,
    projectId?: string,
    folderId?: string
  ): Promise<DovetailDoc> {
    let response = await this.axios.post(
      '/docs/import/file',
      pickDefined({
        url,
        title,
        mime_type: mimeType,
        project_id: projectId,
        folder_id: folderId
      })
    );
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
    let response = await this.axios.get(`/channels/${encodeURIComponent(channelId)}`);
    return response.data.data;
  }

  async updateChannel(
    channelId: string,
    data: {
      title: string;
      context?: string;
    }
  ): Promise<DovetailChannel> {
    let response = await this.axios.patch(`/channels/${encodeURIComponent(channelId)}`, data);
    return response.data.data;
  }

  async deleteChannel(
    channelId: string
  ): Promise<{ id: string; title: string; deleted_at: string; deleted: boolean }> {
    let response = await this.axios.delete(`/channels/${encodeURIComponent(channelId)}`);
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
    let response = await this.axios.patch(
      `/channels/topic/${encodeURIComponent(topicId)}`,
      data
    );
    return response.data.data;
  }

  async deleteTopic(topicId: string): Promise<DovetailTopic> {
    let response = await this.axios.delete(`/channels/topic/${encodeURIComponent(topicId)}`);
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
    let response = await this.axios.get(`/folders/${encodeURIComponent(folderId)}`);
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

    let response = await this.axios.get(`/folders/${encodeURIComponent(folderId)}/contents`, {
      params: queryParams
    });
    return response.data;
  }

  // ---- Files ----

  async getFile(fileId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/files/${encodeURIComponent(fileId)}`);
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
    if (params?.offset !== undefined && !Number.isSafeInteger(params.offset)) {
      throw createApiServiceError('offset must be a whole number.');
    }
    if (params?.limit !== undefined && !Number.isSafeInteger(params.limit)) {
      throw createApiServiceError('limit must be a whole number.');
    }
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
    if (
      ![data.highlightIds, data.noteIds, data.insightIds, data.themeIds, data.tagIds].some(
        ids => ids?.length
      )
    )
      throw createApiServiceError('Provide at least one source ID to summarize.');
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
