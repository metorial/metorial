import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface PlaceQuery {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  isoCountryCode?: string;
  queryId?: string;
  placeMetadata?: {
    storeId?: string;
    phoneNumber?: string;
    website?: string;
    naicsCode?: string;
    mccCode?: string;
  };
}

export type OptionalField =
  | 'address_placekey'
  | 'building_placekey'
  | 'confidence_score'
  | 'normalized_address'
  | 'geocode'
  | 'upi'
  | 'parcel'
  | 'geoid'
  | 'gers';

export interface PlacekeyResult {
  queryId: string;
  placekey: string;
  addressPlacekey?: string;
  buildingPlacekey?: string;
  confidenceScore?: number;
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  normalizedAddress?: Record<string, unknown>;
  geocode?: Record<string, unknown>;
  upi?: string;
  parcel?: string;
  geoid?: string;
  gers?: string;
  error?: string;
}

let toApiQuery = (query: PlaceQuery): Record<string, unknown> => {
  let hasCoordinates = query.latitude !== undefined && query.longitude !== undefined;
  let hasAddress =
    !!query.streetAddress?.trim() &&
    !!query.region?.trim() &&
    !!query.isoCountryCode?.trim() &&
    (!!query.city?.trim() || !!query.postalCode?.trim());

  if (!hasCoordinates && !hasAddress) {
    throw createApiServiceError(
      'Provide latitude and longitude, or a street address, region, country code, and either city or postal code.',
      { reason: 'placekey_location_required' }
    );
  }

  if (
    (query.latitude !== undefined &&
      (!Number.isFinite(query.latitude) || query.latitude < -90 || query.latitude > 90)) ||
    (query.longitude !== undefined &&
      (!Number.isFinite(query.longitude) || query.longitude < -180 || query.longitude > 180))
  ) {
    throw createApiServiceError(
      'Use WGS-84 coordinates with latitude between -90 and 90 and longitude between -180 and 180.',
      { reason: 'placekey_invalid_coordinates' }
    );
  }

  if (
    query.isoCountryCode !== undefined &&
    !/^[A-Za-z]{2}$/.test(query.isoCountryCode.trim())
  ) {
    throw createApiServiceError('Provide a two-letter ISO country code, such as US.', {
      reason: 'placekey_invalid_country_code'
    });
  }

  if (query.queryId !== undefined && !query.queryId.trim()) {
    throw createApiServiceError('Provide a non-blank query ID or omit it.', {
      reason: 'placekey_query_id_required'
    });
  }

  return pickDefined({
    latitude: query.latitude,
    longitude: query.longitude,
    location_name: query.locationName,
    street_address: query.streetAddress,
    city: query.city,
    region: query.region,
    postal_code: query.postalCode,
    iso_country_code: query.isoCountryCode?.trim().toUpperCase(),
    query_id: query.queryId,
    place_metadata: query.placeMetadata
      ? pickDefined({
          store_id: query.placeMetadata.storeId,
          phone_number: query.placeMetadata.phoneNumber,
          website: query.placeMetadata.website,
          naics_code: query.placeMetadata.naicsCode,
          mcc_code: query.placeMetadata.mccCode
        })
      : undefined
  });
};

let fromApiResult = (data: unknown): PlacekeyResult => {
  if (
    !isApiErrorRecord(data) ||
    (typeof data.query_id !== 'string' && typeof data.query_id !== 'number') ||
    !(
      (typeof data.placekey === 'string' && data.placekey.length > 0) ||
      (typeof data.error === 'string' && data.error.length > 0)
    )
  ) {
    throw createApiServiceError('Placekey returned an invalid lookup response. Try again.', {
      reason: 'placekey_invalid_response'
    });
  }

  let result: PlacekeyResult = {
    queryId: String(data.query_id),
    placekey: typeof data.placekey === 'string' ? data.placekey : ''
  };

  if (typeof data.error === 'string') result.error = data.error;
  if (typeof data.address_placekey === 'string')
    result.addressPlacekey = data.address_placekey;
  if (typeof data.building_placekey === 'string')
    result.buildingPlacekey = data.building_placekey;
  if (typeof data.confidence_score === 'number' && Number.isFinite(data.confidence_score)) {
    result.confidenceScore = data.confidence_score;
  }
  if (
    data.confidence_score === 'HIGH' ||
    data.confidence_score === 'MEDIUM' ||
    data.confidence_score === 'LOW'
  ) {
    result.confidenceLevel = data.confidence_score;
  }
  if (isApiErrorRecord(data.normalized_address))
    result.normalizedAddress = data.normalized_address;
  if (isApiErrorRecord(data.geocode)) result.geocode = data.geocode;
  if (typeof data.upi === 'string') result.upi = data.upi;
  if (typeof data.parcel === 'string') result.parcel = data.parcel;
  if (typeof data.geoid === 'string') result.geoid = data.geoid;
  if (typeof data.gers === 'string') result.gers = data.gers;

  return result;
};

export class PlacekeyClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError('Connect Placekey with a non-empty API key.', {
        reason: 'placekey_api_key_required'
      });
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.placekey.io',
      authHeader: { name: 'apikey', value: token },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Placekey',
          reason: 'placekey_api_error'
        })
    });
  }

  async lookupPlacekey(query: PlaceQuery, fields?: OptionalField[]): Promise<PlacekeyResult> {
    let body: Record<string, unknown> = {
      query: toApiQuery(query)
    };

    if (fields && fields.length > 0) {
      body.options = { fields };
    }

    let response = await this.axios.post('/v1/placekey', body);
    return fromApiResult(response.data);
  }

  async bulkLookupPlacekeys(
    queries: PlaceQuery[],
    fields?: OptionalField[]
  ): Promise<PlacekeyResult[]> {
    if (queries.length < 1 || queries.length > 100) {
      throw createApiServiceError('Provide between 1 and 100 location queries per batch.', {
        reason: 'placekey_invalid_batch_size'
      });
    }

    let countries = new Set(
      queries.map(query => query.isoCountryCode?.trim().toUpperCase()).filter(Boolean)
    );
    if (countries.size > 1) {
      throw createApiServiceError(
        'Use the same ISO country code for all queries in a batch.',
        {
          reason: 'placekey_mixed_country_batch'
        }
      );
    }

    let queryIds = new Set<string>();
    for (let query of queries) {
      if (query.queryId !== undefined) {
        if (queryIds.has(query.queryId)) {
          throw createApiServiceError(
            'Use a unique query ID for each location in the batch.',
            {
              reason: 'placekey_duplicate_query_id'
            }
          );
        }
        queryIds.add(query.queryId);
      }
    }

    let body: Record<string, unknown> = {
      queries: queries.map((q, i) => {
        let apiQuery = toApiQuery(q);
        if (q.queryId === undefined) {
          let queryId = String(i);
          while (queryIds.has(queryId)) queryId = `auto-${queryId}`;
          queryIds.add(queryId);
          apiQuery.query_id = queryId;
        }
        return apiQuery;
      })
    };

    if (fields && fields.length > 0) {
      body.options = { fields };
    }

    let response = await this.axios.post('/v1/placekeys', body);
    if (!Array.isArray(response.data) || response.data.length !== queries.length) {
      throw createApiServiceError('Placekey returned an invalid batch response. Try again.', {
        reason: 'placekey_invalid_response'
      });
    }
    return response.data.map(fromApiResult);
  }
}
