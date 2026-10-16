import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import type {
  SeatGeekEvent,
  SeatGeekEventRecommendationsResponse,
  SeatGeekEventsResponse,
  SeatGeekPerformer,
  SeatGeekPerformerRecommendationsResponse,
  SeatGeekPerformersResponse,
  SeatGeekTaxonomiesResponse,
  SeatGeekVenue,
  SeatGeekVenuesResponse
} from './types';

export type QueryParams = Record<string, string | string[]>;

export interface ClientConfig {
  clientId: string;
  clientSecret?: string;
  affiliateId?: string;
  referralId?: string;
}

export let getRecommendationScore = (recommendation: {
  affinity?: number;
  score?: number;
}) => {
  let score = recommendation.affinity ?? recommendation.score;
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw createApiServiceError(
      'SeatGeek returned a recommendation without a numeric score.',
      {
        reason: 'seatgeek_invalid_response'
      }
    );
  }
  return score;
};

let validateId = (id: number, label: string) => {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createApiServiceError(`${label} must be a positive whole-number SeatGeek ID.`);
  }
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    if (!config.clientId.trim()) {
      throw createApiServiceError('A SeatGeek API client ID is required.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.seatgeek.com/2',
      contentType: false,
      timeout: 30_000,
      params: pickDefined({
        client_id: config.clientId.trim(),
        client_secret: config.clientSecret || undefined,
        aid: config.affiliateId,
        rid: config.referralId
      }),
      paramsSerializer: { indexes: null },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SeatGeek',
          reason: 'seatgeek_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  private validateParams(params: QueryParams) {
    for (let [key, value] of Object.entries(params)) {
      if (key === 'page' || key === 'per_page') {
        let number = Number(value);
        if (!Number.isSafeInteger(number) || number < 1) {
          throw createApiServiceError(
            `${key === 'per_page' ? 'perPage' : 'page'} must be a positive whole number.`
          );
        }
      }
      if (
        key === 'id' ||
        /^(?:venue|events|taxonomies|performers(?:\[\w+\])?)\.id$/.test(key)
      ) {
        for (let id of String(value).split(',')) validateId(Number(id), key);
      }
      if (/^(?:lowest_price|average_price|listing_count)\.(?:gte|lte)$/.test(key)) {
        let number = Number(value);
        if (
          !Number.isFinite(number) ||
          number < 0 ||
          (key.startsWith('listing_count') && !Number.isInteger(number))
        ) {
          throw createApiServiceError(
            `${key} must be a nonnegative ${key.startsWith('listing_count') ? 'whole number' : 'number'}.`
          );
        }
      }
    }
    if ((params.lat === undefined) !== (params.lon === undefined)) {
      throw createApiServiceError(
        'Provide both latitude and longitude for SeatGeek geolocation.'
      );
    }
    for (let [key, bound] of [
      ['lat', 90],
      ['lon', 180]
    ] as const) {
      if (
        params[key] !== undefined &&
        (!Number.isFinite(Number(params[key])) || Math.abs(Number(params[key])) > bound)
      ) {
        throw createApiServiceError(
          `${key === 'lat' ? 'Latitude' : 'Longitude'} must be between -${bound} and ${bound}.`
        );
      }
    }
    if (
      params.id &&
      Object.keys(params).some(key => !['id', 'page', 'per_page', 'sort'].includes(key))
    ) {
      throw createApiServiceError(
        'SeatGeek ID lookup cannot be combined with search filters. Use IDs alone with optional sort, page, and perPage.'
      );
    }
    for (let field of ['lowest_price', 'average_price']) {
      if (
        params[`${field}.gte`] !== undefined &&
        params[`${field}.lte`] !== undefined &&
        Number(params[`${field}.gte`]) > Number(params[`${field}.lte`])
      ) {
        throw createApiServiceError(
          `The minimum ${field.replace('_', ' ')} cannot exceed the maximum.`
        );
      }
    }
  }

  private async request<T>(
    path: string,
    params: QueryParams = {},
    collection?: string
  ): Promise<T> {
    this.validateParams(params);
    let response = await this.http.get<T>(path, { params });
    if (
      !isApiErrorRecord(response.data) ||
      (collection && !Array.isArray(response.data[collection]))
    ) {
      throw createApiServiceError('SeatGeek returned an invalid response. Try again later.', {
        reason: 'seatgeek_invalid_response'
      });
    }
    if (
      collection &&
      ['events', 'performers', 'venues', 'recommendations'].includes(collection)
    ) {
      let meta = response.data.meta;
      if (
        !isApiErrorRecord(meta) ||
        ['total', 'page', 'per_page'].some(
          key => typeof meta[key] !== 'number' || !Number.isFinite(meta[key])
        )
      ) {
        throw createApiServiceError(
          'SeatGeek returned invalid pagination metadata. Try again later.',
          { reason: 'seatgeek_invalid_response' }
        );
      }
    }
    return response.data;
  }

  async searchEvents(params: QueryParams): Promise<SeatGeekEventsResponse> {
    return this.request('/events', params, 'events');
  }

  async getEvent(eventId: number): Promise<SeatGeekEvent> {
    validateId(eventId, 'eventId');
    return this.request(`/events/${eventId}`);
  }

  async searchPerformers(params: QueryParams): Promise<SeatGeekPerformersResponse> {
    return this.request('/performers', params, 'performers');
  }

  async getPerformer(performerId: number): Promise<SeatGeekPerformer> {
    validateId(performerId, 'performerId');
    return this.request(`/performers/${performerId}`);
  }

  async searchVenues(params: QueryParams): Promise<SeatGeekVenuesResponse> {
    return this.request('/venues', params, 'venues');
  }

  async getVenue(venueId: number): Promise<SeatGeekVenue> {
    validateId(venueId, 'venueId');
    return this.request(`/venues/${venueId}`);
  }

  async getTaxonomies(): Promise<SeatGeekTaxonomiesResponse> {
    return this.request('/taxonomies', {}, 'taxonomies');
  }

  async getGenres(params: QueryParams): Promise<{ genres: unknown[] }> {
    return this.request('/genres', params, 'genres');
  }

  private validateRecommendations(params: QueryParams, requireLocation: boolean) {
    if (!params['performers.id'] && !params['events.id']) {
      throw createApiServiceError(
        'Provide seedPerformerIds or seedEventId for recommendations.'
      );
    }
    if (
      requireLocation &&
      !params.postal_code?.length &&
      !params.geoip?.length &&
      (params.lat === undefined || params.lon === undefined)
    ) {
      throw createApiServiceError(
        'Event recommendations require postalCode, geoIp, or both latitude and longitude.'
      );
    }
  }

  async getEventRecommendations(
    params: QueryParams
  ): Promise<SeatGeekEventRecommendationsResponse> {
    this.validateRecommendations(params, true);
    return this.request('/recommendations', params, 'recommendations');
  }

  async getPerformerRecommendations(
    params: QueryParams
  ): Promise<SeatGeekPerformerRecommendationsResponse> {
    this.validateRecommendations(params, false);
    return this.request('/recommendations/performers', params, 'recommendations');
  }
}
