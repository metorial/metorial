import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  pickDefined,
  requestAxios
} from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://api.emailable.com/v1'
});

export interface VerifyEmailParams {
  email: string;
  smtp?: boolean;
  acceptAll?: boolean;
  timeout?: number;
}

export interface VerifyEmailResult {
  acceptAll: boolean | null;
  birthYear: number | null;
  didYouMean: string | null;
  disposable: boolean;
  domain: string;
  duration: number;
  email: string;
  firstName: string | null;
  free: boolean;
  fullName: string | null;
  gender: string | null;
  lastName: string | null;
  mailboxFull: boolean;
  mxRecord: string | null;
  noReply: boolean;
  reason: string;
  role: boolean;
  score: number;
  smtpProvider: string | null;
  state: string;
  tag: string | null;
  user: string;
}

interface RawVerificationResult {
  accept_all: boolean | null;
  birth_year?: number | null;
  did_you_mean: string | null;
  disposable: boolean;
  domain: string;
  duration: number;
  email: string;
  first_name: string | null;
  free: boolean;
  full_name: string | null;
  gender: string | null;
  last_name: string | null;
  mailbox_full: boolean;
  mx_record: string | null;
  no_reply: boolean;
  reason: string;
  role: boolean;
  score: number;
  smtp_provider: string | null;
  state: string;
  tag: string | null;
  user: string;
}

interface RawBatchStatus {
  id?: string;
  message: string;
  processed?: number;
  total?: number;
  emails?: Partial<RawVerificationResult>[];
  download_file?: string;
  total_counts?: Partial<BatchTotalCounts>;
  reason_counts?: Record<string, number>;
}

export interface CreateBatchParams {
  emails: string[];
  callbackUrl?: string;
  responseFields?: string[];
  retries?: boolean;
}

export interface CreateBatchResult {
  batchId: string;
  message: string;
}

export interface BatchStatusParams {
  batchId: string;
  partial?: boolean;
}

export interface BatchTotalCounts {
  deliverable: number;
  undeliverable: number;
  risky: number;
  unknown: number;
  duplicate: number;
  processed: number;
  total: number;
}

export interface BatchReasonCounts {
  acceptableEmail?: number;
  acceptedEmail?: number;
  invalidDomain?: number;
  invalidEmail?: number;
  invalidSmtp?: number;
  lowDeliverability?: number;
  lowQuality?: number;
  noConnect?: number;
  rejectedEmail?: number;
  timeout?: number;
  unavailableSmtp?: number;
  unexpectedError?: number;
}

export interface BatchStatusResult {
  batchId: string;
  message: string;
  processed?: number;
  total?: number;
  emails?: Partial<VerifyEmailResult>[];
  downloadFile?: string;
  totalCounts?: BatchTotalCounts;
  reasonCounts?: BatchReasonCounts;
}

export interface AccountResult {
  ownerEmail: string;
  availableCredits: number;
}

let mapVerifyResult = (data: RawVerificationResult): VerifyEmailResult => ({
  acceptAll: data.accept_all,
  birthYear: data.birth_year ?? null,
  didYouMean: data.did_you_mean || null,
  disposable: data.disposable,
  domain: data.domain,
  duration: data.duration,
  email: data.email,
  firstName: data.first_name || null,
  free: data.free,
  fullName: data.full_name || null,
  gender: data.gender || null,
  lastName: data.last_name || null,
  mailboxFull: data.mailbox_full,
  mxRecord: data.mx_record || null,
  noReply: data.no_reply,
  reason: data.reason,
  role: data.role,
  score: data.score,
  smtpProvider: data.smtp_provider || null,
  state: data.state,
  tag: data.tag || null,
  user: data.user
});

let mapPartialVerifyResult = (
  data: Partial<RawVerificationResult>
): Partial<VerifyEmailResult> =>
  pickDefined({
    acceptAll: data.accept_all,
    birthYear: data.birth_year,
    didYouMean: data.did_you_mean,
    disposable: data.disposable,
    domain: data.domain,
    duration: data.duration,
    email: data.email,
    firstName: data.first_name,
    free: data.free,
    fullName: data.full_name,
    gender: data.gender,
    lastName: data.last_name,
    mailboxFull: data.mailbox_full,
    mxRecord: data.mx_record,
    noReply: data.no_reply,
    reason: data.reason,
    role: data.role,
    score: data.score,
    smtpProvider: data.smtp_provider,
    state: data.state,
    tag: data.tag,
    user: data.user
  });

