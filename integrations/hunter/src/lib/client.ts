import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
const invalidResponse = () =>
  createApiServiceError('Hunter returned invalid response metadata.');
export const row = (value: unknown): Row => {
  const parsed = z.record(z.string(), z.unknown()).safeParse(value);
  if (!parsed.success) throw invalidResponse();
  return parsed.data;
};
export const rows = (value: unknown): Row[] => {
  if (!Array.isArray(value)) throw invalidResponse();
  return value.map(row);
};
export const text = (value: unknown, label = 'value'): string => {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value))
    throw createApiServiceError(`Provide a valid ${label}.`);
  return value;
};
export const optionalText = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value !== 'string') throw invalidResponse();
  return value;
};
export const optionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw invalidResponse();
  return value;
};
export const optionalBoolean = (value: unknown): boolean | undefined => {
  if (value == null) return undefined;
  if (typeof value !== 'boolean') throw invalidResponse();
  return value;
};
export const optionalRow = (value: unknown): Row => (value == null ? {} : row(value));
export const optionalStrings = (value: unknown): string[] | undefined => {
  if (value == null) return undefined;
  const parsed = z.array(z.string()).safeParse(value);
  if (!parsed.success) throw invalidResponse();
  return parsed.data;
};
export const id = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw createApiServiceError('Provide a positive integer resource ID.');
  return value;
};
const page = (limit: number | undefined, offset: number | undefined, maximum = 100) => {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > maximum))
    throw createApiServiceError(`Limit must be an integer from 1 to ${maximum}.`);
  if (offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0))
    throw createApiServiceError('Offset must be a non-negative integer.');
};
const filterValues = (value: string | undefined, label: string) =>
  value === undefined ? undefined : value.split(',').map(item => text(item.trim(), label));
