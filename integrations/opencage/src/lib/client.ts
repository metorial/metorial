import { createAxios } from 'slates';
import type { GeocodeResponse } from './types';

let geocodeAxios = createAxios({
  baseURL: 'https://api.opencagedata.com'
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
    this.apiKey = config.token;
  }

  async forwardGeocode(options: ForwardGeocodeOptions): Promise<GeocodeResponse> {
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

    let response = await geocodeAxios.get<GeocodeResponse>('/geocode/v1/json', { params });
    return response.data;
  }

  async reverseGeocode(options: ReverseGeocodeOptions): Promise<GeocodeResponse> {
    let params: Record<string, string | number> = {
      key: this.apiKey,
      q: `${options.latitude},${options.longitude}`
    };

    if (options.language) params.language = options.language;
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.minConfidence !== undefined) params.min_confidence = options.minConfidence;
    if (options.noAnnotations) params.no_annotations = 1;
    if (options.noRecord) params.no_record = 1;
    if (options.roadinfo) params.roadinfo = 1;

    let response = await geocodeAxios.get<GeocodeResponse>('/geocode/v1/json', { params });
    return response.data;
  }
}
