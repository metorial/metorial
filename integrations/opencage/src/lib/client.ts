import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxios
} from 'slates';
import type { GeocodeResponse } from './types';

let geocodeAxios = createAxios({
  baseURL: 'https://api.opencagedata.com',
  timeout: 30_000
});

export interface ForwardGeocodeOptions {
  query: string;
  countrycode?: string;
  bounds?: string;
  proximity?: string;
  language?: string;
  limit?: number;
  minConfidence?: number;
  noAnnotations?: boolean;
  noDedupe?: boolean;
  noRecord?: boolean;
  abbrv?: boolean;
  addressOnly?: boolean;
  roadinfo?: boolean;
}

export interface ReverseGeocodeOptions {
  latitude: number;
  longitude: number;
  language?: string;
  limit?: number;
  minConfidence?: number;
  noAnnotations?: boolean;
  noRecord?: boolean;
  roadinfo?: boolean;
}

export class Client {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token.trim();
    if (!this.apiKey) {
      throw createApiServiceError('An OpenCage API key is required.', {
        reason: 'opencage_missing_api_key'
      });
    }
  }

  async forwardGeocode(options: ForwardGeocodeOptions): Promise<GeocodeResponse> {
    if (options.query.trim().length < 2) {
      throw createApiServiceError('Provide a location query with at least two characters.', {
        reason: 'opencage_invalid_query'
      });
    }
    if (
      options.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100)
    ) {
      throw createApiServiceError('The result limit must be a whole number from 1 to 100.', {
        reason: 'opencage_invalid_limit'
      });
    }
    let params: Record<string, string | number> = {
      key: this.apiKey,
      q: options.query
    };

    if (options.countrycode) params.countrycode = options.countrycode;
    if (options.bounds) params.bounds = options.bounds;
    if (options.proximity) params.proximity = options.proximity;
    if (options.language) params.language = options.language;
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.minConfidence !== undefined) params.min_confidence = options.minConfidence;
    if (options.noAnnotations) params.no_annotations = 1;
    if (options.noDedupe) params.no_dedupe = 1;
    if (options.noRecord) params.no_record = 1;
    if (options.abbrv) params.abbrv = 1;
    if (options.addressOnly) params.address_only = 1;
    if (options.roadinfo) params.roadinfo = 1;

    return this.geocode(params);
  }

  async reverseGeocode(options: ReverseGeocodeOptions): Promise<GeocodeResponse> {
    if (
      !Number.isFinite(options.latitude) ||
      options.latitude < -90 ||
      options.latitude > 90 ||
      !Number.isFinite(options.longitude) ||
      options.longitude < -180 ||
      options.longitude > 180
    ) {
      throw createApiServiceError(
        'Provide a latitude from -90 to 90 and a longitude from -180 to 180.',
        { reason: 'opencage_invalid_coordinates' }
      );
    }
    let params: Record<string, string | number> = {
      key: this.apiKey,
      q: `${options.latitude},${options.longitude}`
    };

    if (options.language) params.language = options.language;
    if (options.minConfidence !== undefined) params.min_confidence = options.minConfidence;
    if (options.noAnnotations) params.no_annotations = 1;
    if (options.noRecord) params.no_record = 1;
    if (options.roadinfo) params.roadinfo = 1;

    return this.geocode(params);
  }

  private async geocode(params: Record<string, string | number>): Promise<GeocodeResponse> {
    let response = await requestAxios(
      'geocode',
      () =>
        geocodeAxios.get<GeocodeResponse>('/geocode/v1/json', {
          params,
          validateStatus: () => true
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'OpenCage',
          operation,
          reason: 'opencage_request_failed'
        })
    );

    let status = response.data?.status;
    if (response.status !== 200 || status?.code !== 200) {
      throw createApiServiceError(
        `OpenCage geocoding failed: ${status?.message || `HTTP ${response.status}`}.`,
        {
          reason: 'opencage_request_failed',
          upstreamStatus: response.status,
          upstreamCode: status?.code !== undefined ? String(status.code) : undefined
        }
      );
    }

    if (!Array.isArray(response.data.results)) {
      throw createApiServiceError('OpenCage returned an invalid geocoding response.', {
        reason: 'opencage_invalid_response'
      });
    }

    return response.data;
  }
}
