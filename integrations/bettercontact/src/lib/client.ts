import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface ContactInput {
  firstName: string;
  lastName: string;
  company?: string;
  companyDomain?: string;
  linkedinUrl?: string;
  customFields?: Record<string, string>;
}

export interface EnrichmentRequest {
  contacts: ContactInput[];
  enrichEmailAddress: boolean;
  enrichPhoneNumber: boolean;
  webhook?: string;
  processFlow?: string;
  verifyCatchAll?: boolean;
  timeoutSeconds?: number;
}

export interface EnrichmentSubmitResponse {
  success: boolean;
  requestId: string;
  message: string;
}

export interface EnrichmentResultSummary {
  total: number;
  valid: number;
  catchAll: number;
  catchAllSafe: number;
  catchAllNotSafe: number;
  undeliverable: number;
  notFound: number;
}

export interface EnrichedContact {
  enriched: boolean;
  emailProvider: string | null;
  phoneProvider: string | null;
  contactFirstName: string;
  contactLastName: string;
  contactEmailAddress: string | null;
  contactEmailAddressStatus: string | null;
  contactPhoneNumber: string | null;
  contactGender: string | null;
  contactJobTitle: string | null;
  customFields: Record<string, string> | null;
  contactId: number | null;
  contactLinkedinUrl: string | null;
  companyName: string | null;
  companyDomain: string | null;
}

export interface EnrichmentResultResponse {
  requestId: string;
  status: string;
  completed: boolean;
  creditsConsumed: number;
  creditsLeft: number;
  summary: EnrichmentResultSummary;
  contacts: EnrichedContact[];
}

export interface CreditsBalanceResponse {
  success: boolean;
  creditsLeft: number;
  email: string;
}

let mapContactToApi = (contact: ContactInput) => {
  let mapped: Record<string, unknown> = {
    first_name: contact.firstName,
    last_name: contact.lastName
  };

  if (contact.company) {
    mapped.company = contact.company;
  }
  if (contact.companyDomain) {
    mapped.company_domain = contact.companyDomain;
  }
  if (contact.linkedinUrl) {
    mapped.linkedin_url = contact.linkedinUrl;
  }
  if (contact.customFields) {
    mapped.custom_fields = contact.customFields;
  }

  return mapped;
};

