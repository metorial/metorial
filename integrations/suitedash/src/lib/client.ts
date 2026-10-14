import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

export interface ClientConfig {
  publicId: string;
  secretKey: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    pagination?: {
      totalPages?: number;
      totalItems?: number;
      currentPageNumber?: number;
      total?: number;
    };
  };
}

export interface ContactInput {
  first_name: string;
  last_name: string;
  email?: string;
  role: string;
  send_welcome_email?: boolean;
  [key: string]: unknown;
}

export interface CompanyInput {
  name: string;
  role: string;
  primaryContact?: {
    first_name?: string;
    last_name?: string;
    email: string;
    send_welcome_email?: boolean;
    create_primary_contact_if_not_exists?: boolean;
    prevent_individual_mode?: boolean;
  };
  [key: string]: unknown;
}

export interface CompanyUpdateInput {
  name?: string;
  website?: string;
  phone?: string;
  full_address?: string;
  tags?: string[];
  background_info?: string;
  [key: string]: unknown;
}

export interface MarketingSubscribeInput {
  contacts: string[];
  audience: string;
}

let providerErrorMessage = (value: unknown) => {
  let details: string[] = [];
  if (!isApiErrorRecord(value)) return undefined;

  let records = [value, ...(Array.isArray(value.data) ? value.data : [])];
  for (let record of records) {
    collectApiErrorDetails(record, details);
    if (isApiErrorRecord(record) && isApiErrorRecord(record.errors)) {
      collectApiErrorDetails(Object.values(record.errors), details);
    }
  }
  return details.length ? details.join('; ') : undefined;
};

let roles: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  client: 'Client'
};

