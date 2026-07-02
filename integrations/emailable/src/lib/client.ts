import { createAxios } from 'slates';

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
  acceptAll: boolean;
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
  emails?: VerifyEmailResult[];
  downloadFile?: string;
  totalCounts?: BatchTotalCounts;
  reasonCounts?: BatchReasonCounts;
}

export interface AccountResult {
  ownerEmail: string;
  availableCredits: number;
}

let mapVerifyResult = (data: any): VerifyEmailResult => ({
  acceptAll: data.accept_all,
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

let mapReasonCounts = (data: any): BatchReasonCounts => {
  if (!data) return {};
  return {
    acceptableEmail: data.acceptable_email,
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
  };
};

let mapTotalCounts = (data: any): BatchTotalCounts => {
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
    this.token = config.token;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`
    };
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

    let response = await apiAxios.get('/verify', {
      headers: this.getHeaders(),
      params: queryParams
    });

    return mapVerifyResult(response.data);
  }

  async createBatch(params: CreateBatchParams): Promise<CreateBatchResult> {
    let body: Record<string, any> = {
      emails: params.emails.join(',')
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

    let response = await apiAxios.post('/batch', body, {
      headers: this.getHeaders()
    });

    return {
      batchId: response.data.id,
      message: response.data.message
    };
  }

  async getBatchStatus(params: BatchStatusParams): Promise<BatchStatusResult> {
    let queryParams: Record<string, string> = {
      id: params.batchId
    };

    if (params.partial !== undefined) {
      queryParams.partial = String(params.partial);
    }

    let response = await apiAxios.get('/batch', {
      headers: this.getHeaders(),
      params: queryParams
    });

    let data = response.data;

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
      result.emails = data.emails.map(mapVerifyResult);
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
    let response = await apiAxios.get('/account', {
      headers: this.getHeaders()
    });

    return {
      ownerEmail: response.data.owner_email,
      availableCredits: response.data.available_credits
    };
  }
}
