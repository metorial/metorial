import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { readLeadBoxerPage, readLeadBoxerRecord } from './responses';

export interface LeadFilters {
  search?: string;
  limit?: number;
  period?: string;
  sortBy?: string;
  email?: string;
  nextToken?: string;
  criteriaTimeFilter?: string;
  criteriaTextFilter?: string;
  criteriaNumberFilter?: string;
  timeField?: 'eventEsTimestamp' | 'first_session_unix_timestamp';
}

export interface TrackEventParams {
  title: string;
  email?: string;
  userId?: string;
  sessionId?: string;
  leadboxerUserId?: string;
  eventId?: string;
  url?: string;
  referrer?: string;
  ip?: string;
  proxy?: boolean;
  customProperties?: Record<string, string>;
}

export interface TagUpdateParams {
  leadboxerUserId: string;
  tags: string;
  action?: 'add' | 'remove';
}

let leadBoxerErrorAdapter = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'LeadBoxer',
    reason: 'leadboxer_api_error',
    extractUpstreamCode: input => {
      if (!isApiErrorRecord(input) || !isApiErrorRecord(input.data)) return undefined;
      let upstream = input.data.upstream;
      return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
        ? upstream.code
        : undefined;
    }
  });

let errorMapping = {
  extractResponseData: (response: { data: unknown }) => {
    if (!isApiErrorRecord(response.data)) return response.data;
    let data = response.data;
    let details: string[] = [];
    collectApiErrorDetails(data, details, {
      detailKeys: ['detail', 'message', 'title', 'error'],
      nestedKeys: []
    });
    if (Array.isArray(data.errors)) {
      for (let issue of data.errors) {
        if (!isApiErrorRecord(issue)) continue;
        if (typeof issue.message === 'string') {
          details.push(
            `${typeof issue.field === 'string' ? `${issue.field}: ` : ''}${issue.message}`
          );
        }
      }
    }
    if (typeof data.retryAfter === 'number') {
      details.push(`Retry after ${data.retryAfter} seconds.`);
    }
    return { ...data, message: details.join(' - ') || data.message };
  }
};

let validateLimit = (limit: number, maximum: number) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    throw createApiServiceError(`The limit must be a whole number between 1 and ${maximum}.`);
  }
};

let timeFilterForPeriod = (period: string, field: string) => {
  let match = /^(\d+)(d|w|m|y)$/.exec(period);
  let units: Record<string, number> = { d: 1, w: 7, m: 30, y: 365 };
  let days = match ? Number(match[1]) * (units[match[2] ?? ''] ?? 0) : 0;
  if (!Number.isSafeInteger(days) || days < 1) {
    throw createApiServiceError(
      'Use a positive period such as 1d, 7d, 30d, or 1y, or provide criteriaTimeFilter for an exact date range.'
    );
  }
  return `${field}|lessthan|${days - 1}`;
};

export class LeadBoxerClient {
  private dataApi: ReturnType<typeof createAuthenticatedAxios>;
  private legacyApi: ReturnType<typeof createAuthenticatedAxios>;
  private trackingApi: ReturnType<typeof createAuthenticatedAxios>;

  constructor(
    private config: {
      token: string;
      datasetId?: string;
      accountEmail?: string;
    }
  ) {
    this.dataApi = createAuthenticatedAxios({
      baseURL: 'https://api.leadboxer.com',
      authHeader: { name: 'x-api-key', value: config.token },
      timeout: 30000,
      errorMapping,
      errorAdapter: leadBoxerErrorAdapter
    });
    // Retain the original legacy tag route for compatibility; runtime support is unverified.
    this.legacyApi = createAuthenticatedAxios({
      baseURL: 'https://kibana.leadboxer.com',
      authHeader: { name: 'x-api-key', value: config.token },
      timeout: 30000,
      errorMapping,
      errorAdapter: leadBoxerErrorAdapter
    });
    this.trackingApi = createAuthenticatedAxios({
      baseURL: 'https://log.leadboxer.com',
      contentType: false,
      timeout: 30000,
      errorMapping,
      errorAdapter: leadBoxerErrorAdapter
    });
  }

  private datasetId() {
    if (!this.config.datasetId?.trim()) {
      throw createApiServiceError(
        'Provide a datasetId. Call list_datasets to discover accessible datasets.'
      );
    }
    return this.config.datasetId;
  }

  private accountEmail() {
    if (!this.config.accountEmail?.trim()) {
      throw createApiServiceError(
        'Provide accountEmail using the email address of the LeadBoxer account that owns the API key, or save it with the connection.'
      );
    }
    return this.config.accountEmail;
  }

