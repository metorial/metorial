import { createAxios } from '@slates/provider';
import { confluenceApiError, confluenceServiceError } from './errors';

export interface ConfluenceClientConfig {
  token: string;
  cloudId?: string;
  baseUrl?: string;
  authType: 'oauth' | 'basic' | 'bearer';
}

export interface V2PaginatedResponse<T> {
  results: T[];
  _links?: { next?: string };
}

export interface V1PaginatedResponse<T> {
  results: T[];
  start?: number;
  limit?: number;
  size?: number;
  _links?: { next?: string };
}

export interface ConfluencePage {
  id: string;
  type?: string;
  status: string;
  title: string;
  spaceId?: string;
  parentId?: string | null;
  authorId?: string;
  createdAt?: string;
  version?: { number: number; message?: string; createdAt?: string };
  body?: {
    storage?: { value: string; representation: string };
  };
  _links?: { webui?: string; tinyui?: string };
}

export interface ConfluenceBlogPost {
  id: string;
  status: string;
  title: string;
  spaceId?: string;
  authorId?: string;
  createdAt?: string;
  version?: { number: number; message?: string; createdAt?: string };
  body?: {
    storage?: { value: string; representation: string };
  };
  _links?: { webui?: string };
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type?: string;
  status?: string;
  description?: { plain?: { value: string }; view?: { value: string } };
  homepageId?: string;
  _links?: { webui?: string };
}

export interface ConfluenceComment {
  id: string;
  status: string;
  title?: string;
  pageId?: string;
  blogPostId?: string;
  parentCommentId?: string;
  authorId?: string;
  createdAt?: string;
  version?: { number: number; createdAt?: string };
  body?: { storage?: { value: string; representation: string } };
}

export interface ConfluenceAttachment {
  id: string;
  status: string;
  title: string;
  createdAt?: string;
  mediaType?: string;
  fileSize?: number;
  pageId?: string;
  blogPostId?: string;
  version?: { number: number; createdAt?: string };
  webuiLink?: string;
  downloadLink?: string;
  _links?: { webui?: string; download?: string };
}

export interface ConfluenceLabel {
  id?: string;
  prefix: string;
  name: string;
}

export interface ConfluenceSearchResult {
  content?: {
    id: string;
    type: string;
    status: string;
    title: string;
    space?: { key: string; name: string };
    _links?: { webui?: string };
  };
  title?: string;
  excerpt?: string;
  url?: string;
  resultGlobalContainer?: { title: string; displayUrl: string };
}

export interface ConfluenceUser {
  type?: string;
  accountId?: string;
  accountType?: string;
  email?: string;
  publicName?: string;
  displayName?: string;
  profilePicture?: { path: string };
}

export interface ConfluenceGroup {
  type?: string;
  name: string;
  id?: string;
}

export interface ContentProperty {
  id: string;
  key: string;
  value: any;
  version?: { number: number };
}

export type ConfluenceContentType = 'page' | 'blogpost' | 'attachment';
export type ConfluenceAttachmentContainerType = 'page' | 'blogpost';

let v2Path = (path: string) => `/wiki/api/v2${path}`;

let attachmentContainerPath = (
  contentType: ConfluenceAttachmentContainerType,
  contentId: string
) => {
  if (contentType === 'blogpost') {
    return `/blogposts/${contentId}/attachments`;
  }

  return `/pages/${contentId}/attachments`;
};

let labelPath = (contentType: ConfluenceContentType, contentId: string) => {
  if (contentType === 'blogpost') {
    return `/blogposts/${contentId}/labels`;
  }
  if (contentType === 'attachment') {
    return `/attachments/${contentId}/labels`;
  }

  return `/pages/${contentId}/labels`;
};

let versionsPath = (contentType: ConfluenceContentType, contentId: string) => {
  if (contentType === 'blogpost') {
    return `/blogposts/${contentId}/versions`;
  }
  if (contentType === 'attachment') {
    return `/attachments/${contentId}/versions`;
  }

  return `/pages/${contentId}/versions`;
};

