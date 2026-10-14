import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface GeocodioClientConfig {
  token: string;
}

export interface AddressComponents {
  number?: string;
  predirectional?: string;
  street?: string;
  suffix?: string;
  postdirectional?: string;
  secondaryunit?: string;
  secondarynumber?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  country?: string;
  formattedStreet?: string;
}

export interface GeocodioLocation {
  lat: number;
  lng: number;
}

export interface GeocodioResult {
  addressComponents: Record<string, any>;
  formattedAddress: string;
  location: GeocodioLocation;
  accuracy: number;
  accuracyType: string;
  source: string;
  stableAddressKey?: string;
  fields?: Record<string, any>;
}

export interface GeocodioResponse {
  input: Record<string, any>;
  results: GeocodioResult[];
}

export interface BatchGeocodioResponse {
  results: Array<{
    query: string;
    response: GeocodioResponse;
  }>;
}

export interface GeocodioListStatus {
  listId: number;
  filename: string;
  status: string;
  rows: number;
  geocodedRows?: number;
  fields?: string[];
  progress?: number;
  estimatedTimeRemaining?: string;
  downloadUrl?: string;
  expiresAt?: string;
  createdAt?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: GeocodioClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Geocodio API key is required. Reconnect with an API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.geocod.io/v1.11',
      authHeader: { value: `Bearer ${config.token}` },
      contentType: false,
      timeout: 60000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Geocodio',
          reason: 'geocodio_api_error'
        })
    });
  }

  async geocodeForward(params: {
    address?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    fields?: string[];
    limit?: number;
    format?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};

    if (params.address) {
      queryParams.q = params.address;
    } else {
      if (params.street) queryParams.street = params.street;
      if (params.city) queryParams.city = params.city;
      if (params.state) queryParams.state = params.state;
      if (params.postalCode) queryParams.postal_code = params.postalCode;
    }

    if (params.country) queryParams.country = params.country;
    if (params.fields && params.fields.length > 0)
      queryParams.fields = params.fields.join(',');
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.format) queryParams.format = params.format;

    let response = await this.axios.get('/geocode', { params: queryParams });
    return response.data;
  }

  async geocodeReverse(params: {
    latitude: number;
    longitude: number;
    fields?: string[];
    limit?: number;
    format?: string;
    skipGeocoding?: boolean;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      q: `${params.latitude},${params.longitude}`
    };

    if (params.fields && params.fields.length > 0)
      queryParams.fields = params.fields.join(',');
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.format) queryParams.format = params.format;
    if (params.skipGeocoding) queryParams.skipGeocoding = true;

    let response = await this.axios.get('/reverse', { params: queryParams });
    return response.data;
  }

  async batchGeocodeForward(params: {
    addresses: string[];
    fields?: string[];
    limit?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};

    if (params.fields && params.fields.length > 0)
      queryParams.fields = params.fields.join(',');
    if (params.limit !== undefined) queryParams.limit = params.limit;

    let response = await this.axios.post('/geocode', params.addresses, {
      params: queryParams
    });
    return response.data;
  }

  async batchGeocodeReverse(params: {
    coordinates: string[];
    fields?: string[];
    limit?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};

    if (params.fields && params.fields.length > 0)
      queryParams.fields = params.fields.join(',');
    if (params.limit !== undefined) queryParams.limit = params.limit;

    let response = await this.axios.post('/reverse', params.coordinates, {
      params: queryParams
    });
    return response.data;
  }

  async geocodeWithDistance(params: {
    address?: string;
    latitude?: number;
    longitude?: number;
    destinations: string[];
    distanceMode?: string;
    distanceUnits?: string;
    fields?: string[];
  }): Promise<any> {
    let queryParams: Record<string, any> = {};

    if (params.address) {
      queryParams.q = params.address;
    } else if (params.latitude !== undefined && params.longitude !== undefined) {
      queryParams.q = `${params.latitude},${params.longitude}`;
    }

    if (params.fields && params.fields.length > 0)
      queryParams.fields = params.fields.join(',');
    queryParams.distance_mode =
      params.distanceMode === 'straight-line'
        ? 'straightline'
        : (params.distanceMode ?? 'driving');
    if (params.distanceUnits) queryParams.distance_units = params.distanceUnits;

    params.destinations.forEach((dest, i) => {
      queryParams[`destinations[${i}]`] = dest;
    });

    let endpoint = params.address ? '/geocode' : '/reverse';
    let response = await this.axios.get(endpoint, { params: queryParams });
    return response.data;
  }

  async createList(params: {
    fileContent: string;
    filename: string;
    direction: string;
    format: string;
    callback?: string;
    fields?: string[];
  }): Promise<any> {
    let formData = new FormData();
    let blob = new Blob([params.fileContent], { type: 'text/csv' });
    formData.append('file', blob, params.filename);
    formData.append('direction', params.direction);
    formData.append('format', params.format);

    if (params.callback) formData.append('callback', params.callback);
    let response = await this.axios.post('/lists', formData, {
      params: params.fields?.length ? { fields: params.fields.join(',') } : undefined
    });
    return response.data;
  }

  async getListStatus(listId: number): Promise<any> {
    let response = await this.axios.get(`/lists/${listId}`);
    return response.data;
  }

  async getLists(page?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page) params.page = page;

    let response = await this.axios.get('/lists', { params });
    return response.data;
  }

  async downloadList(listId: number): Promise<string> {
    let response = await this.axios.get<string>(`/lists/${listId}/download`, {
      responseType: 'text',
      transformResponse: [data => data]
    });
    if (
      typeof response.data !== 'string' ||
      String(response.headers['content-type'] ?? '').includes('application/json')
    ) {
      throw createApiServiceError(
        'Geocodio did not return a CSV file. Check get_list_status and retry once the list is completed.'
      );
    }
    return response.data;
  }

  async calculateDistanceMatrix(params: {
    origins: string[];
    destinations: string[];
    mode?: string;
    units?: string;
  }): Promise<any> {
    let response = await this.axios.post('/distance-matrix', {
      origins: params.origins,
      destinations: params.destinations,
      mode: params.mode === 'straight-line' ? 'straightline' : (params.mode ?? 'driving'),
      units: params.units ?? 'miles'
    });
    return response.data;
  }

  async deleteList(listId: number): Promise<any> {
    let response = await this.axios.delete(`/lists/${listId}`);
    return response.data;
  }
}
