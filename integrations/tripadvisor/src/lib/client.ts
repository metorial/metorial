import { createAxios } from 'slates';

let contentApi = createAxios({
  baseURL: 'https://api.content.tripadvisor.com/api/v1'
});

let partnerApi = createAxios({
  baseURL: 'https://api.tripadvisor.com/api/partner/2.0'
});

let reviewExpressApi = createAxios({
  baseURL: 'https://api.tripadvisor.com/api/partner/1.0'
});

export interface ClientConfig {
  token: string;
  language?: string;
  currency?: string;
}

export interface SearchParams {
  searchQuery: string;
  category?: string;
  phone?: string;
  address?: string;
  latLong?: string;
  radius?: number;
  radiusUnit?: string;
  language?: string;
}

export interface NearbySearchParams {
  latLong: string;
  category?: string;
  phone?: string;
  address?: string;
  radius?: number;
  radiusUnit?: string;
  language?: string;
}

export interface LocationMapperParams {
  latitude: number;
  longitude: number;
  query: string;
  category: string;
}

export interface ReviewExpressRequest {
  locationId: string;
  partnerRequestId?: string;
  recipient: string;
  checkin?: string;
  checkout: string;
  language?: string;
  country: string;
}

export class ContentClient {
  private token: string;
  private language: string;
  private currency: string;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.language = config.language || 'en';
    this.currency = config.currency || 'USD';
  }

  async searchLocations(params: SearchParams) {
    let response = await contentApi.get('/location/search', {
      params: {
        key: this.token,
        searchQuery: params.searchQuery,
        category: params.category,
        phone: params.phone,
        address: params.address,
        latLong: params.latLong,
        radius: params.radius,
        radiusUnit: params.radiusUnit,
        language: params.language || this.language
      }
    });
    return response.data;
  }

  async searchNearbyLocations(params: NearbySearchParams) {
    let response = await contentApi.get('/location/nearby_search', {
      params: {
        key: this.token,
        latLong: params.latLong,
        category: params.category,
        phone: params.phone,
        address: params.address,
        radius: params.radius,
        radiusUnit: params.radiusUnit,
        language: params.language || this.language
      }
    });
    return response.data;
  }

  async getLocationDetails(locationId: string, language?: string, currency?: string) {
    let response = await contentApi.get(`/location/${locationId}/details`, {
      params: {
        key: this.token,
        language: language || this.language,
        currency: currency || this.currency
      }
    });
    return response.data;
  }

  async getLocationReviews(
    locationId: string,
    language?: string,
    limit?: number,
    offset?: number
  ) {
    let response = await contentApi.get(`/location/${locationId}/reviews`, {
      params: {
        key: this.token,
        language: language || this.language,
        limit,
        offset
      }
    });
    return response.data;
  }

  async getLocationPhotos(
    locationId: string,
    language?: string,
    limit?: number,
    offset?: number,
    source?: string
  ) {
    let response = await contentApi.get(`/location/${locationId}/photos`, {
      params: {
        key: this.token,
        language: language || this.language,
        limit,
        offset,
        source
      }
    });
    return response.data;
  }

  async mapLocation(params: LocationMapperParams) {
    let mapperKey = `${this.token}-mapper`;
    let response = await partnerApi.get(
      `/location_mapper/${params.latitude},${params.longitude}`,
      {
        params: {
          key: mapperKey,
          q: params.query,
          category: params.category
        }
      }
    );
    return response.data;
  }
}

export class ReviewExpressClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async createEmailRequest(requests: ReviewExpressRequest[]) {
    let body = requests.map(req => ({
      location_id: req.locationId,
      partner_request_id: req.partnerRequestId,
      recipient: req.recipient,
      checkin: req.checkin,
      checkout: req.checkout,
      language: req.language,
      country: req.country
    }));

    let response = await reviewExpressApi.post('/email_requests', body, {
      headers: {
        'X-TripAdvisor-API-Key': this.token,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async modifyEmailRequest(requestId: number, updates: Partial<ReviewExpressRequest>) {
    let body = {
      location_id: updates.locationId,
      partner_request_id: updates.partnerRequestId,
      recipient: updates.recipient,
      checkin: updates.checkin,
      checkout: updates.checkout,
      language: updates.language,
      country: updates.country
    };

    let response = await reviewExpressApi.put(`/email_requests/${requestId}`, body, {
      headers: {
        'X-TripAdvisor-API-Key': this.token,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async cancelEmailRequest(requestId: number) {
    let response = await reviewExpressApi.delete(`/email_requests/${requestId}`, {
      headers: {
        'X-TripAdvisor-API-Key': this.token
      }
    });
    return response.data;
  }

  async checkOptInStatus(locationIds: string[]) {
    let response = await reviewExpressApi.get('/email_requests/opt_in_status', {
      params: {
        location_ids: locationIds.join(',')
      },
      headers: {
        'X-TripAdvisor-API-Key': this.token
      }
    });
    return response.data;
  }
}
