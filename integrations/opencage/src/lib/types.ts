export interface GeocodeParams {
  q: string;
  key: string;
  countrycode?: string;
  bounds?: string;
  proximity?: string;
  language?: string;
  limit?: number;
  min_confidence?: number;
  no_annotations?: number;
  no_dedupe?: number;
  no_record?: number;
  abbrv?: number;
  address_only?: number;
  roadinfo?: number;
}

export interface GeocodeResponse {
  documentation: string;
  licenses: Array<{ name: string; url: string }>;
  rate: {
    limit: number;
    remaining: number;
    reset: number;
  };
  status: {
    code: number;
    message: string;
  };
  stay_informed: {
    blog: string;
    mastodon: string;
  };
  thanks: string;
  timestamp: {
    created_http: string;
    created_unix: number;
  };
  total_results: number;
  results: GeocodeResult[];
}

export interface GeocodeResult {
  annotations?: ResultAnnotations;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  components: Record<string, string | number>;
  confidence: number;
  formatted: string;
  geometry: {
    lat: number;
    lng: number;
  };
}

export interface ResultAnnotations {
  DMS?: {
    lat: string;
    lng: string;
  };
  MGRS?: string;
  Maidenhead?: string;
  Mercator?: {
    x: number;
    y: number;
  };
  NUTS?: Record<string, { code: string }>;
  OSM?: {
    edit_url?: string;
    note_url?: string;
    url?: string;
  };
  UN_M49?: {
    regions: Record<string, string>;
    statistical_groupings: string[];
  };
  callingcode?: number;
  currency?: {
    alternate_symbols?: string[];
    decimal_mark?: string;
    disambiguate_symbol?: string;
    html_entity?: string;
    iso_code?: string;
    iso_numeric?: string;
    name?: string;
    smallest_denomination?: number;
    subunit?: string;
    subunit_to_unit?: number;
    symbol?: string;
    symbol_first?: number;
    thousands_separator?: string;
  };
  flag?: string;
  geohash?: string;
  qibla?: number;
  roadinfo?: {
    drive_on?: string;
    road?: string;
    road_type?: string;
    speed_in?: string;
  };
  sun?: {
    rise?: {
      apparent: number;
      astronomical: number;
      civil: number;
      nautical: number;
    };
    set?: {
      apparent: number;
      astronomical: number;
      civil: number;
      nautical: number;
    };
  };
  timezone?: {
    name?: string;
    now_in_dst?: number;
    offset_sec?: number;
    offset_string?: string;
    short_name?: string;
  };
  what3words?: {
    words?: string;
  };
  FIPS?: {
    county?: string;
    state?: string;
  };
}
