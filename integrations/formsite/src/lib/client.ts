import { createAxios } from 'slates';

export interface FormsiteForm {
  formDir: string;
  name: string;
  description: string;
  state: string;
  publishUrl: string;
  embedCode: string;
  filesSize: number;
  resultsCount: number;
}

export interface FormsiteItem {
  itemId: string;
  position: number;
  label: string;
  children?: FormsiteItem[];
}

export interface FormsiteResult {
  resultId: string;
  dateStart: string;
  dateFinish: string;
  dateUpdate: string;
  userIp: string;
  userBrowser: string;
  userDevice: string;
  userReferrer: string;
  resultStatus: string;
  loginUsername?: string;
  loginEmail?: string;
  paymentStatus?: string;
  paymentAmount?: string;
  items: Array<{ itemId: string; value: string }>;
}

export interface FormsiteWebhook {
  url: string;
  event: string;
  handshakeKey?: string;
}

export interface ResultsParams {
  afterDate?: string;
  beforeDate?: string;
  afterId?: string;
  beforeId?: string;
  resultId?: string;
  limit?: number;
  page?: number;
  sortId?: string;
  sortDirection?: string;
  resultsView?: string;
  searchEquals?: Record<string, string>;
  searchContains?: Record<string, string>;
  searchBegins?: Record<string, string>;
  searchEnds?: Record<string, string>;
  searchMethod?: string;
}

export interface PaginationInfo {
  limit: number;
  pageCurrent: number;
  pageLast: number;
}

export class FormsiteClient {
  private axios: ReturnType<typeof createAxios>;
  private userDir: string;

