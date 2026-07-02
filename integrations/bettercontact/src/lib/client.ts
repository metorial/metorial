import { createAxios } from 'slates';

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
}

export interface EnrichmentResultResponse {
  requestId: string;
  status: string;
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

let mapEnrichedContact = (data: Record<string, unknown>): EnrichedContact => ({
  enriched: (data.enriched as boolean) ?? false,
  emailProvider: (data.email_provider as string) ?? null,
  phoneProvider: (data.phone_provider as string) ?? null,
  contactFirstName: (data.contact_first_name as string) ?? '',
  contactLastName: (data.contact_last_name as string) ?? '',
  contactEmailAddress: (data.contact_email_address as string) ?? null,
  contactEmailAddressStatus: (data.contact_email_address_status as string) ?? null,
  contactPhoneNumber:
    (data.contact_phone_number as string) ?? (data.contact_mobile_phone as string) ?? null,
  contactGender: (data.contact_gender as string) ?? null,
  contactJobTitle: (data.contact_job_title as string) ?? null,
  customFields: (data.custom_fields as Record<string, string>) ?? null
});

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.bettercontact.rocks/api/v2',
      headers: {
        'X-API-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async submitEnrichment(request: EnrichmentRequest): Promise<EnrichmentSubmitResponse> {
    let body: Record<string, unknown> = {
      data: request.contacts.map(mapContactToApi),
      enrich_email_address: request.enrichEmailAddress,
      enrich_phone_number: request.enrichPhoneNumber
    };

    if (request.webhook) {
      body.webhook = request.webhook;
    }
    if (request.processFlow) {
      body.process_flow = request.processFlow;
    }

    let response = await this.axios.post('/async', body);

    return {
      success: response.data.success,
      requestId: response.data.id,
      message: response.data.message
    };
  }

  async getEnrichmentResults(requestId: string): Promise<EnrichmentResultResponse> {
    let response = await this.axios.get(`/async/${requestId}`);
    let data = response.data;

    return {
      requestId: data.id,
      status: data.status,
      creditsConsumed: data.credits_consumed ?? 0,
      creditsLeft: data.credits_left ?? 0,
      summary: {
        total: data.summary?.total ?? 0,
        valid: data.summary?.valid ?? 0,
        catchAll: data.summary?.catch_all ?? 0,
        catchAllSafe: data.summary?.catch_all_safe ?? 0,
        catchAllNotSafe: data.summary?.catch_all_not_safe ?? 0,
        undeliverable: data.summary?.undeliverable ?? 0,
        notFound: data.summary?.not_found ?? 0
      },
      contacts: (data.data as Record<string, unknown>[])?.map(mapEnrichedContact) ?? []
    };
  }

  async getCreditsBalance(): Promise<CreditsBalanceResponse> {
    let response = await this.axios.get('/account');

    return {
      success: response.data.success,
      creditsLeft: response.data.credits_left,
      email: response.data.email
    };
  }
}

export { mapEnrichedContact };
