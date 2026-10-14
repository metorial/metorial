import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface FormItem {
  id: number;
  public_id: string;
  name: string;
  body: Record<string, unknown>[];
  pages: unknown;
  is_custom: boolean;
  options: FormOptions;
  user_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FormOptions {
  one_submission_per_email: boolean;
  thank_you_message: string;
  max_submissions: number;
  stop_submissions_after: string | null;
  submit_button_text: string;
  form_width: string;
  redirect_url: string;
  password: string;
  theme: string;
  visibility: string;
  page_behaviour: string;
  custom_code: string;
  draft_submissions: boolean;
  remove_branding: boolean;
  email_notifications: boolean;
}

export interface FormResponseItem {
  id: number;
  form_id: number;
  response: Record<string, unknown>;
  options: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PaginationCursor {
  after: string | null;
  before: string | null;
}

export interface ListFormsResponse {
  data: FormItem[];
  status: string;
}

export interface GetFormResponse {
  data: FormItem;
  status: string;
}

export interface ListFormResponsesResponse {
  count: number;
  cursor: PaginationCursor;
  data: FormResponseItem[];
  status: string;
}

export interface ListFormResponsesParams {
  limit?: number;
  order?: 'asc' | 'desc';
  query?: string;
  after?: string;
  before?: string;
}

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A ByteForms API key is required. Reconnect your account.');
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.forms.bytesuite.io/api',
      timeout: 30_000,
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ByteForms',
          reason: 'byteforms_api_error'
        })
    });
  }

  private async get<T>(path: string, params?: ListFormResponsesParams): Promise<T> {
    let response = await this.api.get<T>(path, { params });
    let body = response.data;
    if (!isApiErrorRecord(body)) {
      throw createApiServiceError('ByteForms returned an invalid API response.', {
        reason: 'byteforms_invalid_response',
        upstreamStatus: response.status
      });
    }
    if (body.status !== 'success') {
      throw buildApiServiceError(
        { response: { status: response.status, data: body } },
        {
          providerLabel: 'ByteForms',
          reason: 'byteforms_api_error',
          operation: 'request'
        }
      );
    }
    return body;
  }

  private formIdPath(formId: string): string {
    if (!formId.trim()) {
      throw createApiServiceError('A form ID is required. Call list_forms to find a form.');
    }
    return encodeURIComponent(formId);
  }

  async listForms(): Promise<ListFormsResponse> {
    let result = await this.get<ListFormsResponse>('/form');
    if (!Array.isArray(result.data) || !result.data.every(isApiErrorRecord)) {
      throw createApiServiceError('ByteForms did not return a list of forms.', {
        reason: 'byteforms_invalid_response'
      });
    }
    return result;
  }

  async getForm(formId: string): Promise<GetFormResponse> {
    let result = await this.get<GetFormResponse>(`/form/${this.formIdPath(formId)}`);
    if (!isApiErrorRecord(result.data)) {
      throw createApiServiceError('ByteForms did not return the requested form.', {
        reason: 'byteforms_invalid_response'
      });
    }
    return result;
  }

  async listFormResponses(
    formId: string,
    params?: ListFormResponsesParams
  ): Promise<ListFormResponsesResponse> {
    if (
      params?.limit !== undefined &&
      (!Number.isSafeInteger(params.limit) || params.limit < 1)
    ) {
      throw createApiServiceError('Submission limit must be a positive whole number.');
    }
    let result = await this.get<ListFormResponsesResponse>(
      `/form/responses/${this.formIdPath(formId)}`,
      pickDefined(params ?? {})
    );
    if (
      !Array.isArray(result.data) ||
      !result.data.every(isApiErrorRecord) ||
      typeof result.count !== 'number' ||
      !isApiErrorRecord(result.cursor) ||
      (result.cursor.after !== null && typeof result.cursor.after !== 'string') ||
      (result.cursor.before !== null && typeof result.cursor.before !== 'string')
    ) {
      throw createApiServiceError('ByteForms returned an invalid submissions response.', {
        reason: 'byteforms_invalid_response'
      });
    }
    return result;
  }
}
