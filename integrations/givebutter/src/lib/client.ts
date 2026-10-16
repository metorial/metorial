import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export class Client {
  private rawResponses = new WeakMap<object, Record<string, unknown>>();
  private ax = createAxios({
    baseURL: 'https://api.givebutter.com/v1',
    timeout: 30_000,
    maxRedirects: 0
  });

  constructor(private config: { token: string }) {
    if (typeof config.token !== 'string' || !config.token.trim())
      throw createApiServiceError('A Givebutter API key is required.');
    this.ax.interceptors.response.use(
      response => {
        if (response.config.method !== 'delete') {
          let path = response.config.url ?? '';
          response.data = this.normalizeResponse(response.data, path);
        }
        return response;
      },
      error => {
        throw buildApiServiceError(error, {
          providerLabel: 'Givebutter',
          reason: 'givebutter_api_error',
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
          extractMessage: (failure, helpers) => {
            let response = helpers.getResponseWithBody(failure);
            let details: string[] = [];
            if (helpers.isRecord(response?.data)) {
              helpers.collectDetails(response.data, details);
              if (helpers.isRecord(response.data.errors)) {
                for (let [field, messages] of Object.entries(response.data.errors)) {
                  let fieldDetails: string[] = [];
                  helpers.collectDetails(messages, fieldDetails);
                  if (fieldDetails.length)
                    details.push(`${field}: ${fieldDetails.join('; ')}`);
                }
              }
            }
            return this.publicData(
              details.length ? details.join('; ') : 'The request could not be completed.'
            );
          },
          parent: {}
        });
      }
    );
  }

  publicData<T>(value: T): T {
    let sanitize = (entry: unknown): unknown => {
      if (typeof entry === 'string') {
        let text = entry.split(this.config.token).join('[redacted]');
        text = text.split(encodeURIComponent(this.config.token)).join('[redacted]');
        text = text.replace(/https?:\/\/[^\s<>"']+/g, source => {
          try {
            let url = new URL(source);
            let changed = false;
            if (url.username || url.password) {
              url.username = '[redacted]';
              url.password = '';
              changed = true;
            }
            for (let key of url.searchParams.keys()) {
              if (
                /^(?:api[_-]?key|access[_-]?token|api[_-]?token|oauth[_-]?token|token|secret|password|authorization|auth|key|signature|sig|x-amz-[\w-]+|x-goog-[\w-]+)$/i.test(
                  key
                )
              ) {
                url.searchParams.set(key, '[redacted]');
                changed = true;
              }
            }
            return changed ? url.toString() : source;
          } catch {
            return source;
          }
        });
        return text.replace(
          /([?&](?:api[_-]?key|access[_-]?token|api[_-]?token|oauth[_-]?token|token|secret|password|authorization|auth|key|signature|sig|x-amz-[\w-]+|x-goog-[\w-]+)=)[^&#\s]*/gi,
          '$1[redacted]'
        );
      }
      if (Array.isArray(entry)) return entry.map(sanitize);
      if (isApiErrorRecord(entry))
        return Object.fromEntries(
          Object.entries(entry).map(([key, item]) => [
            key,
            /^(?:api[_-]?key|access[_-]?token|api[_-]?token|oauth[_-]?token|token|secret|password|authorization|auth|key|signature|sig|x-amz-[\w-]+|x-goog-[\w-]+)$/i.test(
              key
            )
              ? '[redacted]'
              : sanitize(item)
          ])
        );
      return entry;
    };
    return sanitize(value) as T;
  }

  rawData(value: Record<string, unknown>): Record<string, unknown> {
    return this.publicData(this.rawResponses.get(value) ?? value);
  }

  nullableId(value: unknown): string | null | undefined {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
      return String(value);
    throw createApiServiceError('Givebutter returned an invalid related resource ID.');
  }

  array(value: unknown): any[] {
    if (!Array.isArray(value) || !value.every(isApiErrorRecord))
      throw createApiServiceError('Givebutter returned a missing or invalid array.');
    return value;
  }

  output<T>(schema: z.ZodType<T>, value: unknown): T {
    let result = schema.safeParse(value);
    if (!result.success)
      throw createApiServiceError('Givebutter returned an invalid or incomplete response.');
    return this.publicData(result.data);
  }

  private identifier(value: string | number, name: string): string {
    if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 1))
      throw createApiServiceError(`${name} must be a positive integer.`);
    if (typeof value === 'string' && !value.trim())
      throw createApiServiceError(`${name} is required.`);
    return encodeURIComponent(String(value));
  }

  private normalizeResponse(value: unknown, path: string): any {
    if (!isApiErrorRecord(value))
      throw createApiServiceError('Givebutter returned an invalid response.');
    if (Array.isArray(value.data)) {
      let meta = value.meta;
      if (
        !isApiErrorRecord(meta) ||
        !['total', 'current_page', 'last_page'].every(key => Number.isSafeInteger(meta[key]))
      )
        throw createApiServiceError('Givebutter returned invalid pagination metadata.');
      return { ...value, data: value.data.map(item => this.normalizeResponse(item, path)) };
    }
    let segments = new URL(path, 'https://api.givebutter.com').pathname
      .split('/')
      .filter(Boolean);
    let resource = segments.find(part =>
      [
        'campaigns',
        'contacts',
        'members',
        'teams',
        'funds',
        'tickets',
        'payouts',
        'plans',
        'transactions',
        'account'
      ].includes(part)
    );
    if (segments.includes('members')) resource = 'members';
    if (segments.includes('teams')) resource = 'teams';
    if (
      resource === 'restore' ||
      resource === 'add' ||
      resource === 'remove' ||
      resource === 'sync'
    )
      resource = 'contacts';
    let record = { ...value };
    let numeric = (entry: unknown, field: string): number => {
      let number =
        typeof entry === 'number'
          ? entry
          : typeof entry === 'string' && /^\d+$/.test(entry)
            ? Number(entry)
            : Number.NaN;
      if (!Number.isSafeInteger(number) || number < 1)
        throw createApiServiceError(`Givebutter returned an invalid ${field}.`);
      return number;
    };
    if (['campaigns', 'contacts', 'members', 'teams'].includes(resource ?? ''))
      record.id = numeric(record.id, 'resource ID');
    else if (
      (typeof record.id !== 'string' || !record.id.trim()) &&
      (typeof record.id !== 'number' || !Number.isSafeInteger(record.id) || record.id < 1)
    )
      throw createApiServiceError('Givebutter returned a missing resource ID.');
    if (record.campaign_id !== undefined && record.campaign_id !== null)
      record.campaign_id = numeric(record.campaign_id, 'campaign ID');
    if (record.account_id !== undefined && record.account_id !== null)
      record.account_id = String(record.account_id);
    if (resource === 'contacts') {
      for (let field of [
        'tags',
        'emails',
        'phones',
        'addresses',
        'custom_fields',
        'external_ids'
      ]) {
        if (!Array.isArray(record[field]))
          throw createApiServiceError(`Givebutter returned invalid contact ${field}.`);
      }
    }
    if (resource === 'transactions' && record.transactions !== undefined) {
      if (!Array.isArray(record.transactions))
        throw createApiServiceError('Givebutter returned invalid sub-transactions.');
      record.transactions = record.transactions.map(item => {
        if (
          !isApiErrorRecord(item) ||
          ((typeof item.id !== 'string' || !item.id.trim()) &&
            (typeof item.id !== 'number' || !Number.isSafeInteger(item.id) || item.id < 1)) ||
          !Array.isArray(item.line_items)
        )
          throw createApiServiceError('Givebutter returned an invalid sub-transaction.');
        return item;
      });
    }
    if (resource === 'contacts' && isApiErrorRecord(record.stats)) {
      let stats = { ...record.stats };
      record.stats = stats;
      for (let key of ['total_contributions', 'recurring_contributions']) {
        let field = stats[key];
        if (typeof field === 'string' && field.trim() && Number.isFinite(Number(field)))
          stats[key] = Number(field);
      }
    }
    if (resource === 'plans') {
      for (let field of ['amount', 'fee_covered']) {
        let value = record[field];
        if (
          typeof value === 'string' &&
          /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()) &&
          Number.isFinite(Number(value))
        )
          record[field] = Number(value);
      }
    }
    let boolean = (entry: unknown): unknown => {
      if (entry === 'true' || entry === '1' || entry === 1) return true;
      if (entry === 'false' || entry === '0' || entry === 0) return false;
      return entry;
    };
    if (resource === 'campaigns' && isApiErrorRecord(record.event)) {
      record.event = {
        ...record.event,
        private: boolean(record.event.private),
        tickets_required: boolean(record.event.tickets_required)
      };
    }
    if (resource === 'contacts') {
      for (let field of [
        'is_email_subscribed',
        'is_phone_subscribed',
        'is_address_subscribed'
      ])
        record[field] = boolean(record[field]);
      record.addresses = this.array(record.addresses).map(address => {
        if (!isApiErrorRecord(address))
          throw createApiServiceError('Givebutter returned an invalid contact address.');
        let primary = address.is_primary;
        return {
          ...address,
          is_primary:
            primary === true || primary === '1'
              ? 1
              : primary === false || primary === '0'
                ? 0
                : primary
        };
      });
    }
    if (
      resource === 'transactions' &&
      isApiErrorRecord(record.giving_space) &&
      record.giving_space.id !== null &&
      record.giving_space.id !== undefined
    )
      record.giving_space = {
        ...record.giving_space,
        id: numeric(record.giving_space.id, 'giving space ID')
      };
    if (resource === 'transactions' && Array.isArray(record.transactions)) {
      record.transactions = record.transactions.map(item => ({
        ...item,
        captured: boolean(item.captured),
        refunded: boolean(item.refunded)
      }));
    }
    this.rawResponses.set(record, value);
    return record;
  }

  private validatePagination(params?: { page?: number; per_page?: number }) {
    for (let key of ['page', 'per_page'] as const) {
      let value = params?.[key];
      if (
        value !== undefined &&
        (!Number.isSafeInteger(value) || value < 1 || (key === 'per_page' && value > 100))
      )
        throw createApiServiceError(
          `${key} must be a positive integer${key === 'per_page' ? ' up to 100' : ''}.`
        );
    }
  }

  private validateGoal(goal: unknown) {
    if (
      goal !== undefined &&
      (typeof goal !== 'number' || !Number.isSafeInteger(goal) || goal < 0)
    )
      throw createApiServiceError('The campaign goal must be a non-negative integer.');
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  async getAccount(): Promise<any> {
    let response = await this.ax.get('https://api.givebutter.com/sso/v1/account', {
      headers: this.headers
    });
    return response.data;
  }

  async manageContactTags(
    contactId: number,
    action: 'add' | 'remove' | 'sync',
    tags: string[]
  ): Promise<any> {
    let response = await this.ax.post(
      `/contacts/${this.identifier(contactId, 'Contact ID')}/tags/${action}`,
      { tags },
      { headers: this.headers }
    );
    return response.data;
  }

  // --- Campaigns ---

  async listCampaigns(params?: {
    page?: number;
    per_page?: number;
    scope?: string;
  }): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get('/campaigns', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getCampaign(campaignId: number | string): Promise<any> {
    let response = await this.ax.get(
      `/campaigns/${this.identifier(campaignId, 'campaignId')}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async createCampaign(data: {
    title?: string;
    type?: string;
    subtitle?: string;
    description?: string;
    slug?: string;
    goal?: number;
    end_at?: string;
  }): Promise<any> {
    this.validateGoal(data.goal);
    let response = await this.ax.post('/campaigns', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCampaign(
    campaignId: number | string,
    data: {
      title?: string;
      type?: string;
      subtitle?: string;
      description?: string;
      slug?: string;
      goal?: number | string;
      published?: boolean;
      public?: boolean;
      end_at?: string;
    }
  ): Promise<any> {
    this.validateGoal(data.goal);
    let response = await this.ax.put(
      `/campaigns/${this.identifier(campaignId, 'campaignId')}`,
      data,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteCampaign(campaignId: number | string): Promise<void> {
    await this.ax.delete(`/campaigns/${this.identifier(campaignId, 'campaignId')}`, {
      headers: this.headers
    });
  }

  // --- Contacts ---

  async listContacts(params?: {
    page?: number;
    per_page?: number;
    scope?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    tags?: string;
    updatedAfter?: string;
  }): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get('/contacts', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getContact(contactId: number | string): Promise<any> {
    let response = await this.ax.get(`/contacts/${this.identifier(contactId, 'contactId')}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createContact(data: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    emails?: Array<{ type?: string; value: string }>;
    phones?: Array<{ type?: string; value: string }>;
    addresses?: Array<{
      address_1?: string;
      address_2?: string;
      city?: string;
      state?: string;
      zipcode?: string;
      country?: string;
    }>;
    tags?: string[];
    dob?: string;
    company?: string;
    title?: string;
    twitter_url?: string;
    linkedin_url?: string;
    facebook_url?: string;
    force_create?: boolean;
  }): Promise<any> {
    let response = await this.ax.post(
      '/contacts',
      {
        ...data,
        emails: data.emails?.map(email => email.value),
        phones: data.phones?.map(phone => phone.value)
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateContact(
    contactId: number | string,
    data: {
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      dob?: string;
      company?: string;
      title?: string;
      twitter_url?: string;
      linkedin_url?: string;
      facebook_url?: string;
    }
  ): Promise<any> {
    let response = await this.ax.put(
      `/contacts/${this.identifier(contactId, 'contactId')}`,
      data,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async archiveContact(contactId: number | string): Promise<void> {
    await this.ax.delete(`/contacts/${this.identifier(contactId, 'contactId')}`, {
      headers: this.headers
    });
  }

  async restoreContact(contactId: number | string): Promise<any> {
    let response = await this.ax.patch(
      `/contacts/${this.identifier(contactId, 'Contact ID')}/restore`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // --- Transactions ---

  async listTransactions(params?: {
    page?: number;
    per_page?: number;
    scope?: string;
    transactedAfter?: string;
    transactedBefore?: string;
    contacts?: string;
    method?: string;
  }): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get('/transactions', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTransaction(transactionId: string): Promise<any> {
    let response = await this.ax.get(
      `/transactions/${this.identifier(transactionId, 'transactionId')}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async createTransaction(data: {
    campaign_id?: number;
    campaign_code?: string;
    first_name: string;
    last_name: string;
    email: string;
    amount: number;
    method: string;
    phone?: string;
    company?: string;
    address?: {
      address_1?: string;
      address_2?: string;
      city?: string;
      state?: string;
      zipcode?: string;
      country?: string;
    };
    fund_id?: number | string;
    transacted_at?: string;
  }): Promise<any> {
    if (
      !Number.isFinite(data.amount) ||
      data.amount < 0 ||
      (data.amount === 0 && data.method !== 'in_kind')
    )
      throw createApiServiceError(
        'The amount must be positive, except zero is allowed for in_kind.'
      );
    let campaignCode = data.campaign_code;
    if (data.campaign_id !== undefined) {
      let campaign = await this.getCampaign(data.campaign_id);
      if (typeof campaign.code !== 'string' || !campaign.code)
        throw createApiServiceError('The campaign response did not include a campaign code.');
      if (campaignCode && campaignCode !== campaign.code)
        throw createApiServiceError(
          'campaignId and campaignCode refer to different campaigns.'
        );
      campaignCode = campaign.code;
    }
    let fundCode: string | undefined;
    if (data.fund_id !== undefined) {
      let fund = await this.getFund(String(data.fund_id));
      if (typeof fund.code !== 'string' || !fund.code)
        throw createApiServiceError(
          'The selected fund has no code and cannot be used to record a transaction.'
        );
      fundCode = fund.code;
    }
    let { campaign_id: _campaignId, fund_id: _fundId, address, ...fields } = data;
    let response = await this.ax.post(
      '/transactions',
      {
        ...fields,
        ...address,
        amount: String(data.amount),
        method: data.method === 'in_kind' ? 'in-kind' : data.method,
        campaign_code: campaignCode,
        fund_code: fundCode,
        transacted_at: data.transacted_at ?? new Date().toISOString()
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // --- Plans ---

  async listPlans(params?: {
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get('/plans', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getPlan(planId: string): Promise<any> {
    let response = await this.ax.get(`/plans/${this.identifier(planId, 'planId')}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Funds ---

  async listFunds(params?: {
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get('/funds', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getFund(fundId: string): Promise<any> {
    let response = await this.ax.get(`/funds/${this.identifier(fundId, 'fundId')}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createFund(data: { name: string; code?: string }): Promise<any> {
    let response = await this.ax.post('/funds', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateFund(fundId: string, data: { name?: string; code?: string }): Promise<any> {
    if (data.name === undefined) {
      let current = await this.getFund(fundId);
      if (typeof current.name !== 'string' || !current.name)
        throw createApiServiceError('Givebutter returned a fund without a name.');
      data = { ...data, name: current.name };
    }
    let response = await this.ax.put(`/funds/${this.identifier(fundId, 'fundId')}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteFund(fundId: string): Promise<void> {
    await this.ax.delete(`/funds/${this.identifier(fundId, 'fundId')}`, {
      headers: this.headers
    });
  }

  // --- Tickets ---

  async listTickets(params?: {
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get('/tickets', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTicket(ticketId: string): Promise<any> {
    let response = await this.ax.get(`/tickets/${this.identifier(ticketId, 'ticketId')}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Payouts ---

  async listPayouts(params?: {
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get('/payouts', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getPayout(payoutId: string): Promise<any> {
    let response = await this.ax.get(`/payouts/${this.identifier(payoutId, 'payoutId')}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Campaign Members ---

  async listMembers(
    campaignId: number | string,
    params?: { page?: number; per_page?: number }
  ): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get(
      `/campaigns/${this.identifier(campaignId, 'campaignId')}/members`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async getMember(campaignId: number | string, memberId: number | string): Promise<any> {
    let response = await this.ax.get(
      `/campaigns/${this.identifier(campaignId, 'campaignId')}/members/${this.identifier(memberId, 'memberId')}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteMember(campaignId: number | string, memberId: number | string): Promise<void> {
    await this.ax.delete(
      `/campaigns/${this.identifier(campaignId, 'campaignId')}/members/${this.identifier(memberId, 'memberId')}`,
      {
        headers: this.headers
      }
    );
  }

  // --- Campaign Teams ---

  async listTeams(
    campaignId: number | string,
    params?: { page?: number; per_page?: number }
  ): Promise<PaginatedResponse<any>> {
    this.validatePagination(params);
    let response = await this.ax.get(
      `/campaigns/${this.identifier(campaignId, 'campaignId')}/teams`,
      {
        headers: this.headers,
        params
      }
    );
    return response.data;
  }

  async getTeam(campaignId: number | string, teamId: number | string): Promise<any> {
    let response = await this.ax.get(
      `/campaigns/${this.identifier(campaignId, 'campaignId')}/teams/${this.identifier(teamId, 'teamId')}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}
