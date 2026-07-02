import { createAxios } from 'slates';

let BASE_URL = 'https://api.mapulus.com/api/v1';

export interface MapulusMap {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  layers?: MapulusLayer[];
  [key: string]: any;
}

export interface MapulusLayer {
  id: string;
  name: string;
  style?: string;
  color?: string;
  map_id?: string;
  [key: string]: any;
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
  custom_attributes?: Record<string, any>;
  travel_boundary?: TravelBoundary;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface TravelBoundary {
  mode?: string;
  value?: number;
  unit?: string;
  [key: string]: any;
}

export interface CreateLocationInput {
  layerId: string;
  title?: string;
  label?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  externalId?: string;
  customAttributes?: Record<string, any>;
  travelBoundary?: {
    mode?: string;
    value?: number;
    unit?: string;
  };
  createMissingCustomAttributes?: boolean;
}

export interface UpdateLocationInput {
  locationId: string;
  title?: string;
  label?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  layerId?: string;
  externalId?: string;
  customAttributes?: Record<string, any>;
  travelBoundary?: {
    mode?: string;
    value?: number;
    unit?: string;
  };
  createMissingCustomAttributes?: boolean;
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
}

export class MapulusClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ========== Maps ==========

  async listMaps(expandLayers?: boolean): Promise<MapulusMap[]> {
    let params: Record<string, any> = {};
    if (expandLayers) {
      params.expand_layer = true;
    }
    let response = await this.axios.get('/maps', { params });
    return response.data?.data ?? response.data ?? [];
  }

  async getMap(mapId: string, expandLayers?: boolean): Promise<MapulusMap> {
    let params: Record<string, any> = {};
    if (expandLayers) {
      params.expand_layer = true;
    }
    let response = await this.axios.get(`/maps/${mapId}`, { params });
    return response.data?.data ?? response.data;
  }

  // ========== Layers ==========

  async listLayers(mapId: string): Promise<MapulusLayer[]> {
    let response = await this.axios.get(`/maps/${mapId}/layers`);
    return response.data?.data ?? response.data ?? [];
  }

  async getLayer(mapId: string, layerId: string): Promise<MapulusLayer> {
    let response = await this.axios.get(`/maps/${mapId}/layers/${layerId}`);
    return response.data?.data ?? response.data;
  }

  // ========== Locations ==========

  async createLocation(input: CreateLocationInput): Promise<MapulusLocation> {
    let body: Record<string, any> = {
      layer_id: input.layerId
    };

    if (input.title !== undefined) body.title = input.title;
    if (input.label !== undefined) body.label = input.label;
    if (input.latitude !== undefined) body.latitude = input.latitude;
    if (input.longitude !== undefined) body.longitude = input.longitude;
    if (input.address !== undefined) body.address = input.address;
    if (input.externalId !== undefined) body.external_id = input.externalId;
    if (input.customAttributes !== undefined) body.custom_attributes = input.customAttributes;
    if (input.createMissingCustomAttributes !== undefined)
      body.create_missing_custom_attributes = input.createMissingCustomAttributes;
    if (input.travelBoundary) {
      body.travel_boundary = {
        mode: input.travelBoundary.mode,
        value: input.travelBoundary.value,
        unit: input.travelBoundary.unit
      };
    }

    let response = await this.axios.post('/locations', body);
    return response.data?.data ?? response.data;
  }

  async updateLocation(input: UpdateLocationInput): Promise<MapulusLocation> {
    let body: Record<string, any> = {};

    if (input.title !== undefined) body.title = input.title;
    if (input.label !== undefined) body.label = input.label;
    if (input.latitude !== undefined) body.latitude = input.latitude;
    if (input.longitude !== undefined) body.longitude = input.longitude;
    if (input.address !== undefined) body.address = input.address;
    if (input.layerId !== undefined) body.layer_id = input.layerId;
    if (input.externalId !== undefined) body.external_id = input.externalId;
    if (input.customAttributes !== undefined) body.custom_attributes = input.customAttributes;
    if (input.createMissingCustomAttributes !== undefined)
      body.create_missing_custom_attributes = input.createMissingCustomAttributes;
    if (input.travelBoundary) {
      body.travel_boundary = {
        mode: input.travelBoundary.mode,
        value: input.travelBoundary.value,
        unit: input.travelBoundary.unit
      };
    }

    let response = await this.axios.put(`/locations/${input.locationId}`, body);
    return response.data?.data ?? response.data;
  }

  async deleteLocation(locationId: string): Promise<void> {
    await this.axios.delete(`/locations/${locationId}`);
  }

  async getLocation(locationId: string): Promise<MapulusLocation> {
    let response = await this.axios.get(`/locations/${locationId}`);
    return response.data?.data ?? response.data;
  }

  async findLocations(input: FindLocationsInput): Promise<MapulusLocation[]> {
    let params: Record<string, any> = {};

    if (input.locationId) params.id = input.locationId;
    if (input.externalId) params.external_id = input.externalId;
    if (input.layerId) params.layer_id = input.layerId;
    if (input.mapId) params.map_id = input.mapId;
    if (input.address) params.address = input.address;
    if (input.latitude !== undefined) params.latitude = input.latitude;
    if (input.longitude !== undefined) params.longitude = input.longitude;

    let response = await this.axios.get('/locations', { params });
    return response.data?.data ?? response.data ?? [];
  }

  // ========== Nearby Search ==========

  async searchNearby(input: NearbySearchInput): Promise<MapulusLocation[]> {
    let params: Record<string, any> = {
      map_id: input.mapId
    };

    if (input.latitude !== undefined) params.latitude = input.latitude;
    if (input.longitude !== undefined) params.longitude = input.longitude;
    if (input.address) params.address = input.address;
    if (input.radius !== undefined) params.radius = input.radius;
    if (input.unit) params.unit = input.unit;

    let response = await this.axios.get('/locations/nearby', { params });
    return response.data?.data ?? response.data ?? [];
  }

  // ========== Travel Boundaries ==========

  async addTravelBoundary(
    locationId: string,
    boundary: TravelBoundary
  ): Promise<MapulusLocation> {
    let body: Record<string, any> = {};
    if (boundary.mode) body.mode = boundary.mode;
    if (boundary.value !== undefined) body.value = boundary.value;
    if (boundary.unit) body.unit = boundary.unit;

    let response = await this.axios.post(`/locations/${locationId}/travel-boundary`, body);
    return response.data?.data ?? response.data;
  }

  // ========== Territory / Boundary Lookup ==========

  async lookupTerritory(
    mapId: string,
    boundaryType: string,
    boundaryName: string
  ): Promise<MapulusLocation[]> {
    let params: Record<string, any> = {
      boundary_type: boundaryType,
      boundary_name: boundaryName
    };

    let response = await this.axios.get(`/maps/${mapId}/territory`, { params });
    return response.data?.data ?? response.data ?? [];
  }
}