  constructor(config: { token: string; server: string; userDir: string }) {
    this.userDir = config.userDir;
    this.axios = createAxios({
      baseURL: `https://${config.server}.formsite.com/api/v2/${config.userDir}`,
      headers: {
        Authorization: `bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Forms ----

  async listForms(): Promise<FormsiteForm[]> {
    let response = await this.axios.get('/forms');
    let forms = response.data.forms || [];
    return forms.map((f: any) => this.normalizeForm(f));
  }

  async getForm(formDir: string): Promise<FormsiteForm> {
    let response = await this.axios.get(`/forms/${formDir}`);
    let forms = response.data.forms || [];
    return this.normalizeForm(forms[0] || response.data);
  }

  // ---- Items ----

  async getFormItems(formDir: string, resultsLabels?: string): Promise<FormsiteItem[]> {
    let params: Record<string, string> = {};
    if (resultsLabels) params.results_labels = resultsLabels;

    let response = await this.axios.get(`/forms/${formDir}/items`, { params });
    let items = response.data.items || [];
    return items.map((item: any) => this.normalizeItem(item));
  }

  // ---- Results ----

  async getFormResults(
    formDir: string,
    queryParams?: ResultsParams
  ): Promise<{
    results: FormsiteResult[];
    pagination: PaginationInfo;
  }> {
    let params: Record<string, string> = {};

    if (queryParams?.afterDate) params.after_date = queryParams.afterDate;
    if (queryParams?.beforeDate) params.before_date = queryParams.beforeDate;
    if (queryParams?.afterId) params.after_id = queryParams.afterId;
    if (queryParams?.beforeId) params.before_id = queryParams.beforeId;
    if (queryParams?.limit !== undefined) params.limit = String(queryParams.limit);
    if (queryParams?.page !== undefined) params.page = String(queryParams.page);
    if (queryParams?.sortId) params.sort_id = queryParams.sortId;
    if (queryParams?.sortDirection) params.sort_direction = queryParams.sortDirection;
    if (queryParams?.resultsView) params.results_view = queryParams.resultsView;
    if (queryParams?.searchMethod) params.search_method = queryParams.searchMethod;

    if (queryParams?.searchEquals) {
      for (let [key, value] of Object.entries(queryParams.searchEquals)) {
        params[`search_equals[${key}]`] = value;
      }
    }
    if (queryParams?.searchContains) {
      for (let [key, value] of Object.entries(queryParams.searchContains)) {
        params[`search_contains[${key}]`] = value;
      }
    }
    if (queryParams?.searchBegins) {
      for (let [key, value] of Object.entries(queryParams.searchBegins)) {
        params[`search_begins[${key}]`] = value;
      }
    }
    if (queryParams?.searchEnds) {
      for (let [key, value] of Object.entries(queryParams.searchEnds)) {
        params[`search_ends[${key}]`] = value;
      }
    }

    let response = await this.axios.get(`/forms/${formDir}/results`, { params });

    let headers = response.headers || {};
    let getHeaderValue = (name: string, fallback: string): string => {
      let value = headers[name];
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      if (Array.isArray(value)) return value[0] || fallback;
      return fallback;
    };
    let pagination: PaginationInfo = {
      limit: Number.parseInt(getHeaderValue('pagination-limit', '100'), 10),
      pageCurrent: Number.parseInt(getHeaderValue('pagination-page-current', '1'), 10),
      pageLast: Number.parseInt(getHeaderValue('pagination-page-last', '1'), 10)
    };

    let results = response.data.results || [];
    return {
      results: results.map((r: any) => this.normalizeResult(r)),
      pagination
    };
  }

  // ---- Webhooks ----

  async listWebhooks(formDir: string): Promise<FormsiteWebhook[]> {
    let response = await this.axios.get(`/forms/${formDir}/webhooks`);
    let webhooks = response.data.webhooks || [];
    return webhooks.map((w: any) => this.normalizeWebhook(w));
  }

  async createOrUpdateWebhook(
    formDir: string,
    params: {
      url: string;
      event?: string;
      handshakeKey?: string;
    }
  ): Promise<FormsiteWebhook> {
    let body: Record<string, string> = {
      url: params.url,
      event: params.event || 'result_completed'
    };
    if (params.handshakeKey) body.handshake_key = params.handshakeKey;

    let response = await this.axios.post(`/forms/${formDir}/webhooks`, body);
    let webhook = response.data.webhook || response.data;
    return this.normalizeWebhook(webhook);
  }

  async deleteWebhook(formDir: string, url: string): Promise<void> {
    await this.axios.delete(`/forms/${formDir}/webhooks`, {
      data: { url }
    });
  }

  // ---- Normalizers ----

  private normalizeForm(data: any): FormsiteForm {
    return {
      formDir: data.directory || '',
      name: data.name || '',
      description: data.description || '',
      state: data.state || '',
      publishUrl: data.publish?.link || '',
      embedCode: data.publish?.embed_code || '',
      filesSize: data.stats?.files_size || 0,
      resultsCount: data.stats?.results_count || 0
    };
  }

  private normalizeItem(data: any): FormsiteItem {
    let item: FormsiteItem = {
      itemId: data.id || '',
      position: data.position || 0,
      label: data.label || ''
    };
    if (data.children && Array.isArray(data.children)) {
      item.children = data.children.map((c: any) => this.normalizeItem(c));
    }
    return item;
  }

  private normalizeResult(data: any): FormsiteResult {
    let items: Array<{ itemId: string; value: string }> = [];
    if (data.items && Array.isArray(data.items)) {
      items = data.items.map((item: any) => ({
        itemId: item.id || '',
        value: item.value || ''
      }));
    }

    return {
      resultId: data.id ? String(data.id) : '',
      dateStart: data.date_start || '',
      dateFinish: data.date_finish || '',
      dateUpdate: data.date_update || '',
      userIp: data.user?.ip || '',
      userBrowser: data.user?.browser || '',
      userDevice: data.user?.device || '',
      userReferrer: data.user?.referrer || '',
      resultStatus: data.result_status || '',
      loginUsername: data.login?.username,
      loginEmail: data.login?.email,
      paymentStatus: data.payment?.status,
      paymentAmount: data.payment?.amount,
      items
    };
  }

  private normalizeWebhook(data: any): FormsiteWebhook {
    return {
      url: data.url || '',
      event: data.event || '',
      handshakeKey: data.handshake_key
    };
  }
}
