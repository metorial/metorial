import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';

export type Row = Record<string, unknown>;
export const row = (value: unknown): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createApiServiceError('Lemlist returned invalid object metadata.');
  return value as Row;
};
export const rows = (value: unknown): Row[] => {
  if (!Array.isArray(value))
    throw createApiServiceError('Lemlist returned invalid collection metadata.');
  return value.map(row);
};
export const text = (value: unknown, label = 'identifier'): string => {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value))
    throw createApiServiceError(`Provide a valid ${label}.`);
  return value;
};
export const optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string')
    throw createApiServiceError('Lemlist returned invalid text metadata.');
  return value;
};
export const optionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw createApiServiceError('Lemlist returned invalid numeric metadata.');
  return value;
};
export const optionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean')
    throw createApiServiceError('Lemlist returned invalid boolean metadata.');
  return value;
};
export const optionalStrings = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string'))
    throw createApiServiceError('Lemlist returned invalid text collection metadata.');
  return value as string[];
};
export const warningOutput = (value: unknown) =>
  value == null
    ? undefined
    : rows(value).map(item => ({
        code: optionalText(item.code),
        message: optionalText(item.message)
      }));
export const isMissing = (error: unknown) =>
  !!error &&
  typeof error === 'object' &&
  'data' in error &&
  !!error.data &&
  typeof error.data === 'object' &&
  'upstreamStatus' in error.data &&
  Number(error.data.upstreamStatus) === 404;