const requireCompany = (params: { domain?: string; company?: string }) => {
  if (!params.domain?.trim() && !params.company?.trim())
    throw createApiServiceError('Provide a domain or company name.');
};
export const entity = (value: unknown, expectedId?: number): Row => {
  const result = row(value);
  const resourceId = id(result.id);
  if (expectedId !== undefined && resourceId !== expectedId)
    throw createApiServiceError('Hunter returned a different resource than requested.');
  return result;
};
export type HunterResponse = { data: unknown; meta: Row; httpStatus: number };

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.hunter.io/v2',
      authHeader: { name: 'X-API-KEY', value: text(config.token, 'API key') },
      timeout: 45000,
      maxRedirects: 0,
      errorAdapter: error => {
        const rawStatus = getApiErrorStatus(error);
        const status =
          typeof rawStatus === 'number' &&
          Number.isInteger(rawStatus) &&
          rawStatus >= 100 &&
          rawStatus <= 599
            ? rawStatus
            : typeof rawStatus === 'string' && /^[1-5]\d{2}$/.test(rawStatus)
              ? Number(rawStatus)
              : undefined;
        return buildApiServiceError(error, {
          providerLabel: 'Hunter',
          reason: 'hunter_api_error',
          extractResponse: () => ({ status }),
          extractMessage: () =>
            status === 401
              ? 'Check the API key.'
              : status === 403
                ? 'Check account access and rate limits before retrying.'
                : status === 429
                  ? 'The account usage limit was reached. Check the remaining quota.'
                  : status === 451
                    ? 'The provider does not permit processing this person. Do not retry or process the returned personal data.'
                    : 'The provider rejected or could not complete the request. Check the supplied fields and resource access. Writes are not retried automatically.',
          parent: {}
        });
      }
    });
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    params?: Row,
    data?: Row,
    empty = false,
    pending = false
  ): Promise<HunterResponse> {
    const response = await this.http.request<unknown>({
      method,
      url: path,
      params: pickDefined(params ?? {}),
      data
    });
    if (path === '/email-verifier' && response.status === 222)
      throw createApiServiceError(
        'Hunter could not complete verification because of a temporary remote mail-server response. Retry later; no verification result is available.',
        { reason: 'hunter_verification_temporarily_unavailable', upstreamStatus: 222 }
      );
    if (response.status === 204 && empty)
      return { data: undefined, meta: {}, httpStatus: 204 };
    if (response.status === 202 && pending && (response.data === '' || response.data == null))
      return { data: undefined, meta: {}, httpStatus: 202 };
    if (![200, 201, ...(pending ? [202] : [])].includes(response.status))
      throw createApiServiceError('Hunter returned an unexpected success status.', {
        upstreamStatus: response.status
      });
    const envelope = row(response.data);
    if (response.status === 202 && pending && envelope.errors === undefined)
      return { data: envelope.data, meta: optionalRow(envelope.meta), httpStatus: 202 };
    if (
      (path === '/people/find' || path === '/companies/find') &&
      !('data' in envelope) &&
      typeof envelope.id === 'string'
    )
      return { data: envelope, meta: {}, httpStatus: response.status };
    if (envelope.errors !== undefined || !('data' in envelope)) throw invalidResponse();
    return {
      data: envelope.data,
      meta: optionalRow(envelope.meta),
      httpStatus: response.status
    };
  }
  async getAccount() {
    return row((await this.request('get', '/account')).data);
  }
  async getAccountStats() {
    return row((await this.request('get', '/account-stats')).data);
  }
  async domainSearch(params: {
    domain?: string;
    company?: string;
    limit?: number;
    offset?: number;
    type?: string;
    seniority?: string;
    department?: string;
    requiredField?: string;
    verificationStatus?: string;
    location?: string;
    jobTitles?: string[];
  }) {
    requireCompany(params);
    page(params.limit, params.offset);
    if (params.verificationStatus === 'invalid')
      throw createApiServiceError(
        'Hunter Domain Search supports valid, accept_all and unknown verification filters; invalid is not supported by this endpoint.'
      );
    const query = pickDefined({
      domain: params.domain,
      company: params.company,
      limit: params.limit,
      offset: params.offset,
      type: params.type,
      seniority: params.seniority,
      department: params.department,
      required_field: params.requiredField,
      verification_status: params.verificationStatus,
      job_titles: params.jobTitles?.join(',')
    });
    if (params.location !== undefined) {
      const countries = params.location.split(',').map(value => value.trim().toUpperCase());
      if (!countries.length || countries.some(value => !/^[A-Z]{2}$/.test(value)))
        throw createApiServiceError(
          'Location must contain comma-separated two-letter country codes. Free-text locations cannot be mapped accurately to Hunter location filters.'
        );
      return this.request('post', '/domain-search', undefined, {
        ...query,
        location: { include: countries.map(country => ({ country })) }
      });
    }
    return this.request('get', '/domain-search', query);
  }
  async findEmail(params: {
    domain?: string;
    company?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    linkedinHandle?: string;
    maxDuration?: number;
  }) {
    if (
      params.maxDuration !== undefined &&
      (!Number.isInteger(params.maxDuration) ||
        params.maxDuration < 3 ||
        params.maxDuration > 20)
    )
      throw createApiServiceError('Max duration must be an integer from 3 to 20 seconds.');
    if (!params.linkedinHandle?.trim()) {
      requireCompany(params);
      if (!params.fullName?.trim() && !(params.firstName?.trim() && params.lastName?.trim()))
        throw createApiServiceError(
          'Provide fullName or both firstName and lastName, or a LinkedIn handle.'
        );
    }
    return this.request('get', '/email-finder', {
      domain: params.domain,
      company: params.company,
      first_name: params.firstName,
      last_name: params.lastName,
      full_name: params.fullName,
      linkedin_handle: params.linkedinHandle,
      max_duration: params.maxDuration
    });
  }
  async verifyEmail(email: string) {
    return this.request(
      'get',
      '/email-verifier',
      { email: text(email, 'email') },
      undefined,
      false,
      true
    );
  }
  async getEmailCount(params: { domain?: string; company?: string; type?: string }) {
    requireCompany(params);
    return this.request('get', '/email-count', params);
  }
  async enrichPerson(params: { email?: string; linkedinHandle?: string }) {
    if (!params.email?.trim() && !params.linkedinHandle?.trim())
      throw createApiServiceError('Provide an email or LinkedIn handle.');
    return this.request('get', '/people/find', {
      email: params.email,
      linkedin_handle: params.linkedinHandle
    });
  }
  async enrichCompany(domain: string) {
    return this.request('get', '/companies/find', { domain: text(domain, 'domain') });
  }
  async discoverCompanies(params: {
    query?: string;
    organization?: Row;
    headquartersLocation?: Row;
    industry?: string[];
    headcount?: string[];
    companyType?: string[];
    limit?: number;
    offset?: number;
  }) {
    page(params.limit, params.offset);
    if (params.offset !== undefined && params.offset > 10000)
      throw createApiServiceError('Discover offset cannot exceed 10,000.');
    const body = pickDefined({
      query: params.query,
      organization: params.organization,
      headquarters_location: params.headquartersLocation,
      industry: params.industry ? { include: params.industry } : undefined,
      headcount: params.headcount,
      company_type: params.companyType ? { include: params.companyType } : undefined,
      limit: params.limit,
      offset: params.offset
    });
    if (
      !params.query?.trim() &&
      !params.organization &&
      !params.headquartersLocation &&
      !params.industry?.length &&
      !params.headcount?.length &&
      !params.companyType?.length
    )
      throw createApiServiceError('Provide a Discover query or at least one filter.');
    return this.request('post', '/discover', undefined, body);
  }
  async listLeads(params: {
    limit?: number;
    offset?: number;
    leadListId?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    industry?: string;
    verificationStatus?: string;
    sendingStatus?: string;
  }) {
    page(params.limit, params.offset, 1000);
    if (params.offset !== undefined && params.offset > 100000)
      throw createApiServiceError('Lead offset cannot exceed 100,000.');
    return this.request('get', '/leads', {
      limit: params.limit,
      offset: params.offset,
      leads_list_id: params.leadListId === undefined ? undefined : id(params.leadListId),
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      company: params.company,
      industry: params.industry,
      verification_status: filterValues(params.verificationStatus, 'verification status'),
      sending_status: filterValues(params.sendingStatus, 'sending status')
    });
  }
  async getLead(leadId: number) {
    const result = await this.request('get', `/leads/${id(leadId)}`);
    entity(result.data, leadId);
    return result;
  }
  async createLead(data: Row) {
    text(data.email, 'email');
    return this.request('post', '/leads', undefined, data);
  }
  async updateLead(leadId: number, data: Row) {
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one lead field to update.');
    await this.request('put', `/leads/${id(leadId)}`, undefined, data, true);
    try {
      return await this.getLead(leadId);
    } catch {
      throw createApiServiceError(
        'Hunter accepted the lead update, but its readback failed. Retrieve the lead before deciding whether to repeat the write.',
        { reason: 'hunter_write_accepted_readback_failed' }
      );
    }
  }
  async upsertLead(data: Row) {
    text(data.email, 'email');
    return this.request('put', '/leads', undefined, data);
  }
  async deleteLead(leadId: number) {
    return this.request('delete', `/leads/${id(leadId)}`, undefined, undefined, true);
  }
  async listLeadsLists(params: { limit?: number; offset?: number } = {}) {
    page(params.limit, params.offset);
    return this.request('get', '/leads_lists', params);
  }
  async getLeadsList(listId: number) {
    const result = await this.request('get', `/leads_lists/${id(listId)}`);
    entity(result.data, listId);
    return result;
  }
  async createLeadsList(name: string) {
    return this.request('post', '/leads_lists', undefined, { name: text(name, 'list name') });
  }
  async updateLeadsList(listId: number, name: string) {
    await this.request(
      'put',
      `/leads_lists/${id(listId)}`,
      undefined,
      { name: text(name, 'list name') },
      true
    );
    try {
      return await this.getLeadsList(listId);
    } catch {
      throw createApiServiceError(
        'Hunter accepted the list update, but its readback failed. Retrieve the list before deciding whether to repeat the write.',
        { reason: 'hunter_write_accepted_readback_failed' }
      );
    }
  }
  async deleteLeadsList(listId: number) {
    return this.request(
      'delete',
      `/leads_lists/${id(listId)}`,
      undefined,
      undefined,
      true,
      true
    );
  }
  async listSequences(params: { limit?: number; offset?: number } = {}) {
    page(params.limit, params.offset);
    return this.request('get', '/sequences', params);
  }
  async getSequence(sequenceId: number) {
    const result = await this.request('get', `/sequences/${id(sequenceId)}`);
    entity(result.data, sequenceId);
    return result;
  }
  async listSequenceRecipients(
    sequenceId: number,
    params: { limit?: number; offset?: number } = {}
  ) {
    page(params.limit, params.offset);
    return this.request('get', `/campaigns/${id(sequenceId)}/recipients`, params);
  }
  async addSequenceRecipients(
    sequenceId: number,
    data: { emails?: string[]; leadIds?: number[] }
  ) {
    if (!data.emails?.length && !data.leadIds?.length)
      throw createApiServiceError('Provide emails or leadIds for recipients.');
    if ((data.emails?.length ?? 0) > 50 || (data.leadIds?.length ?? 0) > 50)
      throw createApiServiceError('Provide no more than 50 emails and 50 lead IDs.');
    data.emails?.forEach(email => text(email, 'recipient email'));
    data.leadIds?.forEach(id);
    return this.request(
      'post',
      `/campaigns/${id(sequenceId)}/recipients`,
      undefined,
      pickDefined({ emails: data.emails, lead_ids: data.leadIds })
    );
  }
  async cancelSequenceRecipient(sequenceId: number, email: string) {
    return this.request(
      'delete',
      `/campaigns/${id(sequenceId)}/recipients`,
      undefined,
      { emails: [text(email, 'recipient email')] },
      true
    );
  }
  async startSequence(sequenceId: number) {
    return this.request('post', `/campaigns/${id(sequenceId)}/start`, undefined, {}, true);
  }
  async pauseSequence(sequenceId: number) {
    return this.request('post', `/sequences/${id(sequenceId)}/pause`, undefined, {}, true);
  }
  async resumeSequence(sequenceId: number) {
    return this.request('delete', `/sequences/${id(sequenceId)}/pause`, undefined, {}, true);
  }
}
