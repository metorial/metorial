import { createAxios } from 'slates';
import { generateGhostJwt } from './jwt';

export class GhostAdminClient {
  private domain: string;
  private apiKey: string;

  constructor(params: { domain: string; apiKey: string }) {
    this.domain = params.domain;
    this.apiKey = params.apiKey;
  }

  private async http() {
    let jwt = await generateGhostJwt(this.apiKey);
    return createAxios({
      baseURL: `https://${this.domain}/ghost/api/admin`,
      headers: {
        Authorization: `Ghost ${jwt}`,
        'Accept-Version': 'v5.0',
        'Content-Type': 'application/json'
      }
    });
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
    let response = await client.get(`/posts/${postId}/`, { params });
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
    let response = await client.get(`/posts/slug/${slug}/`, { params });
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
    let response = await client.put(`/posts/${postId}/`, { posts: [post] }, { params });
    return response.data;
  }

  async deletePost(postId: string) {
    let client = await this.http();
    await client.delete(`/posts/${postId}/`);
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
    let response = await client.get(`/pages/${pageId}/`, { params });
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
    let response = await client.get(`/pages/slug/${slug}/`, { params });
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
    let response = await client.put(`/pages/${pageId}/`, { pages: [page] }, { params });
    return response.data;
  }

  async deletePage(pageId: string) {
    let client = await this.http();
    await client.delete(`/pages/${pageId}/`);
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
    let response = await client.get(`/tags/${tagId}/`, { params });
    return response.data;
  }

  async readTagBySlug(slug: string, params: { include?: string; fields?: string } = {}) {
    let client = await this.http();
    let response = await client.get(`/tags/slug/${slug}/`, { params });
    return response.data;
  }

  async createTag(tag: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/tags/', { tags: [tag] });
    return response.data;
  }

  async updateTag(tagId: string, tag: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/tags/${tagId}/`, { tags: [tag] });
    return response.data;
  }

  async deleteTag(tagId: string) {
    let client = await this.http();
    await client.delete(`/tags/${tagId}/`);
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
    let response = await client.get(`/members/${memberId}/`, { params });
    return response.data;
  }

  async createMember(member: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/members/', { members: [member] });
    return response.data;
  }

  async updateMember(memberId: string, member: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/members/${memberId}/`, { members: [member] });
    return response.data;
  }

  async deleteMember(memberId: string) {
    let client = await this.http();
    await client.delete(`/members/${memberId}/`);
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
    let response = await client.get(`/tiers/${tierId}/`, { params });
    return response.data;
  }

  async createTier(tier: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/tiers/', { tiers: [tier] });
    return response.data;
  }

  async updateTier(tierId: string, tier: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/tiers/${tierId}/`, { tiers: [tier] });
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
    let response = await client.get(`/offers/${offerId}/`);
    return response.data;
  }

  async createOffer(offer: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/offers/', { offers: [offer] });
    return response.data;
  }

  async updateOffer(offerId: string, offer: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/offers/${offerId}/`, { offers: [offer] });
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
    let response = await client.get(`/newsletters/${newsletterId}/`, { params });
    return response.data;
  }

  async createNewsletter(newsletter: Record<string, any>) {
    let client = await this.http();
    let response = await client.post('/newsletters/', { newsletters: [newsletter] });
    return response.data;
  }

  async updateNewsletter(newsletterId: string, newsletter: Record<string, any>) {
    let client = await this.http();
    let response = await client.put(`/newsletters/${newsletterId}/`, {
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
    let response = await client.get(`/users/${userId}/`, { params });
    return response.data;
  }

  // ─── Site ──────────────────────────────────────────────────────

  async readSite() {
    let client = await this.http();
    let response = await client.get('/site/');
    return response.data;
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
    let response = await client.put(`/webhooks/${webhookId}/`, {
      webhooks: [webhook]
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let client = await this.http();
    await client.delete(`/webhooks/${webhookId}/`);
  }

  // ─── Images ──────────────────────────────────────────────────────

  async uploadImage(imageUrl: string, fileName: string) {
    // Download image and re-upload to Ghost
    let downloadClient = createAxios();
    let imageResponse = await downloadClient.get(imageUrl, { responseType: 'arraybuffer' });

    let client = await this.http();

    // Build multipart form data manually
    let boundary = `----SlatesBoundary${Date.now()}`;
    let imageData = imageResponse.data as ArrayBuffer;
    let uint8 = new Uint8Array(imageData);

    let contentType = String(imageResponse.headers['content-type'] ?? 'image/png');

    // Build the multipart body
    let preamble = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`;
    let postamble = `\r\n--${boundary}--\r\n`;

    let preambleBytes = new TextEncoder().encode(preamble);
    let postambleBytes = new TextEncoder().encode(postamble);

    let body = new Uint8Array(preambleBytes.length + uint8.length + postambleBytes.length);
    body.set(preambleBytes, 0);
    body.set(uint8, preambleBytes.length);
    body.set(postambleBytes, preambleBytes.length + uint8.length);

    let response = await client.post('/images/upload/', body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return response.data;
  }
}

export class GhostContentClient {
  private domain: string;
  private contentApiKey: string;

  constructor(params: { domain: string; contentApiKey: string }) {
    this.domain = params.domain;
    this.contentApiKey = params.contentApiKey;
  }

  private http() {
    return createAxios({
      baseURL: `https://${this.domain}/ghost/api/content`,
      headers: {
        'Accept-Version': 'v5.0'
      },
      params: {
        key: this.contentApiKey
      }
    });
  }

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
    let client = this.http();
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
    let client = this.http();
    let response = await client.get(`/posts/${postId}/`, { params });
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
    let client = this.http();
    let response = await client.get(`/posts/slug/${slug}/`, { params });
    return response.data;
  }

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
    let client = this.http();
    let response = await client.get('/pages/', { params });
    return response.data;
  }

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
    let client = this.http();
    let response = await client.get('/tags/', { params });
    return response.data;
  }

  async browseAuthors(
    params: {
      include?: string;
      filter?: string;
      limit?: number;
      page?: number;
      order?: string;
      fields?: string;
    } = {}
  ) {
    let client = this.http();
    let response = await client.get('/authors/', { params });
    return response.data;
  }

  async browseTiers(
    params: { include?: string; filter?: string; limit?: number; page?: number } = {}
  ) {
    let client = this.http();
    let response = await client.get('/tiers/', { params });
    return response.data;
  }

  async readSettings() {
    let client = this.http();
    let response = await client.get('/settings/');
    return response.data;
  }
}
