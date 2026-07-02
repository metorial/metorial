import { createAxios } from 'slates';

export interface FormItem {
  id: number;
  public_id: string;
  name: string;
  body: Record<string, any>[];
  pages: any;
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
  response: Record<string, any>;
  options: Record<string, any>;
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
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.forms.bytesuite.io/api',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listForms(): Promise<ListFormsResponse> {
    let response = await this.api.get<ListFormsResponse>('/form');
    return response.data;
  }

  async getForm(formId: string): Promise<GetFormResponse> {
    let response = await this.api.get<GetFormResponse>(`/form/${formId}`);
    return response.data;
  }

  async listFormResponses(
    formId: string,
    params?: ListFormResponsesParams
  ): Promise<ListFormResponsesResponse> {
    let queryParams: Record<string, any> = {};

    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.order) queryParams.order = params.order;
    if (params?.query) queryParams.query = params.query;
    if (params?.after) queryParams.after = params.after;
    if (params?.before) queryParams.before = params.before;

    let response = await this.api.get<ListFormResponsesResponse>(`/form/responses/${formId}`, {
      params: queryParams
    });
    return response.data;
  }
}