let asAttachment = (raw: any): ConfluenceAttachment => ({
  id: String(raw.id),
  status: raw.status || 'current',
  title: raw.title || raw.fileName || raw.filename,
  createdAt: raw.createdAt,
  mediaType: raw.mediaType || raw.metadata?.mediaType,
  fileSize: raw.fileSize || raw.extensions?.fileSize,
  pageId: raw.pageId || (raw.container?.type === 'page' ? raw.container.id : undefined),
  blogPostId:
    raw.blogPostId || (raw.container?.type === 'blogpost' ? raw.container.id : undefined),
  version: raw.version
    ? {
        number: raw.version.number,
        createdAt: raw.version.createdAt || raw.version.when
      }
    : undefined,
  webuiLink: raw.webuiLink || raw._links?.webui,
  downloadLink: raw.downloadLink || raw._links?.download,
  _links: raw._links
});

let firstAttachmentFromContentArray = (data: any): ConfluenceAttachment => {
  let raw = Array.isArray(data?.results) ? data.results[0] : data;
  if (!raw) {
    throw confluenceServiceError('Confluence did not return attachment metadata.');
  }

  return asAttachment(raw);
};

export class ConfluenceClient {
  private ax: ReturnType<typeof createAxios>;

  constructor(clientConfig: ConfluenceClientConfig) {
    let baseURL: string;
    if (clientConfig.baseUrl) {
      baseURL = clientConfig.baseUrl.replace(/\/$/, '');
    } else if (clientConfig.cloudId) {
      baseURL = `https://api.atlassian.com/ex/confluence/${clientConfig.cloudId}`;
    } else {
      throw confluenceServiceError(
        'Either cloudId (for Cloud) or baseUrl (for Data Center) must be provided.'
      );
    }

    let headers: Record<string, string> = {};
    if (clientConfig.authType === 'oauth') {
      headers.Authorization = `Bearer ${clientConfig.token}`;
    } else if (clientConfig.authType === 'basic') {
      headers.Authorization = `Basic ${clientConfig.token}`;
    } else if (clientConfig.authType === 'bearer') {
      headers.Authorization = `Bearer ${clientConfig.token}`;
    }

    this.ax = createAxios({
      baseURL,
      headers
    });

    this.ax.interceptors.response.use(
      response => response,
      error => Promise.reject(confluenceApiError(error))
    );
  }

  // ── Pages (v2 API) ──

  async getPages(
    params: {
      spaceId?: string;
      title?: string;
      status?: string;
      limit?: number;
      cursor?: string;
      sort?: string;
    } = {}
  ): Promise<V2PaginatedResponse<ConfluencePage>> {
    let queryParams: Record<string, string> = {};
    if (params.spaceId) queryParams['space-id'] = params.spaceId;
    if (params.title) queryParams.title = params.title;
    if (params.status) queryParams.status = params.status;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.sort) queryParams.sort = params.sort;

