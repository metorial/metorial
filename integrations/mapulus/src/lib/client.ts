import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api.mapulus.com/api/v1';

export interface MapulusMap {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  layers?: MapulusLayer[];
  [key: string]: unknown;
}

export interface MapulusLayer {
  id: string;
  name: string;
  style?: string;
  color?: string;
  map_id?: string;
  [key: string]: unknown;
}

export interface MapulusLocation {
  id: string;
  title?: string;
  label?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  external_id?: string;
  layer_id?: string;
  map_id?: string;
  custom_attributes?: Record<string, unknown>;
  travel_boundary?: TravelBoundary;
  created_at?: string;
  updated_at?: string;
  nearest_meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TravelBoundary {
  mode?: string;
  value?: number;
  unit?: string;
}

export interface CreateLocationInput {
  layerId: string;
  title?: string;
  label?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  externalId?: string;
  customAttributes?: Record<string, unknown>;
  travelBoundary?: TravelBoundary;
  createMissingCustomAttributes?: boolean;
}

export interface UpdateLocationInput extends Omit<CreateLocationInput, 'layerId'> {
  locationId: string;
  layerId?: string;
}

export interface FindLocationsInput {
  locationId?: string;
  externalId?: string;
  layerId?: string;
  mapId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface NearbySearchInput {
  mapId: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  radius?: number;
  unit?: string;
  profile?: string;
  sortBy?: string;
  limit?: number;
  liveTraffic?: boolean;
}

type ApiRecord = Record<string, unknown>;

let readRecord = (value: unknown, label: string): ApiRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createApiServiceError(`Mapulus returned an invalid ${label} response.`);
  }
  return value as ApiRecord;
};

let readResource = (value: unknown, label: string) => {
  let record = readRecord(value, label);
  let resource = readRecord(record.data ?? record, label);
  if (typeof resource.id !== 'string' || !resource.id) {
    throw createApiServiceError(`Mapulus returned a ${label} without an ID.`);
  }
  return resource;
};

let readList = (value: unknown, label: string): unknown[] => {
  let list = Array.isArray(value) ? value : readRecord(value, label).data;
  if (!Array.isArray(list)) {
    throw createApiServiceError(`Mapulus returned an invalid ${label} list.`);
  }
  return list;
};

let normalizeMap = (value: unknown): MapulusMap => {
  let map = readResource(value, 'map');
  let name = map.title ?? map.name;
  if (typeof name !== 'string') {
    throw createApiServiceError('Mapulus returned a map without a title.');
  }
  let layers = Array.isArray(map.layers)
    ? map.layers.map(value => {
        let layer = readResource(value, 'layer');
        let name = layer.title ?? layer.name;
        if (typeof name !== 'string') {
          throw createApiServiceError('Mapulus returned a layer without a title.');
        }
        return {
          ...layer,
          name,
          style: layer.style ?? undefined,
          color: layer.color ?? undefined
        };
      })
    : undefined;
  return { ...map, name, description: map.description ?? undefined, layers } as MapulusMap;
};

let normalizeLocation = (value: unknown): MapulusLocation => {
  let location = readResource(value, 'location');
  let attributes = location.custom_attributes;
  if (Array.isArray(attributes)) {
    attributes = Object.fromEntries(
      attributes.map(value => {
        let attribute = readRecord(value, 'custom attribute');
        if (typeof attribute.name !== 'string') {
          throw createApiServiceError('Mapulus returned a custom attribute without a name.');
        }
        return [attribute.name, attribute.value];
      })
    );
  }
  let contourValue = location.contour_minutes;
  let numericContour = typeof contourValue === 'string' ? Number(contourValue) : contourValue;
  let travelBoundary = location.travel_boundary;
  if (location.travel_contour === true) {
    travelBoundary = pickDefined({
      mode: location.contour_mode ?? undefined,
      value:
        typeof numericContour === 'number' && Number.isFinite(numericContour)
          ? numericContour
          : undefined,
      unit: location.contour_metric ?? undefined
    });
  }
  return {
    ...location,
    title: location.title ?? undefined,
    label: location.label ?? undefined,
    latitude: location.lat ?? location.latitude ?? undefined,
    longitude: location.lon ?? location.longitude ?? undefined,
    address: location.address ?? undefined,
    external_id: location.external_id ?? undefined,
    custom_attributes: attributes ?? undefined,
    travel_boundary: travelBoundary ?? undefined
  } as MapulusLocation;
};

