import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.neverbounce.com/v4.2'
});

export interface SingleCheckParams {
  email: string;
  addressInfo?: boolean;
  creditsInfo?: boolean;
  timeout?: number;
}

export interface SingleCheckResult {
  status: string;
  result: string;
  flags: string[];
  suggestedCorrection: string;
  executionTime: number;
  addressInfo?: {
    originalEmail: string;
    normalizedEmail: string;
    addr: string;
    alias: string;
    host: string;
    fqdn: string;
    domain: string;
    subdomain: string;
    tld: string;
  };
  creditsInfo?: {
    paidCreditsUsed: number;
    freeCreditsUsed: number;
    paidCreditsRemaining: number;
    freeCreditsRemaining: number;
  };
}

export interface CreateJobParams {
  inputLocation: 'remote_url' | 'supplied';
  input: string | Record<string, string>[] | string[][];
  filename?: string;
  autoParse?: boolean;
  autoStart?: boolean;
  runSample?: boolean;
  allowManualReview?: boolean;
  callbackUrl?: string;
  callbackHeaders?: Record<string, string>;
}

export interface CreateJobResult {
  status: string;
  jobId: number;
  executionTime: number;
}

export interface JobStatusResult {
  status: string;
  jobId: number;
  jobStatus: string;
  filename: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  total: {
    records: number;
    billable: number;
    processed: number;
    valid: number;
    invalid: number;
    catchall: number;
    disposable: number;
    unknown: number;
    duplicates: number;
    badSyntax: number;
  };
  bounceEstimate: number;
  percentComplete: number;
  executionTime: number;
}

export interface JobResultsParams {
  jobId: number;
  page?: number;
  itemsPerPage?: number;
}

export interface JobResultItem {
  data: Record<string, string>;
  verification: {
    result: string;
    flags: string[];
    suggestedCorrection: string;
    addressInfo: {
      originalEmail: string;
      normalizedEmail: string;
      addr: string;
      alias: string;
      host: string;
      fqdn: string;
      domain: string;
      subdomain: string;
      tld: string;
    };
  };
}

export interface JobResultsResult {
  status: string;
  totalResults: number;
  totalPages: number;
  query: {
    jobId: number;
    page: number;
    itemsPerPage: number;
  };
  results: JobResultItem[];
  executionTime: number;
}

export interface JobSearchParams {
  jobId?: number;
  filename?: string;
  jobStatus?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface JobSearchResultItem {
  jobId: number;
  filename: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  jobStatus: string;
  total: {
    records: number;
    billable: number;
    processed: number;
    valid: number;
    invalid: number;
    catchall: number;
    disposable: number;
    unknown: number;
    duplicates: number;
    badSyntax: number;
  };
  bounceEstimate: number;
  percentComplete: number;
}

export interface JobSearchResult {
  status: string;
  totalResults: number;
  totalPages: number;
  query: {
    page: number;
    itemsPerPage: number;
  };
  results: JobSearchResultItem[];
  executionTime: number;
}

export interface AccountInfoResult {
  status: string;
  creditsInfo: {
    paidCreditsUsed: number;
    freeCreditsUsed: number;
    paidCreditsRemaining: number;
    freeCreditsRemaining: number;
  };
  jobCounts: {
    completed: number;
    underReview: number;
    queued: number;
    processing: number;
  };
  executionTime: number;
}

export interface PoeConfirmParams {
  email: string;
  result: string;
  transactionId: string;
  confirmationToken: string;
}

export interface PoeConfirmResult {
  status: string;
  tokenConfirmed: boolean;
  executionTime: number;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async singleCheck(params: SingleCheckParams): Promise<SingleCheckResult> {
    let response = await http.get('/single/check', {
      params: {
        key: this.token,
        email: params.email,
        address_info: params.addressInfo ? 1 : 0,
        credits_info: params.creditsInfo ? 1 : 0,
        ...(params.timeout !== undefined ? { timeout: params.timeout } : {})
      }
    });

    let data = response.data;
    let result: SingleCheckResult = {
      status: data.status,
      result: this.mapResultCode(data.result),
      flags: data.flags || [],
      suggestedCorrection: data.suggested_correction || '',
      executionTime: data.execution_time
    };

    if (params.addressInfo && data.address_info) {
      result.addressInfo = {
        originalEmail: data.address_info.original_email,
        normalizedEmail: data.address_info.normalized_email,
        addr: data.address_info.addr,
        alias: data.address_info.alias,
        host: data.address_info.host,
        fqdn: data.address_info.fqdn,
        domain: data.address_info.domain,
        subdomain: data.address_info.subdomain,
        tld: data.address_info.tld
      };
    }

    if (params.creditsInfo && data.credits_info) {
      result.creditsInfo = {
        paidCreditsUsed: data.credits_info.paid_credits_used,
        freeCreditsUsed: data.credits_info.free_credits_used,
        paidCreditsRemaining: data.credits_info.paid_credits_remaining,
        freeCreditsRemaining: data.credits_info.free_credits_remaining
      };
    }

    return result;
  }

