import { createAxios } from '@slates/provider';
import type { AxiosResponse } from 'axios';
import { jotformApiError, jotformApiResponseError } from './errors';

export interface JotFormClientConfig {
  token: string;
  apiDomain: string;
}

export interface ListParams {
  offset?: number;
  limit?: number;
  filter?: Record<string, any>;
  orderby?: string;
  direction?: 'ASC' | 'DESC';
}

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let appendFormValue = (body: URLSearchParams, key: string, value: unknown) => {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFormValue(body, `${key}[${index}]`, item));
    return;
  }

  if (value instanceof Date) {
    body.append(key, value.toISOString());
    return;
  }

  if (typeof value === 'object') {
    for (let [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      appendFormValue(body, `${key}[${nestedKey}]`, nestedValue);
    }
    return;
  }

  body.append(key, String(value));
};

let toFormBody = (payload: Record<string, unknown>) => {
  let body = new URLSearchParams();
  for (let [key, value] of Object.entries(payload)) {
    appendFormValue(body, key, value);
  }
  return body;
};

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: JotFormClientConfig) {
    this.http = createAxios({
      baseURL: config.apiDomain,
      headers: {
        APIKEY: config.token
      }
    });
  }

  // ── User ──────────────────────────────────────────────

  private async requestContent<T = any>(
    operation: string,
    request: () => Promise<AxiosResponse>
  ): Promise<T> {
    try {
      let response = await request();
      let data = response.data;

      if (isRecord(data) && 'responseCode' in data) {
        let responseCode = Number(data.responseCode);
        if (!Number.isNaN(responseCode) && (responseCode < 200 || responseCode >= 300)) {
          throw jotformApiResponseError(operation, data);
        }
      }

      if (isRecord(data) && 'content' in data) {
        return data.content as T;
      }

      return data as T;
    } catch (error) {
      throw jotformApiError(error, operation);
    }
  }

  private async postForm<T = any>(
    path: string,
    payload: Record<string, unknown>,
    operation: string
  ): Promise<T> {
    return await this.requestContent<T>(operation, () =>
      this.http.post(path, toFormBody(payload), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async getUser(): Promise<any> {
    return await this.requestContent('get user', () => this.http.get('/user'));
  }

  async getUserUsage(): Promise<any> {
    return await this.requestContent('get user usage', () => this.http.get('/user/usage'));
  }

  async getUserSubusers(): Promise<any[]> {
    return await this.requestContent('list user subusers', () =>
      this.http.get('/user/subusers')
    );
  }

  // ── Forms ─────────────────────────────────────────────

  async listForms(params?: ListParams): Promise<any[]> {
    return await this.requestContent('list forms', () =>
      this.http.get('/user/forms', {
        params: this.buildListParams(params)
      })
    );
  }

  async getForm(formId: string): Promise<any> {
    return await this.requestContent('get form', () => this.http.get(`/form/${formId}`));
  }

  async createForm(formData: {
    questions?: Record<string, any>;
    properties?: Record<string, any>;
    emails?: Record<string, any>;
  }): Promise<any> {
    return await this.postForm(
      '/form',
      {
        ...(formData.questions ? { questions: formData.questions } : {}),
        ...(formData.properties ? { properties: formData.properties } : {}),
        ...(formData.emails ? { emails: formData.emails } : {})
      },
      'create form'
    );
  }

  async deleteForm(formId: string): Promise<any> {
    return await this.requestContent('delete form', () => this.http.delete(`/form/${formId}`));
  }

  async cloneForm(formId: string): Promise<any> {
    return await this.requestContent('clone form', () =>
      this.http.post(`/form/${formId}/clone`)
    );
  }

  // ── Form Properties ───────────────────────────────────

  async getFormProperties(formId: string): Promise<any> {
    return await this.requestContent('get form properties', () =>
      this.http.get(`/form/${formId}/properties`)
    );
  }

  async updateFormProperties(formId: string, properties: Record<string, any>): Promise<any> {
    return await this.postForm(
      `/form/${formId}/properties`,
      { properties },
      'update form properties'
    );
  }

  // ── Form Questions ────────────────────────────────────

  async getFormQuestions(formId: string): Promise<any> {
    return await this.requestContent('list form questions', () =>
      this.http.get(`/form/${formId}/questions`)
    );
  }

  async getFormQuestion(formId: string, questionId: string): Promise<any> {
    return await this.requestContent('get form question', () =>
      this.http.get(`/form/${formId}/question/${questionId}`)
    );
  }

  async addFormQuestion(formId: string, question: Record<string, any>): Promise<any> {
    return await this.postForm(`/form/${formId}/questions`, { question }, 'add form question');
  }

  async updateFormQuestion(
    formId: string,
    questionId: string,
    question: Record<string, any>
  ): Promise<any> {
    return await this.postForm(
      `/form/${formId}/question/${questionId}`,
      { question },
      'update form question'
    );
  }

  async deleteFormQuestion(formId: string, questionId: string): Promise<any> {
    return await this.requestContent('delete form question', () =>
      this.http.delete(`/form/${formId}/question/${questionId}`)
    );
  }

  // ── Submissions ───────────────────────────────────────

  async listAllSubmissions(params?: ListParams): Promise<any[]> {
    return await this.requestContent('list all submissions', () =>
      this.http.get('/user/submissions', {
        params: this.buildListParams(params)
      })
    );
  }

  async listFormSubmissions(formId: string, params?: ListParams): Promise<any[]> {
    return await this.requestContent('list form submissions', () =>
      this.http.get(`/form/${formId}/submissions`, {
        params: this.buildListParams(params)
      })
    );
  }

  async getSubmission(submissionId: string): Promise<any> {
    return await this.requestContent('get submission', () =>
      this.http.get(`/submission/${submissionId}`)
    );
  }

  async createSubmission(formId: string, answers: Record<string, any>): Promise<any> {
    return await this.postForm(
      `/form/${formId}/submissions`,
      { submission: answers },
      'create submission'
    );
  }

  async updateSubmission(submissionId: string, answers: Record<string, any>): Promise<any> {
    return await this.postForm(
      `/submission/${submissionId}`,
      { submission: answers },
      'update submission'
    );
  }

  async deleteSubmission(submissionId: string): Promise<any> {
    return await this.requestContent('delete submission', () =>
      this.http.delete(`/submission/${submissionId}`)
    );
  }

  // ── Folders ───────────────────────────────────────────

  async listFolders(): Promise<any> {
    return await this.requestContent('list folders', () => this.http.get('/user/folders'));
  }

  async getFolder(folderId: string): Promise<any> {
    return await this.requestContent('get folder', () => this.http.get(`/folder/${folderId}`));
  }

  async createFolder(name: string, parent?: string): Promise<any> {
    return await this.postForm('/folder', { name, parent }, 'create folder');
  }

  async deleteFolder(folderId: string): Promise<any> {
    return await this.requestContent('delete folder', () =>
      this.http.delete(`/folder/${folderId}`)
    );
  }

  // ── Reports ───────────────────────────────────────────

  async listReports(): Promise<any[]> {
    return await this.requestContent('list reports', () => this.http.get('/user/reports'));
  }

  async listFormReports(formId: string): Promise<any[]> {
    return await this.requestContent('list form reports', () =>
      this.http.get(`/form/${formId}/reports`)
    );
  }

  async getReport(reportId: string): Promise<any> {
    return await this.requestContent('get report', () => this.http.get(`/report/${reportId}`));
  }

  async createFormReport(
    formId: string,
    report: { title: string; listType: string; fields?: string }
  ): Promise<any> {
    return await this.postForm(
      `/form/${formId}/reports`,
      {
        title: report.title,
        list_type: report.listType,
        ...(report.fields ? { fields: report.fields } : {})
      },
      'create form report'
    );
  }

  async deleteReport(reportId: string): Promise<any> {
    return await this.requestContent('delete report', () =>
      this.http.delete(`/report/${reportId}`)
    );
  }

  // ── Files ─────────────────────────────────────────────

  async listFormFiles(formId: string, params?: ListParams): Promise<any[]> {
    return await this.requestContent('list form files', () =>
      this.http.get(`/form/${formId}/files`, {
        params: this.buildListParams(params)
      })
    );
  }

  // ── Webhooks ──────────────────────────────────────────

  async listFormWebhooks(formId: string): Promise<any> {
    return await this.requestContent('list form webhooks', () =>
      this.http.get(`/form/${formId}/webhooks`)
    );
  }

  async createFormWebhook(formId: string, webhookUrl: string): Promise<any> {
    return await this.postForm(
      `/form/${formId}/webhooks`,
      { webhookURL: webhookUrl },
      'create form webhook'
    );
  }

  async deleteFormWebhook(formId: string, webhookId: string): Promise<any> {
    return await this.requestContent('delete form webhook', () =>
      this.http.delete(`/form/${formId}/webhooks/${webhookId}`)
    );
  }

  // ── Helpers ───────────────────────────────────────────

  private buildListParams(params?: ListParams): Record<string, string | number> {
    let result: Record<string, string | number> = {};
    if (params?.offset !== undefined) result.offset = params.offset;
    if (params?.limit !== undefined) result.limit = params.limit;
    if (params?.orderby) result.orderby = params.orderby;
    if (params?.direction) result.direction = params.direction;
    if (params?.filter) {
      result.filter = JSON.stringify(params.filter);
    }
    return result;
  }
}
