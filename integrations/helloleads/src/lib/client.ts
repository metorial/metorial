import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let BASE_URL = 'https://app.helloleads.io/index.php/private/api';

export interface HelloLeadsClientConfig {
  token: string;
  email: string;
}

export interface CreateLeadParams {
  firstName: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  mobileCode?: string;
  phone?: string;
  fax?: string;
  organization?: string;
  designation?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  website?: string;
  notes?: string;
  interests?: string;
  category?: string;
  tags?: string;
  dealSize?: string;
  potential?: string;
  listKey?: string;
}

export type HelloLeadsRecord = Record<string, unknown>;

export let readHelloLeadsString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

let readCollection = (result: unknown, key: 'leads' | 'lists'): HelloLeadsRecord[] => {
  let collection = Array.isArray(result)
    ? result
    : isApiErrorRecord(result)
      ? (result.data ?? result[key])
      : undefined;

  if (!Array.isArray(collection) || !collection.every(isApiErrorRecord)) {
    throw createApiServiceError(
      `HelloLeads returned an invalid ${key} response. Expected a list of records.`,
      { reason: 'helloleads_invalid_response' }
    );
  }

  return collection;
};

export class HelloLeadsClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: HelloLeadsClientConfig) {
    if (!config.token.trim() || !config.email.trim()) {
      throw createApiServiceError(
        'Provide your HelloLeads API key and account email address.'
      );
    }

    this.http = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'hls-key', value: `token=${config.token}` },
      headers: {
        Xemail: config.email
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'HelloLeads',
          reason: 'helloleads_api_error'
        })
    });
  }

  async listLeads(params?: { page?: number; limit?: number }): Promise<HelloLeadsRecord[]> {
    let page = params?.page ?? 1;
    let limit = params?.limit ?? 100;
    if (!Number.isInteger(page) || page < 1) {
      throw createApiServiceError('Page must be a whole number starting at 1.');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw createApiServiceError('Limit must be a whole number between 1 and 100.');
    }

    let response = await this.http.get<unknown>('/leads', {
      params: {
        page,
        limit
      }
    });
    return readCollection(response.data, 'leads');
  }

  async createLead(lead: CreateLeadParams): Promise<HelloLeadsRecord> {
    if (!lead.firstName.trim()) {
      throw createApiServiceError('Provide a first name for the lead.');
    }
    if (!lead.email?.trim() && !lead.mobile?.trim()) {
      throw createApiServiceError(
        'Provide either an email address or mobile number for the lead.'
      );
    }

    let body = pickDefined({
      first_name: lead.firstName,
      last_name: lead.lastName || undefined,
      email: lead.email || undefined,
      mobile: lead.mobile || undefined,
      mobile_code: lead.mobileCode || undefined,
      phone: lead.phone || undefined,
      fax: lead.fax || undefined,
      organization: lead.organization || undefined,
      designation: lead.designation || undefined,
      address: lead.address || undefined,
      city: lead.city || undefined,
      state: lead.state || undefined,
      country: lead.country || undefined,
      zip: lead.zip || undefined,
      website: lead.website || undefined,
      notes: lead.notes || undefined,
      interests: lead.interests || undefined,
      category: lead.category || undefined,
      tags: lead.tags || undefined,
      deal_size: lead.dealSize || undefined,
      potential: lead.potential || undefined,
      list_key: lead.listKey || undefined
    });

    let response = await this.http.post<unknown>('/leads', body);
    let result = response.data;
    let createdLead = isApiErrorRecord(result)
      ? (result.data ?? result.lead ?? result)
      : undefined;
    if (!isApiErrorRecord(createdLead)) {
      throw createApiServiceError('HelloLeads returned an invalid lead creation response.', {
        reason: 'helloleads_invalid_response'
      });
    }

    return createdLead;
  }

  async listLists(): Promise<HelloLeadsRecord[]> {
    let response = await this.http.get<unknown>('/lists');
    return readCollection(response.data, 'lists');
  }

  async getAllLeads(maxResults?: number): Promise<HelloLeadsRecord[]> {
    let allLeads: HelloLeadsRecord[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      let leads = await this.listLeads({ page, limit: 100 });

      if (leads.length === 0) {
        break;
      }

      allLeads.push(...leads);

      if (maxResults && allLeads.length >= maxResults) {
        allLeads = allLeads.slice(0, maxResults);
        break;
      }

      if (leads.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allLeads;
  }
}
