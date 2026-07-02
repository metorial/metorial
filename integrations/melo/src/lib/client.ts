import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  production: 'https://api.notif.immo',
  sandbox: 'https://preprod-api.notif.immo'
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; environment?: string }) {
    let baseURL = BASE_URLS[config.environment ?? 'production'] ?? BASE_URLS.production;
    this.axios = createAxios({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.token
      }
    });
  }

  // ── Properties ──

  async searchProperties(
    params: Record<string, unknown>
  ): Promise<HydraCollection<PropertyDocument>> {
    let response = await this.axios.get('/documents/properties', { params });
    return response.data;
  }

  async getProperty(propertyId: string): Promise<PropertyDocument> {
    let response = await this.axios.get(`/documents/properties/${propertyId}`);
    return response.data;
  }

  async getSimilarProperties(
    propertyId: string,
    params?: Record<string, unknown>
  ): Promise<HydraCollection<PropertyDocument>> {
    let response = await this.axios.get(
      `/documents/properties/${propertyId}/similar-properties`,
      { params }
    );
    return response.data;
  }

  // ── Saved Searches ──

  async listSearches(params?: Record<string, unknown>): Promise<HydraCollection<SavedSearch>> {
    let response = await this.axios.get('/searches', {
      params,
      headers: { platformOrigin: 'melo' }
    });
    return response.data;
  }

  async getSearch(searchId: string): Promise<SavedSearch> {
    let response = await this.axios.get(`/searches/${searchId}`);
    return response.data;
  }

  async createSearch(data: Record<string, unknown>): Promise<SavedSearch> {
    let response = await this.axios.post('/searches', data);
    return response.data;
  }

  async updateSearch(searchId: string, data: Record<string, unknown>): Promise<SavedSearch> {
    let response = await this.axios.put(`/searches/${searchId}`, data);
    return response.data;
  }

  async deleteSearch(searchId: string): Promise<void> {
    await this.axios.delete(`/searches/${searchId}`);
  }

  // ── Market Indicators ──

  async getPricePerMeterEvolution(
    params: Record<string, unknown>
  ): Promise<HydraCollection<PricePerMeterData>> {
    let response = await this.axios.get('/indicators/price_per_meter', { params });
    return response.data;
  }

  async getCities(params?: Record<string, unknown>): Promise<HydraCollection<City>> {
    let response = await this.axios.get('/cities', { params });
    return response.data;
  }

  async getPointsOfInterest(
    params: Record<string, unknown>
  ): Promise<HydraCollection<PointOfInterest>> {
    let response = await this.axios.get('/indicators/points_of_interest', { params });
    return response.data;
  }

  async locationAutocomplete(
    params: Record<string, unknown>
  ): Promise<HydraCollection<LocationSuggestion>> {
    let response = await this.axios.get('/public/location-autocomplete', { params });
    return response.data;
  }
}

// ── Types ──

export interface HydraCollection<T> {
  'hydra:member': T[];
  'hydra:totalItems': number;
  'hydra:view'?: {
    '@id': string;
    'hydra:first'?: string;
    'hydra:next'?: string;
    'hydra:last'?: string;
  };
}

export interface PropertyDocument {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  uuid: string;
  title: string;
  description: string;
  propertyType: number;
  transactionType: number;
  price: number;
  pricePerMeter: number | null;
  surface: number | null;
  landSurface: number | null;
  bedroom: number | null;
  room: number | null;
  floor: number | null;
  furnished: boolean | null;
  elevator: boolean | null;
  locations: { lat: number; lon: number } | null;
  city: {
    name: string;
    zipcode: string;
    insee: string;
  } | null;
  pictures: string[];
  picturesRemote: string[];
  createdAt: string;
  updatedAt: string;
  lastCrawledAt: string | null;
  expired: boolean;
  expiredAt: string | null;
  adverts: Advert[];
  stations: Station[];
}

export interface Advert {
  uuid: string;
  price: number;
  surface: number | null;
  title: string;
  description: string;
  condominiumFees: number | null;
  constructionYear: number | null;
  energy: { category: string; value: number } | null;
  greenHouseGas: { category: string; value: number } | null;
  contact: {
    agency: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    fax: string | null;
    reference: string | null;
  } | null;
  publisher: { name: string; type: number } | null;
  features: string[];
  createdAt: string;
  events: AdvertEvent[];
}

export interface AdvertEvent {
  fieldName: string;
  fieldNewValue: unknown;
  fieldOldValue: unknown;
  percentVariation: number | null;
}

export interface Station {
  name: string;
  lines: { number: string }[];
}

export interface SavedSearch {
  '@id'?: string;
  '@type'?: string;
  uuid?: string;
  title: string;
  propertyTypes: number[];
  transactionType: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  surfaceMin?: number | null;
  surfaceMax?: number | null;
  bedroomMin?: number | null;
  roomMin?: number | null;
  roomMax?: number | null;
  lat?: number | null;
  lon?: number | null;
  radius?: number | null;
  includedCities?: string[];
  includedDepartments?: string[];
  includedZipcodes?: string[];
  excludedCities?: string[];
  publisherTypes?: number[];
  pricePerMeterMin?: number | null;
  pricePerMeterMax?: number | null;
  landSurfaceMin?: number | null;
  landSurfaceMax?: number | null;
  furnished?: boolean | null;
  withVirtualTour?: boolean | null;
  withCoherentPrice?: boolean | null;
  expressions?: string[];
  endpointRecipient?: string | null;
  eventEndpoint?: string | null;
  notificationEnabled?: boolean;
  subscribedEvents?: string[];
  notificationRecipient?: string | null;
  hidePropertyContact?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  lastAlertAt?: string | null;
  token?: string;
}

export interface PricePerMeterData {
  average: number;
  average_min: number;
  average_max: number;
  median: number;
  series: Record<string, number>;
}

export interface City {
  '@id': string;
  '@type': string;
  zipcode: string;
  insee: string;
  name: string;
  libelle: string;
  originalName: string;
  article: string;
  department: string;
  cityParent: City | null;
}

export interface PointOfInterest {
  lat: number;
  lon: number;
  name: string;
  type: string;
  attributes: Record<string, unknown>;
}

export interface LocationSuggestion {
  '@id': string;
  '@type': string;
  id: string | number;
  code: string;
  insee: string;
  name: string;
  libelle: string;
  displayName: string;
  zipcode: string;
  groupedCityNames: string[];
  groupedCityZipcodes: string[];
  location: { lat: number; lon: number } | null;
}
