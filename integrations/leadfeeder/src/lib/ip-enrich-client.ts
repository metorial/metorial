import { createAxios } from 'slates';

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
    this.http = createAxios({
      baseURL: 'https://api.lf-discover.com',
      headers: {
        'X-API-KEY': apiKey
      }
    });
  }

  async enrichIp(ipAddress: string): Promise<IpEnrichCompany> {
    let response = await this.http.get('/companies', {
      params: { ip: ipAddress }
    });

    let data = response.data;
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
      revenueYear: revenue.year ?? null,
      revenueAmount: revenue.amount ?? null,
      employeesMin: employeesRange.min ?? null,
      employeesMax: employeesRange.max ?? null,
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
