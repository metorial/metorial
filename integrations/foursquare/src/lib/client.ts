import { createAxios } from 'slates';

export interface PlaceSearchParams {
  query?: string;
  ll?: string;
  radius?: number;
  categories?: string;
  chains?: string;
  exclude_all_chains?: boolean;
  fields?: string;
  min_price?: number;
  max_price?: number;
  open_at?: string;
  open_now?: boolean;
  near?: string;
  sort?: 'relevance' | 'rating' | 'distance' | 'popularity';
  limit?: number;
  ne?: string;
  sw?: string;
  polygon?: string;
}

export interface AutocompleteParams {
  query: string;
  ll?: string;
  radius?: number;
  types?: string;
  bias?: string;
  limit?: number;
  session_token?: string;
}

export interface PlaceMatchParams {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  cc?: string;
  ll?: string;
  fields?: string;
}

export interface PlacePhotosParams {
  limit?: number;
  sort?: 'popular' | 'newest';
  classifications?: string;
  offset?: number;
}

export interface PlaceTipsParams {
  limit?: number;
  fields?: string;
  sort?: 'popular' | 'newest';
  offset?: number;
}

export interface ProposeEditBody {
  name?: string;
  address?: string;
  cross_street?: string;
  locality?: string;
  region?: string;
  postcode?: string;
  country?: string;
  tel?: string;
  website?: string;
  social_media?: Record<string, string>;
  hours?: Record<string, any>;
  category_ids?: string[];
  email?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface FlagPlaceBody {
  problem:
    | 'mislocated'
    | 'closed'
    | 'duplicate'
    | 'inappropriate'
    | 'doesnt_exist'
    | 'private'
    | 'event_over';
  duplicate_fsq_id?: string;
  comment?: string;
  latitude?: number;
  longitude?: number;
}

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.foursquare.com/v3',
      headers: {
        Authorization: config.token,
        Accept: 'application/json'
      }
    });
  }

  async searchPlaces(params: PlaceSearchParams) {
    let response = await this.api.get('/places/search', { params });
    return response.data;
  }

  async getPlaceDetails(fsqId: string, params?: { fields?: string; session_token?: string }) {
    let response = await this.api.get(`/places/${fsqId}`, { params });
    return response.data;
  }

  async autocomplete(params: AutocompleteParams) {
    let response = await this.api.get('/autocomplete', { params });
    return response.data;
  }

  async matchPlace(params: PlaceMatchParams) {
    let response = await this.api.get('/places/match', { params });
    return response.data;
  }

  async getNearbyPlaces(
    ll: string,
    params?: { hacc?: number; altitude?: number; limit?: number; fields?: string }
  ) {
    let response = await this.api.get('/places/nearby', { params: { ll, ...params } });
    return response.data;
  }

  async getPlacePhotos(fsqId: string, params?: PlacePhotosParams) {
    let response = await this.api.get(`/places/${fsqId}/photos`, { params });
    return response.data;
  }

  async getPlaceTips(fsqId: string, params?: PlaceTipsParams) {
    let response = await this.api.get(`/places/${fsqId}/tips`, { params });
    return response.data;
  }

  async proposeEdit(fsqId: string, body: ProposeEditBody) {
    let response = await this.api.post(`/places/${fsqId}/proposededit`, body);
    return response.data;
  }

  async flagPlace(fsqId: string, body: FlagPlaceBody) {
    let response = await this.api.post(`/places/${fsqId}/flag`, body);
    return response.data;
  }

  async getFeedbackStatus(feedbackId: string) {
    let response = await this.api.get(`/places/feedback/${feedbackId}`);
    return response.data;
  }
}