let mapCustomFields = (value: unknown): Record<string, string> | null => {
  if (Array.isArray(value)) {
    let fields: Record<string, string> = {};
    for (let field of value) {
      if (
        isApiErrorRecord(field) &&
        typeof field.name === 'string' &&
        typeof field.value === 'string'
      ) {
        Object.defineProperty(fields, field.name, {
          value: field.value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      }
    }
    return fields;
  }
  return isApiErrorRecord(value) ? (value as Record<string, string>) : null;
};

let mapEnrichedContact = (data: Record<string, unknown>): EnrichedContact => ({
  enriched: (data.enriched as boolean) ?? false,
  emailProvider:
    (data.contact_email_address_provider as string) ?? (data.email_provider as string) ?? null,
  phoneProvider:
    (data.contact_phone_number_provider as string) ?? (data.phone_provider as string) ?? null,
  contactFirstName: (data.contact_first_name as string) ?? '',
  contactLastName: (data.contact_last_name as string) ?? '',
  contactEmailAddress: (data.contact_email_address as string) ?? null,
  contactEmailAddressStatus: (data.contact_email_address_status as string) ?? null,
  contactPhoneNumber:
    (data.contact_phone_number as string) ?? (data.contact_mobile_phone as string) ?? null,
  contactGender: (data.contact_gender as string) ?? null,
  contactJobTitle: (data.contact_job_title as string) ?? null,
  customFields: mapCustomFields(data.custom_fields),
  contactId: (data.contact_id as number) ?? null,
  contactLinkedinUrl: (data.contact_linkedin_profile_url as string) ?? null,
  companyName: (data.company_name as string) ?? null,
  companyDomain: (data.company_domain as string) ?? null
});

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.bettercontact.rocks/api/v2',
      authHeader: { name: 'X-API-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'BetterContact',
          reason: 'bettercontact_api_error'
        })
    });
  }

  async submitEnrichment(request: EnrichmentRequest): Promise<EnrichmentSubmitResponse> {
    for (let [index, contact] of request.contacts.entries()) {
      if (!contact.company?.trim() && !contact.companyDomain?.trim()) {
        throw createApiServiceError(`Contact ${index + 1} requires company or companyDomain.`);
      }
    }

    let body: Record<string, unknown> = {
      data: request.contacts.map(mapContactToApi),
      enrich_email_address: request.enrichEmailAddress,
      enrich_phone_number: request.enrichPhoneNumber,
      ...pickDefined({
        verify_catch_all: request.verifyCatchAll,
        timeout_seconds: request.timeoutSeconds
      })
    };

    if (request.webhook) {
      body.webhook = request.webhook;
    }
    if (request.processFlow) {
      body.process_flow = request.processFlow;
    }

    let response = await this.axios.post('/async', body);
    if (response.data?.success === false) {
      throw createApiServiceError(
        response.data.error ??
          response.data.message ??
          'BetterContact rejected the enrichment request.'
      );
    }

    return {
      success: response.data.success,
      requestId: response.data.id,
      message: response.data.message
    };
  }

  async getEnrichmentResults(requestId: string): Promise<EnrichmentResultResponse> {
    let response = await this.axios.get(`/async/${encodeURIComponent(requestId)}`);
    let data = isApiErrorRecord(response.data) ? response.data : {};
    let status =
      typeof data.status === 'string'
        ? data.status
        : response.status === 202
          ? 'processing'
          : undefined;
    if (!status) {
      throw createApiServiceError(
        'BetterContact returned enrichment results without a processing status.'
      );
    }
    let completed = status === 'terminated';
    let summary = completed && isApiErrorRecord(data.summary) ? data.summary : {};

    return {
      requestId: typeof data.id === 'string' ? data.id : requestId,
      status,
      completed,
      creditsConsumed: (data.credits_consumed as number) ?? 0,
      creditsLeft: (data.credits_left as number) ?? 0,
      summary: {
        total: (summary.total as number) ?? 0,
        valid: (summary.valid as number) ?? 0,
        catchAll: (summary.catch_all as number) ?? 0,
        catchAllSafe: (summary.catch_all_safe as number) ?? 0,
        catchAllNotSafe: (summary.catch_all_not_safe as number) ?? 0,
        undeliverable: (summary.undeliverable as number) ?? 0,
        notFound: (summary.not_found as number) ?? 0
      },
      contacts:
        completed && Array.isArray(data.data)
          ? data.data.filter(isApiErrorRecord).map(mapEnrichedContact)
          : []
    };
  }

  async getCreditsBalance(): Promise<CreditsBalanceResponse> {
    let response = await this.axios.get('/account');
    if (response.data?.success === false) {
      throw createApiServiceError(
        response.data.error ?? 'BetterContact could not retrieve the account.'
      );
    }

    return {
      success: response.data.success,
      creditsLeft: response.data.credits_left,
      email: response.data.email
    };
  }

  async enrichLeadProfile(input: {
    linkedinUrl?: string;
    firstName?: string;
    lastName?: string;
    companyDomain?: string;
    company?: string;
  }): Promise<Record<string, unknown>> {
    if (!input.linkedinUrl && (!input.firstName || !input.lastName || !input.companyDomain)) {
      throw createApiServiceError(
        'Provide linkedinUrl, or firstName, lastName and companyDomain together.'
      );
    }
    return this.getProfile(
      '/enrich_profile/lead',
      input.linkedinUrl
        ? { linkedin_url: input.linkedinUrl }
        : pickDefined({
            first_name: input.firstName,
            last_name: input.lastName,
            company_domain: input.companyDomain,
            company: input.company
          })
    );
  }

  async enrichCompanyProfile(input: {
    companyDomain?: string;
    companyLinkedinUrl?: string;
  }): Promise<Record<string, unknown>> {
    if (!input.companyDomain && !input.companyLinkedinUrl) {
      throw createApiServiceError('Provide companyDomain or companyLinkedinUrl.');
    }
    return this.getProfile(
      '/enrich_profile/company',
      pickDefined({
        company_domain: input.companyDomain,
        company_linkedin_url: input.companyLinkedinUrl
      })
    );
  }

  private async getProfile(
    path: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(path, body);
    if (response.data?.success === false || !isApiErrorRecord(response.data?.data)) {
      throw createApiServiceError(
        response.data?.error ?? 'BetterContact returned no profile data.'
      );
    }
    return response.data.data;
  }
}

export { mapEnrichedContact };
