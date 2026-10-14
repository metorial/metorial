import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://geokeo.com/geocode/v1'
});

let locationSchema = z.object({ lat: z.string(), lng: z.string() });

let resultSchema = z.object({
  class: z.string(),
  type: z.string(),
  address_components: z
    .object({
      name: z.string().nullish(),
      street: z.string().nullish(),
      city: z.string().nullish(),
      state: z.string().nullish(),
      postcode: z.string().nullish(),
      country: z.string().nullish()
    })
    .nullish(),
  formatted_address: z.string(),
  geometry: z.object({
    location: locationSchema,
    viewport: z.object({ northeast: locationSchema, southwest: locationSchema })
  }),
  osmurl: z.string(),
  distance: z.string().optional()
});

let responseSchema = z.object({
  status: z.string(),
  results: z.unknown().optional()
});

export interface GeokeoResponse {
  results: z.infer<typeof resultSchema>[];
  status: string;
}

let statusMessages: Record<string, string> = {
  INVALID_REQUEST: 'Check the required query or coordinate parameters.',
  ACCESS_DENIED: 'Check the API key and any IP or domain restrictions in the API settings.',
  OVER_QUERY_LIMIT: 'The daily request quota has been exceeded. Quotas reset at midnight UTC.'
};

export class Client {
  constructor(private token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Geokeo API key is required. Reconnect with a valid key.',
        {
          reason: 'geokeo_missing_api_key'
        }
      );
    }
  }

  private async request(
    path: string,
    params: Record<string, string>,
    operation: string
  ): Promise<GeokeoResponse> {
    let data = await requestAxiosData<unknown>(
      operation,
      () => http.get(path, { params: { ...params, api: this.token, format: 'json' } }),
      (error, currentOperation) =>
        buildApiServiceError(error, {
          providerLabel: 'Geokeo',
          reason: 'geokeo_http_error',
          operation: currentOperation
        })
    );

    let parsed = responseSchema.safeParse(data);
    if (!parsed.success) {
      throw createApiServiceError('Geokeo returned an invalid geocoding response.', {
        reason: 'geokeo_invalid_response'
      });
    }

    let response = parsed.data;
    let status = response.status.toUpperCase();
    if (status === 'ZERO_RESULTS') {
      return { status: response.status, results: [] };
    }
    if (status !== 'OK') {
      throw createApiServiceError(
        `Geokeo returned ${response.status}. ${statusMessages[status] ?? 'The geocoding request could not be completed.'}`,
        { reason: 'geokeo_api_error', upstreamCode: response.status }
      );
    }

    let results = z.array(resultSchema).safeParse(response.results);
    if (!results.success) {
      throw createApiServiceError('Geokeo returned invalid location data.', {
        reason: 'geokeo_invalid_response'
      });
    }

    return { status: response.status, results: results.data };
  }

  async forwardGeocode(params: { query: string; country?: string }): Promise<GeokeoResponse> {
    if (!params.query.trim()) {
      throw createApiServiceError('Enter an address or place name to geocode.', {
        reason: 'geokeo_invalid_query'
      });
    }
    if (params.country !== undefined && !/^[a-z]{2}$/i.test(params.country)) {
      throw createApiServiceError('Country code must contain two ISO country-code letters.', {
        reason: 'geokeo_invalid_country'
      });
    }

    let queryParams: Record<string, string> = {
      q: params.query
    };

    if (params.country) {
      queryParams.country = params.country.toLowerCase();
    }

    return this.request('/search.php', queryParams, 'forward geocoding');
  }

  async reverseGeocode(params: { lat: number; lng: number }): Promise<GeokeoResponse> {
    return this.request(
      '/reverse.php',
      {
        lat: params.lat.toString(),
        lng: params.lng.toString()
      },
      'reverse geocoding'
    );
  }
}
