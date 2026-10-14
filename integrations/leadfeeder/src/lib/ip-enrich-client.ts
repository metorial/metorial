import { isIP } from 'node:net';
import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface IpEnrichCompany {
  enrichmentId: string;
  ipAddress: string;
  confidenceScore: string;
  companyName: string;
  companyDomain: string;
  logoUrl: string;
  revenueYear: number | null;
  revenueAmount: number | null;
  employeesMin: number | null;
  employeesMax: number | null;
  industryName: string;
  sicCodes: string[];
  naicsCodes: string[];
  twitterUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  businessIds: Array<{ countryCode: string; key: string; value: string }>;
  city: string;
  region: string;
  countryCode: string;
}

export class IpEnrichClient {
  private http;

  constructor(apiKey: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.lf-discover.com',
      authHeader: { name: 'X-API-KEY', value: apiKey },
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Leadfeeder IP-Enrich',
          reason: 'leadfeeder_ip_enrich_api_error'
        })
    });
  }

  async enrichIp(ipAddress: string): Promise<IpEnrichCompany> {
    if (!isIP(ipAddress)) {
      throw createApiServiceError(
        'ipAddress must be a valid IPv4 or IPv6 address without brackets.'
      );
    }
    let response = await this.http.get('/companies', {
      params: { ip: ipAddress }
    });

    let data = response.data;
    if (!data || typeof data !== 'object') {
      throw createApiServiceError(
        'IP-Enrich returned a response without company information.'
      );
    }
    let company = data.company ?? {};
    let location = data.location ?? {};
    let revenue = company.revenue ?? {};
    let employeesRange = company.employees_range ?? {};
    let industries = company.industries ?? {};
    let social = company.social ?? {};

    return {
      enrichmentId: data.id ?? '',
      ipAddress: data.ip_address ?? ipAddress,
      confidenceScore: data.confidence_score ?? '',
      companyName: company.name ?? '',
      companyDomain: company.domain ?? '',
      logoUrl: company.logo_url ?? '',
      revenueYear: parseNumericValue(revenue.year),
      revenueAmount: parseNumericValue(revenue.amount),
      employeesMin: parseNumericValue(employeesRange.min),
      employeesMax: parseNumericValue(employeesRange.max),
      industryName: industries.name ?? '',
      sicCodes: (industries.sic ?? []).map((s: any) => String(s)),
      naicsCodes: (industries.naics ?? []).map((n: any) => String(n)),
      twitterUrl: social.twitter ?? '',
      facebookUrl: social.facebook ?? '',
      linkedinUrl: social.linkedin ?? '',
      businessIds: (data.business_ids ?? company.business_ids ?? []).map((b: any) => ({
        countryCode: b.country_code ?? '',
        key: b.key ?? '',
        value: b.value ?? ''
      })),
      city: location.city ?? '',
      region: location.region ?? '',
      countryCode: location.country_code ?? ''
    };
  }
}

let parseNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  let parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