let validateCoordinates = (input: { latitude?: number; longitude?: number }) => {
  if (
    input.latitude !== undefined &&
    (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90)
  ) {
    throw createApiServiceError('Latitude must be between -90 and 90.');
  }
  if (
    input.longitude !== undefined &&
    (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180)
  ) {
    throw createApiServiceError('Longitude must be between -180 and 180.');
  }
};

let locationBody = (input: Omit<UpdateLocationInput, 'locationId'>) => {
  validateCoordinates(input);
  let body: ApiRecord = pickDefined({
    layer_id: input.layerId,
    title: input.title,
    label: input.label,
    lat: input.latitude,
    lon: input.longitude,
    address: input.address,
    external_id: input.externalId,
    create_or_update_custom_attributes: input.createMissingCustomAttributes,
    custom_attributes:
      input.customAttributes === undefined
        ? undefined
        : Object.entries(input.customAttributes).map(([name, value]) => ({
            object: 'custom_attribute',
            name,
            value
          }))
  });
  if (input.travelBoundary) {
    let { mode = 'driving', value, unit = 'minutes' } = input.travelBoundary;
    if (
      !['driving', 'walking', 'cycling'].includes(mode) ||
      unit !== 'minutes' ||
      value === undefined ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      throw createApiServiceError(
        'Travel boundaries require a positive value in minutes and a driving, walking, or cycling mode.'
      );
    }
    Object.assign(body, {
      travel_contour: true,
      contour_mode: mode,
      contour_metric: unit,
      contour_style: 'polygons',
      contour_minutes: String(value)
    });
  }
  return body;
};

