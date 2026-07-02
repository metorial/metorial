import { createAxios } from 'slates';

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
  submission_count: number;
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
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://usebasin.com/api/v1',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Forms ----

  async listForms(params?: { page?: number; query?: string }): Promise<any> {
    let res = await this.axios.get('/forms', { params });
    return res.data;
  }

  async getForm(formId: number): Promise<BasinForm> {
    let res = await this.axios.get(`/forms/${formId}`);
    return res.data;
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
    let res = await this.axios.post('/forms', { form: data });
    return res.data;
  }

  async updateForm(formId: number, data: Record<string, unknown>): Promise<BasinForm> {
    let res = await this.axios.put(`/forms/${formId}`, { form: data });
    return res.data;
  }

  async deleteForm(formId: number): Promise<BasinForm> {
    let res = await this.axios.delete(`/forms/${formId}`);
    return res.data;
  }

  // ---- Submissions ----

  async listSubmissions(params?: {
    form_id?: number;
    filter_by?: string;
    query?: string;
    order_by?: string;
    date_range?: string;
    page?: number;
  }): Promise<any> {
    let res = await this.axios.get('/submissions', { params });
    return res.data;
  }

  async getSubmission(submissionId: number): Promise<BasinSubmission> {
    let res = await this.axios.get(`/submissions/${submissionId}`);
    return res.data;
  }

  async updateSubmission(
    submissionId: number,
    data: {
      spam?: boolean;
      read?: boolean;
      trash?: boolean;
    }
  ): Promise<BasinSubmission> {
    let res = await this.axios.patch(`/submissions/${submissionId}`, { submission: data });
    return res.data;
  }

  async deleteSubmission(submissionId: number): Promise<any> {
    let res = await this.axios.delete(`/submissions/${submissionId}`);
    return res.data;
  }

  async refireWebhooksForSubmission(
    submissionId: number
  ): Promise<{ success: boolean; message: string }> {
    let res = await this.axios.post(`/submissions/${submissionId}/refire_webhooks`);
    return res.data;
  }

  async refireWebhooksForSubmissions(
    submissionIds: number[]
  ): Promise<{ success: boolean; message: string }> {
    let res = await this.axios.post('/submissions/refire_webhooks', {
      submission_ids: submissionIds
    });
    return res.data;
  }

  // ---- Projects ----

  async listProjects(params?: { page?: number; query?: string }): Promise<any> {
    let res = await this.axios.get('/projects', { params });
    return res.data;
  }

  async getProject(projectId: number): Promise<BasinProject> {
    let res = await this.axios.get(`/projects/${projectId}`);
    return res.data;
  }

  async createProject(data: { name: string }): Promise<BasinProject> {
    let res = await this.axios.post('/projects', { project: data });
    return res.data;
  }

  async updateProject(projectId: number, data: { name: string }): Promise<BasinProject> {
    let res = await this.axios.put(`/projects/${projectId}`, { project: data });
    return res.data;
  }

  async deleteProject(projectId: number): Promise<BasinProject> {
    let res = await this.axios.delete(`/projects/${projectId}`);
    return res.data;
  }

  // ---- Domains ----

  async listDomains(params?: { page?: number; query?: string }): Promise<any> {
    let res = await this.axios.get('/domains', { params });
    return res.data;
  }

  // ---- Form Webhooks ----

  async listFormWebhooks(params?: { page?: number; query?: string }): Promise<any> {
    let res = await this.axios.get('/form_webhooks', { params });
    return res.data;
  }

  async getFormWebhook(webhookId: number): Promise<BasinFormWebhook> {
    let res = await this.axios.get(`/form_webhooks/${webhookId}`);
    return res.data;
  }

  async createFormWebhook(data: {
    form_id: number;
    name: string;
    url: string;
    format?: string;
    trigger_when_spam?: boolean;
    enabled?: boolean;
  }): Promise<BasinFormWebhook> {
    let res = await this.axios.post('/form_webhooks', { form_webhook: data });
    return res.data;
  }

  async updateFormWebhook(
    webhookId: number,
    data: Record<string, unknown>
  ): Promise<BasinFormWebhook> {
    let res = await this.axios.put(`/form_webhooks/${webhookId}`, { form_webhook: data });
    return res.data;
  }

  async deleteFormWebhook(webhookId: number): Promise<any> {
    let res = await this.axios.delete(`/form_webhooks/${webhookId}`);
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
