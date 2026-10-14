import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';

interface ApiForm {
  directory: string;
  name: string;
  description?: string | null;
  state: string;
  publish?: { link?: string; embed_code?: string };
  stats?: {
    filesSize?: number;
    resultsCount?: number;
    files_size?: number;
    results_count?: number;
  };
}

interface ApiItem {
  id: string;
  position?: number;
  label?: string;
  children?: Array<string | ApiItem>;
}

interface ApiResult {
  id: string | number;
  date_start?: string;
  date_finish?: string;
  date_update?: string;
  result_status?: string;
  user_ip?: string;
  user_browser?: string;
  user_device?: string;
  user_referrer?: string;
  login_username?: string | null;
  login_email?: string | null;
  payment_status?: string | null;
  payment_amount?: string | number | null;
  user?: { ip?: string; browser?: string; device?: string; referrer?: string };
  login?: { username?: string; email?: string };
  payment?: { status?: string; amount?: string | number };
  items?: Array<{
    id: string;
    position?: number;
    value?: string;
    values?: FormsiteChoice[];
  }>;
}

interface ApiWebhook {
  url: string;
  event: string;
  handshake_key?: string | null;
}

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
  childItemIds?: string[];
}

export interface FormsiteChoice {
  value: string;
  position?: number;
  other?: string;
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
  items: Array<{
    itemId: string;
    value: string;
    position?: number;
    values?: FormsiteChoice[];
  }>;
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; server: string; userDir: string }) {
    let server = config.server.trim();
    let userDir = config.userDir.trim();
    if (!/^fs\d+$/.test(server) || !userDir || !config.token.trim()) {
      throw createApiServiceError(
        'Provide an API token, account directory, and Formsite server prefix such as fs1.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${server}.formsite.com/api/v2/${encodeURIComponent(userDir)}`,
      timeout: 30_000,
      authHeader: { value: `bearer ${config.token.trim()}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Formsite',
          reason: 'formsite_api_request_failed'
        })
    });
  }

  // ---- Forms ----

  async listForms(): Promise<FormsiteForm[]> {
    let response = await this.axios.get<{ forms: ApiForm[] }>('/forms');
    let forms = response.data.forms || [];
    return forms.map(form => this.normalizeForm(form));
  }

  async getForm(formDir: string): Promise<FormsiteForm> {
    let response = await this.axios.get<{ forms: ApiForm[] }>(this.formPath(formDir));
    let forms = response.data.forms || [];
    if (!forms[0]) {
      throw createApiServiceError('The requested Formsite form was not found.', {
        upstreamStatus: 404
      });
    }
    return this.normalizeForm(forms[0]);
  }

  // ---- Items ----

  async getFormItems(formDir: string, resultsLabels?: string): Promise<FormsiteItem[]> {
    let params: Record<string, string> = {};
    if (resultsLabels) params.results_labels = resultsLabels;

    let response = await this.axios.get<{ items: ApiItem[] }>(
      `${this.formPath(formDir)}/items`,
      { params }
    );
    let items = response.data.items || [];
    return items.map(item => this.normalizeItem(item));
  }

  // ---- Results ----

  async getFormResults(
    formDir: string,
    queryParams?: ResultsParams
  ): Promise<{
    results: FormsiteResult[];
    pagination: PaginationInfo;
  }> {
    if (
      queryParams?.limit !== undefined &&
      (!Number.isInteger(queryParams.limit) ||
        queryParams.limit < 1 ||
        queryParams.limit > 500)
    ) {
      throw createApiServiceError('limit must be a whole number between 1 and 500.');
    }
    if (
      queryParams?.page !== undefined &&
      (!Number.isInteger(queryParams.page) || queryParams.page < 1)
    ) {
      throw createApiServiceError('page must be a positive whole number.');
    }
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

    let response = await this.axios.get<{ results: ApiResult[] }>(
      `${this.formPath(formDir)}/results`,
      { params }
    );

    let paginationValue = (name: string, fallback: number): number => {
      let value = Number(getResponseHeaderValue(response.headers, name));
      return Number.isInteger(value) && value > 0 ? value : fallback;
    };
    let pagination: PaginationInfo = {
      limit: paginationValue('pagination-limit', queryParams?.limit ?? 100),
      pageCurrent: paginationValue('pagination-page-current', queryParams?.page ?? 1),
      pageLast: paginationValue('pagination-page-last', queryParams?.page ?? 1)
    };

    let results = response.data.results || [];
    return {
      results: results.map(result => this.normalizeResult(result)),
      pagination
    };
  }

  async getFormResult(
    formDir: string,
    resultId: string,
    resultsView?: string
  ): Promise<FormsiteResult> {
    if (!resultId.trim()) {
      throw createApiServiceError('resultId is required.');
    }
    let { results } = await this.getFormResults(formDir, {
      searchEquals: { result_id: resultId },
      limit: 1,
      resultsView
    });
    if (!results[0]) {
      throw createApiServiceError('The requested Formsite result was not found.', {
        upstreamStatus: 404
      });
    }
    return results[0];
  }

  // ---- Webhooks ----

  async listWebhooks(formDir: string): Promise<FormsiteWebhook[]> {
    let response = await this.axios.get<{ webhooks: ApiWebhook[] }>(
      `${this.formPath(formDir)}/webhooks`
    );
    let webhooks = response.data.webhooks || [];
    return webhooks.map(webhook => this.normalizeWebhook(webhook));
  }

  async createOrUpdateWebhook(
    formDir: string,
    params: {
      url: string;
      event?: string;
      handshakeKey?: string;
    }
  ): Promise<FormsiteWebhook> {
    let query = pickDefined({
      url: params.url,
      event: params.event || 'result_completed',
      handshake_key: params.handshakeKey
    });

    let response = await this.axios.post<{ webhook: ApiWebhook }>(
      `${this.formPath(formDir)}/webhooks`,
      undefined,
      { params: query }
    );
    let webhook = response.data.webhook;
    if (!webhook) {
      throw createApiServiceError('Formsite did not return the created or updated webhook.');
    }
    return this.normalizeWebhook(webhook);
  }

  async deleteWebhook(formDir: string, url: string): Promise<void> {
    await this.axios.delete(`${this.formPath(formDir)}/webhooks`, {
      params: { url }
    });
  }

  private formPath(formDir: string): string {
    if (!formDir.trim()) {
      throw createApiServiceError(
        'formDir is required. Call list_forms to discover form directories.'
      );
    }
    return `/forms/${encodeURIComponent(formDir)}`;
  }

  private normalizeForm(data: ApiForm): FormsiteForm {
    return {
      formDir: data.directory || '',
      name: data.name || '',
      description: data.description || '',
      state: data.state || '',
      publishUrl: data.publish?.link || '',
      embedCode: data.publish?.embed_code || '',
      filesSize: data.stats?.filesSize ?? data.stats?.files_size ?? 0,
      resultsCount: data.stats?.resultsCount ?? data.stats?.results_count ?? 0
    };
  }

  private normalizeItem(data: ApiItem): FormsiteItem {
    let item: FormsiteItem = {
      itemId: data.id || '',
      position: data.position || 0,
      label: data.label || ''
    };
    if (data.children && Array.isArray(data.children)) {
      item.childItemIds = data.children.map(child =>
        typeof child === 'string' ? child : child.id
      );
      item.children = data.children.map(child =>
        this.normalizeItem(typeof child === 'string' ? { id: child } : child)
      );
    }
    return item;
  }

  private normalizeResult(data: ApiResult): FormsiteResult {
    let paymentAmount = data.payment_amount ?? data.payment?.amount;
    let items: FormsiteResult['items'] = [];
    if (data.items && Array.isArray(data.items)) {
      items = data.items.map(item => ({
        itemId: item.id || '',
        value: item.value ?? item.values?.map(choice => choice.value).join(', ') ?? '',
        position: item.position,
        values: item.values
      }));
    }

    return {
      resultId: String(data.id),
      dateStart: data.date_start || '',
      dateFinish: data.date_finish || '',
      dateUpdate: data.date_update || '',
      userIp: data.user_ip ?? data.user?.ip ?? '',
      userBrowser: data.user_browser ?? data.user?.browser ?? '',
      userDevice: data.user_device ?? data.user?.device ?? '',
      userReferrer: data.user_referrer ?? data.user?.referrer ?? '',
      resultStatus: data.result_status || '',
      loginUsername: data.login_username ?? data.login?.username,
      loginEmail: data.login_email ?? data.login?.email,
      paymentStatus: data.payment_status ?? data.payment?.status,
      paymentAmount: paymentAmount != null ? String(paymentAmount) : undefined,
      items
    };
  }

  private normalizeWebhook(data: ApiWebhook): FormsiteWebhook {
    return {
      url: data.url || '',
      event: data.event || '',
      handshakeKey: data.handshake_key ?? undefined
    };
  }
}