let normalizeContactFields = (data: Record<string, unknown>) => {
  let isCustomField = (key: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  let payload = Object.fromEntries(
    Object.entries(data).filter(([key]) => !isCustomField(key))
  );
  let customFields = Object.fromEntries(
    Object.entries(data).filter(([key]) => isCustomField(key))
  );
  if (Object.keys(customFields).length) {
    payload.custom_fields = {
      ...customFields,
      ...(isApiErrorRecord(data.custom_fields) ? data.custom_fields : {})
    };
  }
  if (typeof payload.role === 'string') payload.role = roles[payload.role] ?? payload.role;
  return payload;
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.suitedash.com/secure-api',
      headers: {
        Accept: 'application/json',
        'X-Public-ID': config.publicId,
        'X-Secret-Key': config.secretKey
      },
      errorMapping: {
        mapAxiosError: error => {
          let message = providerErrorMessage(error.response?.data);
          return message ? { message } : undefined;
        }
      }
    });
  }

  private async request<T = Record<string, unknown>>(
    operation: string,
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    allowPartialSuccess = false
  ): Promise<T> {
    let result = await requestAxiosData<T>(
      operation,
      () => this.http.request<T>({ method, url, data, params }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'SuiteDash',
          reason: 'suitedash_api_error',
          operation
        })
    );

    if (isApiErrorRecord(result) && result.success === false && !allowPartialSuccess) {
      throw createApiServiceError(
        `SuiteDash ${operation} failed: ${providerErrorMessage(result) ?? 'The provider reported an unsuccessful operation.'}`,
        { reason: 'suitedash_api_error' }
      );
    }
    return result;
  }

  private validatePage(page: number) {
    if (!Number.isSafeInteger(page) || page < 1) {
      throw createApiServiceError('Page must be a whole number starting at 1.', {
        reason: 'invalid_page'
      });
    }
  }

  async listContacts(page = 1): Promise<PaginatedResponse<Record<string, unknown>>> {
    this.validatePage(page);
    let result = await this.request<
      PaginatedResponse<Record<string, unknown>> & Record<string, unknown>
    >('list contacts', 'GET', '/contacts', undefined, { page });
    if (!Array.isArray(result.data)) {
      throw createApiServiceError('SuiteDash returned an invalid contact list.', {
        reason: 'invalid_provider_response'
      });
    }
    return result;
  }

  async listAllContacts(): Promise<Record<string, unknown>[]> {
    let contacts: Record<string, unknown>[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      let response = await this.listContacts(page);
      contacts.push(...response.data);
      totalPages = response.meta?.pagination?.totalPages ?? 1;
      page++;
    } while (page <= totalPages);
    return contacts;
  }

  async getContact(identifier: string): Promise<Record<string, unknown>> {
    return this.request('get contact', 'GET', `/contact/${encodeURIComponent(identifier)}`);
  }

  async createContact(data: ContactInput): Promise<Record<string, unknown>> {
    let role = roles[data.role] ?? data.role;
    if (role !== 'Lead' && (typeof data.email !== 'string' || !data.email.trim())) {
      throw createApiServiceError(
        'An email address is required for prospect and client contacts.',
        {
          reason: 'contact_email_required'
        }
      );
    }
    return this.request('create contact', 'POST', '/contact', normalizeContactFields(data));
  }

  async updateContact(
    identifier: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return this.request(
      'update contact',
      'PUT',
      `/contact/${encodeURIComponent(identifier)}`,
      normalizeContactFields(data)
    );
  }

  async listCompanies(page = 1): Promise<PaginatedResponse<Record<string, unknown>>> {
    this.validatePage(page);
    let result = await this.request<
      PaginatedResponse<Record<string, unknown>> & Record<string, unknown>
    >('list companies', 'GET', '/companies', undefined, { page });
    if (!Array.isArray(result.data)) {
      throw createApiServiceError('SuiteDash returned an invalid company list.', {
        reason: 'invalid_provider_response'
      });
    }
    return result;
  }

  async listAllCompanies(): Promise<Record<string, unknown>[]> {
    let companies: Record<string, unknown>[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      let response = await this.listCompanies(page);
      companies.push(...response.data);
      totalPages = response.meta?.pagination?.totalPages ?? 1;
      page++;
    } while (page <= totalPages);
    return companies;
  }

  async getCompany(identifier: string): Promise<Record<string, unknown>> {
    return this.request('get company', 'GET', `/company/${encodeURIComponent(identifier)}`);
  }

  async createCompany(data: CompanyInput): Promise<Record<string, unknown>> {
    return this.request('create company', 'POST', '/company', data);
  }

  async updateCompany(
    companyId: string,
    data: CompanyUpdateInput
  ): Promise<Record<string, unknown>> {
    return this.request(
      'update company',
      'PUT',
      `/company/${encodeURIComponent(companyId)}`,
      data
    );
  }

  async getContactMeta(): Promise<Record<string, unknown>> {
    return this.request('get contact metadata', 'GET', '/contact/meta');
  }

  async getCompanyMeta(): Promise<Record<string, unknown> | null> {
    return this.request('get company metadata', 'GET', '/company/meta');
  }

  async subscribeToMarketingAudience(
    data: MarketingSubscribeInput
  ): Promise<Record<string, unknown>> {
    let audience = Number(data.audience);
    if (!data.audience.trim() || !Number.isSafeInteger(audience) || audience < 1) {
      throw createApiServiceError(
        'Audience identifier must be a positive numeric audience ID. Use Get Metadata to discover available IDs.',
        {
          reason: 'invalid_audience_id'
        }
      );
    }
    if (!data.contacts.length) {
      throw createApiServiceError('Provide at least one contact UID or email address.', {
        reason: 'contacts_required'
      });
    }

    let subscribers: { email: string; audiences: number[] }[] = [];
    for (let identifier of data.contacts) {
      let email = identifier;
      if (!identifier.includes('@')) {
        let response = await this.getContact(identifier);
        let contact = isApiErrorRecord(response.data) ? response.data : undefined;
        if (typeof contact?.email !== 'string' || !contact.email.trim()) {
          throw createApiServiceError(
            `Contact ${identifier} has no email address and cannot subscribe to a marketing audience.`,
            {
              reason: 'contact_email_required'
            }
          );
        }
        email = contact.email;
      }
      subscribers.push({ email, audiences: [audience] });
    }

    return this.request(
      'subscribe to marketing audience',
      'POST',
      '/marketing/subscribe',
      subscribers,
      undefined,
      true
    );
  }
}
