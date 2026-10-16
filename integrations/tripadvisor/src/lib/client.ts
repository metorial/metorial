import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord
} from 'slates';

let createClient = (baseURL: string, token: string) => {
  let toServiceError = (error: unknown) =>
    buildApiServiceError(error, {
      providerLabel: 'Tripadvisor',
      reason: 'tripadvisor_api_error',
      nestedKeys: ['error', 'errors'],
      extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
      extractMessage: (value, helpers) =>
        extractApiErrorMessage(value, {
          nestedKeys: ['error', 'errors'],
          response: helpers.getResponseWithBody(value)
        })
          .split(token)
          .join('[redacted]'),
      extractUpstreamCode: (_error, response) => {
        let body = response?.data;
        let detail =
          isApiErrorRecord(body) && isApiErrorRecord(body.error) ? body.error : body;
        return isApiErrorRecord(detail) && detail.code != null
          ? String(detail.code)
          : undefined;
      }
    });

  let client = createAuthenticatedAxios({
    baseURL,
    timeout: 30_000,
    errorAdapter: toServiceError
  });
  client.interceptors.response.use(response => {
    let body = response.data;
    if (
      isApiErrorRecord(body) &&
      (body.error != null || (Array.isArray(body.errors) && body.errors.length > 0))
    ) {
      throw toServiceError({ response: { status: response.status, data: body } });
    }
    return response;
  });
  return client;
};

export let optionalNumber = (value: unknown): number | undefined => {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return undefined;
  let number =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
};

export let optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;

export let providerId = (value: unknown): string => {
  if (
    (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return String(value);
  }
  throw createApiServiceError('Tripadvisor returned a result without its identifier.');
};

export let providerList = (value: unknown): any[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError('Tripadvisor returned an unexpected list response.');
  }
  return value;
};

export let validateRequestId = (value: number) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw createApiServiceError('The email request ID must be a positive whole number.');
  }
};

let validatePagination = (limit?: number, offset?: number) => {
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit <= 0)) {
    throw createApiServiceError('Limit must be a positive whole number.');
  }
  if (offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0)) {
    throw createApiServiceError('Offset must be a non-negative whole number.');
  }
};