let mapReasonCounts = (data: Record<string, number>): BatchReasonCounts => ({
  acceptableEmail: data.accepted_email ?? data.acceptable_email,
  acceptedEmail: data.accepted_email,
  invalidDomain: data.invalid_domain,
  invalidEmail: data.invalid_email,
  invalidSmtp: data.invalid_smtp,
  lowDeliverability: data.low_deliverability,
  lowQuality: data.low_quality,
  noConnect: data.no_connect,
  rejectedEmail: data.rejected_email,
  timeout: data.timeout,
  unavailableSmtp: data.unavailable_smtp,
  unexpectedError: data.unexpected_error
});

let mapTotalCounts = (data: Partial<BatchTotalCounts>): BatchTotalCounts => {
  if (!data)
    return {
      deliverable: 0,
      undeliverable: 0,
      risky: 0,
      unknown: 0,
      duplicate: 0,
      processed: 0,
      total: 0
    };
  return {
    deliverable: data.deliverable ?? 0,
    undeliverable: data.undeliverable ?? 0,
    risky: data.risky ?? 0,
    unknown: data.unknown ?? 0,
    duplicate: data.duplicate ?? 0,
    processed: data.processed ?? 0,
    total: data.total ?? 0
  };
};

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'An Emailable credential is required. Reconnect the account.'
      );
    }
    this.token = config.token;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  private async request<T>(operation: string, request: Parameters<typeof requestAxios<T>>[1]) {
    let response = await requestAxios<T>(operation, request, (error, operation) =>
      buildApiServiceError(error, {
        providerLabel: 'Emailable',
        operation,
        reason: 'emailable_api_error'
      })
    );
    if (response.status === 249) {
      throw createApiServiceError(
        'Emailable is still verifying this email. Retry the same request within 5 minutes to retrieve the result without an additional charge.',
        { reason: 'emailable_verification_pending', upstreamStatus: 249 }
      );
    }
    return response.data;
  }

  async verifyEmail(params: VerifyEmailParams): Promise<VerifyEmailResult> {
    let queryParams: Record<string, string> = {
      email: params.email
    };

    if (params.smtp !== undefined) {
      queryParams.smtp = String(params.smtp);
    }
    if (params.acceptAll !== undefined) {
      queryParams.accept_all = String(params.acceptAll);
    }
    if (params.timeout !== undefined) {
      queryParams.timeout = String(params.timeout);
    }

    let data = await this.request('verify email', () =>
      apiAxios.get<RawVerificationResult>('/verify', {
        headers: this.getHeaders(),
        params: queryParams
      })
    );

    return mapVerifyResult(data);
  }

  async createBatch(params: CreateBatchParams): Promise<CreateBatchResult> {
    let body: Record<string, string | boolean | string[]> = {
      emails: params.emails
    };

    if (params.callbackUrl) {
      body.url = params.callbackUrl;
    }
    if (params.responseFields && params.responseFields.length > 0) {
      body.response_fields = params.responseFields.join(',');
    }
    if (params.retries !== undefined) {
      body.retries = params.retries;
    }

    let data = await this.request('create batch', () =>
      apiAxios.post<{ id: string; message: string }>('/batch', body, {
        headers: this.getHeaders()
      })
    );

    return {
      batchId: data.id,
      message: data.message
    };
  }

  async getBatchStatus(params: BatchStatusParams): Promise<BatchStatusResult> {
    let queryParams: Record<string, string> = {
      id: params.batchId
    };

    if (params.partial !== undefined) {
      queryParams.partial = String(params.partial);
    }

    let data = await this.request('get batch status', () =>
      apiAxios.get<RawBatchStatus>('/batch', {
        headers: this.getHeaders(),
        params: queryParams
      })
    );

    let result: BatchStatusResult = {
      batchId: data.id || params.batchId,
      message: data.message
    };

    if (data.processed !== undefined) {
      result.processed = data.processed;
    }
    if (data.total !== undefined) {
      result.total = data.total;
    }
    if (data.emails) {
      result.emails = data.emails.map(mapPartialVerifyResult);
    }
    if (data.download_file) {
      result.downloadFile = data.download_file;
    }
    if (data.total_counts) {
      result.totalCounts = mapTotalCounts(data.total_counts);
    }
    if (data.reason_counts) {
      result.reasonCounts = mapReasonCounts(data.reason_counts);
    }

    return result;
  }

  async getAccount(): Promise<AccountResult> {
    let data = await this.request('get account', () =>
      apiAxios.get<{ owner_email: string; available_credits: number }>('/account', {
        headers: this.getHeaders()
      })
    );

    return {
      ownerEmail: data.owner_email,
      availableCredits: data.available_credits
    };
  }
}
