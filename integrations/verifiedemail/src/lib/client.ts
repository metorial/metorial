import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface VerificationResult {
  email: string;
  status: string;
  subStatus: string;
  domain: string;
  domainType?: string;
  isRole: boolean;
  isFree?: boolean;
  isDisposable?: boolean;
  deliverabilityScore?: number;
  mxRecords?: string[];
  smtpProvider?: string;
  suggestion?: string | null;
  result?: string;
  score?: number;
  role?: string | null;
  alias?: string | null;
  canonical?: string | null;
  isMX?: boolean | null;
  isCatchAll?: boolean | null;
  dateLastVerified?: string | null;
}

type LegacyVerificationResult = Required<
  Pick<
    VerificationResult,
    | 'email'
    | 'status'
    | 'subStatus'
    | 'domain'
    | 'domainType'
    | 'isRole'
    | 'isFree'
    | 'isDisposable'
    | 'deliverabilityScore'
    | 'mxRecords'
    | 'smtpProvider'
    | 'suggestion'
  >
>;

interface ProviderVerification
  extends Partial<Omit<VerificationResult, 'isFree' | 'isDisposable'>> {
  email: string;
  result: string;
  score?: number;
  role?: string | null;
  alias?: string | null;
  canonical?: string | null;
  isFree?: boolean | null;
  isDisposable?: boolean | null;
  isMX?: boolean | null;
  isCatchAll?: boolean | null;
  dateLastVerified?: string | null;
}

export interface EmailList {
  listId: string;
  name: string;
  emailCount?: number;
  verifiedCount?: number;
  unverifiedCount?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  records?: Record<string, number | boolean>;
  autoVerify?: string;
  dateLastVerified?: string | null;
  isAutoRefill?: boolean;
  error?: string;
}

interface ProviderList extends Partial<EmailList> {
  id: string;
  title: string;
  status: string;
  records?: Record<string, number | boolean>;
  dateAdded?: string;
  dateLastVerified?: string | null;
  autoVerify?: string;
  isAutoRefill?: boolean;
  error?: string;
}

export interface ListVerificationSummary {
  listId: string;
  totalEmails?: number;
  deliverable?: number;
  undeliverable?: number;
  risky?: number;
  unknown?: number;
  duplicates?: number;
  status: string;
  records?: Record<string, number | boolean>;
}