const segment = (value: string) => encodeURIComponent(text(value));
const page = (value: number | undefined, minimum: number, maximum?: number) => {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < minimum || (maximum !== undefined && value > maximum))
  )
    throw createApiServiceError(
      `Pagination values must be integers from ${minimum}${maximum === undefined ? '' : ` to ${maximum}`}.`
    );
};
const validTimestamp = (value: string) => {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(
      value
    );
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (days[month - 1] ?? 0) &&
    Number(match[4]) < 24 &&
    Number(match[5]) < 60 &&
    Number(match[6]) < 60 &&
    (match[7] === undefined || (Number(match[8]) < 24 && Number(match[9]) < 60))
  );
};
const entity = (value: unknown, expectedId?: string) => {
  const result = row(value),
    id = text(result._id, 'provider identifier');
  if (expectedId !== undefined && id !== expectedId)
    throw createApiServiceError('Lemlist returned a different resource than requested.');
  return result;
};
export const campaignOutput = (value: Row) => ({
  campaignId: text(value._id, 'campaign identifier'),
  name: optionalText(value.name),
  status: optionalText(value.status ?? value.state),
  createdAt: optionalText(value.createdAt),
  hasError: optionalBoolean(value.hasError),
  errors: optionalStrings(value.errors),
  labels: optionalStrings(value.labels)
});
export const leadOutput = (value: Row) => {
  const variables = value.variables == null ? undefined : row(value.variables),
    campaign = value.campaign == null ? undefined : row(value.campaign);
  return {
    leadId: text(value._id, 'lead identifier'),
    email: optionalText(value.email ?? variables?.email),
    firstName: optionalText(value.firstName ?? variables?.firstName),
    lastName: optionalText(value.lastName ?? variables?.lastName),
    companyName: optionalText(value.companyName ?? variables?.companyName),
    jobTitle: optionalText(value.jobTitle ?? variables?.jobTitle),
    isPaused: optionalBoolean(value.isPaused),
    state: optionalText(value.state),
    status: optionalText(value.status),
    contactId: optionalText(value.contactId),
    campaignId: optionalText(campaign?.id ?? value.campaignId),
    campaignName: optionalText(campaign?.name ?? value.campaignName),
    campaignStatus: optionalText(campaign?.status),
    updatedAt: optionalText(value.updatedAt),
    variables
  };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string }) {
    const token = text(config.token, 'API key');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.lemlist.com/api',
      authHeader: { value: `Basic ${Buffer.from(`:${token}`).toString('base64')}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error => {
        const rawStatus = getApiErrorStatus(error),
          status =
            typeof rawStatus === 'number' &&
            Number.isInteger(rawStatus) &&
            rawStatus >= 100 &&
            rawStatus <= 599
              ? rawStatus
              : typeof rawStatus === 'string' && /^[1-5]\d{2}$/.test(rawStatus)
                ? Number(rawStatus)
                : undefined;
        return buildApiServiceError(error, {
          providerLabel: 'Lemlist',
          reason: 'lemlist_api_error',
          extractResponse: () => ({ status }),
          extractMessage: () =>
            status === 429
              ? 'Rate limit exceeded. Wait for the provider Retry-After interval before retrying; writes are not retried automatically.'
              : status === 401
                ? 'Check the API key and its access to this team.'
                : status === 403
                  ? 'This API key or plan cannot perform the requested operation.'
                  : status === 409
                    ? 'The operation conflicts with provider state. Protected opt-outs cannot be re-subscribed.'
                    : 'The provider rejected or could not complete the request. Check the supplied fields and resource access.',
          parent: createApiServiceError('Lemlist upstream request failed.', {
            upstreamStatus: status
          })
        });
      }
    });
  }
  async listCampaigns(
    params: {
      offset?: number;
      limit?: number;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ) {
    page(params.offset, 0);
    page(params.limit, 1, 100);
    return rows(
      (await this.axios.get<unknown>('/campaigns', { params: { version: 'v2', ...params } }))
        .data
    ).map(item => entity(item));
  }
  async getCampaign(campaignId: string) {
    return entity(
      (await this.axios.get<unknown>(`/campaigns/${segment(campaignId)}`)).data,
      campaignId
    );
  }
  async createCampaign(name: string) {
    return entity(
      (await this.axios.post<unknown>('/campaigns', { name: text(name, 'campaign name') }))
        .data
    );
  }
  async updateCampaign(campaignId: string, data: Row) {
    if (data.name !== undefined) text(data.name, 'campaign name');
    return row(
      (await this.axios.patch<unknown>(`/campaigns/${segment(campaignId)}`, pickDefined(data)))
        .data
    );
  }
  async pauseCampaign(campaignId: string) {
    return entity(
      (await this.axios.post<unknown>(`/campaigns/${segment(campaignId)}/pause`)).data,
      campaignId
    );
  }
  async startCampaign(campaignId: string) {
    return entity(
      (await this.axios.post<unknown>(`/campaigns/${segment(campaignId)}/start`)).data,
      campaignId
    );
  }
  async getCampaignStats(
    campaignId: string,
    params: { startDate: string; endDate: string; sendUser?: string; channels?: string[] }
  ) {
    for (const value of [params.startDate, params.endDate])
      if (!validTimestamp(value))
        throw createApiServiceError(
          'Statistics dates must be valid ISO 8601 timestamps with a timezone.'
        );
    if (Date.parse(params.startDate) > Date.parse(params.endDate))
      throw createApiServiceError('startDate must not be later than endDate.');
    return row(
      (
        await this.axios.get<unknown>(`/v2/campaigns/${segment(campaignId)}/stats`, {
          params: {
            ...params,
            channels: params.channels ? JSON.stringify(params.channels) : undefined
          }
        })
      ).data
    );
  }
  async addLeadToCampaign(
    campaignId: string,
    lead: Row,
    options?: {
      deduplicate?: boolean;
      linkedinEnrichment?: boolean;
      findEmail?: boolean;
      verifyEmail?: boolean;
      findPhone?: boolean;
    }
  ) {
    const result = entity(
      (
        await this.axios.post<unknown>(
          `/campaigns/${segment(campaignId)}/leads/`,
          pickDefined(lead),
          { params: options }
        )
      ).data
    );
    if (result.campaignId !== undefined && result.campaignId !== campaignId)
      throw createApiServiceError(
        'Lemlist added the lead to a different campaign than requested.'
      );
    return result;
  }
  async getCampaignLeads(campaignId: string, params: { state?: string; limit?: number } = {}) {
    page(params.limit, 1, 500);
    return rows(
      (await this.axios.get<unknown>(`/campaigns/${segment(campaignId)}/leads/`, { params }))
        .data
    ).map(item => entity(item));
  }
  async getLeadById(leadId: string, campaignId?: string) {
    const result = entity(
      (
        await this.axios.get<unknown>('/leads', {
          params: { id: text(leadId), version: 'v2' }
        })
      ).data,
      leadId
    );
    if (
      campaignId !== undefined &&
      text(result.campaignId, 'lead campaign identifier') !== campaignId
    )
      throw createApiServiceError('The lead does not belong to the requested campaign.');
    return result;
  }
  async getLeadByEmail(email: string) {
    return rows(
      (
        await this.axios.get<unknown>(`/leads/${segment(email)}`, {
          params: { version: 'v2' }
        })
      ).data
    ).map(item => entity(item));
  }
  async updateLead(campaignId: string, leadId: string, data: Row) {
    const result = entity(
      (
        await this.axios.patch<unknown>(
          `/campaigns/${segment(campaignId)}/leads/${segment(leadId)}`,
          pickDefined(data)
        )
      ).data,
      leadId
    );
    if (result.campaignId !== undefined && result.campaignId !== campaignId)
      throw createApiServiceError('Lemlist returned a lead from a different campaign.');
    return result;
  }
  async deleteLead(campaignId: string, leadId: string, action?: 'remove') {
    const current = await this.getLeadById(leadId, campaignId),
      target =
        action === 'remove' ? leadId : text(current.email, 'lead email for unsubscribing');
    return entity(
      (
        await this.axios.delete<unknown>(
          `/campaigns/${segment(campaignId)}/leads/${segment(target)}`,
          { params: action ? { action } : undefined }
        )
      ).data,
      leadId
    );
  }
  async markLeadInterested(leadId: string, campaignId: string) {
    return entity(
      (
        await this.axios.post<unknown>(
          `/campaigns/${segment(campaignId)}/leads/${segment(leadId)}/interested`
        )
      ).data,
      leadId
    );
  }
  async markLeadNotInterested(leadId: string, campaignId: string) {
    return entity(
      (
        await this.axios.post<unknown>(
          `/campaigns/${segment(campaignId)}/leads/${segment(leadId)}/notinterested`
        )
      ).data,
      leadId
    );
  }
  async pauseLead(leadId: string, campaignId: string) {
    return rows(
      (
        await this.axios.post<unknown>(`/leads/pause/${segment(leadId)}`, undefined, {
          params: { campaignId: text(campaignId) }
        })
      ).data
    ).map(item => entity(item));
  }
  async resumeLead(leadId: string, campaignId: string) {
    return rows(
      (
        await this.axios.post<unknown>(`/leads/start/${segment(leadId)}`, undefined, {
          params: { campaignId: text(campaignId) }
        })
      ).data
    ).map(item => entity(item));
  }
  async getActivities(
    params: {
      type?: string;
      campaignId?: string;
      leadId?: string;
      isFirst?: boolean;
      offset?: number;
      limit?: number;
    } = {}
  ) {
    page(params.offset, 0);
    page(params.limit, 1, 100);
    return rows(
      (await this.axios.get<unknown>('/activities', { params: { version: 'v2', ...params } }))
        .data
    ).map(item => entity(item));
  }
  async listUnsubscribes(params: { offset?: number; limit?: number } = {}) {
    page(params.offset, 0);
    page(params.limit, 1, 100);
    return rows((await this.axios.get<unknown>('/unsubscribes', { params })).data);
  }
  async getUnsubscribeStatus(email: string) {
    return row((await this.axios.get<unknown>(`/unsubscribes/${segment(email)}`)).data);
  }
  async addUnsubscribe(email: string) {
    return entity((await this.axios.post<unknown>(`/unsubscribes/${segment(email)}`)).data);
  }
  async removeUnsubscribe(email: string) {
    return entity((await this.axios.delete<unknown>(`/unsubscribes/${segment(email)}`)).data);
  }
  async listUnsubscribedVariables(params: { offset?: number; limit?: number } = {}) {
    page(params.offset, 0);
    page(params.limit, 1, 100);
    return rows(
      (await this.axios.get<unknown>('/v2/unsubscribes/variables', { params })).data
    ).map(item => entity(item));
  }
  async getVariableSubscription(value: string) {
    const result = entity(
      (await this.axios.get<unknown>(`/v2/unsubscribes/variables/${segment(value)}`)).data
    );
    if (text(result.value, 'unsubscribe value') !== value)
      throw createApiServiceError('Lemlist returned a different unsubscribe value.');
    return result;
  }
  async unsubscribeVariable(value: string) {
    return entity(
      (await this.axios.post<unknown>(`/v2/unsubscribes/variables/${segment(value)}`)).data
    );
  }
  async resubscribeVariable(value: string) {
    await this.axios.delete<unknown>(`/v2/unsubscribes/variables/${segment(value)}`);
  }
  async getContactSubscription(contactId: string) {
    const result = entity(
      (await this.axios.get<unknown>(`/v2/unsubscribes/contacts/${segment(contactId)}`)).data,
      contactId
    );
    if (typeof result.doNotContact !== 'boolean')
      throw createApiServiceError('Lemlist returned invalid contact subscription status.');
    return result;
  }
  async unsubscribeContact(contactId: string) {
    await this.axios.post<unknown>(`/v2/unsubscribes/contacts/${segment(contactId)}`);
  }
  async resubscribeContact(contactId: string) {
    await this.axios.delete<unknown>(`/v2/unsubscribes/contacts/${segment(contactId)}`);
  }
  async getTeam() {
    return entity(
      (await this.axios.get<unknown>('/team', { params: { version: 'v2' } })).data
    );
  }
  async getTeamCredits() {
    return row((await this.axios.get<unknown>('/team/credits')).data);
  }
  async searchPeople(params: {
    filters?: Array<{ filterId: string; in?: string[]; out?: string[] }>;
    page?: number;
    size?: number;
    search?: string;
  }) {
    page(params.page, 1);
    page(params.size, 1, 100);
    if (!params.filters?.length && !params.search?.trim())
      throw createApiServiceError(
        'Provide search filters or a text query. Use Get Database Filters to discover valid filter IDs.'
      );
    for (const filter of params.filters ?? []) {
      text(filter.filterId, 'database filter ID');
      if (!filter.in?.length && !filter.out?.length)
        throw createApiServiceError(
          'Each database filter requires included or excluded values.'
        );
    }
    const result = row((await this.axios.post<unknown>('/database/people', params)).data);
    rows(result.results);
    return result;
  }
  async getDatabaseFilters(mode?: 'leads' | 'companies') {
    return rows(
      (await this.axios.get<unknown>('/database/filters', { params: { usage: 'api', mode } }))
        .data
    );
  }
  async getCampaignSequences(campaignId: string) {
    return row(
      (await this.axios.get<unknown>(`/campaigns/${segment(campaignId)}/sequences`)).data
    );
  }
}
