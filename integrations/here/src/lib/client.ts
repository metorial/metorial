import { createAxios } from 'slates';

export class HereClient {
  private token: string;
  private authMethod: 'apiKey' | 'bearer';

  constructor(config: { token: string; authMethod: 'apiKey' | 'bearer' }) {
    this.token = config.token;
    this.authMethod = config.authMethod;
  }

  private createClient(baseURL: string) {
    let headers: Record<string, string> = {};
    if (this.authMethod === 'bearer') {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return createAxios({ baseURL, headers });
  }

  private authParams(): Record<string, string> {
    if (this.authMethod === 'apiKey') {
      return { apiKey: this.token };
    }
    return {};
  }

  // ─── Geocoding & Search ───

  async geocode(params: {
    query?: string;
    qualifiedQuery?: string;
    at?: string;
    inArea?: string;
    limit?: number;
    lang?: string;
  }) {
    let client = this.createClient('https://geocode.search.hereapi.com');
    let queryParams: Record<string, string | number> = { ...this.authParams() };
    if (params.query) queryParams.q = params.query;
    if (params.qualifiedQuery) queryParams.qq = params.qualifiedQuery;
    if (params.at) queryParams.at = params.at;
    if (params.inArea) queryParams.in = params.inArea;
    if (params.limit) queryParams.limit = params.limit;
    if (params.lang) queryParams.lang = params.lang;
    let response = await client.get('/v1/geocode', { params: queryParams });
    return response.data;
  }

  async reverseGeocode(params: { at: string; types?: string; limit?: number; lang?: string }) {
    let client = this.createClient('https://revgeocode.search.hereapi.com');
    let queryParams: Record<string, string | number> = {
      ...this.authParams(),
      at: params.at
    };
    if (params.types) queryParams.types = params.types;
    if (params.limit) queryParams.limit = params.limit;
    if (params.lang) queryParams.lang = params.lang;
    let response = await client.get('/v1/revgeocode', { params: queryParams });
    return response.data;
  }

  async autosuggest(params: {
    query: string;
    at?: string;
    inArea?: string;
    limit?: number;
    lang?: string;
    termsLimit?: number;
  }) {
    let client = this.createClient('https://autosuggest.search.hereapi.com');
    let queryParams: Record<string, string | number> = {
      ...this.authParams(),
      q: params.query
    };
    if (params.at) queryParams.at = params.at;
    if (params.inArea) queryParams.in = params.inArea;
    if (params.limit) queryParams.limit = params.limit;
    if (params.lang) queryParams.lang = params.lang;
    if (params.termsLimit !== undefined) queryParams.termsLimit = params.termsLimit;
    let response = await client.get('/v1/autosuggest', { params: queryParams });
    return response.data;
  }

  async autocomplete(params: {
    query: string;
    at?: string;
    inArea?: string;
    limit?: number;
    lang?: string;
    types?: string;
  }) {
    let client = this.createClient('https://autocomplete.search.hereapi.com');
    let queryParams: Record<string, string | number> = {
      ...this.authParams(),
      q: params.query
    };
    if (params.at) queryParams.at = params.at;
    if (params.inArea) queryParams.in = params.inArea;
    if (params.limit) queryParams.limit = params.limit;
    if (params.lang) queryParams.lang = params.lang;
    if (params.types) queryParams.types = params.types;
    let response = await client.get('/v1/autocomplete', { params: queryParams });
    return response.data;
  }

  async discover(params: {
    query: string;
    at?: string;
    inArea?: string;
    limit?: number;
    lang?: string;
  }) {
    let client = this.createClient('https://discover.search.hereapi.com');
    let queryParams: Record<string, string | number> = {
      ...this.authParams(),
      q: params.query
    };
    if (params.at) queryParams.at = params.at;
    if (params.inArea) queryParams.in = params.inArea;
    if (params.limit) queryParams.limit = params.limit;
    if (params.lang) queryParams.lang = params.lang;
    let response = await client.get('/v1/discover', { params: queryParams });
    return response.data;
  }

  async browse(params: {
    at: string;
    categories?: string;
    foodTypes?: string;
    chains?: string;
    name?: string;
    inArea?: string;
    limit?: number;
    lang?: string;
  }) {
    let client = this.createClient('https://browse.search.hereapi.com');
    let queryParams: Record<string, string | number> = {
      ...this.authParams(),
      at: params.at
    };
    if (params.categories) queryParams.categories = params.categories;
    if (params.foodTypes) queryParams.foodTypes = params.foodTypes;
    if (params.chains) queryParams.chains = params.chains;
    if (params.name) queryParams.name = params.name;
    if (params.inArea) queryParams.in = params.inArea;
    if (params.limit) queryParams.limit = params.limit;
    if (params.lang) queryParams.lang = params.lang;
    let response = await client.get('/v1/browse', { params: queryParams });
    return response.data;
  }

  async lookup(params: { placeId: string; lang?: string }) {
    let client = this.createClient('https://lookup.search.hereapi.com');
    let queryParams: Record<string, string> = {
      ...this.authParams(),
      id: params.placeId
    };
    if (params.lang) queryParams.lang = params.lang;
    let response = await client.get('/v1/lookup', { params: queryParams });
    return response.data;
  }

  // ─── Routing ───

  async calculateRoute(params: {
    origin: string;
    destination: string;
    transportMode: string;
    via?: string[];
    returnFields?: string[];
    departureTime?: string;
    arrivalTime?: string;
    avoidFeatures?: string[];
    avoidAreas?: string[];
    excludeCountries?: string[];
    units?: string;
    lang?: string;
    spans?: string[];
    alternatives?: number;
    truckGrossWeight?: number;
    truckWeight?: number;
    truckAxleCount?: number;
    truckHeight?: number;
    truckWidth?: number;
    truckLength?: number;
    truckType?: string;
    truckTrailerCount?: number;
    truckShippedHazardousGoods?: string[];
  }) {
    let client = this.createClient('https://router.hereapi.com');
    let queryParams: Record<string, string | number> = {
      ...this.authParams(),
      origin: params.origin,
      destination: params.destination,
      transportMode: params.transportMode
    };
    if (params.returnFields && params.returnFields.length > 0)
      queryParams.return = params.returnFields.join(',');
    if (params.departureTime) queryParams.departureTime = params.departureTime;
    if (params.arrivalTime) queryParams.arrivalTime = params.arrivalTime;
    if (params.avoidFeatures && params.avoidFeatures.length > 0)
      queryParams['avoid[features]'] = params.avoidFeatures.join(',');
    if (params.avoidAreas && params.avoidAreas.length > 0)
      queryParams['avoid[areas]'] = params.avoidAreas.join('|');
    if (params.excludeCountries && params.excludeCountries.length > 0)
      queryParams.exclude = params.excludeCountries.join(',');
    if (params.units) queryParams.units = params.units;
    if (params.lang) queryParams.lang = params.lang;
    if (params.spans && params.spans.length > 0) queryParams.spans = params.spans.join(',');
    if (params.alternatives !== undefined) queryParams.alternatives = params.alternatives;

    // Truck-specific parameters
    if (params.truckGrossWeight) queryParams['truck[grossWeight]'] = params.truckGrossWeight;
    if (params.truckWeight) queryParams['truck[weight]'] = params.truckWeight;
    if (params.truckAxleCount) queryParams['truck[axleCount]'] = params.truckAxleCount;
    if (params.truckHeight) queryParams['truck[height]'] = params.truckHeight;
    if (params.truckWidth) queryParams['truck[width]'] = params.truckWidth;
    if (params.truckLength) queryParams['truck[length]'] = params.truckLength;
    if (params.truckType) queryParams['truck[type]'] = params.truckType;
    if (params.truckTrailerCount)
      queryParams['truck[trailerCount]'] = params.truckTrailerCount;
    if (params.truckShippedHazardousGoods && params.truckShippedHazardousGoods.length > 0) {
      queryParams['truck[shippedHazardousGoods]'] =
        params.truckShippedHazardousGoods.join(',');
    }

    // Via waypoints
    if (params.via && params.via.length > 0) {
      params.via.forEach((waypoint, _index) => {
        queryParams.via = waypoint;
      });
    }

    let response = await client.get('/v8/routes', { params: queryParams });
    return response.data;
  }

  async calculateMatrix(params: {
    origins: Array<{ lat: number; lng: number }>;
    destinations?: Array<{ lat: number; lng: number }>;
    transportMode?: string;
    regionType?: string;
    regionMargin?: number;
    matrixAttributes?: string[];
    departureTime?: string;
    avoidFeatures?: string[];
  }) {
    let client = this.createClient('https://matrix.router.hereapi.com');
    let queryParams: Record<string, string> = {
      ...this.authParams(),
      async: 'false'
    };

    let body: Record<string, any> = {
      origins: params.origins,
      regionDefinition: {
        type: params.regionType || 'autoCircle',
        ...(params.regionMargin ? { margin: params.regionMargin } : {})
      }
    };

    if (params.destinations) body.destinations = params.destinations;
    if (params.transportMode) body.transportMode = params.transportMode;
    if (params.matrixAttributes) body.matrixAttributes = params.matrixAttributes;
    if (params.departureTime) body.departureTime = params.departureTime;
    if (params.avoidFeatures) body.avoid = { features: params.avoidFeatures };

    let response = await client.post('/v8/matrix', body, { params: queryParams });
    return response.data;
  }

  async calculateIsoline(params: {
    origin?: string;
    destination?: string;
    transportMode: string;
    rangeType: string;
    rangeValues: number[];
    departureTime?: string;
    routingMode?: string;
    optimizeFor?: string;
    avoidFeatures?: string[];
    shapeMaxPoints?: number;
  }) {
    let client = this.createClient('https://isoline.router.hereapi.com');
    let queryParams: Record<string, string | number> = {
      ...this.authParams(),
      transportMode: params.transportMode,
      'range[type]': params.rangeType,
      'range[values]': params.rangeValues.join(',')
    };
    if (params.origin) queryParams.origin = params.origin;
    if (params.destination) queryParams.destination = params.destination;
    if (params.departureTime) queryParams.departureTime = params.departureTime;
    if (params.routingMode) queryParams.routingMode = params.routingMode;
    if (params.optimizeFor) queryParams.optimizeFor = params.optimizeFor;
    if (params.avoidFeatures && params.avoidFeatures.length > 0)
      queryParams['avoid[features]'] = params.avoidFeatures.join(',');
    if (params.shapeMaxPoints) queryParams['shape[maxPoints]'] = params.shapeMaxPoints;

    let response = await client.get('/v8/isolines', { params: queryParams });
    return response.data;
  }

  // ─── Traffic ───

  async getTrafficFlow(params: {
    inArea: string;
    locationReferencing?: string;
    minJamFactor?: number;
    maxJamFactor?: number;
    functionalClasses?: string;
    advancedFeatures?: string;
  }) {
    let client = this.createClient('https://data.traffic.hereapi.com');
    let queryParams: Record<string, string | number> = {
      ...this.authParams(),
      in: params.inArea,
      locationReferencing: params.locationReferencing || 'shape'
    };
    if (params.minJamFactor !== undefined) queryParams.minJamFactor = params.minJamFactor;
    if (params.maxJamFactor !== undefined) queryParams.maxJamFactor = params.maxJamFactor;
    if (params.functionalClasses) queryParams.functionalClasses = params.functionalClasses;
    if (params.advancedFeatures) queryParams.advancedFeatures = params.advancedFeatures;
    let response = await client.get('/v7/flow', { params: queryParams });
    return response.data;
  }

  async getTrafficIncidents(params: {
    inArea: string;
    locationReferencing?: string;
    lang?: string;
    latestEndTime?: string;
  }) {
    let client = this.createClient('https://data.traffic.hereapi.com');
    let queryParams: Record<string, string> = {
      ...this.authParams(),
      in: params.inArea,
      locationReferencing: params.locationReferencing || 'shape'
    };
    if (params.lang) queryParams.lang = params.lang;
    if (params.latestEndTime) queryParams.latestEndTime = params.latestEndTime;
    let response = await client.get('/v7/incidents', { params: queryParams });
    return response.data;
  }

  // ─── Weather ───

  async getWeather(params: {
    products: string[];
    location?: string;
    query?: string;
    zipCode?: string;
    units?: string;
    lang?: string;
    oneObservation?: boolean;
    hourlyDate?: string;
  }) {
    let client = this.createClient('https://weather.hereapi.com');
    let queryParams: Record<string, string> = {
      ...this.authParams(),
      products: params.products.join(',')
    };
    if (params.location) queryParams.location = params.location;
    if (params.query) queryParams.q = params.query;
    if (params.zipCode) queryParams.zipCode = params.zipCode;
    if (params.units) queryParams.units = params.units;
    if (params.lang) queryParams.lang = params.lang;
    if (params.oneObservation !== undefined)
      queryParams.oneobservation = String(params.oneObservation);
    if (params.hourlyDate) queryParams.hourlyDate = params.hourlyDate;
    let response = await client.get('/v3/report', { params: queryParams });
    return response.data;
  }

  // ─── Tour Planning ───

  async planTour(body: Record<string, any>) {
    let client = this.createClient('https://tourplanning.hereapi.com');
    let queryParams: Record<string, string> = { ...this.authParams() };
    let response = await client.post('/v3/problems', body, { params: queryParams });
    return response.data;
  }

  // ─── Positioning ───

  async locate(params: {
    wlan?: Array<{ mac: string }>;
    gsm?: Array<{ mcc: number; mnc: number; lac: number; cid: number }>;
    lte?: Array<{ mcc: number; mnc: number; cid: number }>;
    fallback?: string;
  }) {
    let client = this.createClient('https://positioning.hereapi.com');
    let queryParams: Record<string, string> = { ...this.authParams() };
    if (params.fallback) queryParams.fallback = params.fallback;

    let body: Record<string, any> = {};
    if (params.wlan) body.wlan = params.wlan;
    if (params.gsm) body.gsm = params.gsm;
    if (params.lte) body.lte = params.lte;

    let response = await client.post('/v2/locate', body, {
      params: queryParams,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }
}