export interface Webhook {
  webhookId: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditBalance {
  available: number;
  used?: number;
  autoRefillEnabled?: boolean;
  payAsYouGo: { credits: number; needed?: number };
  autoVerify?: { credits?: number; needed?: number };
}

export interface ResultsDownload {
  id: string;
  listId: string;
  status: string;
  include?: string[];
  url?: string;
  dateAdded?: string;
  dateReady?: string;
}

let recordCount = (records: ProviderList['records'], key: string) => {
  let value = records?.[key];
  return typeof value === 'number' ? value : undefined;
};

let mapList = (list: ProviderList): EmailList => {
  if (
    !list ||
    typeof list.id !== 'string' ||
    typeof list.title !== 'string' ||
    typeof list.status !== 'string'
  ) {
    throw createApiServiceError('VerifiedEmail returned an invalid email list response.');
  }
  return {
    listId: list.id,
    name: list.title,
    emailCount: list.emailCount ?? recordCount(list.records, 'total'),
    verifiedCount: list.verifiedCount,
    unverifiedCount: list.unverifiedCount ?? recordCount(list.records, 'pending'),
    status: list.status,
    createdAt: list.createdAt ?? list.dateAdded,
    updatedAt: list.updatedAt,
    records: list.records,
    autoVerify: list.autoVerify,
    dateLastVerified: list.dateLastVerified,
    isAutoRefill: list.isAutoRefill,
    error: list.error
  };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.verified.email/v1',
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'VerifiedEmail',
          reason: 'verifiedemail_api_error'
        })
    });
  }

  async verifyEmail(email: string): Promise<VerificationResult> {
    if (email.includes(',')) {
      throw createApiServiceError('Provide one email address per verification.');
    }
    let response = await this.axios.get<{ verifications: ProviderVerification[] }>(
      '/verifications',
      {
        params: { email }
      }
    );
    let result = response.data.verifications?.[0];
    if (!result || typeof result.email !== 'string' || typeof result.result !== 'string') {
      throw createApiServiceError(
        'VerifiedEmail returned no verification result for this address.'
      );
    }
    return {
      email: result.email,
      status: result.status ?? result.result,
      subStatus: result.subStatus ?? result.result,
      domain: result.email.includes('@') ? (result.email.split('@').at(-1) ?? '') : '',
      domainType:
        result.domainType ??
        (result.isDisposable ? 'disposable' : result.isFree ? 'free' : undefined),
      isRole: result.isRole ?? Boolean(result.role),
      isFree: result.isFree ?? undefined,
      isDisposable: result.isDisposable ?? undefined,
      deliverabilityScore: result.deliverabilityScore ?? result.score,
      mxRecords: result.mxRecords,
      smtpProvider: result.smtpProvider,
      suggestion: result.suggestion,
      result: result.result,
      score: result.score,
      role: result.role,
      alias: result.alias,
      canonical: result.canonical,
      isMX: result.isMX,
      isCatchAll: result.isCatchAll,
      dateLastVerified: result.dateLastVerified
    };
  }

  async getCredits(): Promise<CreditBalance> {
    let response = await this.axios.get<{
      entitlements: {
        payAsYouGo: CreditBalance['payAsYouGo'];
        autoVerify?: CreditBalance['autoVerify'];
        used?: number;
        autoRefillEnabled?: boolean;
      };
    }>('/entitlements');
    let entitlements = response.data.entitlements;
    if (typeof entitlements?.payAsYouGo?.credits !== 'number') {
      throw createApiServiceError(
        'VerifiedEmail returned an invalid credit balance response.'
      );
    }
    return { available: entitlements.payAsYouGo.credits, ...entitlements };
  }

  async getLists(params?: {
    page?: number;
    limit?: number;
    offset?: number;
    sortField?: string;
    sortOrder?: string;
  }): Promise<{
    lists: EmailList[];
    total: number;
    metadata?: { count: number; limit?: number; offset?: number };
  }> {
    let { page = 1, limit = 10, offset, ...sorting } = params ?? {};
    let response = await this.axios.get<{
      lists: ProviderList[];
      metadata: { count: number; limit?: number; offset?: number };
    }>('/lists', { params: { ...sorting, limit, offset: offset ?? (page - 1) * limit } });
    if (
      !Array.isArray(response.data.lists) ||
      typeof response.data.metadata?.count !== 'number'
    ) {
      throw createApiServiceError(
        'VerifiedEmail returned an invalid list collection response.'
      );
    }
    return {
      lists: response.data.lists.map(mapList),
      total: response.data.metadata.count,
      metadata: response.data.metadata
    };
  }

  async getList(listId: string): Promise<EmailList> {
    let response = await this.axios.get<{ list: ProviderList }>(
      `/lists/${encodeURIComponent(listId)}`
    );
    return mapList(response.data.list);
  }

  async createList(name: string, emails: string[]): Promise<EmailList> {
    let response = await this.axios.post<{ list: ProviderList }>('/lists/', { name, emails });
    return mapList(response.data.list);
  }

  async verifyList(listId: string): Promise<ListVerificationSummary> {
    let response = await this.axios.post<{ list: ProviderList }>(
      `/lists/${encodeURIComponent(listId)}`,
      { status: 'progress' }
    );
    let list = mapList(response.data.list);
    return {
      listId: list.listId,
      totalEmails: recordCount(list.records, 'total'),
      deliverable: recordCount(list.records, 'deliverable'),
      undeliverable: recordCount(list.records, 'undeliverable'),
      risky: recordCount(list.records, 'risky'),
      unknown: recordCount(list.records, 'unknown'),
      duplicates: recordCount(list.records, 'duplicate'),
      status: list.status,
      records: list.records
    };
  }

  async getListResults(
    listId: string,
    params?: { status?: string; page?: number; limit?: number }
  ): Promise<{ results: LegacyVerificationResult[]; total: number }> {
    let response = await this.axios.get(`/lists/${encodeURIComponent(listId)}/results`, {
      params
    });
    return response.data;
  }

  async deleteList(listId: string): Promise<void> {
    await this.axios.delete(`/lists/${encodeURIComponent(listId)}`);
  }

  async getWebhooks(): Promise<Webhook[]> {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(url: string, events: string[]): Promise<Webhook> {
    let response = await this.axios.post('/webhooks', { url, events });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    updates: { url?: string; events?: string[]; enabled?: boolean }
  ): Promise<Webhook> {
    let response = await this.axios.patch(
      `/webhooks/${encodeURIComponent(webhookId)}`,
      updates
    );
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
  }

  async requestResultsDownload(listId: string, include?: string[]): Promise<ResultsDownload> {
    let response = await this.axios.post<{ download: ResultsDownload }>('/downloads/', {
      listId,
      include
    });
    return response.data.download;
  }

  async getResultsDownload(downloadId: string): Promise<ResultsDownload> {
    let response = await this.axios.get<{ download: ResultsDownload }>(
      `/downloads/${encodeURIComponent(downloadId)}`
    );
    return response.data.download;
  }
}
