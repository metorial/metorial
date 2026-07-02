import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  apiVersion: 'v1' | 'v2';
}

export interface SubmissionBlock {
  type: string;
  name?: string;
  value?: string | number | boolean;
  properties?: Record<string, string>;
}

export interface SubmitFormParams {
  formId: string;
  blocks: SubmissionBlock[];
}

export interface SubmitFormResponse {
  success: boolean;
  redirectUrl?: string;
  submission: {
    hashId: string;
    date: string;
    blocks: Record<string, unknown>;
    submissionInfo?: {
      ip?: string;
      userAgent?: string;
      referer?: string;
      location?: Record<string, unknown>;
    };
  };
}

export interface GetSubmissionsParams {
  formId: string;
  page?: number;
  size?: number;
  query?: string;
  files?: boolean;
  timezone?: string;
}

export interface Submission {
  submissionId: number;
  submissionDate: string;
  status: string;
  submissionStatus: string;
  blocks: Record<string, unknown>;
  files?: Array<{ name: string; url: string }>;
}

export interface PaginationInfo {
  count: number;
  currentPage: number;
  total: number;
  firstPage: number;
  lastPage: number;
  size: number;
}

export interface GetSubmissionsResponse {
  formId: string;
  submissions: Submission[];
  pagination: PaginationInfo;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;
  private apiVersion: 'v1' | 'v2';

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.apiVersion = config.apiVersion;

    if (this.apiVersion === 'v2') {
      this.axios = createAxios({
        baseURL: 'https://api.forminit.com/v1',
        headers: {
          'X-API-Key': this.token,
          'Content-Type': 'application/json'
        }
      });
    } else {
      this.axios = createAxios({
        baseURL: 'https://api.getform.io/v1',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  async submitForm(params: SubmitFormParams): Promise<SubmitFormResponse> {
    let submitAxios = createAxios({
      baseURL: 'https://forminit.com',
      headers: {
        'X-API-Key': this.token,
        'Content-Type': 'application/json'
      }
    });

    let response = await submitAxios.post(`/f/${params.formId}`, {
      blocks: params.blocks
    });

    let data = response.data;
    return {
      success: data.success,
      redirectUrl: data.redirectUrl,
      submission: {
        hashId: data.submission?.hashId ?? '',
        date: data.submission?.date ?? '',
        blocks: data.submission?.blocks ?? {},
        submissionInfo: data.submission?.submissionInfo
      }
    };
  }

  async getSubmissions(params: GetSubmissionsParams): Promise<GetSubmissionsResponse> {
    let queryParams: Record<string, string | number | boolean> = {};

    if (this.apiVersion === 'v1') {
      queryParams.token = this.token;
    }
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.size !== undefined) queryParams.size = params.size;
    if (params.query !== undefined) queryParams.query = params.query;
    if (params.files !== undefined) queryParams.files = params.files;
    if (params.timezone !== undefined) queryParams.timezone = params.timezone;

    let response = await this.axios.get(`/forms/${params.formId}`, {
      params: queryParams
    });

    let data = response.data;
    let submissions = (data.data?.submissions ?? []).map((s: any) => ({
      submissionId: s.id,
      submissionDate: s.submissionDate ?? s.submission_date ?? '',
      status: s.status ?? 'active',
      submissionStatus: s.submissionStatus ?? s.submission_status ?? 'open',
      blocks: s.blocks ?? {},
      files: s.files
    }));

    let pagination = data.data?.pagination ?? {
      count: 0,
      currentPage: 1,
      total: 0,
      firstPage: 1,
      lastPage: 1,
      size: params.size ?? 30
    };

    return {
      formId: data.data?.id ?? params.formId,
      submissions,
      pagination: {
        count: pagination.count,
        currentPage: pagination.currentPage ?? pagination.current_page,
        total: pagination.total,
        firstPage: pagination.firstPage ?? pagination.first_page,
        lastPage: pagination.lastPage ?? pagination.last_page,
        size: pagination.size
      }
    };
  }
}