export class MapulusClient {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Mapulus API key is required. Reconnect with an API key from Profile > API Keys.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Mapulus', reason: 'mapulus_api_error' })
    });
  }

  async listMaps(expandLayers?: boolean): Promise<MapulusMap[]> {
    let response = await this.axios.get('/maps', {
      params: expandLayers ? { 'expand[]': 'layer' } : undefined
    });
    return readList(response.data, 'map').map(normalizeMap);
  }

  async getMap(mapId: string, expandLayers?: boolean): Promise<MapulusMap> {
    let response = await this.axios.get(`/maps/${encodeURIComponent(mapId)}`, {
      params: expandLayers ? { 'expand[]': 'layer' } : undefined
    });
    return normalizeMap(response.data);
  }

  async createLocation(input: CreateLocationInput): Promise<MapulusLocation> {
    if (
      !input.address?.trim() &&
      (input.latitude === undefined || input.longitude === undefined)
    ) {
      throw createApiServiceError(
        'Provide an address or both latitude and longitude to create a location.'
      );
    }
    let response = await this.axios.post('/locations', locationBody(input));
    return normalizeLocation(response.data);
  }

  async updateLocation(input: UpdateLocationInput): Promise<MapulusLocation> {
    let body = locationBody(input);
    // Keep metadata-only calls usable while satisfying the documented layer and source requirements.
    let needsSource =
      !input.address?.trim() &&
      (input.latitude === undefined || input.longitude === undefined);
    if (input.layerId === undefined || needsSource) {
      let current = await this.getLocation(input.locationId);
      if (input.layerId === undefined) {
        if (!current.layer_id) {
          throw createApiServiceError(
            'This location has no layer ID. Provide a layerId from list_maps with expandLayers.'
          );
        }
        body.layer_id = current.layer_id;
      }
      if (needsSource) {
        if (current.latitude !== undefined && current.longitude !== undefined) {
          body.lat = input.latitude ?? current.latitude;
          body.lon = input.longitude ?? current.longitude;
        } else if (current.address) {
          body.address = current.address;
        } else {
          throw createApiServiceError(
            'This location has no usable coordinates or address. Provide an address or both latitude and longitude.'
          );
        }
      }
    }
    let response = await this.axios.put(
      `/locations/${encodeURIComponent(input.locationId)}`,
      body
    );
    return normalizeLocation(response.data);
  }

  async deleteLocation(locationId: string): Promise<void> {
    await this.axios.delete(`/locations/${encodeURIComponent(locationId)}`);
  }

  async getLocation(locationId: string): Promise<MapulusLocation> {
    let response = await this.axios.get(`/locations/${encodeURIComponent(locationId)}`);
    return normalizeLocation(response.data);
  }

  async findLocations(input: FindLocationsInput): Promise<MapulusLocation[]> {
    if (input.locationId) {
      let location = await this.getLocation(input.locationId);
      return [location].filter(
        location =>
          (input.externalId === undefined || location.external_id === input.externalId) &&
          (input.layerId === undefined || location.layer_id === input.layerId) &&
          (input.mapId === undefined || location.map_id === input.mapId) &&
          (input.address === undefined || location.address === input.address) &&
          (input.latitude === undefined || location.latitude === input.latitude) &&
          (input.longitude === undefined || location.longitude === input.longitude)
      );
    }
    validateCoordinates(input);
    let params = pickDefined({
      external_id: input.externalId,
      layer_id: input.layerId,
      map_id: input.mapId,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude
    });
    let response = await this.axios.get('/locations', { params });
    return readList(response.data, 'location').map(normalizeLocation);
  }

  async searchNearby(input: NearbySearchInput): Promise<MapulusLocation[]> {
    validateCoordinates(input);
    if (
      !input.address?.trim() &&
      (input.latitude === undefined || input.longitude === undefined)
    ) {
      throw createApiServiceError(
        'Provide an address or both latitude and longitude for a nearby search.'
      );
    }
    if (
      input.limit !== undefined &&
      (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 24)
    ) {
      throw createApiServiceError(
        'The nearby result limit must be a whole number between 1 and 24.'
      );
    }
    if (input.radius !== undefined && (!Number.isFinite(input.radius) || input.radius <= 0)) {
      throw createApiServiceError('The search radius must be positive.');
    }
    let unit = input.unit ?? 'km';
    if (
      input.radius !== undefined &&
      !['km', 'kilometers', 'kilometres', 'miles', 'mi', 'm', 'meters', 'metres'].includes(
        unit
      )
    ) {
      throw createApiServiceError('Use km, miles, or m for the search radius unit.');
    }
    if (
      input.radius !== undefined &&
      (input.latitude === undefined || input.longitude === undefined)
    ) {
      throw createApiServiceError(
        'Provide latitude and longitude when applying a radius; address-only nearest searches do not expose the source coordinates.'
      );
    }
    let params = pickDefined({
      map_id: input.mapId,
      'nearest[lat]': input.latitude,
      'nearest[lon]': input.longitude,
      'nearest[address]':
        input.latitude !== undefined && input.longitude !== undefined
          ? undefined
          : input.address,
      'nearest[profile]': input.profile ?? 'driving',
      'nearest[sort_by]': input.sortBy ?? 'distance',
      'nearest[limit]': input.limit ?? 24,
      'nearest[live_traffic]':
        input.liveTraffic === undefined ? undefined : String(input.liveTraffic)
    });
    let response = await this.axios.get('/locations', { params });
    let locations = readList(response.data, 'location').map(normalizeLocation);
    if (input.radius === undefined) return locations;
    // Radius is applied to the returned candidates because the API supports nearest search, not a radius query.
    let sourceLatitude = input.latitude;
    let sourceLongitude = input.longitude;
    if (sourceLatitude === undefined || sourceLongitude === undefined) return locations;
    let radiusMeters =
      input.radius *
      (['miles', 'mi'].includes(unit)
        ? 1609.344
        : ['m', 'meters', 'metres'].includes(unit)
          ? 1
          : 1000);
    return locations.filter(location => {
      if (location.latitude === undefined || location.longitude === undefined) return false;
      let radians = Math.PI / 180;
      let latitudeDelta = (location.latitude - sourceLatitude) * radians;
      let longitudeDelta = (location.longitude - sourceLongitude) * radians;
      let arc =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(sourceLatitude * radians) *
          Math.cos(location.latitude * radians) *
          Math.sin(longitudeDelta / 2) ** 2;
      let distance =
        6371008.8 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - Math.min(arc, 1)));
      return distance <= radiusMeters;
    });
  }

  async addTravelBoundary(
    locationId: string,
    boundary: TravelBoundary
  ): Promise<MapulusLocation> {
    return this.updateLocation({ locationId, travelBoundary: boundary });
  }

  async lookupTerritory(
    mapId: string,
    boundaryType: string,
    boundaryName: string
  ): Promise<MapulusLocation[]> {
    let response = await this.axios.get(`/maps/${encodeURIComponent(mapId)}/territory`, {
      params: { boundary_type: boundaryType, boundary_name: boundaryName }
    });
    return readList(response.data, 'location').map(normalizeLocation);
  }
}
