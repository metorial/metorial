import { createAxios } from 'slates';

export interface GenderByFirstNameRequest {
  firstName: string;
  country?: string;
  locale?: string;
  ip?: string;
}

export interface GenderByFullNameRequest {
  fullName: string;
  country?: string;
  locale?: string;
  ip?: string;
  strict?: boolean;
}

export interface GenderByEmailRequest {
  email: string;
  country?: string;
  locale?: string;
  ip?: string;
}

export interface CountryOfOriginRequest {
  firstName?: string;
  fullName?: string;
  email?: string;
}

export interface GenderResultDetails {
  creditsUsed: number;
  samples: number;
  country: string | null;
  firstNameSanitized: string;
  duration: string;
}

export interface GenderByFirstNameResult {
  input: { firstName: string };
  details: GenderResultDetails;
  resultFound: boolean;
  firstName: string;
  probability: number;
  gender: string;
}

export interface GenderByFullNameResult {
  input: { fullName: string };
  details: GenderResultDetails;
  resultFound: boolean;
  firstName: string;
  lastName: string;
  probability: number;
  gender: string;
}

export interface GenderByEmailResult {
  input: { email: string };
  details: GenderResultDetails;
  resultFound: boolean;
  firstName: string;
  lastName: string;
  probability: number;
  gender: string;
}

export interface CountryOfOriginEntry {
  countryName: string;
  country: string;
  probability: number;
  continentalRegion: string;
  statisticalRegion: string;
}

export interface CountryOfOriginResult {
  input: Record<string, string>;
  details: GenderResultDetails;
  resultFound: boolean;
  countryOfOrigin: CountryOfOriginEntry[];
  countryOfOriginMapUrl: string;
  firstName: string;
  probability: number;
  gender: string;
}

export interface StatisticResult {
  isLimitReached: boolean;
  remainingCredits: number;
  details: {
    creditsUsed: number;
    duration: string;
  };
  usageLastMonth: {
    date: string;
    creditsUsed: number;
  };
}

let mapFirstNameResult = (data: any): GenderByFirstNameResult => ({
  input: { firstName: data.input?.first_name },
  details: {
    creditsUsed: data.details?.credits_used,
    samples: data.details?.samples,
    country: data.details?.country ?? null,
    firstNameSanitized: data.details?.first_name_sanitized,
    duration: data.details?.duration
  },
  resultFound: data.result_found,
  firstName: data.first_name,
  probability: data.probability,
  gender: data.gender
});

let mapFullNameResult = (data: any): GenderByFullNameResult => ({
  input: { fullName: data.input?.full_name },
  details: {
    creditsUsed: data.details?.credits_used,
    samples: data.details?.samples,
    country: data.details?.country ?? null,
    firstNameSanitized: data.details?.first_name_sanitized,
    duration: data.details?.duration
  },
  resultFound: data.result_found,
  firstName: data.first_name,
  lastName: data.last_name ?? '',
  probability: data.probability,
  gender: data.gender
});

let mapEmailResult = (data: any): GenderByEmailResult => ({
  input: { email: data.input?.email },
  details: {
    creditsUsed: data.details?.credits_used,
    samples: data.details?.samples,
    country: data.details?.country ?? null,
    firstNameSanitized: data.details?.first_name_sanitized,
    duration: data.details?.duration
  },
  resultFound: data.result_found,
  firstName: data.first_name,
  lastName: data.last_name ?? '',
  probability: data.probability,
  gender: data.gender
});

let mapCountryOfOriginResult = (data: any): CountryOfOriginResult => ({
  input: data.input ?? {},
  details: {
    creditsUsed: data.details?.credits_used,
    samples: data.details?.samples,
    country: data.details?.country ?? null,
    firstNameSanitized: data.details?.first_name_sanitized,
    duration: data.details?.duration
  },
  resultFound: data.result_found,
  countryOfOrigin: (data.country_of_origin ?? []).map((entry: any) => ({
    countryName: entry.country_name,
    country: entry.country,
    probability: entry.probability,
    continentalRegion: entry.continental_region,
    statisticalRegion: entry.statistical_region
  })),
  countryOfOriginMapUrl: data.country_of_origin_map_url ?? '',
  firstName: data.first_name,
  probability: data.probability,
  gender: data.gender
});

let mapStatisticResult = (data: any): StatisticResult => ({
  isLimitReached: data.is_limit_reached,
  remainingCredits: data.remaining_credits,
  details: {
    creditsUsed: data.details?.credits_used,
    duration: data.details?.duration
  },
  usageLastMonth: {
    date: data.usage_last_month?.date,
    creditsUsed: data.usage_last_month?.credits_used
  }
});

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://gender-api.com/v2',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getGenderByFirstName(req: GenderByFirstNameRequest): Promise<GenderByFirstNameResult> {
    let body: Record<string, string> = { first_name: req.firstName };
    if (req.country) body.country = req.country;
    if (req.locale) body.locale = req.locale;
    if (req.ip) body.ip = req.ip;

    let response = await this.axios.post('/gender/by-first-name', body);
    return mapFirstNameResult(response.data);
  }

  async getGenderByFullName(req: GenderByFullNameRequest): Promise<GenderByFullNameResult> {
    let body: Record<string, string | boolean> = { full_name: req.fullName };
    if (req.country) body.country = req.country;
    if (req.locale) body.locale = req.locale;
    if (req.ip) body.ip = req.ip;
    if (req.strict !== undefined) body.strict = req.strict;

    let response = await this.axios.post('/gender/by-full-name', body);
    return mapFullNameResult(response.data);
  }

  async getGenderByEmail(req: GenderByEmailRequest): Promise<GenderByEmailResult> {
    let body: Record<string, string> = { email: req.email };
    if (req.country) body.country = req.country;
    if (req.locale) body.locale = req.locale;
    if (req.ip) body.ip = req.ip;

    let response = await this.axios.post('/gender/by-email-address', body);
    return mapEmailResult(response.data);
  }

  async getCountryOfOrigin(req: CountryOfOriginRequest): Promise<CountryOfOriginResult> {
    let body: Record<string, string> = {};
    if (req.firstName) body.first_name = req.firstName;
    if (req.fullName) body.full_name = req.fullName;
    if (req.email) body.email = req.email;

    let response = await this.axios.post('/country-of-origin', body);
    return mapCountryOfOriginResult(response.data);
  }

  async getStatistics(): Promise<StatisticResult> {
    let response = await this.axios.get('/statistic');
    return mapStatisticResult(response.data);
  }
}