let validateSearch = (params: { latLong?: string; radius?: number }) => {
  if (params.radius !== undefined && (!Number.isFinite(params.radius) || params.radius <= 0)) {
    throw createApiServiceError('Search radius must be greater than zero.');
  }
  if (params.latLong !== undefined) {
    let coordinates = params.latLong.split(',').map(value => value.trim());
    let [latitude, longitude] = coordinates.map(Number);
    if (
      coordinates.length !== 2 ||
      coordinates.some(value => value === '') ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude!) > 90 ||
      Math.abs(longitude!) > 180
    ) {
      throw createApiServiceError(
        'Provide latitude,longitude with latitude from -90 to 90 and longitude from -180 to 180.'
      );
    }
  }
};

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
  private contentApi: ReturnType<typeof createClient>;
  private partnerApi: ReturnType<typeof createClient>;
  private token: string;
  private language: string;
  private currency: string;

  constructor(config: ClientConfig) {
    this.token = config.token;
    if (!this.token.trim()) throw createApiServiceError('A Tripadvisor API key is required.');
    this.contentApi = createClient('https://api.content.tripadvisor.com/api/v1', this.token);
    this.partnerApi = createClient('https://api.tripadvisor.com/api/partner/2.0', this.token);
    this.language = config.language || 'en';
    this.currency = config.currency || 'USD';
  }

  async searchLocations(params: SearchParams) {
    validateSearch(params);
    let response = await this.contentApi.get('/location/search', {
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
    validateSearch(params);
    let response = await this.contentApi.get('/location/nearby_search', {
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
    let response = await this.contentApi.get(
      `/location/${encodeURIComponent(locationId)}/details`,
      {
        params: {
          key: this.token,
          language: language || this.language,
          currency: currency || this.currency
        }
      }
    );
    return response.data;
  }

  async getLocationReviews(
    locationId: string,
    language?: string,
    limit?: number,
    offset?: number
  ) {
    validatePagination(limit, offset);
    let response = await this.contentApi.get(
      `/location/${encodeURIComponent(locationId)}/reviews`,
      {
        params: {
          key: this.token,
          language: language || this.language,
          limit,
          offset
        }
      }
    );
    return response.data;
  }

  async getLocationPhotos(
    locationId: string,
    language?: string,
    limit?: number,
    offset?: number,
    source?: string
  ) {
    validatePagination(limit, offset);
    let response = await this.contentApi.get(
      `/location/${encodeURIComponent(locationId)}/photos`,
      {
        params: {
          key: this.token,
          language: language || this.language,
          limit,
          offset,
          source
        }
      }
    );
    return response.data;
  }

  async mapLocation(params: LocationMapperParams) {
    validateSearch({ latLong: `${params.latitude},${params.longitude}` });
    let mapperKey = `${this.token}-mapper`;
    let response = await this.partnerApi.get(
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
  private reviewExpressApi: ReturnType<typeof createClient>;

  constructor(config: { token: string }) {
    this.token = config.token;
    if (!this.token.trim())
      throw createApiServiceError('A Review Express API key is required.');
    this.reviewExpressApi = createClient(
      'https://api.tripadvisor.com/api/partner/1.0',
      this.token
    );
  }

  async createEmailRequest(requests: ReviewExpressRequest[]) {
    if (requests.length === 0)
      throw createApiServiceError('Provide at least one guest request.');
    let body = requests.map(req => ({
      location_id: req.locationId,
      partner_request_id: req.partnerRequestId,
      recipient: req.recipient,
      checkin: req.checkin,
      checkout: req.checkout,
      language: req.language,
      country: req.country
    }));

    if (JSON.stringify(body).length > 10_000) {
      throw createApiServiceError(
        'The email request body exceeds the 10,000 character limit. Send a smaller batch.'
      );
    }
    let response = await this.reviewExpressApi.post('/email_requests', body, {
      headers: {
        'X-TripAdvisor-API-Key': this.token,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async modifyEmailRequest(requestId: number, updates: Partial<ReviewExpressRequest>) {
    validateRequestId(requestId);
    if (Object.values(updates).every(value => value === undefined)) {
      throw createApiServiceError('Provide fields to update for the modify action.');
    }
    let body = {
      location_id: updates.locationId,
      partner_request_id: updates.partnerRequestId,
      recipient: updates.recipient,
      checkin: updates.checkin,
      checkout: updates.checkout,
      language: updates.language,
      country: updates.country
    };

    let response = await this.reviewExpressApi.put(`/email_requests/${requestId}`, body, {
      headers: {
        'X-TripAdvisor-API-Key': this.token,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async cancelEmailRequest(requestId: number) {
    validateRequestId(requestId);
    let response = await this.reviewExpressApi.delete(`/email_requests/${requestId}`, {
      headers: {
        'X-TripAdvisor-API-Key': this.token
      }
    });
    return response.data;
  }

  async checkOptInStatus(locationIds: string[]) {
    if (locationIds.length === 0)
      throw createApiServiceError('Provide at least one location ID.');
    let response = await this.reviewExpressApi.get('/email_requests/opt_in_status', {
      params: {
        location_ids: locationIds.join(',')
      },
      headers: {
        'X-TripAdvisor-API-Key': this.token
      }
    });
    return response.data;
  }

  async listEmailRequests(params: {
    locationId?: string;
    requestId?: number;
    partnerRequestId?: string;
  }) {
    if (
      [params.locationId, params.requestId, params.partnerRequestId].filter(
        value => value !== undefined
      ).length !== 1
    ) {
      throw createApiServiceError(
        'Provide exactly one of locationId, requestId, or partnerRequestId.'
      );
    }
    if (params.requestId !== undefined) validateRequestId(params.requestId);
    let response = await this.reviewExpressApi.get(
      params.requestId !== undefined
        ? `/email_requests/${params.requestId}`
        : '/email_requests',
      {
        params: {
          location_id: params.locationId,
          partner_request_id: params.partnerRequestId
        },
        headers: { 'X-TripAdvisor-API-Key': this.token }
      }
    );
    return response.data;
  }

  async listLocationMappings(params: { partnerId?: string; optedIn?: boolean }) {
    let response = await this.reviewExpressApi.get(
      params.partnerId !== undefined
        ? `/location_mappings/${encodeURIComponent(params.partnerId)}`
        : '/location_mappings',
      {
        params: { key: this.token, review_express_opted_in: params.optedIn },
        headers: { 'X-TripAdvisor-API-Key': this.token }
      }
    );
    return response.data;
  }
}
