import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export class RadarClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Radar API key is required. Reconnect with a valid key.');
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.radar.io/v1',
      timeout: 30000,
      authHeader: { value: config.token },
      errorMapping: {
        extractResponseData: response => {
          let data: unknown = response.data;
          return isApiErrorRecord(data) && isApiErrorRecord(data.meta) ? data.meta : data;
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Radar',
          reason: 'radar_api_error',
          nestedKeys: ['meta', 'errors'],
          detailKeys: ['message', 'detail', 'error']
        })
    });
  }

  // --- Geofences ---

  async listGeofences(params?: {
    limit?: number;
    createdBefore?: string;
    createdAfter?: string;
    tag?: string;
  }) {
    let res = await this.api.get('/geofences', {
      params
    });
    return res.data;
  }

  async getGeofence(geofenceId: string) {
    let res = await this.api.get(`/geofences/${encodeURIComponent(geofenceId)}`);
    return res.data;
  }

  async getGeofenceByTagAndExternalId(tag: string, externalId: string) {
    let res = await this.api.get(
      `/geofences/${encodeURIComponent(tag)}/${encodeURIComponent(externalId)}`
    );
    return res.data;
  }

  async upsertGeofence(
    tag: string,
    externalId: string,
    data: {
      description: string;
      type: string;
      coordinates: number[] | number[][];
      radius?: number;
      metadata?: Record<string, string>;
      enabled?: boolean;
      userId?: string;
      disableAfter?: string;
      mode?: string;
    }
  ) {
    let res = await this.api.put(
      `/geofences/${encodeURIComponent(tag)}/${encodeURIComponent(externalId)}`,
      data
    );
    return res.data;
  }

  async deleteGeofence(geofenceId: string) {
    let res = await this.api.delete(`/geofences/${encodeURIComponent(geofenceId)}`);
    return res.data;
  }

  async deleteGeofenceByTagAndExternalId(tag: string, externalId: string) {
    let res = await this.api.delete(
      `/geofences/${encodeURIComponent(tag)}/${encodeURIComponent(externalId)}`
    );
    return res.data;
  }

  async listGeofenceUsers(tag: string, externalId: string) {
    let res = await this.api.get(
      `/geofences/${encodeURIComponent(tag)}/${encodeURIComponent(externalId)}/users`
    );
    return res.data;
  }

  // --- Users ---

  async listUsers(params?: { limit?: number; updatedBefore?: string; updatedAfter?: string }) {
    let res = await this.api.get('/users', {
      params
    });
    return res.data;
  }

  async getUser(userId: string) {
    let res = await this.api.get(`/users/${encodeURIComponent(userId)}`);
    return res.data;
  }

  async deleteUser(userId: string) {
    let res = await this.api.delete(`/users/${encodeURIComponent(userId)}`);
    return res.data;
  }

  // --- Trips ---

  async listTrips(params?: {
    status?: string;
    destinationGeofenceTag?: string;
    destinationGeofenceExternalId?: string;
    limit?: number;
    createdBefore?: string;
    createdAfter?: string;
    sortBy?: string;
  }) {
    let res = await this.api.get('/trips', {
      params
    });
    return res.data;
  }

  async getTrip(tripId: string) {
    let res = await this.api.get(`/trips/${encodeURIComponent(tripId)}`);
    return res.data;
  }

  async updateTrip(
    tripId: string,
    data: {
      status: string;
      metadata?: Record<string, string>;
      mode?: string;
      destinationGeofenceTag?: string;
      destinationGeofenceExternalId?: string;
      approachingThreshold?: number;
      scheduledArrivalAt?: string;
    }
  ) {
    let res = await this.api.patch(`/trips/${encodeURIComponent(tripId)}/update`, data);
    return res.data;
  }

  async createTrip(data: {
    externalId: string;
    destinationGeofenceTag?: string;
    destinationGeofenceExternalId?: string;
    userId?: string;
    mode?: string;
    approachingThreshold?: number;
    scheduledArrivalAt?: string;
    metadata?: Record<string, string | number | boolean>;
  }) {
    let res = await this.api.post('/trips', data);
    return res.data;
  }

  async deleteTrip(tripId: string) {
    let res = await this.api.delete(`/trips/${encodeURIComponent(tripId)}`);
    return res.data;
  }

  // --- Geocoding ---

  async forwardGeocode(params: {
    query: string;
    layers?: string;
    country?: string;
    lang?: string;
  }) {
    let res = await this.api.get('/geocode/forward', {
      params
    });
    return res.data;
  }

  async reverseGeocode(params: { coordinates: string; layers?: string; lang?: string }) {
    let res = await this.api.get('/geocode/reverse', {
      params
    });
    return res.data;
  }

  async ipGeocode(params?: { ip?: string }) {
    let res = await this.api.get('/geocode/ip', {
      params
    });
    return res.data;
  }

  // --- Search ---

  async autocomplete(params: {
    query: string;
    near?: string;
    layers?: string;
    limit?: number;
    countryCode?: string;
  }) {
    let res = await this.api.get('/search/autocomplete', {
      params
    });
    return res.data;
  }

  async searchPlaces(params: {
    near: string;
    chains?: string;
    categories?: string;
    radius?: number;
    limit?: number;
  }) {
    let res = await this.api.get('/search/places', {
      params
    });
    return res.data;
  }

  async searchGeofences(params: {
    near: string;
    radius?: number;
    tags?: string;
    limit?: number;
    includeGeometry?: boolean;
  }) {
    let res = await this.api.get('/search/geofences', {
      params
    });
    return res.data;
  }

  // --- Routing ---

  async getDistance(params: {
    origin: string;
    destination: string;
    modes: string;
    units?: string;
    avoid?: string;
    geometry?: string;
    departureTime?: string;
  }) {
    let res = await this.api.get('/route/distance', {
      params
    });
    return res.data;
  }

  async getMatrix(params: {
    origins: string;
    destinations: string;
    mode: string;
    units?: string;
    avoid?: string;
    departureTime?: string;
  }) {
    let res = await this.api.get('/route/matrix', {
      params
    });
    return res.data;
  }

  async getDirections(params: {
    locations: string;
    mode?: string;
    units?: string;
    avoid?: string;
    geometry?: string;
    departureTime?: string;
    alternatives?: boolean;
    lang?: string;
  }) {
    let res = await this.api.get('/route/directions', {
      params
    });
    return res.data;
  }

  // --- Events ---

  async listEvents(params?: {
    limit?: number;
    createdBefore?: string;
    createdAfter?: string;
  }) {
    let res = await this.api.get('/events', {
      params
    });
    return res.data;
  }

  async getEvent(eventId: string) {
    let res = await this.api.get(`/events/${encodeURIComponent(eventId)}`);
    return res.data;
  }

  async verifyEvent(
    eventId: string,
    data: {
      verification: number;
      verifiedPlaceId?: string;
    }
  ) {
    let res = await this.api.put(`/events/${encodeURIComponent(eventId)}/verification`, data);
    return res.data;
  }

  async deleteEvent(eventId: string) {
    let res = await this.api.delete(`/events/${encodeURIComponent(eventId)}`);
    return res.data;
  }

  // --- Address Validation ---

  async validateAddress(params: {
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
    number?: string;
    street?: string;
    unit?: string;
    addressLabel?: string;
  }) {
    let res = await this.api.get('/addresses/validate', {
      params
    });
    return res.data;
  }

  // --- Context ---

  async getContext(params: { coordinates: string }) {
    let res = await this.api.get('/context', {
      params
    });
    return res.data;
  }

  // --- Track ---

  async trackUser(data: {
    deviceId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    userId?: string;
    foreground?: boolean;
    stopped?: boolean;
    description?: string;
    metadata?: Record<string, string>;
    deviceType?: string;
    updatedAt?: string;
  }) {
    let res = await this.api.post('/track', data);
    return res.data;
  }

  // --- Search Users ---

  async searchUsers(params: { near: string; radius?: number; limit?: number }) {
    let res = await this.api.get('/search/users', {
      params
    });
    return res.data;
  }
}
