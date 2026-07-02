import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.radar.io/v1'
});

export class RadarClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return { Authorization: this.token };
  }

  // --- Geofences ---

  async listGeofences(params?: {
    limit?: number;
    createdBefore?: string;
    createdAfter?: string;
    tag?: string;
  }) {
    let res = await api.get('/geofences', {
      headers: this.headers(),
      params
    });
    return res.data;
  }

  async getGeofence(geofenceId: string) {
    let res = await api.get(`/geofences/${geofenceId}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async getGeofenceByTagAndExternalId(tag: string, externalId: string) {
    let res = await api.get(`/geofences/${tag}/${externalId}`, {
      headers: this.headers()
    });
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
    }
  ) {
    let res = await api.put(`/geofences/${tag}/${externalId}`, data, {
      headers: this.headers()
    });
    return res.data;
  }

  async deleteGeofence(geofenceId: string) {
    let res = await api.delete(`/geofences/${geofenceId}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async deleteGeofenceByTagAndExternalId(tag: string, externalId: string) {
    let res = await api.delete(`/geofences/${tag}/${externalId}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async listGeofenceUsers(
    geofenceId: string,
    params?: {
      limit?: number;
      updatedBefore?: string;
      updatedAfter?: string;
    }
  ) {
    let res = await api.get(`/geofences/${geofenceId}/users`, {
      headers: this.headers(),
      params
    });
    return res.data;
  }

  // --- Users ---

  async listUsers(params?: { limit?: number; updatedBefore?: string; updatedAfter?: string }) {
    let res = await api.get('/users', {
      headers: this.headers(),
      params
    });
    return res.data;
  }

  async getUser(userId: string) {
    let res = await api.get(`/users/${userId}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async deleteUser(userId: string) {
    let res = await api.delete(`/users/${userId}`, {
      headers: this.headers()
    });
    return res.data;
  }

  // --- Trips ---

  async listTrips(params?: {
    status?: string;
    destinationGeofenceTag?: string;
    destinationGeofenceExternalId?: string;
  }) {
    let res = await api.get('/trips', {
      headers: this.headers(),
      params
    });
    return res.data;
  }

  async getTrip(tripId: string) {
    let res = await api.get(`/trips/${tripId}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async updateTrip(
    tripId: string,
    data: {
      status: string;
      metadata?: Record<string, string>;
    }
  ) {
    let res = await api.patch(`/trips/${tripId}`, data, {
      headers: this.headers()
    });
    return res.data;
  }

  // --- Geocoding ---

  async forwardGeocode(params: {
    query: string;
    layers?: string;
    country?: string;
    lang?: string;
  }) {
    let res = await api.get('/geocode/forward', {
      headers: this.headers(),
      params
    });
    return res.data;
  }

  async reverseGeocode(params: { coordinates: string; layers?: string; lang?: string }) {
    let res = await api.get('/geocode/reverse', {
      headers: this.headers(),
      params
    });
    return res.data;
  }

  async ipGeocode(params?: { ip?: string }) {
    let res = await api.get('/geocode/ip', {
      headers: this.headers(),
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
    let res = await api.get('/search/autocomplete', {
      headers: this.headers(),
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
    let res = await api.get('/search/places', {
      headers: this.headers(),
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
    let res = await api.get('/search/geofences', {
      headers: this.headers(),
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
    let res = await api.get('/route/distance', {
      headers: this.headers(),
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
    let res = await api.get('/route/matrix', {
      headers: this.headers(),
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
    let res = await api.get('/route/directions', {
      headers: this.headers(),
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
    let res = await api.get('/events', {
      headers: this.headers(),
      params
    });
    return res.data;
  }

  async getEvent(eventId: string) {
    let res = await api.get(`/events/${eventId}`, {
      headers: this.headers()
    });
    return res.data;
  }

  async verifyEvent(
    eventId: string,
    data: {
      verification: number;
      verifiedPlaceId?: string;
    }
  ) {
    let res = await api.put(`/events/${eventId}/verification`, data, {
      headers: this.headers()
    });
    return res.data;
  }

  async deleteEvent(eventId: string) {
    let res = await api.delete(`/events/${eventId}`, {
      headers: this.headers()
    });
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
    let res = await api.get('/addresses/validate', {
      headers: this.headers(),
      params
    });
    return res.data;
  }

  // --- Context ---

  async getContext(params: { coordinates: string }) {
    let res = await api.get('/context', {
      headers: this.headers(),
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
    let res = await api.post('/track', data, {
      headers: this.headers()
    });
    return res.data;
  }

  // --- Search Users ---

  async searchUsers(params: { near: string; radius?: number; limit?: number }) {
    let res = await api.get('/search/users', {
      headers: this.headers(),
      params
    });
    return res.data;
  }
}
