import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface ClientConfig {
  token: string;
  countryCode?: string;
  locale?: string;
}

type SearchParams = {
  keyword?: string;
  id?: string;
  source?: string;
  includeTest?: string;
  sort?: string;
  size?: number;
  page?: number;
};

type ClassificationFilters = {
  classificationName?: string;
  classificationId?: string;
  segmentId?: string;
  segmentName?: string;
  genreId?: string;
  subGenreId?: string;
  typeId?: string;
  subTypeId?: string;
  includeFamily?: string;
};

type LocationFilters = {
  countryCode?: string;
  stateCode?: string;
  city?: string;
  postalCode?: string;
  latlong?: string;
  geoPoint?: string;
  radius?: string;
  unit?: string;
};

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Ticketmaster',
    reason: 'ticketmaster_api_error',
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
    detailKeys: [
      'faultstring',
      'message',
      'description',
      'detail',
      'error',
      'errorcode',
      'code'
    ],
    nestedKeys: ['fault', 'detail', 'errors'],
    extractUpstreamCode: (_failure, response) => {
      let data = response?.data;
      if (!isApiErrorRecord(data)) return undefined;
      let fault = data.fault;
      if (isApiErrorRecord(fault) && isApiErrorRecord(fault.detail)) {
        let code = fault.detail.errorcode;
        if (typeof code === 'string') return code;
      }
      let firstError = Array.isArray(data.errors) ? data.errors[0] : undefined;
      let code = isApiErrorRecord(firstError) ? firstError.code : data.code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

let createClient = (baseURL: string, token: string) => {
  if (!token.trim()) {
    throw createApiServiceError('A Ticketmaster API key is required.', {
      reason: 'missing_api_key'
    });
  }
  return createAuthenticatedAxios({
    baseURL,
    params: { apikey: token.trim() },
    timeout: 30000,
    contentType: false,
    errorAdapter: apiError
  });
};

let resourceId = (value: string, label: string) => {
  if (!value.trim()) {
    throw createApiServiceError(`${label} must not be blank.`, {
      reason: 'invalid_resource_id'
    });
  }
  return encodeURIComponent(value.trim());
};

let validateSearch = (params: SearchParams & { unit?: string }) => {
  let size = params.size ?? 20;
  let page = params.page ?? 0;
  if (!Number.isInteger(size) || size < 1 || size > 200) {
    throw createApiServiceError('size must be a whole number between 1 and 200.', {
      reason: 'invalid_pagination'
    });
  }
  if (!Number.isInteger(page) || page < 0 || size * page >= 1000) {
    throw createApiServiceError(
      'page must be a non-negative whole number with size × page below 1000. Narrow the search to retrieve more results.',
      { reason: 'invalid_pagination' }
    );
  }
  if (params.unit !== undefined && !['miles', 'km'].includes(params.unit)) {
    throw createApiServiceError('unit must be miles or km.', { reason: 'invalid_unit' });
  }
};

export class DiscoveryClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private config: ClientConfig) {
    this.api = createClient('https://app.ticketmaster.com/discovery/v2', config.token);
  }

  private async get(
    path: string,
    params: Record<string, unknown> = {},
    location = false
  ): Promise<any> {
    let response = await this.api.get(path, {
      params: pickDefined({
        locale: this.config.locale,
        ...(location ? { countryCode: this.config.countryCode } : {}),
        ...params
      }),
      paramsSerializer: { indexes: null }
    });
    return response.data;
  }

  async searchEvents(
    params: SearchParams &
      ClassificationFilters &
      LocationFilters & {
        attractionId?: string;
        venueId?: string;
        promoterId?: string;
        marketId?: string;
        dmaId?: string;
        startDateTime?: string;
        endDateTime?: string;
        localStartDateTime?: string;
        localEndDateTime?: string;
        onsaleStartDateTime?: string;
        onsaleEndDateTime?: string;
        onsaleOnStartDate?: string;
        onsaleOnAfterStartDate?: string;
        includeTBA?: string;
        includeTBD?: string;
      } = {}
  ): Promise<any> {
    validateSearch(params);
    return this.get('/events.json', pickDefined(params), true);
  }

  async getEventDetails(eventId: string): Promise<any> {
    return this.get(`/events/${resourceId(eventId, 'Event ID')}.json`);
  }

  async searchAttractions(params: SearchParams & ClassificationFilters = {}): Promise<any> {
    validateSearch(params);
    return this.get('/attractions.json', pickDefined(params));
  }

  async getAttractionDetails(attractionId: string): Promise<any> {
    return this.get(`/attractions/${resourceId(attractionId, 'Attraction ID')}.json`);
  }

  async searchVenues(params: SearchParams & LocationFilters = {}): Promise<any> {
    validateSearch(params);
    return this.get('/venues.json', pickDefined(params), true);
  }

  async getVenueDetails(venueId: string): Promise<any> {
    return this.get(`/venues/${resourceId(venueId, 'Venue ID')}.json`);
  }

  async searchClassifications(params: SearchParams = {}): Promise<any> {
    validateSearch(params);
    return this.get('/classifications.json', pickDefined(params));
  }

  async getClassificationDetails(classificationId: string): Promise<any> {
    return this.get(
      `/classifications/${resourceId(classificationId, 'Classification ID')}.json`
    );
  }

  async suggest(
    params: LocationFilters & {
      keyword: string;
      resource?: string;
      source?: string;
      includeFamily?: string;
      includeTBA?: string;
      includeTBD?: string;
      segmentId?: string;
      size?: number;
    }
  ): Promise<any> {
    validateSearch(params);
    if (!params.keyword.trim()) {
      throw createApiServiceError('keyword must not be blank.', { reason: 'invalid_keyword' });
    }
    return this.get('/suggest.json', pickDefined(params), true);
  }
}

export class CommerceClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    this.api = createClient('https://app.ticketmaster.com/commerce/v2', config.token);
  }

  async getEventOffers(eventId: string): Promise<any> {
    let response = await this.api.get(
      `/events/${resourceId(eventId, 'Event ID')}/offers.json`
    );
    return response.data;
  }
}

export class InventoryStatusClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    this.api = createClient('https://app.ticketmaster.com/inventory-status/v1', config.token);
  }

  async getAvailability(eventIds: string[]): Promise<any> {
    if (eventIds.length === 0 || eventIds.some(id => !id.trim() || id.includes(','))) {
      throw createApiServiceError('Provide at least one non-blank event ID without commas.', {
        reason: 'invalid_event_ids'
      });
    }
    let events = eventIds.map(id => id.trim()).join(',');
    if (
      new TextEncoder().encode(this.api.getUri({ url: '/availability', params: { events } }))
        .length > 7000
    ) {
      throw createApiServiceError(
        'The event ID list must fit within the 7 KB request limit. Split it into smaller batches.',
        { reason: 'inventory_request_too_large' }
      );
    }
    let response = await this.api.get('/availability', { params: { events } });
    return response.data;
  }
}
