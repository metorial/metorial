import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

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
  country?: string | null;
  firstNameSanitized?: string;
  duration: string;
}

export interface GenderByFirstNameResult {
  input: { firstName: string };
  raw: Record<string, unknown>;
  details: GenderResultDetails;
  resultFound: boolean;
  firstName: string;
  probability: number;
  gender: string;
}

export interface GenderByFullNameResult {
  input: { fullName: string };
  raw: Record<string, unknown>;
  details: GenderResultDetails;
  resultFound: boolean;
  firstName: string;
  lastName?: string;
  probability: number;
  gender: string;
}

export interface GenderByEmailResult {
  input: { email: string };
  raw: Record<string, unknown>;
  details: GenderResultDetails;
  resultFound: boolean;
  firstName: string;
  lastName?: string;
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
  countryOfOriginMapUrl?: string;
  languageOfOrigin?: string;
  meaning?: string;
  ethnicity?: {
    id?: string;
    name?: string;
    distribution?: { id: string; name: string; percentage: number }[];
  };
  raw: Record<string, unknown>;
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
  raw: data,
  details: {
    creditsUsed: data.details?.credits_used,
    samples: data.details?.samples,
    country: data.details?.country,
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
  raw: data,
  details: {
    creditsUsed: data.details?.credits_used,
    samples: data.details?.samples,
    country: data.details?.country,
    firstNameSanitized: data.details?.first_name_sanitized,
    duration: data.details?.duration
  },
  resultFound: data.result_found,
  firstName: data.first_name,
  lastName: data.last_name ?? undefined,
  probability: data.probability,
  gender: data.gender
});

let mapEmailResult = (data: any): GenderByEmailResult => ({
  input: { email: data.input?.email },
  raw: data,
  details: {
    creditsUsed: data.details?.credits_used,
    samples: data.details?.samples,
    country: data.details?.country,
    firstNameSanitized: data.details?.first_name_sanitized,
    duration: data.details?.duration
  },
  resultFound: data.result_found,
  firstName: data.first_name,
  lastName: data.last_name ?? undefined,
  probability: data.probability,
  gender: data.gender
});

let getOriginEntries = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError('Gender API did not return a country-of-origin list.', {
      reason: 'gender_api_invalid_origin_response'
    });
  }
  return value;
};

let mapCountryOfOriginResult = (data: any): CountryOfOriginResult => ({
  input: data.input,
  details: {
    creditsUsed: data.details?.credits_used,
    samples: data.details?.samples,
    country: data.details?.country,
    firstNameSanitized: data.details?.first_name_sanitized,
    duration: data.details?.duration
  },
  resultFound: data.result_found,
  countryOfOrigin: getOriginEntries(data.country_of_origin).map((entry: any) => ({
    countryName: entry.country_name,
    country: entry.country,
    probability: entry.probability,
    continentalRegion: entry.continental_region,
    statisticalRegion: entry.statistical_region
  })),
  countryOfOriginMapUrl: data.country_of_origin_map_url ?? undefined,
  languageOfOrigin: data.language_of_origin ?? undefined,
  meaning: data.meaning ?? undefined,
  ethnicity: data.ethnicity ?? undefined,
  raw: data,
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

let toGenderApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Gender API',
    reason: 'gender_api_error',
    detailKeys: ['message', 'description', 'error', 'errmsg', 'status', 'code', 'upgrade_url'],
    nestedKeys: ['error', 'errors'],
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractUpstreamCode: (_value, response) => {
      if (!isApiErrorRecord(response?.data)) return undefined;
      let body = response.data;
      let error = isApiErrorRecord(body.error) ? body.error : body;
      let code =
        error.code ??
        error.status ??
        (typeof body.error === 'string' ? body.error : undefined);
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export interface BatchGenderRequest {
  firstName: string;
  country?: string;
  locale?: string;
  ip?: string;
  id?: string;
}

export class Client {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Gender API token is required. Reconnect with your API token.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://gender-api.com/v2',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      errorAdapter: toGenderApiError
    });
    this.axios.interceptors.response.use(response => {
      // Batch entries retain their individual provider errors alongside successful results.
      let values = Array.isArray(response.data) ? [] : [response.data];
      for (let value of values) {
        if (
          isApiErrorRecord(value) &&
          (value.error ||
            value.success === false ||
            (typeof value.status === 'string' &&
              /^(?:invalid-|parameter-|mandatory-parameter-|key-parameter-|content-type-|missing-|too-many-|endpoint-not-found$|limit-exceeded$|generic-error$)/.test(
                value.status
              )))
        ) {
          throw toGenderApiError({ response: { status: response.status, data: value } });
        }
      }
      return response;
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

  async getGenderBatch(queries: BatchGenderRequest[]): Promise<Record<string, unknown>[]> {
    let body = queries.map(query =>
      pickDefined({
        first_name: query.firstName,
        country: query.country,
        locale: query.locale,
        ip: query.ip,
        id: query.id
      })
    );
    let response = await this.axios.post('/gender', body);
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('Gender API did not return the requested batch results.', {
        reason: 'gender_api_invalid_batch_response'
      });
    }
    return response.data;
  }

  async getStatistics(): Promise<StatisticResult> {
    let response = await this.axios.get('/statistic');
    return mapStatisticResult(response.data);
  }
}
