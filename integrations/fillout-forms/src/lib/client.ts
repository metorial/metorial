import { createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';
import {
  formMetadataSchema,
  formSummarySchema,
  submissionListResponseSchema,
  submissionSchema
} from './types';
import { apiError, baseUrl, date, id, jsonValue, parse, privacy, text } from './validation';

export interface ClientConfig {
  token: string;
  baseUrl?: string;
}
export interface ListSubmissionsParams {
  limit?: number;
  offset?: number;
  afterDate?: string;
  beforeDate?: string;
  status?: 'finished' | 'in_progress';
  sort?: 'asc' | 'desc';
  search?: string;
  includeEditLink?: boolean;
  includePreview?: boolean;
}
export interface CreateSubmissionInput {
  questions: Array<{ id: string; value?: unknown }>;
  urlParameters?: Array<{ id: string; name?: string; value?: unknown }>;
  submissionTime?: string;
  lastUpdatedAt?: string;
  scheduling?: Array<{ id: string; value?: unknown }>;
  payments?: Array<{ id: string; value?: unknown }>;
  login?: { email: string };
}
export class Client {
  private axios;
  private token: string;
  constructor(config: ClientConfig) {
    this.token = text(config.token, 'Fillout credential');
    this.axios = createAxios({
      baseURL: `${baseUrl(config.baseUrl)}/v1/api`,
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      maxBodyLength: 16 * 1024 * 1024
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    operation: string,
    params?: Record<string, string>,
    data?: unknown
  ): Promise<unknown> {
    let response: { status: number; data: unknown };
    try {
      response = await this.axios.request({ method, url: path, params, data });
    } catch (error) {
      throw apiError(error, operation);
    }
    if (response.status !== 200)
      throw apiError({ response: { status: response.status } }, operation);
    return privacy(response.data, [this.token]);
  }
  async listForms() {
    return parse(
      z.array(formSummarySchema),
      await this.request('GET', '/forms', 'list forms'),
      'forms'
    );
  }
  async getForm(formId: string) {
    const form = parse(
      formMetadataSchema,
      await this.request('GET', `/forms/${id(formId, 'Form ID')}`, 'get form'),
      'form'
    );
    if (form.id !== formId)
      throw createApiServiceError(
        'The returned form ID does not match the requested form. No write was attempted.',
        { parent: {} }
      );
    return form;
  }
  async listSubmissions(formId: string, params: ListSubmissionsParams = {}) {
    const formPath = id(formId, 'Form ID');
    if (
      (params.limit !== undefined &&
        (!Number.isSafeInteger(params.limit) || params.limit < 1 || params.limit > 150)) ||
      (params.offset !== undefined &&
        (!Number.isSafeInteger(params.offset) || params.offset < 0))
    )
      throw createApiServiceError(
        'Use an integer limit from 1 to 150 and a nonnegative integer offset.',
        { parent: {} }
      );
    date(params.afterDate, 'afterDate');
    date(params.beforeDate, 'beforeDate');
    if (
      params.afterDate &&
      params.beforeDate &&
      Date.parse(params.afterDate) >= Date.parse(params.beforeDate)
    )
      throw createApiServiceError('afterDate must precede beforeDate.', { parent: {} });
    const query = Object.fromEntries(
      Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    );
    return parse(
      submissionListResponseSchema,
      await this.request('GET', `/forms/${formPath}/submissions`, 'list submissions', query),
      'submission list'
    );
  }
  async getSubmission(formId: string, submissionId: string, includeEditLink?: boolean) {
    const result = await this.request(
      'GET',
      `/forms/${id(formId, 'Form ID')}/submissions/${id(submissionId, 'Submission ID')}`,
      'get submission',
      includeEditLink === undefined ? undefined : { includeEditLink: String(includeEditLink) }
    );
    const wrapped = z.object({ submission: z.unknown() }).safeParse(result);
    const submission = parse(
      submissionSchema,
      wrapped.success ? wrapped.data.submission : result,
      'submission'
    );
    if (submission.submissionId !== submissionId)
      throw createApiServiceError(
        'The returned submission ID does not match the requested submission.',
        { parent: {} }
      );
    return submission;
  }
  async createSubmissions(formId: string, submissions: CreateSubmissionInput[]) {
    id(formId, 'Form ID');
    if (!Array.isArray(submissions) || submissions.length < 1 || submissions.length > 10)
      throw createApiServiceError('Provide between one and ten submissions.', { parent: {} });
    for (const submission of submissions) {
      date(submission.submissionTime, 'submissionTime');
      date(submission.lastUpdatedAt, 'lastUpdatedAt');
      for (const values of [
        submission.questions,
        submission.urlParameters,
        submission.scheduling,
        submission.payments
      ]) {
        if (!values) continue;
        const seen = new Set<string>();
        for (const field of values) {
          text(field.id, 'Field ID');
          if (seen.has(field.id) || !jsonValue(field.value))
            throw createApiServiceError(
              'Use each field ID once per submission and provide JSON response values; omit unsupported values before importing.',
              { parent: {} }
            );
          seen.add(field.id);
        }
      }
    }
    const form = await this.getForm(formId);
    for (const submission of submissions)
      for (const [fields, definitions] of [
        [submission.questions, form.questions],
        [submission.urlParameters, form.urlParameters ?? []],
        [submission.scheduling, form.scheduling ?? []],
        [submission.payments, form.payments ?? []]
      ] as const)
        for (const field of fields ?? [])
          if (!definitions.some(definition => definition.id === field.id))
            throw createApiServiceError(
              'A field ID is absent from the current form definition. Call get_form and correct the import before creating submissions.',
              { parent: {} }
            );
    const raw = await this.request(
      'POST',
      `/forms/${id(formId, 'Form ID')}/submissions`,
      'create submissions',
      undefined,
      { submissions }
    );
    const wrapped = z.object({ submissions: z.unknown() }).safeParse(raw);
    const created = parse(
      z.array(submissionSchema),
      wrapped.success ? wrapped.data.submissions : raw,
      'created submissions (changes may already exist)'
    );
    if (
      new Set(created.map(item => item.submissionId)).size !== created.length ||
      created.some(item => !item.submissionId)
    )
      throw createApiServiceError(
        'The import returned ambiguous submission IDs. Changes may already exist; inspect the form before retrying. No automatic retry was attempted.',
        { reason: 'fillout_create_uncertain', parent: {} }
      );
    return {
      submissions: created,
      requestedCount: submissions.length,
      createdCount: created.length,
      complete: created.length === submissions.length
    };
  }
  async deleteSubmission(formId: string, submissionId: string) {
    await this.getSubmission(formId, submissionId);
    await this.request(
      'DELETE',
      `/forms/${id(formId, 'Form ID')}/submissions/${id(submissionId, 'Submission ID')}`,
      'delete submission'
    );
    return { success: true, formId, submissionId };
  }
}