  async createJob(params: CreateJobParams): Promise<CreateJobResult> {
    let body: Record<string, any> = {
      key: this.token,
      input_location: params.inputLocation,
      input: params.input
    };

    if (params.filename !== undefined) body.filename = params.filename;
    if (params.autoParse !== undefined) body.auto_parse = params.autoParse;
    if (params.autoStart !== undefined) body.auto_start = params.autoStart;
    if (params.runSample !== undefined) body.run_sample = params.runSample;
    if (params.allowManualReview !== undefined)
      body.allow_manual_review = params.allowManualReview;
    if (params.callbackUrl !== undefined) body.callback_url = params.callbackUrl;
    if (params.callbackHeaders !== undefined) body.callback_headers = params.callbackHeaders;

    let response = await http.post('/jobs/create', body);
    let data = response.data;

    return {
      status: data.status,
      jobId: data.job_id,
      executionTime: data.execution_time
    };
  }

  async parseJob(
    jobId: number,
    autoStart?: boolean
  ): Promise<{ status: string; queueId: string; executionTime: number }> {
    let response = await http.post('/jobs/parse', {
      key: this.token,
      job_id: jobId,
      ...(autoStart !== undefined ? { auto_start: autoStart } : {})
    });

    let data = response.data;
    return {
      status: data.status,
      queueId: data.queue_id,
      executionTime: data.execution_time
    };
  }

  async startJob(
    jobId: number,
    runSample?: boolean
  ): Promise<{ status: string; queueId: string; executionTime: number }> {
    let response = await http.post('/jobs/start', {
      key: this.token,
      job_id: jobId,
      ...(runSample !== undefined ? { run_sample: runSample } : {})
    });

    let data = response.data;
    return {
      status: data.status,
      queueId: data.queue_id,
      executionTime: data.execution_time
    };
  }

  async getJobStatus(jobId: number): Promise<JobStatusResult> {
    let response = await http.get('/jobs/status', {
      params: {
        key: this.token,
        job_id: jobId
      }
    });

    let data = response.data;
    return {
      status: data.status,
      jobId: data.id,
      jobStatus: data.job_status,
      filename: data.filename,
      createdAt: data.created_at,
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      total: {
        records: data.total?.records ?? 0,
        billable: data.total?.billable ?? 0,
        processed: data.total?.processed ?? 0,
        valid: data.total?.valid ?? 0,
        invalid: data.total?.invalid ?? 0,
        catchall: data.total?.catchall ?? 0,
        disposable: data.total?.disposable ?? 0,
        unknown: data.total?.unknown ?? 0,
        duplicates: data.total?.duplicates ?? 0,
        badSyntax: data.total?.bad_syntax ?? 0
      },
      bounceEstimate: data.bounce_estimate ?? 0,
      percentComplete: data.percent_complete ?? 0,
      executionTime: data.execution_time
    };
  }

