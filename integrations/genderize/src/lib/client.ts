import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';
import { z } from 'zod';

let providerPredictionSchema = z.looseObject({
  name: z.string(),
  gender: z.string().nullable(),
  probability: z.number().nullable(),
  count: z.number(),
  country_id: z.string().nullable().optional()
});

let readQuotaNumber = (headers: unknown, name: string) => {
  let value = getResponseHeaderValue(headers, name);
  if (value === undefined || !/^\d+$/.test(value.trim())) return undefined;
  let number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
};

export class Client {
  private axios;

  constructor(private config: { token?: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.genderize.io',
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Genderize',
          reason: 'genderize_api_error',
          operation: 'predict gender',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          extractUpstreamCode: (_input, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.error === 'string'
              ? response.data.error
              : undefined
        })
    });
  }

  async predictGender(names: string[], countryId?: string) {
    let params = new URLSearchParams();
    for (let name of names) {
      params.append(names.length === 1 ? 'name' : 'name[]', name);
    }
    if (countryId !== undefined) params.set('country_id', countryId);
    if (this.config.token !== undefined) params.set('apikey', this.config.token);

    let response = await this.axios.get<unknown>('/', { params });
    let parsed = z
      .array(providerPredictionSchema)
      .safeParse(Array.isArray(response.data) ? response.data : [response.data]);
    if (!parsed.success || parsed.data.length !== names.length) {
      throw createApiServiceError('Genderize returned an invalid prediction response.', {
        reason: 'genderize_invalid_response'
      });
    }

    let rateLimit = pickDefined({
      limit: readQuotaNumber(response.headers, 'X-Rate-Limit-Limit'),
      remaining: readQuotaNumber(response.headers, 'X-Rate-Limit-Remaining'),
      resetSeconds: readQuotaNumber(response.headers, 'X-Rate-Limit-Reset')
    });

    return {
      predictions: parsed.data.map(raw => ({
        name: raw.name,
        gender: raw.gender,
        probability: raw.probability,
        count: raw.count,
        ...(typeof raw.country_id === 'string' ? { countryId: raw.country_id } : {}),
        raw
      })),
      ...(Object.values(rateLimit).some(value => value !== undefined) ? { rateLimit } : {})
    };
  }
}
