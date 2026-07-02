import { createAxios } from 'slates';
import { wordpressApiError, wordpressServiceError } from './errors';

export interface WordPressClientConfig {
  siteUrl: string;
  apiType: 'wpcom' | 'selfhosted';
  token: string;
  authMethod: 'oauth' | 'application_password';
}

export class WordPressClient {
  private http: ReturnType<typeof createAxios>;
  private headers: Record<string, string>;
  private siteUrl: string;
  private apiType: 'wpcom' | 'selfhosted';
  private siteId: string;

  constructor(config: WordPressClientConfig) {
    this.siteUrl = config.siteUrl.replace(/\/+$/, '');
    this.apiType = config.apiType;
    this.siteId = this.siteUrl.replace(/^https?:\/\//, '');

    let authorization =
      config.apiType === 'wpcom' || config.authMethod !== 'application_password'
        ? `Bearer ${config.token}`
        : `Basic ${config.token}`;

    this.headers = {
      Authorization: authorization,
      'Content-Type': 'application/json'
    };

    this.http = this.createHttp(
      config.apiType === 'wpcom'
        ? 'https://public-api.wordpress.com/rest/v1.1'
        : `${this.siteUrl}/wp-json/wp/v2`
    );
  }

  private createHttp(baseURL: string, headers: Record<string, string> = this.headers) {
    let http = createAxios({
      baseURL,
      headers
    });

    http.interceptors.response.use(
      response => response,
      error => Promise.reject(wordpressApiError(error))
    );

    return http;
  }

  private normalizeSelfHostedOrder(order?: string) {
    return (order || 'desc').toLowerCase();
  }

  private sanitizeHeaderValue(value: string) {
    return value.replace(/[\r\n"]/g, '_');
  }

  private async fetchRemoteFile(fileUrl: string) {
    let url: URL;
    try {
      url = new URL(fileUrl);
    } catch {
      throw wordpressServiceError('fileUrl must be a valid HTTP or HTTPS URL.');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw wordpressServiceError('fileUrl must use HTTP or HTTPS.');
    }

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      let serviceError = wordpressServiceError(
        `Unable to fetch media file URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (error instanceof Error) {
        serviceError.setParent(error);
      }
      throw serviceError;
    }

    if (!response.ok) {
      throw wordpressServiceError(
        `Unable to fetch media file URL: HTTP ${response.status} ${response.statusText}`.trim()
      );
    }

    return {
      body: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get('content-type') ?? undefined
    };
  }

  private async findWpcomCategory(identifier: string) {
    let categories = await this.listCategories({
      search: /^\d+$/.test(identifier) ? undefined : identifier,
      perPage: 1000,
      page: 1
    });

    return categories.find((category: any) => {
      return (
        String(category.ID ?? category.id ?? '') === identifier ||
        String(category.slug ?? '') === identifier ||
        String(category.name ?? '') === identifier
      );
    });
  }

  private async requireWpcomCategory(identifier: string) {
    let category = await this.findWpcomCategory(identifier);
    if (!category) {
      throw wordpressServiceError(`WordPress.com category ${identifier} was not found.`);
    }
    if (!category.slug) {
      throw wordpressServiceError(
        `WordPress.com category ${identifier} did not include a slug for mutation.`
      );
    }

    return category;
  }

  private async findWpcomTag(identifier: string) {
    let tags = await this.listTags({
      search: /^\d+$/.test(identifier) ? undefined : identifier,
      perPage: 1000,
      page: 1
    });

    return tags.find((tag: any) => {
      return (
        String(tag.ID ?? tag.id ?? '') === identifier ||
        String(tag.slug ?? '') === identifier ||
        String(tag.name ?? '') === identifier
      );
    });
  }

  private async requireWpcomTag(identifier: string) {
    let tag = await this.findWpcomTag(identifier);
    if (!tag) {
      throw wordpressServiceError(`WordPress.com tag ${identifier} was not found.`);
    }
    if (!tag.slug) {
      throw wordpressServiceError(
        `WordPress.com tag ${identifier} did not include a slug for mutation.`
      );
    }

    return tag;
  }

  // ──────────────────────────────── Posts ────────────────────────────────

  async listPosts(
    params: {
      status?: string;
      search?: string;
      category?: string;
      tag?: string;
      author?: string;
      perPage?: number;
      page?: number;
      orderBy?: string;
      order?: string;
      after?: string;
      before?: string;
    } = {}
  ): Promise<any[]> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/posts`, {
        params: {
          status: params.status,
          search: params.search,
          category: params.category,
          tag: params.tag,
          author: params.author,
          number: params.perPage || 20,
          page: params.page || 1,
          order_by: params.orderBy || 'date',
          order: params.order || 'DESC',
          after: params.after,
          before: params.before
        }
      });
      return response.data.posts || [];
    } else {
      let response = await this.http.get('/posts', {
        params: {
          status: params.status,
          search: params.search,
          categories: params.category,
          tags: params.tag,
          author: params.author,
          per_page: params.perPage || 20,
          page: params.page || 1,
          orderby: params.orderBy || 'date',
          order: this.normalizeSelfHostedOrder(params.order),
          after: params.after,
          before: params.before
        }
      });
      return response.data;
    }
  }

  async getPost(postId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/posts/${postId}`);
      return response.data;
    } else {
      let response = await this.http.get(`/posts/${postId}`);
      return response.data;
    }
  }

  async createPost(data: {
    title: string;
    content?: string;
    excerpt?: string;
    status?: string;
    format?: string;
    categories?: string[];
    tags?: string[];
    featuredImageId?: string;
    date?: string;
    slug?: string;
    password?: string;
    commentStatus?: string;
    pingStatus?: string;
  }): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/posts/new`, {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status || 'draft',
        format: data.format,
        categories: data.categories,
        tags: data.tags,
        featured_image: data.featuredImageId,
        date: data.date,
        slug: data.slug,
        password: data.password,
        comment_status: data.commentStatus,
        ping_status: data.pingStatus
      });
      return response.data;
    } else {
      let body: Record<string, any> = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status || 'draft',
        format: data.format,
        featured_media: data.featuredImageId ? Number(data.featuredImageId) : undefined,
        date: data.date,
        slug: data.slug,
        password: data.password,
        comment_status: data.commentStatus,
        ping_status: data.pingStatus
      };

      if (data.categories && data.categories.length > 0) {
        body.categories = data.categories.map(Number);
      }
      if (data.tags && data.tags.length > 0) {
        body.tags = data.tags.map(Number);
      }

      let response = await this.http.post('/posts', body);
      return response.data;
    }
  }

  async updatePost(
    postId: string,
    data: {
      title?: string;
      content?: string;
      excerpt?: string;
      status?: string;
      format?: string;
      categories?: string[];
      tags?: string[];
      featuredImageId?: string;
      date?: string;
      slug?: string;
      password?: string;
      commentStatus?: string;
      pingStatus?: string;
    }
  ): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/posts/${postId}`, {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        format: data.format,
        categories: data.categories,
        tags: data.tags,
        featured_image: data.featuredImageId,
        date: data.date,
        slug: data.slug,
        password: data.password,
        comment_status: data.commentStatus,
        ping_status: data.pingStatus
      });
      return response.data;
    } else {
      let body: Record<string, any> = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        format: data.format,
        featured_media: data.featuredImageId ? Number(data.featuredImageId) : undefined,
        date: data.date,
        slug: data.slug,
        password: data.password,
        comment_status: data.commentStatus,
        ping_status: data.pingStatus
      };

      if (data.categories) {
        body.categories = data.categories.map(Number);
      }
      if (data.tags) {
        body.tags = data.tags.map(Number);
      }

      let response = await this.http.post(`/posts/${postId}`, body);
      return response.data;
    }
  }

  async deletePost(postId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/posts/${postId}/delete`);
      return response.data;
    } else {
      let response = await this.http.delete(`/posts/${postId}`, {
        params: { force: true }
      });
      return response.data;
    }
  }

  // ──────────────────────────────── Pages ────────────────────────────────

  async listPages(
    params: {
      status?: string;
      search?: string;
      perPage?: number;
      page?: number;
      orderBy?: string;
      order?: string;
    } = {}
  ): Promise<any[]> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/posts`, {
        params: {
          type: 'page',
          status: params.status,
          search: params.search,
          number: params.perPage || 20,
          page: params.page || 1,
          order_by: params.orderBy || 'date',
          order: params.order || 'DESC'
        }
      });
      return response.data.posts || [];
    } else {
      let response = await this.http.get('/pages', {
        params: {
          status: params.status,
          search: params.search,
          per_page: params.perPage || 20,
          page: params.page || 1,
          orderby: params.orderBy || 'date',
          order: this.normalizeSelfHostedOrder(params.order)
        }
      });
      return response.data;
    }
  }

  async getPage(pageId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/posts/${pageId}`);
      return response.data;
    } else {
      let response = await this.http.get(`/pages/${pageId}`);
      return response.data;
    }
  }

  async createPage(data: {
    title: string;
    content?: string;
    excerpt?: string;
    status?: string;
    parentId?: string;
    slug?: string;
    date?: string;
    featuredImageId?: string;
    commentStatus?: string;
  }): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/posts/new`, {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status || 'draft',
        type: 'page',
        parent: data.parentId ? Number(data.parentId) : undefined,
        slug: data.slug,
        date: data.date,
        featured_image: data.featuredImageId,
        comment_status: data.commentStatus
      });
      return response.data;
    } else {
      let response = await this.http.post('/pages', {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status || 'draft',
        parent: data.parentId ? Number(data.parentId) : 0,
        slug: data.slug,
        date: data.date,
        featured_media: data.featuredImageId ? Number(data.featuredImageId) : undefined,
        comment_status: data.commentStatus
      });
      return response.data;
    }
  }

  async updatePage(
    pageId: string,
    data: {
      title?: string;
      content?: string;
      excerpt?: string;
      status?: string;
      parentId?: string;
      slug?: string;
      date?: string;
      featuredImageId?: string;
      commentStatus?: string;
    }
  ): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/posts/${pageId}`, {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        parent: data.parentId ? Number(data.parentId) : undefined,
        slug: data.slug,
        date: data.date,
        featured_image: data.featuredImageId,
        comment_status: data.commentStatus
      });
      return response.data;
    } else {
      let response = await this.http.post(`/pages/${pageId}`, {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        parent: data.parentId ? Number(data.parentId) : undefined,
        slug: data.slug,
        date: data.date,
        featured_media: data.featuredImageId ? Number(data.featuredImageId) : undefined,
        comment_status: data.commentStatus
      });
      return response.data;
    }
  }

  async deletePage(pageId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/posts/${pageId}/delete`);
      return response.data;
    } else {
      let response = await this.http.delete(`/pages/${pageId}`, {
        params: { force: true }
      });
      return response.data;
    }
  }

  // ──────────────────────────────── Comments ────────────────────────────────

  async listComments(
    params: {
      postId?: string;
      status?: string;
      perPage?: number;
      page?: number;
      search?: string;
    } = {}
  ): Promise<any[]> {
    if (this.apiType === 'wpcom') {
      let url = params.postId
        ? `/sites/${this.siteId}/posts/${params.postId}/replies`
        : `/sites/${this.siteId}/comments`;
      let response = await this.http.get(url, {
        params: {
          status: params.status,
          number: params.perPage || 20,
          page: params.page || 1
        }
      });
      return response.data.comments || [];
    } else {
      let response = await this.http.get('/comments', {
        params: {
          post: params.postId,
          status: params.status,
          per_page: params.perPage || 20,
          page: params.page || 1,
          search: params.search
        }
      });
      return response.data;
    }
  }

  async getComment(commentId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/comments/${commentId}`);
      return response.data;
    } else {
      let response = await this.http.get(`/comments/${commentId}`);
      return response.data;
    }
  }

  async createComment(data: {
    postId: string;
    content: string;
    parentCommentId?: string;
    authorName?: string;
    authorEmail?: string;
  }): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(
        `/sites/${this.siteId}/posts/${data.postId}/replies/new`,
        {
          content: data.content,
          parent: data.parentCommentId ? Number(data.parentCommentId) : undefined
        }
      );
      return response.data;
    } else {
      let response = await this.http.post('/comments', {
        post: Number(data.postId),
        content: data.content,
        parent: data.parentCommentId ? Number(data.parentCommentId) : 0,
        author_name: data.authorName,
        author_email: data.authorEmail
      });
      return response.data;
    }
  }

  async updateComment(
    commentId: string,
    data: {
      content?: string;
      status?: string;
    }
  ): Promise<any> {
    if (this.apiType === 'wpcom') {
      let body: Record<string, any> = {};
      if (data.content !== undefined) body.content = data.content;
      if (data.status !== undefined) body.status = data.status;

      let response = await this.http.post(`/sites/${this.siteId}/comments/${commentId}`, body);
      return response.data;
    } else {
      let response = await this.http.post(`/comments/${commentId}`, {
        content: data.content,
        status: data.status
      });
      return response.data;
    }
  }

  async deleteComment(commentId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(
        `/sites/${this.siteId}/comments/${commentId}/delete`
      );
      return response.data;
    } else {
      let response = await this.http.delete(`/comments/${commentId}`, {
        params: { force: true }
      });
      return response.data;
    }
  }

  // ──────────────────────────────── Media ────────────────────────────────

  async listMedia(
    params: { mediaType?: string; search?: string; perPage?: number; page?: number } = {}
  ): Promise<any[]> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/media`, {
        params: {
          mime_type: params.mediaType,
          search: params.search,
          number: params.perPage || 20,
          page: params.page || 1
        }
      });
      return response.data.media || [];
    } else {
      let response = await this.http.get('/media', {
        params: {
          media_type: params.mediaType,
          search: params.search,
          per_page: params.perPage || 20,
          page: params.page || 1
        }
      });
      return response.data;
    }
  }

  async getMedia(mediaId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/media/${mediaId}`);
      return response.data;
    } else {
      let response = await this.http.get(`/media/${mediaId}`);
      return response.data;
    }
  }

  async uploadMedia(data: {
    fileUrl: string;
    fileName: string;
    title?: string;
    caption?: string;
    altText?: string;
    description?: string;
    mimeType?: string;
    postId?: string;
  }): Promise<any> {
    if (this.apiType === 'wpcom') {
      let body = new URLSearchParams({
        media_urls: data.fileUrl
      });

      if (data.title) body.set('attrs[0][title]', data.title);
      if (data.caption) body.set('attrs[0][caption]', data.caption);
      if (data.altText) body.set('attrs[0][alt]', data.altText);
      if (data.description) body.set('attrs[0][description]', data.description);
      if (data.postId) body.set('attrs[0][parent_id]', data.postId);

      let response = await this.http.post(`/sites/${this.siteId}/media/new`, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let media = response.data?.media?.[0];
      if (!media) {
        let errors = response.data?.errors ?? response.data?.media_errors;
        throw wordpressServiceError(
          `WordPress.com media upload did not return a media item${
            errors ? `: ${JSON.stringify(errors)}` : '.'
          }`
        );
      }

      return media;
    } else {
      let file = await this.fetchRemoteFile(data.fileUrl);
      let response = await this.http.post('/media', file.body, {
        params: {
          title: data.title,
          caption: data.caption,
          alt_text: data.altText,
          description: data.description,
          post: data.postId ? Number(data.postId) : undefined
        },
        headers: {
          'Content-Type': data.mimeType ?? file.mimeType ?? 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${this.sanitizeHeaderValue(
            data.fileName
          )}"`
        }
      });
      return response.data;
    }
  }

  async updateMedia(
    mediaId: string,
    data: {
      title?: string;
      caption?: string;
      altText?: string;
      description?: string;
    }
  ): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/media/${mediaId}`, {
        title: data.title,
        caption: data.caption,
        alt: data.altText,
        description: data.description
      });
      return response.data;
    } else {
      let response = await this.http.post(`/media/${mediaId}`, {
        title: data.title,
        caption: data.caption,
        alt_text: data.altText,
        description: data.description
      });
      return response.data;
    }
  }

  async deleteMedia(mediaId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/media/${mediaId}/delete`);
      return response.data;
    } else {
      let response = await this.http.delete(`/media/${mediaId}`, {
        params: { force: true }
      });
      return response.data;
    }
  }

  // ──────────────────────────────── Categories ────────────────────────────────

  async listCategories(
    params: { search?: string; perPage?: number; page?: number } = {}
  ): Promise<any[]> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/categories`, {
        params: {
          search: params.search,
          number: params.perPage || 100,
          page: params.page || 1
        }
      });
      return response.data.categories || [];
    } else {
      let response = await this.http.get('/categories', {
        params: {
          search: params.search,
          per_page: params.perPage || 100,
          page: params.page || 1
        }
      });
      return response.data;
    }
  }

  async createCategory(data: {
    name: string;
    description?: string;
    parentId?: string;
    slug?: string;
  }): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/categories/new`, {
        name: data.name,
        description: data.description,
        parent: data.parentId ? Number(data.parentId) : undefined
      });
      return response.data;
    } else {
      let response = await this.http.post('/categories', {
        name: data.name,
        description: data.description,
        parent: data.parentId ? Number(data.parentId) : 0,
        slug: data.slug
      });
      return response.data;
    }
  }

  async getCategory(categoryId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      return this.requireWpcomCategory(categoryId);
    } else {
      let response = await this.http.get(`/categories/${categoryId}`);
      return response.data;
    }
  }

  async updateCategory(
    categoryId: string,
    data: {
      name?: string;
      description?: string;
      parentId?: string;
      slug?: string;
    }
  ): Promise<any> {
    if (this.apiType === 'wpcom') {
      let category = await this.requireWpcomCategory(categoryId);
      let response = await this.http.post(
        `/sites/${this.siteId}/categories/slug:${encodeURIComponent(category.slug)}`,
        {
          name: data.name,
          description: data.description,
          parent: data.parentId ? Number(data.parentId) : undefined
        }
      );
      return response.data;
    } else {
      let response = await this.http.post(`/categories/${categoryId}`, {
        name: data.name,
        description: data.description,
        parent: data.parentId ? Number(data.parentId) : undefined,
        slug: data.slug
      });
      return response.data;
    }
  }

  async deleteCategory(categoryId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let category = await this.requireWpcomCategory(categoryId);
      let response = await this.http.post(
        `/sites/${this.siteId}/categories/slug:${encodeURIComponent(category.slug)}/delete`
      );
      return response.data;
    } else {
      let response = await this.http.delete(`/categories/${categoryId}`, {
        params: { force: true }
      });
      return response.data;
    }
  }

  // ──────────────────────────────── Tags ────────────────────────────────

  async listTags(
    params: { search?: string; perPage?: number; page?: number } = {}
  ): Promise<any[]> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/tags`, {
        params: {
          search: params.search,
          number: params.perPage || 100,
          page: params.page || 1
        }
      });
      return response.data.tags || [];
    } else {
      let response = await this.http.get('/tags', {
        params: {
          search: params.search,
          per_page: params.perPage || 100,
          page: params.page || 1
        }
      });
      return response.data;
    }
  }

  async createTag(data: { name: string; description?: string; slug?: string }): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/tags/new`, {
        name: data.name,
        description: data.description
      });
      return response.data;
    } else {
      let response = await this.http.post('/tags', {
        name: data.name,
        description: data.description,
        slug: data.slug
      });
      return response.data;
    }
  }

  async getTag(tagId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      return this.requireWpcomTag(tagId);
    } else {
      let response = await this.http.get(`/tags/${tagId}`);
      return response.data;
    }
  }

  async updateTag(
    tagId: string,
    data: {
      name?: string;
      description?: string;
      slug?: string;
    }
  ): Promise<any> {
    if (this.apiType === 'wpcom') {
      let tag = await this.requireWpcomTag(tagId);
      let response = await this.http.post(
        `/sites/${this.siteId}/tags/slug:${encodeURIComponent(tag.slug)}`,
        {
          name: data.name,
          description: data.description
        }
      );
      return response.data;
    } else {
      let response = await this.http.post(`/tags/${tagId}`, {
        name: data.name,
        description: data.description,
        slug: data.slug
      });
      return response.data;
    }
  }

  async deleteTag(tagId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      let tag = await this.requireWpcomTag(tagId);
      let response = await this.http.post(
        `/sites/${this.siteId}/tags/slug:${encodeURIComponent(tag.slug)}/delete`
      );
      return response.data;
    } else {
      let response = await this.http.delete(`/tags/${tagId}`, {
        params: { force: true }
      });
      return response.data;
    }
  }

  // ──────────────────────────────── Users ────────────────────────────────

  async listUsers(
    params: { search?: string; perPage?: number; page?: number; roles?: string } = {}
  ): Promise<any[]> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/users`, {
        params: {
          search: params.search,
          number: params.perPage || 20,
          page: params.page || 1
        }
      });
      return response.data.users || [];
    } else {
      let response = await this.http.get('/users', {
        params: {
          search: params.search,
          per_page: params.perPage || 20,
          page: params.page || 1,
          roles: params.roles
        }
      });
      return response.data;
    }
  }

  async getUser(userId: string): Promise<any> {
    if (this.apiType === 'wpcom') {
      // WP.com doesn't have a direct user by ID endpoint for site users
      // Use the /me endpoint for the authenticated user
      let response = await this.http.get(`/sites/${this.siteId}/users`, {
        params: { number: 100 }
      });
      let users: any[] = response.data.users || [];
      let user = users.find((u: any) => String(u.ID) === userId);
      if (!user) throw wordpressServiceError(`User ${userId} not found`);
      return user;
    } else {
      let response = await this.http.get(`/users/${userId}`);
      return response.data;
    }
  }

  async getCurrentUser(): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get('/me');
      return response.data;
    } else {
      let response = await this.http.get('/users/me');
      return response.data;
    }
  }

  // ──────────────────────────────── Site Settings ────────────────────────────────

  async getSiteInfo(): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}`);
      return response.data;
    } else {
      let settingsHttp = this.createHttp(`${this.siteUrl}/wp-json`);
      let response = await settingsHttp.get('/');
      return response.data;
    }
  }

  async getSiteSettings(): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/settings`);
      return response.data;
    } else {
      let response = await this.http.get('/settings');
      return response.data;
    }
  }

  async updateSiteSettings(data: Record<string, any>): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.post(`/sites/${this.siteId}/settings`, data);
      return response.data;
    } else {
      let response = await this.http.post('/settings', data);
      return response.data;
    }
  }

  // ──────────────────────────────── Stats (WP.com) ────────────────────────────────

  async getSiteStats(): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/stats`);
      return response.data;
    } else {
      throw wordpressServiceError(
        'Site statistics are only available for WordPress.com or Jetpack-connected sites.'
      );
    }
  }

  async getStatsTopPosts(
    params: { period?: string; num?: number; date?: string } = {}
  ): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/stats/top-posts`, {
        params: {
          period: params.period || 'day',
          num: params.num || 10,
          date: params.date
        }
      });
      return response.data;
    } else {
      throw wordpressServiceError(
        'Site statistics are only available for WordPress.com or Jetpack-connected sites.'
      );
    }
  }

  async getStatsReferrers(
    params: { period?: string; num?: number; date?: string } = {}
  ): Promise<any> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/stats/referrers`, {
        params: {
          period: params.period || 'day',
          num: params.num || 10,
          date: params.date
        }
      });
      return response.data;
    } else {
      throw wordpressServiceError(
        'Site statistics are only available for WordPress.com or Jetpack-connected sites.'
      );
    }
  }

  // ──────────────────────────────── Search ────────────────────────────────

  async search(
    query: string,
    params: {
      postType?: string;
      perPage?: number;
      page?: number;
    } = {}
  ): Promise<any[]> {
    if (this.apiType === 'wpcom') {
      let response = await this.http.get(`/sites/${this.siteId}/posts`, {
        params: {
          search: query,
          type: params.postType,
          number: params.perPage || 20,
          page: params.page || 1
        }
      });
      return response.data.posts || [];
    } else {
      let response = await this.http.get('/search', {
        params: {
          search: query,
          type: params.postType,
          per_page: params.perPage || 20,
          page: params.page || 1
        }
      });
      return Array.isArray(response.data) ? response.data : response.data?.results || [];
    }
  }
}
