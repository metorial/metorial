import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getCurrentContext,
  requestAxios
} from 'slates';
import { type AuthMode, connection, type GhostAuth, siteUrl } from './connection';
import { generateGhostJwt, validateAdminKey } from './jwt';
import { invalid, malformed, object, one, resourceId, rows } from './schemas';
export const segment = (id: string) => {
  if (!resourceId.safeParse(id).success) throw invalid('Provide an exact native ID or slug.');
  return encodeURIComponent(id);
};
export function guardCredentials(value: unknown, values: string[]) {
  const redactor = new AuthConfigSecretRedactor(
    Object.fromEntries(values.filter(Boolean).map((v, i) => [String(i), v]))
  );
  const seen = new Set<object>();
  function text(s: string) {
    for (let n = 0; n < 5; n++) {
      if (redactor.redactEmbedded(s) !== s) throw malformed();
      for (const m of s.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
        const d = Buffer.from(m[0], 'base64').toString();
        if (redactor.redactEmbedded(d) !== d) throw malformed();
      }
      const d = s.replace(/%([a-f0-9]{2})/gi, (_, v: string) =>
        String.fromCharCode(Number.parseInt(v, 16))
      );
      if (d === s) break;
      s = d;
    }
  }
  function walk(v: unknown, depth = 0) {
    if (depth > 80) throw malformed();
    if (typeof v === 'string') text(v);
    if (
      typeof v === 'number' &&
      (!Number.isFinite(v) || Math.abs(v) > Number.MAX_SAFE_INTEGER)
    )
      throw malformed();
    if (!v || (typeof v !== 'object' && typeof v !== 'function') || seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v))
      text(Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString());
    for (const k of Reflect.ownKeys(v)) {
      text(String(k));
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (d && 'value' in d) walk(d.value, depth + 1);
    }
  }
  walk(value);
}
export const adaptError = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Ghost',
      reason: 'ghost_api',
      operation,
      parent: {},
      extractMessage: () =>
        status === 401
          ? 'Reconnect with the original key for this exact Ghost instance and API type.'
          : status === 403
            ? 'Check integration permissions or staff role and the selected API type.'
            : status === 404
              ? 'The exact resource is unavailable to this connection.'
              : status === 409
                ? 'Read the latest updated_at timestamp and reconcile changes before retrying.'
                : status === 429
                  ? 'Wait for the rate limit to reset; inspect uncertain writes before repeating.'
                  : 'Check documented payload and current state. A write may already have succeeded; inspect it before retrying.'
    }
  );
};
export class GhostAdminClient {
  readonly domain: string;
  readonly apiKey: string;
  readonly mode: AuthMode;
  readonly contentApiKey?: string;
  constructor(params: {
    domain: string;
    apiKey: string;
    contentApiKey?: string;
    mode?: AuthMode;
  }) {
    this.domain = siteUrl(params.domain);
    this.apiKey = params.apiKey;
    this.mode = params.mode ?? 'legacy_admin';
    this.contentApiKey = params.contentApiKey;
  }
  private async http() {
    const isContent = this.mode === 'content_api_key';
    if (isContent && !/^[a-f0-9]{26}$/i.test(this.apiKey))
      throw invalid('Provide a Ghost Content API key for published-content reads.');
    const jwt = isContent ? undefined : await generateGhostJwt(validateAdminKey(this.apiKey));
    const secrets = [
      this.apiKey,
      ...(!isContent ? this.apiKey.split(':').slice(1) : []),
      this.contentApiKey ?? '',
      jwt ?? ''
    ];
    const client = createAuthenticatedAxios({
      baseURL: `${this.domain}/ghost/api/${isContent ? 'content' : 'admin'}`,
      authHeader: jwt ? { value: `Ghost ${jwt}` } : undefined,
      headers: { 'Accept-Version': 'v5.0' },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 32 * 1024 * 1024,
      maxBodyLength: 32 * 1024 * 1024
    });
    const request = async (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      path: string,
      body?: unknown,
      params?: Record<string, unknown>
    ) => {
      if (
        isContent &&
        (method !== 'GET' || !/^\/(posts|pages|tags|tiers|settings)\//.test(path))
      )
        throw invalid(
          'This tool requires an Admin integration key or staff key. Reconnect with Admin credentials; Content keys cannot access Admin resources.'
        );
      const query = { ...params };
      if (query.limit !== undefined) {
        if (
          typeof query.limit !== 'number' ||
          !Number.isSafeInteger(query.limit) ||
          query.limit < 0
        )
          throw invalid('limit must be a nonnegative integer; legacy0 requests all records.');
        if (query.limit === 0) query.limit = 'all';
      }
      if (
        query.page !== undefined &&
        (typeof query.page !== 'number' || !Number.isSafeInteger(query.page) || query.page < 1)
      )
        throw invalid('page must be a positive integer.');
      if (isContent) {
        if (
          query.formats &&
          String(query.formats)
            .split(',')
            .some(x => !['html', 'plaintext'].includes(x))
        )
          throw invalid(
            'The Content API supports html and plaintext formats, not Lexical. Use an Admin key for Lexical.'
          );
        query.key = this.apiKey;
      }
      guardCredentials(body, secrets);
      const response = await requestAxios(
        `${method} request`,
        () => client.request<unknown>({ method, url: path, data: body, params: query }),
        error => {
          guardCredentials(getCurrentContext().getHttpTraces(), secrets);
          return adaptError(error, `${method} request`);
        }
      );
      guardCredentials(response.data, secrets);
      guardCredentials(getCurrentContext().getHttpTraces(), secrets);
      const expectedStatus = method === 'DELETE' ? 204 : method === 'POST' ? 201 : 200;
      if (response.status !== expectedStatus) throw malformed();
      if (method === 'DELETE') {
        return { ...response, data: {} as Record<string, any> };
      }
      const data = object(response.data),
        key = path.split('/')[1]!;
      if (key === 'site' || key === 'settings') {
        object(data[key]);
        return { ...response, data };
      }
      rows(data, key);
      if (method === 'POST') one(data, key);
      const components = path.split('/').filter(Boolean);
      if (components.length > 1) {
        const id = components[1];
        one(
          data,
          key,
          id === 'slug'
            ? { slug: decodeURIComponent(components[2]!) }
            : id === 'me'
              ? undefined
              : { id: decodeURIComponent(id!) }
        );
      }
      return { ...response, data };
    };
    return {
      get: (path: string, opts?: { params?: Record<string, unknown> }) =>
        request('GET', path, undefined, opts?.params),
      post: (path: string, body: unknown, opts?: { params?: Record<string, unknown> }) =>
        request('POST', path, body, opts?.params),
      put: (path: string, body: unknown, opts?: { params?: Record<string, unknown> }) =>
        request('PUT', path, body, opts?.params),
      delete: (path: string) => request('DELETE', path)
    };
  }
  // ─── Posts ──────────────────────────────────────────────────────

  async browsePosts(
    params: {
      include?: string;
      formats?: string;
      filter?: string;
      limit?: number;
      page?: number;
      order?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get('/posts/', { params });
    return response.data;
  }

  async readPost(
    postId: string,
    params: {
      include?: string;
      formats?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get(`/posts/${segment(postId)}/`, { params });
    return response.data;
  }

  async readPostBySlug(
    slug: string,
    params: {
      include?: string;
      formats?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get(`/posts/slug/${segment(slug)}/`, { params });
    return response.data;
  }

  async createPost(post: Record<string, any>, params: { source?: string } = {}) {
    let client = await this.http();
    let response = await client.post('/posts/', { posts: [post] }, { params });
    return response.data;
  }

  async updatePost(
    postId: string,
    post: Record<string, any>,
    params: { source?: string } = {}
  ) {
    let client = await this.http();
    let response = await client.put(
      `/posts/${segment(postId)}/`,
      { posts: [post] },
      { params }
    );
    return response.data;
  }

  async deletePost(postId: string) {
    let client = await this.http();
    await client.delete(`/posts/${segment(postId)}/`);
  }

  // ─── Pages ──────────────────────────────────────────────────────

  async browsePages(
    params: {
      include?: string;
      formats?: string;
      filter?: string;
      limit?: number;
      page?: number;
      order?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get('/pages/', { params });
    return response.data;
  }

  async readPage(
    pageId: string,
    params: {
      include?: string;
      formats?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get(`/pages/${segment(pageId)}/`, { params });
    return response.data;
  }

  async readPageBySlug(
    slug: string,
    params: {
      include?: string;
      formats?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get(`/pages/slug/${segment(slug)}/`, { params });
    return response.data;
  }

  async createPage(page: Record<string, any>, params: { source?: string } = {}) {
    let client = await this.http();
    let response = await client.post('/pages/', { pages: [page] }, { params });
    return response.data;
  }

  async updatePage(
    pageId: string,
    page: Record<string, any>,
    params: { source?: string } = {}
  ) {
    let client = await this.http();
    let response = await client.put(
      `/pages/${segment(pageId)}/`,
      { pages: [page] },
      { params }
    );
    return response.data;
  }

  async deletePage(pageId: string) {
    let client = await this.http();
    await client.delete(`/pages/${segment(pageId)}/`);
  }

  // ─── Tags ──────────────────────────────────────────────────────

  async browseTags(
    params: {
      include?: string;
      filter?: string;
      limit?: number;
      page?: number;
      order?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get('/tags/', { params });
    return response.data;
  }

  async readTag(tagId: string, params: { include?: string; fields?: string } = {}) {
    let client = await this.http();
    let response = await client.get(`/tags/${segment(tagId)}/`, { params });
    return response.data;
  }

  async readTagBySlug(slug: string, params: { include?: string; fields?: string } = {}) {
    let client = await this.http();
    let response = await client.get(`/tags/slug/${segment(slug)}/`, { params });
    return response.data;
  }

  async createTag(tag: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/tags/', { tags: [tag] });
    return response.data;
  }

  async updateTag(tagId: string, tag: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/tags/${segment(tagId)}/`, { tags: [tag] });
    return response.data;
  }

  async deleteTag(tagId: string) {
    let client = await this.http();
    await client.delete(`/tags/${segment(tagId)}/`);
  }

  // ─── Members ──────────────────────────────────────────────────

  async browseMembers(
    params: {
      include?: string;
      filter?: string;
      limit?: number;
      page?: number;
      order?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get('/members/', { params });
    return response.data;
  }

  async readMember(memberId: string, params: { include?: string; fields?: string } = {}) {
    let client = await this.http();
    let response = await client.get(`/members/${segment(memberId)}/`, { params });
    return response.data;
  }

  async createMember(member: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/members/', { members: [member] });
    return response.data;
  }

  async updateMember(memberId: string, member: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/members/${segment(memberId)}/`, { members: [member] });
    return response.data;
  }

  async deleteMember(memberId: string) {
    let client = await this.http();
    await client.delete(`/members/${segment(memberId)}/`);
  }

  // ─── Tiers ──────────────────────────────────────────────────────

  async browseTiers(
    params: {
      include?: string;
      filter?: string;
      limit?: number;
      page?: number;
      order?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get('/tiers/', { params });
    return response.data;
  }

  async readTier(tierId: string, params: { include?: string } = {}) {
    let client = await this.http();
    let response = await client.get(`/tiers/${segment(tierId)}/`, { params });
    return response.data;
  }

  // ─── Offers ──────────────────────────────────────────────────────

  async browseOffers(params: { filter?: string; limit?: number; page?: number } = {}) {
    let client = await this.http();
    let response = await client.get('/offers/', { params });
    return response.data;
  }

  async readOffer(offerId: string) {
    let client = await this.http();
    let response = await client.get(`/offers/${segment(offerId)}/`);
    return response.data;
  }

  async createOffer(offer: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/offers/', { offers: [offer] });
    return response.data;
  }

  async updateOffer(offerId: string, offer: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/offers/${segment(offerId)}/`, { offers: [offer] });
    return response.data;
  }

  // ─── Newsletters ──────────────────────────────────────────────

  async browseNewsletters(
    params: {
      include?: string;
      filter?: string;
      limit?: number;
      page?: number;
      order?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get('/newsletters/', { params });
    return response.data;
  }

  async readNewsletter(newsletterId: string, params: { include?: string } = {}) {
    let client = await this.http();
    let response = await client.get(`/newsletters/${segment(newsletterId)}/`, { params });
    return response.data;
  }

  async createNewsletter(newsletter: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/newsletters/', { newsletters: [newsletter] });
    return response.data;
  }

  async updateNewsletter(newsletterId: string, newsletter: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/newsletters/${segment(newsletterId)}/`, {
      newsletters: [newsletter]
    });
    return response.data;
  }

  // ─── Users ──────────────────────────────────────────────────────

  async browseUsers(
    params: {
      include?: string;
      filter?: string;
      limit?: number;
      page?: number;
      order?: string;
      fields?: string;
    } = {}
  ) {
    let client = await this.http();
    let response = await client.get('/users/', { params });
    return response.data;
  }

  async readUser(userId: string, params: { include?: string; fields?: string } = {}) {
    let client = await this.http();
    let response = await client.get(`/users/${segment(userId)}/`, { params });
    return response.data;
  }

  // ─── Site ──────────────────────────────────────────────────────

  async readSite() {
    let client = await this.http();
    let response = await client.get(this.mode === 'content_api_key' ? '/settings/' : '/site/');
    return this.mode === 'content_api_key' ? { site: response.data.settings } : response.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────────

  async createWebhook(webhook: {
    event: string;
    targetUrl: string;
    name?: string;
    secret?: string;
    apiVersion?: string;
  }) {
    let client = await this.http();
    let response = await client.post('/webhooks/', {
      webhooks: [
        {
          event: webhook.event,
          target_url: webhook.targetUrl,
          name: webhook.name,
          secret: webhook.secret,
          api_version: webhook.apiVersion ?? 'v5'
        }
      ]
    });
    return response.data;
  }

  async updateWebhook(webhookId: string, webhook: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/webhooks/${segment(webhookId)}/`, {
      webhooks: [webhook]
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let client = await this.http();
    await client.delete(`/webhooks/${segment(webhookId)}/`);
  }
}
export const getClient = (
  ctx: { auth: GhostAuth; config: unknown },
  api?: 'admin' | 'content'
) => {
  const params = connection(ctx.auth, ctx.config as { adminDomain?: string });
  if (api === 'admin' && params.mode === 'content_api_key')
    throw invalid('This connection has a Content key. Reconnect with an Admin key.');
  if (api === 'content' && params.mode !== 'content_api_key') {
    if (!params.contentApiKey)
      throw invalid(
        'Reconnect with an optional Content API key to select published-content reads.'
      );
    params.apiKey = params.contentApiKey;
    params.mode = 'content_api_key';
  }
  return new GhostAdminClient(params);
};
export class GhostContentClient extends GhostAdminClient {
  constructor(params: { domain: string; contentApiKey: string }) {
    super({ domain: params.domain, apiKey: params.contentApiKey, mode: 'content_api_key' });
  }
}
