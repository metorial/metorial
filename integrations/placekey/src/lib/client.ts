import { createAxios } from 'slates';

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
  normalizedAddress?: Record<string, unknown>;
  geocode?: Record<string, unknown>;
  upi?: string;
  parcel?: string;
  geoid?: string;
  gers?: string;
  error?: string;
}

let toApiQuery = (query: PlaceQuery): Record<string, unknown> => {
  let result: Record<string, unknown> = {};

  if (query.latitude !== undefined) result.latitude = query.latitude;
  if (query.longitude !== undefined) result.longitude = query.longitude;
  if (query.locationName) result.location_name = query.locationName;
  if (query.streetAddress) result.street_address = query.streetAddress;
  if (query.city) result.city = query.city;
  if (query.region) result.region = query.region;
  if (query.postalCode) result.postal_code = query.postalCode;
  if (query.isoCountryCode) result.iso_country_code = query.isoCountryCode;
  if (query.queryId) result.query_id = query.queryId;

  if (query.placeMetadata) {
    let meta: Record<string, unknown> = {};
    if (query.placeMetadata.storeId) meta.store_id = query.placeMetadata.storeId;
    if (query.placeMetadata.phoneNumber) meta.phone_number = query.placeMetadata.phoneNumber;
    if (query.placeMetadata.website) meta.website = query.placeMetadata.website;
    if (query.placeMetadata.naicsCode) meta.naics_code = query.placeMetadata.naicsCode;
    if (query.placeMetadata.mccCode) meta.mcc_code = query.placeMetadata.mccCode;
    if (Object.keys(meta).length > 0) result.place_metadata = meta;
  }

  return result;
};

let fromApiResult = (data: Record<string, unknown>): PlacekeyResult => {
  let result: PlacekeyResult = {
    queryId: (data.query_id as string) ?? '',
    placekey: (data.placekey as string) ?? ''
  };

  if (data.error) result.error = data.error as string;
  if (data.address_placekey) result.addressPlacekey = data.address_placekey as string;
  if (data.building_placekey) result.buildingPlacekey = data.building_placekey as string;
  if (data.confidence_score !== undefined)
    result.confidenceScore = data.confidence_score as number;
  if (data.normalized_address)
    result.normalizedAddress = data.normalized_address as Record<string, unknown>;
  if (data.geocode) result.geocode = data.geocode as Record<string, unknown>;
  if (data.upi) result.upi = data.upi as string;
  if (data.parcel) result.parcel = data.parcel as string;
  if (data.geoid) result.geoid = data.geoid as string;
  if (data.gers) result.gers = data.gers as string;

  return result;
};

export class PlacekeyClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.placekey.io',
      headers: {
        apikey: config.token,
        'Content-Type': 'application/json'
      }
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
    let body: Record<string, unknown> = {
      queries: queries.map((q, i) => {
        let apiQuery = toApiQuery(q);
        if (!apiQuery.query_id) {
          apiQuery.query_id = q.queryId ?? String(i);
        }
        return apiQuery;
      })
    };

    if (fields && fields.length > 0) {
      body.options = { fields };
    }

    let response = await this.axios.post('/v1/placekeys', body);
    let results = Array.isArray(response.data) ? response.data : [];
    return results.map((item: Record<string, unknown>) => fromApiResult(item));
  }
}
