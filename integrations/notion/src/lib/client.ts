import { createApiServiceError, createAxios, isApiErrorRecord, SlateError } from 'slates';
import { notionApiError } from './errors';
import { requestWithNotionRateLimitRetry } from './rate-limit';

let NOTION_API_VERSION = '2022-06-28';
let DATA_SOURCE_API_VERSION = '2025-09-03';
let DATA_SOURCE_REQUEST = { headers: { 'Notion-Version': DATA_SOURCE_API_VERSION } };

interface DatabaseDataSource {
  id: string;
  name: string;
}

let isMultipleDataSourcesError = (error: unknown) =>
  SlateError.is(error) &&
  error.data.upstream?.code === 'validation_error' &&
  error.message.includes('multiple data sources');

let sameNotionId = (a: string, b: string) =>
  a.replaceAll('-', '').toLowerCase() === b.replaceAll('-', '').toLowerCase();

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

    try {
      let response = await this.axios.post('/pages', body);
      return response.data;
    } catch (error) {
      if (params.parent.type !== 'database_id' || !isMultipleDataSourcesError(error)) {
        throw error;
      }
    }

    let { source } = await this.selectDataSource(
      params.parent.database_id,
      undefined,
      'parentDataSourceId'
    );
    let response = await this.axios.post('/pages', {
      ...body,
      parent: { type: 'data_source_id', data_source_id: source.id }
    });
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

    return requestWithNotionRateLimitRetry(() =>
      this.axios.get(`/blocks/${blockId}/children`, {
        params,
        validateStatus: status => status === 429 || (status >= 200 && status < 300)
      })
    );
  }

  async appendBlockChildren(
    blockId: string,
    children: any[],
    after?: string
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.patch(`/blocks/${blockId}/children`, {
      children,
      ...(after ? { after } : {})
    });
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

  async getDatabase(databaseId: string, dataSourceId?: string): Promise<any> {
    if (!dataSourceId) {
      try {
        let response = await this.axios.get(`/databases/${databaseId}`);
        return response.data;
      } catch (error) {
        if (!isMultipleDataSourcesError(error)) throw error;
      }
    }

    let database = await this.getDataSourceDatabase(databaseId);
    let dataSources = parseDataSources(database);
    if (!dataSourceId) return { ...database, dataSources };

    let source = findDataSource(dataSources, dataSourceId, 'dataSourceId');
    let response = await this.axios.get(`/data_sources/${source.id}`, DATA_SOURCE_REQUEST);
    return {
      ...database,
      properties: response.data?.properties,
      dataSourceId: source.id,
      dataSources
    };
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
      dataSourceId?: string;
      title?: any[];
      description?: any[];
      properties?: Record<string, any>;
      icon?: Record<string, any> | null;
      cover?: Record<string, any> | null;
      isInline?: boolean;
      archived?: boolean;
    }
  ): Promise<any> {
    let databaseBody: Record<string, any> = {};
    if (params.title !== undefined) databaseBody.title = params.title;
    if (params.description !== undefined) databaseBody.description = params.description;
    if (params.icon !== undefined) databaseBody.icon = params.icon;
    if (params.cover !== undefined) databaseBody.cover = params.cover;
    if (params.isInline !== undefined) databaseBody.is_inline = params.isInline;

    if (!params.dataSourceId) {
      let body = { ...databaseBody };
      if (params.properties !== undefined) body.properties = params.properties;
      if (params.archived !== undefined) body.archived = params.archived;
      try {
        let response = await this.axios.patch(`/databases/${databaseId}`, body);
        return response.data;
      } catch (error) {
        if (!isMultipleDataSourcesError(error)) throw error;
      }
    }

    let source: DatabaseDataSource | undefined;
    if (params.properties !== undefined || params.dataSourceId) {
      ({ source } = await this.selectDataSource(
        databaseId,
        params.dataSourceId,
        'dataSourceId'
      ));
    }
    if (params.archived === false) databaseBody.in_trash = false;
    let database =
      Object.keys(databaseBody).length > 0
        ? await this.patchDataSourceDatabase(databaseId, databaseBody)
        : undefined;
    if (source && params.properties !== undefined) {
      await this.axios.patch(
        `/data_sources/${source.id}`,
        { properties: params.properties },
        DATA_SOURCE_REQUEST
      );
    }
    if (params.archived === true) {
      database = await this.patchDataSourceDatabase(databaseId, { in_trash: true });
    }
    database ??= await this.getDataSourceDatabase(databaseId);
    return { ...database, dataSourceId: source?.id };
  }

  async queryDatabase(
    databaseId: string,
    params?: {
      dataSourceId?: string;
      filter?: Record<string, any>;
      sorts?: any[];
      startCursor?: string;
      pageSize?: number;
    }
  ): Promise<PaginatedResponse<any> & { dataSourceId?: string }> {
    let body: Record<string, any> = {};
    if (params?.filter) body.filter = params.filter;
    if (params?.sorts) body.sorts = params.sorts;
    if (params?.startCursor) body.start_cursor = params.startCursor;
    if (params?.pageSize) body.page_size = params.pageSize;

    let dataSourceId = params?.dataSourceId;
    if (!dataSourceId) {
      try {
        let response = await this.axios.post(`/databases/${databaseId}/query`, body);
        return response.data;
      } catch (error) {
        if (!isMultipleDataSourcesError(error)) throw error;
      }
      ({
        source: { id: dataSourceId }
      } = await this.selectDataSource(databaseId, undefined, 'dataSourceId'));
    }

    let response = await this.axios.post<PaginatedResponse<any>>(
      `/data_sources/${dataSourceId}/query`,
      body,
      DATA_SOURCE_REQUEST
    );
    let results = response.data.results ?? [];
    let parents =
      results.length > 0
        ? results.map(entry => entry?.parent)
        : [
            (await this.axios.get(`/data_sources/${dataSourceId}`, DATA_SOURCE_REQUEST)).data
              ?.parent
          ];
    if (
      parents.some(
        parent =>
          typeof parent?.database_id === 'string' &&
          !sameNotionId(parent.database_id, databaseId)
      )
    ) {
      throw createApiServiceError(
        'The dataSourceId does not belong to this database. Call get_database for this databaseId to list its data sources.',
        { reason: 'notion_data_source_mismatch' }
      );
    }
    let canonicalId = results[0]?.parent?.data_source_id;
    return {
      ...response.data,
      dataSourceId: typeof canonicalId === 'string' ? canonicalId : dataSourceId
    };
  }

  private async patchDataSourceDatabase(
    databaseId: string,
    body: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/databases/${databaseId}`,
      body,
      DATA_SOURCE_REQUEST
    );
    return response.data;
  }

  private async getDataSourceDatabase(databaseId: string): Promise<any> {
    let response = await this.axios.get(`/databases/${databaseId}`, DATA_SOURCE_REQUEST);
    return response.data;
  }

  private async selectDataSource(
    databaseId: string,
    dataSourceId: string | undefined,
    inputField: string
  ): Promise<{ database: any; source: DatabaseDataSource }> {
    let database = await this.getDataSourceDatabase(databaseId);
    let sources = parseDataSources(database);
    if (dataSourceId) {
      return { database, source: findDataSource(sources, dataSourceId, inputField) };
    }
    if (sources.length === 1) return { database, source: sources[0]! };
    throw dataSourceSelectionError(
      'This database has multiple data sources.',
      sources,
      inputField
    );
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

let parseDataSources = (database: any): DatabaseDataSource[] => {
  let sources = database?.data_sources;
  if (
    !Array.isArray(sources) ||
    sources.length === 0 ||
    !sources.every(
      (source): source is DatabaseDataSource =>
        isApiErrorRecord(source) &&
        typeof source.id === 'string' &&
        source.id.length > 0 &&
        typeof source.name === 'string'
    )
  ) {
    throw createApiServiceError(
      'Notion returned no usable data sources for this database. Check the database ID and connection access, then retry.',
      { reason: 'notion_data_sources_unavailable' }
    );
  }
  return sources.map(source => ({ id: source.id, name: source.name }));
};

let findDataSource = (
  sources: DatabaseDataSource[],
  dataSourceId: string,
  inputField: string
) => {
  let source = sources.find(candidate => sameNotionId(candidate.id, dataSourceId));
  if (!source) {
    throw dataSourceSelectionError(
      `The ${inputField} does not belong to this database.`,
      sources,
      inputField
    );
  }
  return source;
};

let dataSourceSelectionError = (
  reason: string,
  sources: DatabaseDataSource[],
  inputField: string
) =>
  createApiServiceError(
    `${reason} Retry with ${inputField} set to one of: ${sources
      .map(source => `${JSON.stringify(source.name)} (${source.id})`)
      .join(', ')}.`,
    { reason: 'notion_data_source_selection_required' }
  );
