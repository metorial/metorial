import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface FomoEvent {
  eventId?: number;
  applicationId?: number;
  eventTypeId?: string;
  eventTypeTag?: string;
  externalId?: string;
  firstName?: string;
  emailAddress?: string;
  ipAddress?: string;
  city?: string;
  province?: string;
  country?: string;
  title?: string;
  url?: string;
  imageUrl?: string;
  createdAtToSecondsFromEpoch?: number;
  message?: string;
  link?: string;
  customEventFieldsAttributes?: Array<{ key: string; value: string }>;
  createdAt?: string;
}

export interface FomoTemplate {
  templateId?: number;
  eventTypeTag?: string;
  name?: string;
  message?: string;
  markdownEnabled?: boolean;
  imageUrl?: string;
  useAvatar?: boolean;
  useIpMapping?: boolean;
}

export interface FomoStatistics {
  graph: Array<{
    date: string;
    convertedSaleInCents: number;
    conversionsCount: number;
    clickCount: number;
    impressionsCount: number;
    hoverCount: number;
  }>;
  totals: {
    convertedSaleInCents: number;
    conversionsCount: number;
    clickCount: number;
    impressionsCount: number;
    hoverCount: number;
    goalConversionCount: number;
    goalConvertedSaleInDollars: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
  hasGaConversions: boolean;
}

export interface FomoApplicationSettings {
  name?: string;
  url?: string;
  language?: string;
  pageLoad?: number;
  maximumPerPage?: string;
  displayFor?: number;
  displayInterval?: number;
  randomize?: boolean;
  closable?: boolean;
  displayPeriod?: number;
  displayThreshold?: number;
  timeAgoPeriod?: number;
  timeAgoThreshold?: number;
  hideMobile?: boolean;
  loopNotification?: boolean;
  position?: string;
  theme?: string;
  utmSource?: string;
  utmMedium?: string;
}

export interface ListEventsOptions {
  perPage?: number;
  page?: number;
}

let validateResourceId = (id: number, label: string) => {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createApiServiceError(`Fomo ${label} must be a positive whole number.`);
  }
};

let validateObjectResponse = (data: unknown, resource: string): void => {
  if (!isApiErrorRecord(data)) {
    throw createApiServiceError(`Fomo returned an invalid ${resource} response.`);
  }
};

let fromSnakeCaseEvent = (data: any): FomoEvent => {
  validateObjectResponse(data, 'event');
  return {
    eventId: data.id,
    applicationId: data.application_id,
    eventTypeId: data.event_type_id?.toString(),
    eventTypeTag: data.event_type_tag,
    externalId: data.external_id,
    firstName: data.first_name,
    emailAddress: data.email_address,
    ipAddress: data.ip_address,
    city: data.city,
    province: data.province,
    country: data.country,
    title: data.title,
    url: data.url,
    imageUrl: data.image_url,
    createdAtToSecondsFromEpoch: data.created_at_to_seconds_from_epoch,
    message: data.message,
    link: data.link,
    customEventFieldsAttributes: data.custom_event_fields_attributes,
    createdAt: data.created_at
  };
};

