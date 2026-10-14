import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface BasinForm {
  id: number;
  uuid: string;
  name: string;
  enabled: boolean;
  endpoint_url: string;
  project_id: number | null;
  redirect_url: string | null;
  notification_emails: string | null;
  notify_email_subject: string | null;
  notification_frequency: string | null;
  honeypot_field: string | null;
  captcha_provider: string | null;
  ajax: boolean;
  use_ajax?: boolean;
  force_recaptcha?: boolean;
  force_hcaptcha?: boolean;
  force_turnstile?: boolean;
  submission_count: number;
  inbox_count?: number;
  trash_count?: number;
  spam_count: number;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface BasinSubmission {
  id: number;
  form_id: number;
  email: string | null;
  spam: boolean;
  read: boolean;
  trash: boolean;
  spam_reason: string | null;
  webhook_sent_at: string | null;
  ip: string | null;
  referrer: string | null;
  user_agent: string | null;
  payload_params: Record<string, unknown>;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface BasinProject {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface BasinDomain {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface BasinFormWebhook {
  failure_count?: number;
  last_failure_at?: string | null;
  id: number;
  form_id: number;
  name: string;
  url: string;
  format: string;
  trigger_when_spam: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(opts: { token: string }) {
    if (!opts.token.trim()) {
      throw createApiServiceError('Provide your Basin account API key.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://usebasin.com/api/v1',
      timeout: 30_000,
      authHeader: { value: `Token ${opts.token.trim()}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Basin',
          reason: 'basin_api_request_failed'
        })
    });
  }

  private validateId(id: number, label: string) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw createApiServiceError(`${label} must be a positive whole number.`);
    }
    return id;
  }

  private refireResult(data: unknown): { success: boolean; message: string } {
    if (
      !isApiErrorRecord(data) ||
      typeof data.success !== 'boolean' ||
      typeof data.message !== 'string'
    ) {
      throw createApiServiceError('Basin returned an unexpected webhook re-fire response.', {
        reason: 'basin_invalid_response'
      });
    }
    if (!data.success) {
      throw createApiServiceError(`Basin could not queue the webhooks: ${data.message}`, {
        reason: 'basin_webhook_refire_failed'
      });
    }
    return { success: data.success, message: data.message };
  }

  private requireUpdate(data: Record<string, unknown>) {
    if (Object.keys(data).length === 0) {
      throw createApiServiceError('Provide at least one setting to update.');
    }
  }

  private validatePage(page?: number) {
    if (page !== undefined) this.validateId(page, 'Page');
  }

  private record<T extends { id: number }>(data: unknown, resource: string): T {
    if (
      !isApiErrorRecord(data) ||
      typeof data.id !== 'number' ||
      !Number.isSafeInteger(data.id) ||
      data.id <= 0
    ) {
      throw createApiServiceError(`Basin returned an unexpected ${resource} response.`, {
        reason: 'basin_invalid_response'
      });
    }
    return data as T;
  }

  private form(response: unknown): BasinForm {
    let data = this.record<BasinForm>(response, 'form');
    return {
      ...data,
      endpoint_url:
        data.endpoint_url ??
        (data.uuid ? `https://usebasin.com/f/${encodeURIComponent(data.uuid)}` : ''),
      ajax: data.use_ajax ?? data.ajax ?? false,
      captcha_provider:
        data.captcha_provider ??
        (data.force_turnstile
          ? 'turnstile'
          : data.force_hcaptcha
            ? 'hcaptcha'
            : data.force_recaptcha
              ? 'recaptcha'
              : null),
      submission_count:
        data.submission_count ??
        (data.inbox_count ?? 0) + (data.spam_count ?? 0) + (data.trash_count ?? 0)
    };
  }

  private list<T>(data: unknown, resource: string): T[] {
    let items = Array.isArray(data)
      ? data
      : isApiErrorRecord(data)
        ? (data.items ?? data[resource])
        : undefined;

    if (
      !Array.isArray(items) ||
      !items.every(
        item =>
          isApiErrorRecord(item) &&
          typeof item.id === 'number' &&
          Number.isSafeInteger(item.id) &&
          item.id > 0
      )
    ) {
      throw createApiServiceError(`Basin returned an unexpected ${resource} list response.`, {
        reason: 'basin_invalid_response'
      });
    }
    return items as T[];
  }

  // ---- Forms ----

  async listForms(params?: { page?: number; query?: string }): Promise<BasinForm[]> {
    this.validatePage(params?.page);
    let res = await this.axios.get('/forms', { params });
    return this.list<BasinForm>(res.data, 'forms').map(form => this.form(form));
  }

  async getForm(formId: number): Promise<BasinForm> {
    let res = await this.axios.get(`/forms/${this.validateId(formId, 'Form ID')}`);
    return this.form(res.data);
  }

  async createForm(data: {
    name: string;
    timezone?: string;
    notification_emails?: string;
    project_id?: number;
    redirect_url?: string;
    honeypot_field?: string;
    ajax?: boolean;
  }): Promise<BasinForm> {
    if (data.project_id !== undefined) this.validateId(data.project_id, 'Project ID');
    let { ajax, ...settings } = data;
    let res = await this.axios.post('/forms', { form: { ...settings, use_ajax: ajax } });
    return this.form(res.data);
  }

  async updateForm(formId: number, data: Record<string, unknown>): Promise<BasinForm> {
    if (typeof data.project_id === 'number') this.validateId(data.project_id, 'Project ID');
    this.requireUpdate(data);
    let res = await this.axios.put(`/forms/${this.validateId(formId, 'Form ID')}`, {
      form: data
    });
    return this.form(res.data);
  }

  async deleteForm(formId: number): Promise<BasinForm> {
    let res = await this.axios.delete(`/forms/${this.validateId(formId, 'Form ID')}`);
    return this.form(res.data);
  }

  // ---- Submissions ----

  async listSubmissions(params?: {
    form_id?: number;
    filter_by?: string;
    query?: string;
    order_by?: string;
    date_range?: string;
    page?: number;
  }): Promise<BasinSubmission[]> {
    this.validatePage(params?.page);
    if (params?.form_id !== undefined) this.validateId(params.form_id, 'Form ID');
    let res = await this.axios.get('/submissions', { params });
    return this.list<BasinSubmission>(res.data, 'submissions');
  }

  async getSubmission(submissionId: number): Promise<BasinSubmission> {
    let res = await this.axios.get(
      `/submissions/${this.validateId(submissionId, 'Submission ID')}`
    );
    return this.record<BasinSubmission>(res.data, 'submission');
  }

  async updateSubmission(
    submissionId: number,
    data: {
      spam?: boolean;
      read?: boolean;
      trash?: boolean;
    }
  ): Promise<BasinSubmission> {
    this.requireUpdate(data);
    let res = await this.axios.patch(
      `/submissions/${this.validateId(submissionId, 'Submission ID')}`,
      { submission: data }
    );
    return this.record<BasinSubmission>(res.data, 'submission');
  }

  async deleteSubmission(submissionId: number): Promise<unknown> {
    let res = await this.axios.delete(
      `/submissions/${this.validateId(submissionId, 'Submission ID')}`
    );
    return res.data;
  }

  async refireWebhooksForSubmission(
    submissionId: number
  ): Promise<{ success: boolean; message: string }> {
    let res = await this.axios.post(
      `/submissions/${this.validateId(submissionId, 'Submission ID')}/refire_webhooks`
    );
    return this.refireResult(res.data);
  }

  async refireWebhooksForSubmissions(
    submissionIds: number[]
  ): Promise<{ success: boolean; message: string }> {
    if (submissionIds.length === 0) {
      throw createApiServiceError('Provide at least one submission ID.');
    }
    for (let id of submissionIds) this.validateId(id, 'Submission ID');
    let res = await this.axios.post('/submissions/refire_webhooks', {
      submission_ids: submissionIds
    });
    return this.refireResult(res.data);
  }

  // ---- Projects ----

  async listProjects(params?: { page?: number; query?: string }): Promise<BasinProject[]> {
    this.validatePage(params?.page);
    let res = await this.axios.get('/projects', { params });
    return this.list<BasinProject>(res.data, 'projects');
  }

  async getProject(projectId: number): Promise<BasinProject> {
    let res = await this.axios.get(`/projects/${this.validateId(projectId, 'Project ID')}`);
    return this.record<BasinProject>(res.data, 'project');
  }

  async createProject(data: { name: string }): Promise<BasinProject> {
    let res = await this.axios.post('/projects', { project: data });
    return this.record<BasinProject>(res.data, 'project');
  }

  async updateProject(projectId: number, data: { name: string }): Promise<BasinProject> {
    let res = await this.axios.put(`/projects/${this.validateId(projectId, 'Project ID')}`, {
      project: data
    });
    return this.record<BasinProject>(res.data, 'project');
  }

  async deleteProject(projectId: number): Promise<BasinProject> {
    let res = await this.axios.delete(`/projects/${this.validateId(projectId, 'Project ID')}`);
    return this.record<BasinProject>(res.data, 'project');
  }

  // ---- Domains ----

  async listDomains(params?: { page?: number; query?: string }): Promise<BasinDomain[]> {
    this.validatePage(params?.page);
    let res = await this.axios.get('/domains', { params });
    return this.list<BasinDomain>(res.data, 'domains');
  }

  // ---- Form Webhooks ----

  async listFormWebhooks(params?: {
    page?: number;
    query?: string;
  }): Promise<BasinFormWebhook[]> {
    this.validatePage(params?.page);
    let res = await this.axios.get('/form_webhooks', { params });
    return this.list<BasinFormWebhook>(res.data, 'form_webhooks');
  }

  async getFormWebhook(webhookId: number): Promise<BasinFormWebhook> {
    let res = await this.axios.get(
      `/form_webhooks/${this.validateId(webhookId, 'Webhook ID')}`
    );
    return this.record<BasinFormWebhook>(res.data, 'webhook');
  }

  async createFormWebhook(data: {
    form_id: number;
    name: string;
    url: string;
    format?: string;
    trigger_when_spam?: boolean;
    enabled?: boolean;
  }): Promise<BasinFormWebhook> {
    this.validateId(data.form_id, 'Form ID');
    let res = await this.axios.post('/form_webhooks', { form_webhook: data });
    return this.record<BasinFormWebhook>(res.data, 'webhook');
  }

  async updateFormWebhook(
    webhookId: number,
    data: Record<string, unknown>
  ): Promise<BasinFormWebhook> {
    this.requireUpdate(data);
    let res = await this.axios.put(
      `/form_webhooks/${this.validateId(webhookId, 'Webhook ID')}`,
      { form_webhook: data }
    );
    return this.record<BasinFormWebhook>(res.data, 'webhook');
  }

  async deleteFormWebhook(webhookId: number): Promise<unknown> {
    let res = await this.axios.delete(
      `/form_webhooks/${this.validateId(webhookId, 'Webhook ID')}`
    );
    return res.data;
  }

  // ---- Form Views ----

  async listFormViews(params?: { page?: number; query?: string }): Promise<any> {
    let res = await this.axios.get('/form_views', { params });
    return res.data;
  }

  async getFormView(formViewId: number): Promise<any> {
    let res = await this.axios.get(`/form_views/${formViewId}`);
    return res.data;
  }
}
