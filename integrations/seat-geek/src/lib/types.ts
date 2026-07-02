export interface SeatGeekMeta {
  total: number;
  took: number;
  page: number;
  per_page: number;
  geolocation: {
    lat: number;
    lon: number;
    range: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  } | null;
}

export interface SeatGeekStats {
  listing_count: number | null;
  average_price: number | null;
  lowest_price: number | null;
  highest_price: number | null;
  lowest_sg_base_price: number | null;
  lowest_sg_base_price_good_deals: number | null;
  lowest_price_good_deals: number | null;
  median_price: number | null;
  visible_listing_count: number | null;
}

export interface SeatGeekTaxonomy {
  id: number;
  name: string;
  parent_id: number | null;
  rank: number;
}

export interface SeatGeekLocation {
  lat: number;
  lon: number;
}

export interface SeatGeekVenue {
  id: number;
  name: string;
  name_v2: string;
  url: string;
  score: number;
  postal_code: string;
  address: string;
  extended_address: string;
  city: string;
  state: string;
  country: string;
  location: SeatGeekLocation;
  timezone: string;
  slug: string;
  capacity: number;
  display_location: string;
  num_upcoming_events: number;
  has_upcoming_events: boolean;
}

export interface SeatGeekPerformerImage {
  huge: string;
  large: string;
  medium: string;
  small: string;
  banner: string;
  block: string;
  criteo_130_160: string;
  criteo_170_235: string;
  criteo_205_100: string;
  criteo_400_300: string;
  fb_100x72: string;
  fb_600_315: string;
  mongo: string;
  square_mid: string;
  triggit_fb_ad: string;
}

export interface SeatGeekGenre {
  id: number;
  name: string;
  slug: string;
  primary: boolean;
  image: string;
  images: Record<string, string>;
  document_source: { source_type: string; generation_type: string };
}

export interface SeatGeekPerformerLink {
  provider: string;
  id: string;
  url: string;
}

export interface SeatGeekPerformer {
  id: number;
  name: string;
  short_name: string;
  url: string;
  image: string;
  images: SeatGeekPerformerImage;
  score: number;
  slug: string;
  type: string;
  taxonomies: SeatGeekTaxonomy[];
  has_upcoming_events: boolean;
  num_upcoming_events: number;
  genres: SeatGeekGenre[];
  links: SeatGeekPerformerLink[];
  divisions: Array<{
    taxonomy_id: number;
    short_name: string;
    display_name: string;
    display_type: string;
    division_level: number;
    slug: string | null;
  }>;
  stats?: {
    event_count: number;
  };
  primary?: boolean;
  away_team?: boolean;
  home_team?: boolean;
}

export interface SeatGeekEvent {
  id: number;
  title: string;
  short_title: string;
  url: string;
  type: string;
  datetime_local: string;
  datetime_utc: string;
  datetime_tbd: boolean;
  time_tbd: boolean;
  date_tbd: boolean;
  visible_until_utc: string;
  announce_date: string;
  created_at: string;
  score: number;
  popularity: number;
  venue: SeatGeekVenue;
  performers: SeatGeekPerformer[];
  taxonomies: SeatGeekTaxonomy[];
  stats: SeatGeekStats;
  enddatetime_utc: string | null;
  is_open: boolean;
  general_admission: boolean;
}

export interface SeatGeekRecommendation {
  event: SeatGeekEvent;
  affinity: number;
}

export interface SeatGeekPerformerRecommendation {
  performer: SeatGeekPerformer;
  affinity: number;
}

export interface SeatGeekListResponse<T> {
  meta: SeatGeekMeta;
  [key: string]: T[] | SeatGeekMeta;
}

export interface SeatGeekEventsResponse {
  meta: SeatGeekMeta;
  events: SeatGeekEvent[];
}

export interface SeatGeekPerformersResponse {
  meta: SeatGeekMeta;
  performers: SeatGeekPerformer[];
}

export interface SeatGeekVenuesResponse {
  meta: SeatGeekMeta;
  venues: SeatGeekVenue[];
}

export interface SeatGeekTaxonomiesResponse {
  meta: SeatGeekMeta;
  taxonomies: SeatGeekTaxonomy[];
}

export interface SeatGeekEventRecommendationsResponse {
  meta: SeatGeekMeta;
  recommendations: SeatGeekRecommendation[];
}

export interface SeatGeekPerformerRecommendationsResponse {
  meta: SeatGeekMeta;
  recommendations: SeatGeekPerformerRecommendation[];
}
