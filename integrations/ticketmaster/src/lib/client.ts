import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  countryCode?: string;
  locale?: string;
}

export class DiscoveryClient {
  private token: string;
  private countryCode?: string;
  private locale?: string;
  private api: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.countryCode = config.countryCode;
    this.locale = config.locale;
    this.api = createAxios({
      baseURL: 'https://app.ticketmaster.com/discovery/v2'
    });
  }

  private defaultParams(): Record<string, string> {
    let params: Record<string, string> = { apikey: this.token };
    if (this.countryCode) params.countryCode = this.countryCode;
    if (this.locale) params.locale = this.locale;
    return params;
  }

  async searchEvents(
    params: {
      keyword?: string;
      attractionId?: string;
      venueId?: string;
      promoterId?: string;
      classificationName?: string;
      classificationId?: string;
      segmentId?: string;
      segmentName?: string;
      genreId?: string;
      subGenreId?: string;
      countryCode?: string;
      stateCode?: string;
      city?: string;
      postalCode?: string;
      dmaId?: string;
      latlong?: string;
      radius?: string;
      unit?: string;
      startDateTime?: string;
      endDateTime?: string;
      localStartDateTime?: string;
      localEndDateTime?: string;
      onsaleStartDateTime?: string;
      onsaleEndDateTime?: string;
      onsaleOnStartDate?: string;
      onsaleOnAfterStartDate?: string;
      source?: string;
      includeFamily?: string;
      includeTBA?: string;
      includeTBD?: string;
      includeTest?: string;
      sort?: string;
      size?: number;
      page?: number;
    } = {}
  ): Promise<any> {
    let queryParams: Record<string, string> = { ...this.defaultParams() };

    if (params.countryCode) queryParams.countryCode = params.countryCode;

    let stringFields = [
      'keyword',
      'attractionId',
      'venueId',
      'promoterId',
      'classificationName',
      'classificationId',
      'segmentId',
      'segmentName',
      'genreId',
      'subGenreId',
      'stateCode',
      'city',
      'postalCode',
      'dmaId',
      'latlong',
      'radius',
      'unit',
      'startDateTime',
      'endDateTime',
      'localStartDateTime',
      'localEndDateTime',
      'onsaleStartDateTime',
      'onsaleEndDateTime',
      'onsaleOnStartDate',
      'onsaleOnAfterStartDate',
      'source',
      'includeFamily',
      'includeTBA',
      'includeTBD',
      'includeTest',
      'sort'
    ] as const;

    for (let field of stringFields) {
      if (params[field]) queryParams[field] = params[field];
    }

    if (params.size !== undefined) queryParams.size = String(params.size);
    if (params.page !== undefined) queryParams.page = String(params.page);

    let response = await this.api.get('/events.json', { params: queryParams });
    return response.data;
  }

  async getEventDetails(eventId: string): Promise<any> {
    let response = await this.api.get(`/events/${eventId}.json`, {
      params: this.defaultParams()
    });
    return response.data;
  }

  async searchAttractions(
    params: {
      keyword?: string;
      classificationName?: string;
      classificationId?: string;
      segmentId?: string;
      segmentName?: string;
      genreId?: string;
      subGenreId?: string;
      source?: string;
      includeFamily?: string;
      includeTest?: string;
      sort?: string;
      size?: number;
      page?: number;
    } = {}
  ): Promise<any> {
    let queryParams: Record<string, string> = { ...this.defaultParams() };

    let stringFields = [
      'keyword',
      'classificationName',
      'classificationId',
      'segmentId',
      'segmentName',
      'genreId',
      'subGenreId',
      'source',
      'includeFamily',
      'includeTest',
      'sort'
    ] as const;

    for (let field of stringFields) {
      if (params[field]) queryParams[field] = params[field];
    }

    if (params.size !== undefined) queryParams.size = String(params.size);
    if (params.page !== undefined) queryParams.page = String(params.page);

    let response = await this.api.get('/attractions.json', { params: queryParams });
    return response.data;
  }

  async getAttractionDetails(attractionId: string): Promise<any> {
    let response = await this.api.get(`/attractions/${attractionId}.json`, {
      params: this.defaultParams()
    });
    return response.data;
  }

  async searchVenues(
    params: {
      keyword?: string;
      countryCode?: string;
      stateCode?: string;
      city?: string;
      postalCode?: string;
      latlong?: string;
      radius?: string;
      unit?: string;
      source?: string;
      includeTest?: string;
      sort?: string;
      size?: number;
      page?: number;
    } = {}
  ): Promise<any> {
    let queryParams: Record<string, string> = { ...this.defaultParams() };

    if (params.countryCode) queryParams.countryCode = params.countryCode;

    let stringFields = [
      'keyword',
      'stateCode',
      'city',
      'postalCode',
      'latlong',
      'radius',
      'unit',
      'source',
      'includeTest',
      'sort'
    ] as const;

    for (let field of stringFields) {
      if (params[field]) queryParams[field] = params[field];
    }

    if (params.size !== undefined) queryParams.size = String(params.size);
    if (params.page !== undefined) queryParams.page = String(params.page);

    let response = await this.api.get('/venues.json', { params: queryParams });
    return response.data;
  }

  async getVenueDetails(venueId: string): Promise<any> {
    let response = await this.api.get(`/venues/${venueId}.json`, {
      params: this.defaultParams()
    });
    return response.data;
  }

  async searchClassifications(
    params: { keyword?: string; sort?: string; size?: number; page?: number } = {}
  ): Promise<any> {
    let queryParams: Record<string, string> = { ...this.defaultParams() };

    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.sort) queryParams.sort = params.sort;
    if (params.size !== undefined) queryParams.size = String(params.size);
    if (params.page !== undefined) queryParams.page = String(params.page);

    let response = await this.api.get('/classifications.json', { params: queryParams });
    return response.data;
  }

  async getClassificationDetails(classificationId: string): Promise<any> {
    let response = await this.api.get(`/classifications/${classificationId}.json`, {
      params: this.defaultParams()
    });
    return response.data;
  }

  async suggest(params: {
    keyword: string;
    resource?: string;
    countryCode?: string;
    source?: string;
    includeFamily?: string;
    size?: number;
  }): Promise<any> {
    let queryParams: Record<string, string> = { ...this.defaultParams() };

    queryParams.keyword = params.keyword;
    if (params.resource) queryParams.resource = params.resource;
    if (params.countryCode) queryParams.countryCode = params.countryCode;
    if (params.source) queryParams.source = params.source;
    if (params.includeFamily) queryParams.includeFamily = params.includeFamily;
    if (params.size !== undefined) queryParams.size = String(params.size);

    let response = await this.api.get('/suggest.json', { params: queryParams });
    return response.data;
  }
}

export class CommerceClient {
  private token: string;
  private api: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.api = createAxios({
      baseURL: 'https://app.ticketmaster.com/commerce/v2'
    });
  }

  async getEventOffers(eventId: string): Promise<any> {
    let response = await this.api.get(`/events/${eventId}/offers.json`, {
      params: { apikey: this.token }
    });
    return response.data;
  }
}

export class InventoryStatusClient {
  private token: string;
  private api: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.api = createAxios({
      baseURL: 'https://app.ticketmaster.com/inventory-status/v1'
    });
  }

  async getAvailability(eventIds: string[]): Promise<any> {
    let response = await this.api.get('/availability', {
      params: {
        apikey: this.token,
        events: eventIds.join(',')
      }
    });
    return response.data;
  }
}