  async getJobResults(params: JobResultsParams): Promise<JobResultsResult> {
    let response = await http.get('/jobs/results', {
      params: {
        key: this.token,
        job_id: params.jobId,
        page: params.page ?? 1,
        items_per_page: params.itemsPerPage ?? 10
      }
    });

    let data = response.data;
    return {
      status: data.status,
      totalResults: data.total_results,
      totalPages: data.total_pages,
      query: {
        jobId: data.query?.job_id,
        page: data.query?.page,
        itemsPerPage: data.query?.items_per_page
      },
      results: (data.results || []).map((item: any) => ({
        data: item.data,
        verification: {
          result: this.mapResultCode(item.verification?.result),
          flags: item.verification?.flags || [],
          suggestedCorrection: item.verification?.suggested_correction || '',
          addressInfo: item.verification?.address_info
            ? {
                originalEmail: item.verification.address_info.original_email,
                normalizedEmail: item.verification.address_info.normalized_email,
                addr: item.verification.address_info.addr,
                alias: item.verification.address_info.alias,
                host: item.verification.address_info.host,
                fqdn: item.verification.address_info.fqdn,
                domain: item.verification.address_info.domain,
                subdomain: item.verification.address_info.subdomain,
                tld: item.verification.address_info.tld
              }
            : undefined
        }
      })),
      executionTime: data.execution_time
    };
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
    let queryParams: Record<string, any> = {
      key: this.token
    };

    if (params.jobId !== undefined) queryParams.job_id = params.jobId;
    if (params.filename !== undefined) queryParams.filename = params.filename;
    if (params.jobStatus !== undefined) queryParams.job_status = params.jobStatus;
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.itemsPerPage !== undefined) queryParams.items_per_page = params.itemsPerPage;

    let response = await http.get('/jobs/search', { params: queryParams });
    let data = response.data;

    return {
      status: data.status,
      totalResults: data.total_results,
      totalPages: data.total_pages,
      query: {
        page: data.query?.page,
        itemsPerPage: data.query?.items_per_page
      },
      results: (data.results || []).map((item: any) => ({
        jobId: item.id,
        filename: item.filename,
        createdAt: item.created_at,
        startedAt: item.started_at,
        finishedAt: item.finished_at,
        jobStatus: item.job_status,
        total: {
          records: item.total?.records ?? 0,
          billable: item.total?.billable ?? 0,
          processed: item.total?.processed ?? 0,
          valid: item.total?.valid ?? 0,
          invalid: item.total?.invalid ?? 0,
          catchall: item.total?.catchall ?? 0,
          disposable: item.total?.disposable ?? 0,
          unknown: item.total?.unknown ?? 0,
          duplicates: item.total?.duplicates ?? 0,
          badSyntax: item.total?.bad_syntax ?? 0
        },
        bounceEstimate: item.bounce_estimate ?? 0,
        percentComplete: item.percent_complete ?? 0
      })),
      executionTime: data.execution_time
    };
  }

  async deleteJob(jobId: number): Promise<{ status: string; executionTime: number }> {
    let response = await http.post('/jobs/delete', {
      key: this.token,
      job_id: jobId
    });

    let data = response.data;
    return {
      status: data.status,
      executionTime: data.execution_time
    };
  }

  async getAccountInfo(): Promise<AccountInfoResult> {
    let response = await http.get('/account/info', {
      params: {
        key: this.token
      }
    });

    let data = response.data;
    return {
      status: data.status,
      creditsInfo: {
        paidCreditsUsed: data.credits_info?.paid_credits_used ?? 0,
        freeCreditsUsed: data.credits_info?.free_credits_used ?? 0,
        paidCreditsRemaining: data.credits_info?.paid_credits_remaining ?? 0,
        freeCreditsRemaining: data.credits_info?.free_credits_remaining ?? 0
      },
      jobCounts: {
        completed: data.job_counts?.completed ?? 0,
        underReview: data.job_counts?.under_review ?? 0,
        queued: data.job_counts?.queued ?? 0,
        processing: data.job_counts?.processing ?? 0
      },
      executionTime: data.execution_time
    };
  }

  async poeConfirm(params: PoeConfirmParams): Promise<PoeConfirmResult> {
    let response = await http.post('/poe/confirm', {
      key: this.token,
      email: params.email,
      result: params.result,
      transaction_id: params.transactionId,
      confirmation_token: params.confirmationToken
    });

    let data = response.data;
    return {
      status: data.status,
      tokenConfirmed: data.token_confirmed,
      executionTime: data.execution_time
    };
  }

  private mapResultCode(code: number | string): string {
    let resultMap: Record<number, string> = {
      0: 'valid',
      1: 'invalid',
      2: 'disposable',
      3: 'catchall',
      4: 'unknown'
    };

    if (typeof code === 'number') {
      return resultMap[code] || String(code);
    }
    return String(code);
  }
}
