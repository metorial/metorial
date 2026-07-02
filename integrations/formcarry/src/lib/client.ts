import { createAxios } from 'slates';

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
  submissions: Record<string, any>[];
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
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://formcarry.com/api',
      headers: {
        api_key: config.token
      }
    });
  }

  async createForm(params: CreateFormParams): Promise<CreateFormResponse> {
    let body: Record<string, any> = {
      name: params.name
    };

    if (params.email !== undefined) body.email = params.email;
    if (params.returnUrl !== undefined) body.returnUrl = params.returnUrl;
    if (params.failUrl !== undefined) body.failUrl = params.failUrl;
    if (params.returnParams !== undefined) body.returnParams = params.returnParams;
    if (params.googleRecaptcha !== undefined) body.googleRecaptcha = params.googleRecaptcha;
    if (params.webhook !== undefined) body.webhook = params.webhook;
    if (params.retention !== undefined) body.retention = params.retention;

    if (params.thankYouPage) {
      let tp = params.thankYouPage;
      if (tp.theme !== undefined) body.thankYouPage_theme = tp.theme;
      if (tp.headline !== undefined) body.thankYouPage_headline = tp.headline;
      if (tp.message !== undefined) body.thankYouPage_message = tp.message;
      if (tp.mode !== undefined) body.thankYouPage_mode = tp.mode;
      if (tp.returnText !== undefined) body.thankYouPage_returnText = tp.returnText;
      if (tp.returnUrl !== undefined) body.thankYouPage_returnUrl = tp.returnUrl;
    }

    let response = await this.axios.put('/form', body);
    return response.data;
  }

  async deleteForm(formId: string): Promise<DeleteFormResponse> {
    let response = await this.axios.delete(`/form/${formId}`);
    return response.data;
  }

  async listSubmissions(params: ListSubmissionsParams): Promise<SubmissionsResponse> {
    let queryParams: Record<string, any> = {};

    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.sort !== undefined) queryParams.sort = params.sort;
    if (params.filter !== undefined) queryParams.filter = params.filter;

    let response = await this.axios.get(`/form/${params.formId}/submissions`, {
      params: queryParams
    });

    let data = response.data;

    return {
      form: data.form,
      results: data.results,
      pagination: {
        currentPage: data.pagination?.current_page,
        previousPage: data.pagination?.previous_page,
        nextPage: data.pagination?.next_page,
        totalPage: data.pagination?.total_page,
        totalSubmissions: data.pagination?.total_submissions
      },
      submissions: data.submissions || []
    };
  }
}