    let response = await this.ax.get(v2Path('/pages'), { params: queryParams });
    return response.data;
  }

  async getPageById(pageId: string, includeBody: boolean = false): Promise<ConfluencePage> {
    let params: Record<string, string> = {};
    if (includeBody) params['body-format'] = 'storage';

    let response = await this.ax.get(v2Path(`/pages/${pageId}`), { params });
    return response.data;
  }

  async createPage(data: {
    spaceId: string;
    title: string;
    body: string;
    parentId?: string;
    status?: string;
  }): Promise<ConfluencePage> {
    let payload: any = {
      spaceId: data.spaceId,
      status: data.status || 'current',
      title: data.title,
      body: {
        representation: 'storage',
        value: data.body
      }
    };

    if (data.parentId) {
      payload.parentId = data.parentId;
    }

    let response = await this.ax.post(v2Path('/pages'), payload);
    return response.data;
  }

  async updatePage(
    pageId: string,
    data: {
      title?: string;
      body?: string;
      version: number;
      status?: string;
      message?: string;
    }
  ): Promise<ConfluencePage> {
    let current =
      data.title === undefined || data.body === undefined
        ? await this.getPageById(pageId, true)
        : undefined;
    let title = data.title ?? current?.title;
    let body = data.body ?? current?.body?.storage?.value;

    if (!title) {
      throw confluenceServiceError('A page title is required to update a Confluence page.');
    }
    if (body === undefined) {
      throw confluenceServiceError('A page body is required to update a Confluence page.');
    }

    let payload: any = {
      id: pageId,
      status: data.status || current?.status || 'current',
      title,
      body: {
        representation: 'storage',
        value: body
      },
      version: {
        number: data.version,
        message: data.message
      }
    };

    let response = await this.ax.put(v2Path(`/pages/${pageId}`), payload);
    return response.data;
  }

  async deletePage(pageId: string): Promise<void> {
    await this.ax.delete(v2Path(`/pages/${pageId}`));
  }

  async getPageChildren(
    pageId: string,
    params: {
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<V2PaginatedResponse<ConfluencePage>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;

    let response = await this.ax.get(v2Path(`/pages/${pageId}/children`), {
      params: queryParams
    });
    return response.data;
  }

  // ── Blog Posts (v2 API) ──

  async getBlogPosts(
    params: {
      spaceId?: string;
      title?: string;
      status?: string;
      limit?: number;
      cursor?: string;
      sort?: string;
    } = {}
  ): Promise<V2PaginatedResponse<ConfluenceBlogPost>> {
    let queryParams: Record<string, string> = {};
    if (params.spaceId) queryParams['space-id'] = params.spaceId;
    if (params.title) queryParams.title = params.title;
    if (params.status) queryParams.status = params.status;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.sort) queryParams.sort = params.sort;

    let response = await this.ax.get(v2Path('/blogposts'), { params: queryParams });
    return response.data;
  }

  async getBlogPostById(
    blogPostId: string,
    includeBody: boolean = false
  ): Promise<ConfluenceBlogPost> {
    let params: Record<string, string> = {};
    if (includeBody) params['body-format'] = 'storage';

    let response = await this.ax.get(v2Path(`/blogposts/${blogPostId}`), { params });
    return response.data;
  }

  async createBlogPost(data: {
    spaceId: string;
    title: string;
    body: string;
    status?: string;
  }): Promise<ConfluenceBlogPost> {
    let response = await this.ax.post(v2Path('/blogposts'), {
      spaceId: data.spaceId,
      status: data.status || 'current',
      title: data.title,
      body: {
        representation: 'storage',
        value: data.body
      }
    });
    return response.data;
  }

  async updateBlogPost(
    blogPostId: string,
    data: {
      title?: string;
      body?: string;
      version: number;
      status?: string;
    }
  ): Promise<ConfluenceBlogPost> {
    let current =
      data.title === undefined || data.body === undefined
        ? await this.getBlogPostById(blogPostId, true)
        : undefined;
    let title = data.title ?? current?.title;
    let body = data.body ?? current?.body?.storage?.value;

    if (!title) {
      throw confluenceServiceError(
        'A blog post title is required to update a Confluence blog post.'
      );
    }
    if (body === undefined) {
      throw confluenceServiceError(
        'A blog post body is required to update a Confluence blog post.'
      );
    }

    let payload: any = {
      id: blogPostId,
      status: data.status || current?.status || 'current',
      title,
      body: {
        representation: 'storage',
        value: body
      },
      version: {
        number: data.version
      }
    };

    let response = await this.ax.put(v2Path(`/blogposts/${blogPostId}`), payload);
    return response.data;
  }

  async deleteBlogPost(blogPostId: string): Promise<void> {
    await this.ax.delete(v2Path(`/blogposts/${blogPostId}`));
  }

  // ── Spaces (v2 API) ──

  async getSpaces(
    params: {
      keys?: string[];
      type?: string;
      status?: string;
      limit?: number;
      cursor?: string;
      sort?: string;
    } = {}
  ): Promise<V2PaginatedResponse<ConfluenceSpace>> {
    let queryParams: Record<string, string> = {};
    if (params.keys && params.keys.length > 0) queryParams.keys = params.keys.join(',');
    if (params.type) queryParams.type = params.type;
    if (params.status) queryParams.status = params.status;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.sort) queryParams.sort = params.sort;

    let response = await this.ax.get(v2Path('/spaces'), { params: queryParams });
    return response.data;
  }

  async getSpaceById(spaceId: string): Promise<ConfluenceSpace> {
    let response = await this.ax.get(v2Path(`/spaces/${spaceId}`));
    return response.data;
  }

  // ── Comments (v2 API) ──

  async getPageFooterComments(
    pageId: string,
    params: {
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<V2PaginatedResponse<ConfluenceComment>> {
    let queryParams: Record<string, string> = { 'body-format': 'storage' };
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;

    let response = await this.ax.get(v2Path(`/pages/${pageId}/footer-comments`), {
      params: queryParams
    });
    return response.data;
  }

  async createPageFooterComment(pageId: string, body: string): Promise<ConfluenceComment> {
    let response = await this.ax.post(v2Path('/footer-comments'), {
      pageId,
      body: {
        representation: 'storage',
        value: body
      }
    });
    return response.data;
  }

  async createBlogPostFooterComment(
    blogPostId: string,
    body: string
  ): Promise<ConfluenceComment> {
    let response = await this.ax.post(v2Path('/footer-comments'), {
      blogPostId,
      body: {
        representation: 'storage',
        value: body
      }
    });
    return response.data;
  }

  async deleteFooterComment(commentId: string): Promise<void> {
    await this.ax.delete(v2Path(`/footer-comments/${commentId}`));
  }

  async deleteInlineComment(commentId: string): Promise<void> {
    await this.ax.delete(v2Path(`/inline-comments/${commentId}`));
  }

  // ── Labels (v2 read, v1 write API) ──

  async getContentLabels(
    contentId: string,
    contentType: ConfluenceContentType = 'page'
  ): Promise<V1PaginatedResponse<ConfluenceLabel>> {
    let response = await this.ax.get(v2Path(labelPath(contentType, contentId)));
    let data = response.data;
    return {
      results: data.results || [],
      start: 0,
      limit: 200,
      size: data.results?.length ?? 0
    };
  }

  async addContentLabels(contentId: string, labels: string[]): Promise<ConfluenceLabel[]> {
    let payload = labels.map(name => ({ prefix: 'global', name }));
    let response = await this.ax.post(`/wiki/rest/api/content/${contentId}/label`, payload);
    return response.data.results || response.data;
  }

  async removeContentLabel(contentId: string, label: string): Promise<void> {
    await this.ax.delete(
      `/wiki/rest/api/content/${contentId}/label/${encodeURIComponent(label)}`
    );
  }

  // ── Search (v1 API with CQL) ──

  async search(params: {
    cql: string;
    cqlContext?: string;
    limit?: number;
    start?: number;
    includeArchivedSpaces?: boolean;
    excerpt?: string;
  }): Promise<V1PaginatedResponse<ConfluenceSearchResult>> {
    let queryParams: Record<string, string> = {
      cql: params.cql
    };
    if (params.cqlContext) queryParams.cqlcontext = params.cqlContext;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.start) queryParams.start = String(params.start);
    if (params.includeArchivedSpaces !== undefined) {
      queryParams.includeArchivedSpaces = String(params.includeArchivedSpaces);
    }
    if (params.excerpt) queryParams.excerpt = params.excerpt;

    let response = await this.ax.get('/wiki/rest/api/search', { params: queryParams });
    return response.data;
  }

  // ── Content Properties (v2 API) ──

  async getPageProperties(pageId: string): Promise<V2PaginatedResponse<ContentProperty>> {
    let response = await this.ax.get(v2Path(`/pages/${pageId}/properties`));
    return response.data;
  }

  async createPageProperty(pageId: string, key: string, value: any): Promise<ContentProperty> {
    let response = await this.ax.post(v2Path(`/pages/${pageId}/properties`), {
      key,
      value
    });
    return response.data;
  }

  async updatePageProperty(
    pageId: string,
    propertyId: string,
    key: string,
    value: any,
    version: number
  ): Promise<ContentProperty> {
    let response = await this.ax.put(v2Path(`/pages/${pageId}/properties/${propertyId}`), {
      key,
      value,
      version: { number: version }
    });
    return response.data;
  }

  async deletePageProperty(pageId: string, propertyId: string): Promise<void> {
    await this.ax.delete(v2Path(`/pages/${pageId}/properties/${propertyId}`));
  }

  // ── Attachments (v2 read/delete, v1 upload API) ──

  async getContentAttachments(
    contentId: string,
    params: {
      contentType?: ConfluenceAttachmentContainerType;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<V2PaginatedResponse<ConfluenceAttachment>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;

    let response = await this.ax.get(
      v2Path(attachmentContainerPath(params.contentType || 'page', contentId)),
      {
        params: queryParams
      }
    );
    return {
      ...response.data,
      results: (response.data.results || []).map(asAttachment)
    };
  }

  async getPageAttachments(
    pageId: string,
    params: {
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<V2PaginatedResponse<ConfluenceAttachment>> {
    return this.getContentAttachments(pageId, { ...params, contentType: 'page' });
  }

  async getAttachmentById(attachmentId: string): Promise<ConfluenceAttachment> {
    let response = await this.ax.get(v2Path(`/attachments/${attachmentId}`));
    return asAttachment(response.data);
  }

  async uploadContentAttachment(data: {
    contentId: string;
    fileName: string;
    contentBase64: string;
    mediaType?: string;
    comment?: string;
    minorEdit?: boolean;
    overwriteExisting?: boolean;
  }): Promise<ConfluenceAttachment> {
    let fileBytes = Buffer.from(data.contentBase64, 'base64');
    let formData = new FormData();
    formData.append(
      'file',
      new Blob([fileBytes], { type: data.mediaType || 'application/octet-stream' }),
      data.fileName
    );
    formData.append('minorEdit', String(data.minorEdit !== false));
    if (data.comment) {
      formData.append('comment', data.comment);
    }

    let method = data.overwriteExisting ? 'put' : 'post';
    let response = await this.ax.request({
      method,
      url: `/wiki/rest/api/content/${data.contentId}/child/attachment`,
      data: formData,
      headers: {
        'X-Atlassian-Token': 'nocheck'
      }
    });

    return firstAttachmentFromContentArray(response.data);
  }

  async deleteAttachment(attachmentId: string, purge?: boolean): Promise<void> {
    await this.ax.delete(v2Path(`/attachments/${attachmentId}`), {
      params: purge ? { purge: true } : undefined
    });
  }

  // ── Content Restrictions (v1 API) ──

  async getContentRestrictions(contentId: string): Promise<any> {
    let response = await this.ax.get(`/wiki/rest/api/content/${contentId}/restriction`);
    return response.data;
  }

  async updateContentRestrictions(
    contentId: string,
    restrictions: Array<{
      operation: 'read' | 'update';
      users?: string[];
      groups?: string[];
    }>
  ): Promise<any> {
    let payload = restrictions.map(r => ({
      operation: r.operation,
      restrictions: {
        user: (r.users || []).map(accountId => ({ type: 'known', accountId })),
        group: (r.groups || []).map(name => ({ type: 'group', name }))
      }
    }));

    let response = await this.ax.put(
      `/wiki/rest/api/content/${contentId}/restriction`,
      payload
    );
    return response.data;
  }

  async deleteContentRestrictions(contentId: string): Promise<void> {
    await this.ax.delete(`/wiki/rest/api/content/${contentId}/restriction`);
  }

  // ── Users & Groups (v1 API) ──

  async getCurrentUser(): Promise<ConfluenceUser> {
    let response = await this.ax.get('/wiki/rest/api/user/current');
    return response.data;
  }

  async getUserByAccountId(accountId: string): Promise<ConfluenceUser> {
    let response = await this.ax.get('/wiki/rest/api/user', { params: { accountId } });
    return response.data;
  }

  async getGroups(
    params: { limit?: number; start?: number } = {}
  ): Promise<V1PaginatedResponse<ConfluenceGroup>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.start) queryParams.start = String(params.start);

    let response = await this.ax.get('/wiki/rest/api/group', { params: queryParams });
    return response.data;
  }

  // ── Content Version History (v2 API) ──

  async getContentVersions(
    contentId: string,
    params: {
      contentType?: ConfluenceContentType;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<V1PaginatedResponse<any>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;

    let response = await this.ax.get(
      v2Path(versionsPath(params.contentType || 'page', contentId)),
      {
        params: queryParams
      }
    );
    let data = response.data;
    return {
      results: data.results || [],
      start: 0,
      limit: params.limit ?? 10,
      size: data.results?.length ?? 0,
      _links: data._links
    };
  }

  // ── Webhooks (Cloud REST API) ──

  async registerWebhook(data: {
    name: string;
    url: string;
    events: string[];
    active?: boolean;
  }): Promise<any> {
    let response = await this.ax.post('/wiki/rest/webhooks/1.0/webhook', {
      ...data,
      active: data.active !== false
    });
    return response.data;
  }

  async unregisterWebhook(webhookId: string): Promise<void> {
    await this.ax.delete(`/wiki/rest/webhooks/1.0/webhook/${webhookId}`);
  }
}