  async getLeads(filters: LeadFilters = {}) {
    let limit = filters.limit ?? 50;
    validateLimit(limit, 2147483647);
    let timeField = filters.timeField ?? 'eventEsTimestamp';
    if (filters.email && /[|,;]/.test(filters.email)) {
      throw createApiServiceError(
        'The email filter cannot contain filter delimiters (|, comma, or semicolon).'
      );
    }
    let textFilters = [
      filters.criteriaTextFilter,
      filters.email ? `email.raw|is|${filters.email}` : undefined
    ]
      .filter(Boolean)
      .join(',');
    let response = await this.dataApi.get('/v1/leads', {
      params: pickDefined({
        site: this.datasetId(),
        search: filters.search || '*',
        noShortenEmail: true,
        limit,
        sortBy: filters.sortBy,
        nextToken: filters.nextToken,
        timeField,
        criteriaTimeFilter:
          filters.criteriaTimeFilter ??
          timeFilterForPeriod(filters.period ?? '30d', timeField),
        criteriaTextFilter: textFilters || undefined,
        criteriaNumberFilter: filters.criteriaNumberFilter
      })
    });
    return readLeadBoxerPage(response.data, 'leads');
  }

  async getLeadDetail(leadId: string) {
    let response = await this.dataApi.get(`/v1/leads/${encodeURIComponent(leadId)}`, {
      params: { email: this.accountEmail(), site: this.datasetId() }
    });
    let detail = readLeadBoxerRecord(response.data, 'lead detail');
    if (detail.resultsList !== undefined) {
      return readLeadBoxerRecord(
        Array.isArray(detail.resultsList) ? detail.resultsList[0] : detail.resultsList,
        'lead detail'
      );
    }
    return detail;
  }

  async getLeadSessions(leadId: string, limit = 100, nextToken?: string) {
    validateLimit(limit, 10000);
    let response = await this.dataApi.get('/v1/leads/sessions', {
      params: pickDefined({
        leadId,
        limit,
        site: this.datasetId(),
        email: this.config.accountEmail,
        nextToken
      })
    });
    return readLeadBoxerPage(response.data, 'lead sessions');
  }

  async getLeadEvents(sessionId: string, limit = 100, segmentId?: number) {
    validateLimit(limit, 100);
    if (
      segmentId !== undefined &&
      (!Number.isInteger(segmentId) || segmentId < 0 || segmentId > 2147483647)
    ) {
      throw createApiServiceError(
        'The segmentId must be a nonnegative whole number within the 32-bit integer range.'
      );
    }
    let response = await this.dataApi.get('/v1/leads/events', {
      params: pickDefined({
        sessionId,
        limit,
        site: this.datasetId(),
        email: this.config.accountEmail,
        segmentId
      })
    });
    return readLeadBoxerPage(response.data, 'lead events');
  }

  async getDatasets() {
    let response = await this.dataApi.get('/v1/users/datasets', {
      params: { email: this.accountEmail() }
    });
    return readLeadBoxerPage(response.data, 'datasets');
  }

  async lookupIp(ipAddress: string) {
    let response = await this.dataApi.get('/v1/ip-lookup', {
      params: pickDefined({ ip: ipAddress, datasetId: this.config.datasetId })
    });
    return readLeadBoxerRecord(response.data, 'IP lookup');
  }

  async lookupDomain(domain: string) {
    let response = await this.dataApi.get('/v1/domain-lookup', {
      params: pickDefined({ domain, datasetId: this.config.datasetId })
    });
    return readLeadBoxerRecord(response.data, 'domain lookup');
  }

  async lookupEmail(input: {
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    companyDomain?: string;
  }) {
    let response = await this.dataApi.post('/v1/email-lookup', pickDefined(input), {
      params: pickDefined({ datasetId: this.config.datasetId })
    });
    return readLeadBoxerRecord(response.data, 'email lookup');
  }

  async trackEvent(params: TrackEventParams): Promise<unknown> {
    let reserved = new Set([
      'si',
      'ti',
      'json',
      'pix',
      'callback',
      'email',
      'userId',
      'sid',
      'uid',
      'eid',
      'lc',
      'ref',
      'ip',
      'proxy'
    ]);
    for (let key of Object.keys(params.customProperties ?? {})) {
      if (reserved.has(key) || !/^[\x20-\x7e]+$/.test(key)) {
        throw createApiServiceError(
          `Custom property "${key}" must use an ASCII name and must not override an event parameter.`
        );
      }
    }
    let response = await this.trackingApi.get('/', {
      params: pickDefined({
        ...params.customProperties,
        si: this.datasetId(),
        ti: params.title,
        json: 'true',
        email: params.email,
        userId: params.userId,
        sid: params.sessionId,
        uid: params.leadboxerUserId,
        eid: params.eventId,
        lc: params.url,
        ref: params.referrer,
        ip: params.ip,
        proxy: params.proxy === undefined ? undefined : String(params.proxy)
      })
    });
    return response.data;
  }

  async updateLeadTags(params: TagUpdateParams): Promise<unknown> {
    let response = await this.legacyApi.get('/api/management/update_lead_tags', {
      params: pickDefined({
        userId: params.leadboxerUserId,
        leadTags: params.tags,
        action: params.action
      })
    });
    return response.data;
  }
}
