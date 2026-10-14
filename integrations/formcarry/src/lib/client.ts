import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let authenticationSchema = z.object({
  status: z.literal('success'),
  message: z.string()
});

let formResponseSchema = z.object({
  code: z.number(),
  title: z.string(),
  message: z.string(),
  type: z.literal('success')
});

let createFormResponseSchema = formResponseSchema.extend({ formUrl: z.string().url() });

let submissionsSchema = z.object({
  form: z.string(),
  results: z.number(),
  pagination: z.object({
    current_page: z.number(),
    previous_page: z.number().nullable().optional().default(null),
    next_page: z.number().nullable().optional().default(null),
    total_page: z.number(),
    total_submissions: z.number()
  }),
  submissions: z.array(z.record(z.string(), z.unknown()))
});

let submissionResponseSchema = z.object({
  code: z.number(),
  status: z.literal('success'),
  title: z.string(),
  message: z.string()
});

export interface CreateFormParams {
  name: string;
  email?: string;
  returnUrl?: string;
  failUrl?: string;
  returnParams?: boolean;
  googleRecaptcha?: string;
  webhook?: string;
  retention?: boolean;
  thankYouPage?: {
    theme?: string;
    headline?: string;
    message?: string;
    mode?: string;
    returnText?: string;
    returnUrl?: string;
  };
}

export interface ListSubmissionsParams {
  formId: string;
  limit?: number;
  page?: number;
  sort?: string;
  filter?: string;
}

export interface SubmissionsPagination {
  currentPage: number;
  previousPage: number | null;
  nextPage: number | null;
  totalPage: number;
  totalSubmissions: number;
}

export interface SubmissionsResponse {
  form: string;
  results: number;
  pagination: SubmissionsPagination;
  submissions: Record<string, unknown>[];
}

export interface CreateFormResponse {
  code: number;
  title: string;
  message: string;
  type: string;
  formUrl: string;
}

export interface DeleteFormResponse {
  code: number;
  title: string;
  message: string;
  type: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private submissionAxios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide your Formcarry team API key.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://formcarry.com/api',
      timeout: 30_000,
      authHeader: { name: 'api_key', value: config.token.trim() }
    });
    this.submissionAxios = createAxios({
      baseURL: 'https://formcarry.com/s',
      timeout: 30_000,
      headers: { Accept: 'application/json' }
    });
  }

  private async request<T>(
    operation: string,
    schema: z.ZodType<T>,
    options: {
      method: 'get' | 'put' | 'delete' | 'post';
      url: string;
      data?: unknown;
      params?: Record<string, unknown>;
    },
    axios = this.axios
  ): Promise<T> {
    let data = await requestAxiosData<unknown>(
      operation,
      () => axios.request(options),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Formcarry',
          reason: 'formcarry_api_request_failed',
          operation
        })
    );

    if (
      isApiErrorRecord(data) &&
      ((typeof data.code === 'number' && data.code >= 400) ||
        (typeof data.status === 'string' && data.status !== 'success') ||
        (typeof data.type === 'string' && data.type !== 'success'))
    ) {
      throw buildApiServiceError(
        { response: { status: typeof data.code === 'number' ? data.code : 400, data } },
        {
          providerLabel: 'Formcarry',
          reason: 'formcarry_api_request_failed',
          operation
        }
      );
    }

    let result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(
        `Formcarry returned an unexpected response while attempting to ${operation}.`,
        { reason: 'formcarry_invalid_response' }
      );
    }
    return result.data;
  }

  async authenticate() {
    return this.request('verify the API key', authenticationSchema, {
      method: 'get',
      url: '/auth'
    });
  }

  async createForm(params: CreateFormParams): Promise<CreateFormResponse> {
    if (params.returnUrl && !params.failUrl) {
      throw createApiServiceError('Provide failUrl when configuring returnUrl.');
    }
    if (params.returnUrl && params.thankYouPage) {
      throw createApiServiceError('Choose either returnUrl or a built-in thankYouPage.');
    }

    let body: Record<string, unknown> = pickDefined({
      name: params.name,
      email: params.email,
      returnUrl: params.returnUrl,
      failUrl: params.failUrl,
      returnParams: params.returnParams,
      googleRecaptcha: params.googleRecaptcha,
      webhook: params.webhook,
      retention: params.retention
    });

    if (params.thankYouPage) {
      let tp = params.thankYouPage;
      if (tp.theme !== undefined) body.thankYouPage_theme = tp.theme;
      if (tp.headline !== undefined) body.thankYouPage_headline = tp.headline;
      if (tp.message !== undefined) body.thankYouPage_message = tp.message;
      if (tp.mode !== undefined) body.thankYouPage_mode = tp.mode;
      if (tp.returnText !== undefined) body.thankYouPage_returnText = tp.returnText;
      if (tp.returnUrl !== undefined) body.thankYouPage_returnUrl = tp.returnUrl;
    }

    return this.request('create the form', createFormResponseSchema, {
      method: 'put',
      url: '/form',
      data: body
    });
  }

  async deleteForm(formId: string): Promise<DeleteFormResponse> {
    return this.request('delete the form', formResponseSchema, {
      method: 'delete',
      url: `/form/${encodeURIComponent(formId)}`
    });
  }

  async listSubmissions(params: ListSubmissionsParams): Promise<SubmissionsResponse> {
    let data = await this.request('list submissions', submissionsSchema, {
      method: 'get',
      url: `/form/${encodeURIComponent(params.formId)}/submissions`,
      params: pickDefined({
        limit: params.limit,
        page: params.page,
        sort: params.sort,
        filter: params.filter
      })
    });

    return {
      form: data.form,
      results: data.results,
      pagination: {
        currentPage: data.pagination.current_page,
        previousPage: data.pagination.previous_page,
        nextPage: data.pagination.next_page,
        totalPage: data.pagination.total_page,
        totalSubmissions: data.pagination.total_submissions
      },
      submissions: data.submissions
    };
  }

  async submitForm(formId: string, fields: Record<string, string>) {
    return this.request(
      'submit the form',
      submissionResponseSchema,
      { method: 'post', url: `/${encodeURIComponent(formId)}`, data: fields },
      this.submissionAxios
    );
  }
}