let fromSnakeCaseTemplate = (data: any): FomoTemplate => {
  validateObjectResponse(data, 'template');
  return {
    templateId: data.id,
    eventTypeTag: data.event_type_tag,
    name: data.name,
    message: data.message,
    markdownEnabled: data.markdown_enabled,
    imageUrl: data.image_url,
    useAvatar: data.use_avatar,
    useIpMapping: data.use_ip_mapping
  };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Fomo API token is required. Reconnect with your site API token.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.fomo.com/api/v1/applications/me',
      authHeader: { value: `Token ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Fomo',
          reason: 'fomo_api_error'
        })
    });
  }

  async createEvent(event: {
    eventTypeId?: string;
    eventTypeTag?: string;
    externalId?: string;
    firstName?: string;
    emailAddress?: string;
    ipAddress?: string;
    city?: string;
    province?: string;
    country?: string;
    title?: string;
    url?: string;
    imageUrl?: string;
    customEventFieldsAttributes?: Array<{ key: string; value: string }>;
    createdAt?: string;
  }): Promise<FomoEvent> {
    if (!event.eventTypeId?.trim() && !event.eventTypeTag?.trim()) {
      throw createApiServiceError(
        'Provide eventTypeId or eventTypeTag from the Fomo Templates page before creating an event.'
      );
    }
    let body: Record<string, any> = {};

    if (event.eventTypeId !== undefined) body.event_type_id = event.eventTypeId;
    if (event.eventTypeTag !== undefined) body.event_type_tag = event.eventTypeTag;
    if (event.externalId !== undefined) body.external_id = event.externalId;
    if (event.firstName !== undefined) body.first_name = event.firstName;
    if (event.emailAddress !== undefined) body.email_address = event.emailAddress;
    if (event.ipAddress !== undefined) body.ip_address = event.ipAddress;
    if (event.city !== undefined) body.city = event.city;
    if (event.province !== undefined) body.province = event.province;
    if (event.country !== undefined) body.country = event.country;
    if (event.title !== undefined) body.title = event.title;
    if (event.url !== undefined) body.url = event.url;
    if (event.imageUrl !== undefined) body.image_url = event.imageUrl;
    if (event.customEventFieldsAttributes !== undefined)
      body.custom_event_fields_attributes = event.customEventFieldsAttributes;
    if (event.createdAt !== undefined) body.created_at = event.createdAt;

    let response = await this.axios.post('/events', { event: body });
    return fromSnakeCaseEvent(response.data);
  }

  async getEvent(eventId: number): Promise<FomoEvent> {
    validateResourceId(eventId, 'event ID');
    let response = await this.axios.get(`/events/${eventId}`);
    return fromSnakeCaseEvent(response.data);
  }

  async listEvents(options?: ListEventsOptions): Promise<{
    events: FomoEvent[];
    meta?: {
      page: number;
      totalPages: number;
      perPage: number;
      totalCount: number;
    };
  }> {
    if (options?.perPage !== undefined) validateResourceId(options.perPage, 'page size');
    if (options?.page !== undefined) validateResourceId(options.page, 'page number');
    let params = pickDefined({
      show_meta: true,
      per: options?.perPage,
      page: options?.page
    });

    let response = await this.axios.get('/events', { params });

    if (Array.isArray(response.data?.events)) {
      return {
        events: response.data.events.map(fromSnakeCaseEvent),
        meta: response.data.meta
          ? {
              page: response.data.meta.page,
              totalPages: response.data.meta.total_pages,
              perPage: response.data.meta.per_page,
              totalCount: response.data.meta.total_count
            }
          : undefined
      };
    }

    if (Array.isArray(response.data)) {
      return { events: response.data.map(fromSnakeCaseEvent) };
    }
    throw createApiServiceError('Fomo returned an invalid events list response.');
  }

  async searchEvent(field: string, query: string): Promise<FomoEvent | null> {
    let response = await this.axios.get('/events/find', {
      params: { field, q: query }
    });
    if (!response.data || response.data.success === false) return null;
    return fromSnakeCaseEvent(response.data);
  }

  async updateEvent(
    eventId: number,
    event: {
      eventTypeId?: string;
      eventTypeTag?: string;
      externalId?: string;
      firstName?: string;
      emailAddress?: string;
      ipAddress?: string;
      city?: string;
      province?: string;
      country?: string;
      title?: string;
      url?: string;
      imageUrl?: string;
      customEventFieldsAttributes?: Array<{ key: string; value: string }>;
      createdAt?: string;
    }
  ): Promise<FomoEvent> {
    validateResourceId(eventId, 'event ID');
    let body: Record<string, any> = {};

    if (event.eventTypeId !== undefined) body.event_type_id = event.eventTypeId;
    if (event.eventTypeTag !== undefined) body.event_type_tag = event.eventTypeTag;
    if (event.externalId !== undefined) body.external_id = event.externalId;
    if (event.firstName !== undefined) body.first_name = event.firstName;
    if (event.emailAddress !== undefined) body.email_address = event.emailAddress;
    if (event.ipAddress !== undefined) body.ip_address = event.ipAddress;
    if (event.city !== undefined) body.city = event.city;
    if (event.province !== undefined) body.province = event.province;
    if (event.country !== undefined) body.country = event.country;
    if (event.title !== undefined) body.title = event.title;
    if (event.url !== undefined) body.url = event.url;
    if (event.imageUrl !== undefined) body.image_url = event.imageUrl;
    if (event.customEventFieldsAttributes !== undefined)
      body.custom_event_fields_attributes = event.customEventFieldsAttributes;
    if (event.createdAt !== undefined) body.created_at = event.createdAt;

    let response = await this.axios.patch(`/events/${eventId}`, { event: body });
    return fromSnakeCaseEvent(response.data);
  }

  async deleteEvent(eventId: number): Promise<{ message: string }> {
    validateResourceId(eventId, 'event ID');
    let response = await this.axios.delete(`/events/${eventId}`);
    return { message: response.data?.message ?? 'Event successfully deleted' };
  }

  async createTemplate(template: {
    name: string;
    message: string;
    markdownEnabled?: boolean;
    imageUrl?: string;
    useAvatar?: boolean;
    useIpMapping?: boolean;
  }): Promise<FomoTemplate> {
    let body: Record<string, any> = {
      name: template.name,
      message: template.message
    };
    if (template.markdownEnabled !== undefined)
      body.markdown_enabled = template.markdownEnabled;
    if (template.imageUrl !== undefined) body.image_url = template.imageUrl;
    if (template.useAvatar !== undefined) body.use_avatar = template.useAvatar;
    if (template.useIpMapping !== undefined) body.use_ip_mapping = template.useIpMapping;

    let response = await this.axios.post('/event_types', { event_type: body });
    return fromSnakeCaseTemplate(response.data);
  }

  async getStatistics(dateFrom: string, dateTo: string): Promise<FomoStatistics> {
    let response = await this.axios.get('/dashboard', {
      params: {
        'date_range[from]': dateFrom,
        'date_range[to]': dateTo
      }
    });

    let data = response.data;
    validateObjectResponse(data, 'statistics');
    if (data.graph != null && !Array.isArray(data.graph)) {
      throw createApiServiceError('Fomo returned an invalid statistics response.');
    }

    let graphEntries = (data.graph || []).map((entry: any) => ({
      date: entry.date,
      convertedSaleInCents: entry.converted_sale_in_cents ?? 0,
      conversionsCount: entry.conversions_count ?? 0,
      clickCount: entry.click_count ?? 0,
      impressionsCount: entry.impr_count ?? 0,
      hoverCount: entry.hover_count ?? 0
    }));

    let totals = data.totals || {};

    return {
      graph: graphEntries,
      totals: {
        convertedSaleInCents: totals.converted_sale_in_cents ?? 0,
        conversionsCount: totals.conversions_count ?? 0,
        clickCount: totals.click_count ?? 0,
        impressionsCount: totals.impr_count ?? 0,
        hoverCount: totals.hover_count ?? 0,
        goalConversionCount: totals.goal_conversion_count ?? 0,
        goalConvertedSaleInDollars: totals.goal_converted_sale_in_dollars ?? 0
      },
      dateRange: {
        from: data.date_range?.from ?? dateFrom,
        to: data.date_range?.to ?? dateTo
      },
      hasGaConversions: data.has_ga_conversions ?? false
    };
  }

  async updateApplication(
    applicationId: number,
    settings: FomoApplicationSettings
  ): Promise<Record<string, any>> {
    validateResourceId(applicationId, 'application ID');
    for (let [field, value] of Object.entries({
      pageLoad: settings.pageLoad,
      displayFor: settings.displayFor,
      displayInterval: settings.displayInterval,
      displayThreshold: settings.displayThreshold,
      timeAgoThreshold: settings.timeAgoThreshold
    })) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
        throw createApiServiceError(`Fomo ${field} must be a non-negative whole number.`);
      }
    }
    for (let [field, value] of Object.entries({
      displayPeriod: settings.displayPeriod,
      timeAgoPeriod: settings.timeAgoPeriod
    })) {
      if (value !== undefined && ![1, 2, 3, 4].includes(value)) {
        throw createApiServiceError(`Fomo ${field} must be 1, 2, 3, or 4.`);
      }
    }
    let body: Record<string, any> = {};

    if (settings.name !== undefined) body.name = settings.name;
    if (settings.url !== undefined) body.url = settings.url;
    if (settings.language !== undefined) body.language = settings.language;
    if (settings.pageLoad !== undefined) body.page_load = settings.pageLoad;
    if (settings.maximumPerPage !== undefined) body.maximum_per_page = settings.maximumPerPage;
    if (settings.displayFor !== undefined) body.display_for = settings.displayFor;
    if (settings.displayInterval !== undefined)
      body.display_interval = settings.displayInterval;
    if (settings.randomize !== undefined) body.randomize = settings.randomize;
    if (settings.closable !== undefined) body.closable = settings.closable;
    if (settings.displayPeriod !== undefined) body.display_period = settings.displayPeriod;
    if (settings.displayThreshold !== undefined)
      body.display_threshold = settings.displayThreshold;
    if (settings.timeAgoPeriod !== undefined) body.time_ago_period = settings.timeAgoPeriod;
    if (settings.timeAgoThreshold !== undefined)
      body.time_ago_threshold = settings.timeAgoThreshold;
    if (settings.hideMobile !== undefined) body.hide_mobile = settings.hideMobile;
    if (settings.loopNotification !== undefined)
      body.loop_notification = settings.loopNotification;
    if (settings.position !== undefined) body.position = settings.position;
    if (settings.theme !== undefined) body.theme = settings.theme;
    if (settings.utmSource !== undefined) body.utm_source = settings.utmSource;
    if (settings.utmMedium !== undefined) body.utm_medium = settings.utmMedium;

    let response = await this.axios.patch(`/${applicationId}`, { application: body });
    return response.data;
  }
}

export class FomoOpenClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor() {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://fomo.com/api/v1',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Fomo Open',
          reason: 'fomo_open_api_error'
        })
    });
  }

  async getMetric(metric: string, since?: string): Promise<any> {
    let params: Record<string, any> = { metric };
    if (since) params.since = since;
    let response = await this.axios.get('/open', { params });
    return response.data;
  }
}
