import { createAxios } from 'slates';

export interface IndividualRevealRequest {
  profileUrl?: string;
  fullName?: string;
  company?: string;
  domain?: string;
  email?: string;
  enrichmentLevel?: 'none' | 'partial' | 'phone' | 'full';
  acceptWork?: boolean;
  acceptPersonal?: boolean;
  callbackUrl?: string;
}

export interface IndividualRevealResponse {
  status: {
    code: number;
    message: string;
  };
  type: string;
  data: {
    id: number;
    status: string;
    is_complete: boolean;
    name?: string;
    title?: string;
    location?: string;
    linkedin_profile_url?: string;
    email?: string;
    email_type?: string;
    email_status?: string;
    emails?: Array<{
      email: string;
      email_type: string;
      email_status: string;
    }>;
    mobile_phone?: string;
    phone_number?: string;
    phone_status?: string;
    phones?: Array<{
      phone_number: string;
      phone_type: string;
    }>;
    company?: string;
    company_domain?: string;
    company_linkedin?: string;
    company_size?: number;
    company_size_range?: string;
    company_type?: string;
    company_location?: string;
    company_locality?: string;
    company_region?: string;
    company_country?: string;
    company_street?: string;
    company_postal_code?: string;
    company_industry?: string;
    company_subindustry?: string;
    company_description?: string;
    company_founded?: number;
    company_funding?: string;
    company_revenue?: string;
    enrichment_level?: string;
    headline?: string;
    bio?: string;
    work_history?: Record<string, unknown>[];
    skills?: string[];
    languages?: string[];
    certifications?: Record<string, unknown>[];
    education?: Record<string, unknown>[];
    is_premium?: boolean;
    is_open_to_work?: boolean;
    tenure_at_company?: string;
    tenure_at_role?: string;
    fail_error?: string;
    credits?: {
      email_credits: number;
      phone_credits: number;
      export_credits: number;
      api_credits: {
        total: number;
        email_credits: number;
        phone_credits: number;
        scrape_credits: number;
      };
    };
    [key: string]: unknown;
  };
}

export interface CompanyEnrichmentRequest {
  companyName?: string;
  companyDomain?: string;
  companyLinkedinId?: string;
  companyLinkedinSlug?: string;
}

export interface CompanyEnrichmentResponse {
  status: {
    code: number;
    message: string;
  };
  type: string;
  data: {
    company_name?: string;
    company_domain?: string;
    company_linkedin?: string;
    company_industry?: string;
    company_subindustry?: string;
    company_size?: number;
    company_size_range?: string;
    company_type?: string;
    company_description?: string;
    company_founded?: number;
    company_revenue?: string;
    company_funding?: string;
    company_last_funding_round?: string;
    company_ticker?: string;
    company_location?: string;
    company_street?: string;
    company_locality?: string;
    company_region?: string;
    company_postal_code?: string;
    company_country?: string;
    twitter_url?: string;
    facebook_url?: string;
    linkedin_url?: string;
    [key: string]: unknown;
  };
}

export interface CreditsResponse {
  credits: {
    email_credits: number | string;
    phone_credits: number | string;
    export_credits: number | string;
    api_credits: number | string;
  };
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://wiza.co/api',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async startIndividualReveal(
    request: IndividualRevealRequest
  ): Promise<IndividualRevealResponse> {
    let individualReveal: Record<string, unknown> = {};

    if (request.profileUrl) {
      individualReveal.profile_url = request.profileUrl;
    } else if (request.email) {
      individualReveal.email = request.email;
    } else if (request.fullName) {
      individualReveal.full_name = request.fullName;
      if (request.domain) {
        individualReveal.domain = request.domain;
      }
      if (request.company) {
        individualReveal.company = request.company;
      }
    }

    let body: Record<string, unknown> = {
      individual_reveal: individualReveal
    };

    if (request.enrichmentLevel) {
      body.enrichment_level = request.enrichmentLevel;
    }

    let emailOptions: Record<string, boolean> = {};
    if (request.acceptWork !== undefined) {
      emailOptions.accept_work = request.acceptWork;
    }
    if (request.acceptPersonal !== undefined) {
      emailOptions.accept_personal = request.acceptPersonal;
    }
    if (Object.keys(emailOptions).length > 0) {
      body.email_options = emailOptions;
    }

    if (request.callbackUrl) {
      body.callback_url = request.callbackUrl;
    }

    let response = await this.axios.post('/individual_reveals', body);
    return response.data;
  }

  async getIndividualReveal(revealId: number): Promise<IndividualRevealResponse> {
    let response = await this.axios.get(`/individual_reveals/${revealId}`);
    return response.data;
  }

  async enrichCompany(request: CompanyEnrichmentRequest): Promise<CompanyEnrichmentResponse> {
    let body: Record<string, unknown> = {};

    if (request.companyName) {
      body.company_name = request.companyName;
    }
    if (request.companyDomain) {
      body.company_domain = request.companyDomain;
    }
    if (request.companyLinkedinId) {
      body.company_linkedin_id = request.companyLinkedinId;
    }
    if (request.companyLinkedinSlug) {
      body.company_linkedin_slug = request.companyLinkedinSlug;
    }

    let response = await this.axios.post('/company_enrichments', body);
    return response.data;
  }

  async getCredits(): Promise<CreditsResponse> {
    let response = await this.axios.get('/meta/credits');
    return response.data;
  }
}
