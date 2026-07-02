import { createAxios } from 'slates';

export class FluxguardClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.fluxguard.com',
      headers: {
        'x-api-key': token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Account ──────────────────────────────────────────────

  async getAccount() {
    let response = await this.http.get('/account');
    return response.data;
  }

  // ─── Pages ────────────────────────────────────────────────

  async addPage(params: {
    url: string;
    siteId?: string;
    sessionId?: string;
    categories?: string[];
    categoryId?: string;
    categoryName?: string;
    siteNickname?: string;
  }) {
    let body: Record<string, any> = { url: params.url };
    if (params.siteId) body.siteId = params.siteId;
    if (params.sessionId) body.sessionId = params.sessionId;
    if (params.categories) body.categories = params.categories;
    if (params.categoryId) body.categoryId = params.categoryId;
    if (params.categoryName) body.categoryName = params.categoryName;
    if (params.siteNickname) body.siteNickname = params.siteNickname;

    let response = await this.http.post('/add-page', body);
    return response.data;
  }

  async getPage(siteId: string, sessionId: string, pageId: string) {
    let response = await this.http.get(`/site/${siteId}/session/${sessionId}/page/${pageId}`);
    return response.data;
  }

  async deletePage(siteId: string, sessionId: string, pageId: string) {
    let response = await this.http.delete(
      `/site/${siteId}/session/${sessionId}/page/${pageId}`
    );
    return response.data;
  }

  // ─── Sites ────────────────────────────────────────────────

  async deleteSite(siteId: string) {
    let response = await this.http.delete(`/site/${siteId}`);
    return response.data;
  }

  // ─── Crawls ───────────────────────────────────────────────

  async startCrawl(siteId: string, sessionId: string) {
    let response = await this.http.post(`/site/${siteId}/session/${sessionId}/crawl`);
    return response.data;
  }

  // ─── Categories ───────────────────────────────────────────

  async listCategories() {
    let response = await this.http.get('/account/category');
    return response.data;
  }

  async createCategory(name: string) {
    let response = await this.http.post('/account/category', { name });
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.http.get('/account/webhook');
    return response.data;
  }

  async createWebhook(url: string) {
    let response = await this.http.put('/account/webhook', { url });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.http.delete('/account/webhook', { data: { id: webhookId } });
    return response.data;
  }

  async getWebhookSample() {
    let response = await this.http.get('/account/webhook/sample');
    return response.data;
  }
}
