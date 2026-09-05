import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { z } from 'zod';
import { amplitudeApiError, amplitudeServiceError } from './errors';
import {
  parseEvent,
  parseEvents,
  parseJson,
  parseResponse,
  recordSchema,
  serializeGroupBy,
  serializeSegment,
  validateDateRange,
  validateInterval
} from './rest-validation';

export type AmplitudeRegion = 'US' | 'EU';

let getBaseUrl = (region: AmplitudeRegion) => {
  return region === 'EU' ? 'https://analytics.eu.amplitude.com' : 'https://amplitude.com';
};

let getApiBaseUrl = (region: AmplitudeRegion) => {
  return region === 'EU'
    ? 'https://analytics.eu.amplitude.com/api'
    : 'https://amplitude.com/api';
};

let getIngestionBaseUrl = (region: AmplitudeRegion) => {
  return region === 'EU' ? 'https://api.eu.amplitude.com' : 'https://api2.amplitude.com';
};

let getUserMappingBaseUrl = (region: AmplitudeRegion) => {
  return region === 'EU' ? 'https://api.eu.amplitude.com' : 'https://api.amplitude.com';
};

let getProfileBaseUrl = (region: AmplitudeRegion) => {
  return region === 'EU'
    ? 'https://profile-api.eu.amplitude.com'
    : 'https://profile-api.amplitude.com';
};

export interface AmplitudeEvent {
  userId?: string;
  deviceId?: string;
  eventType: string;
  time?: number;
  eventProperties?: Record<string, unknown>;
  userProperties?: Record<string, unknown>;
  groups?: Record<string, unknown>;
  appVersion?: string;
  platform?: string;
  osName?: string;
  osVersion?: string;
  deviceBrand?: string;
  deviceManufacturer?: string;
  deviceModel?: string;
  carrier?: string;
  country?: string;
  region?: string;
  city?: string;
  dma?: string;
  language?: string;
  price?: number;
  quantity?: number;
  revenue?: number;
  productId?: string;
  revenueType?: string;
  locationLat?: number;
  locationLng?: number;
  ip?: string;
  idfa?: string;
  idfv?: string;
  adid?: string;
  androidId?: string;
  sessionId?: number;
  insertId?: string;
}

export interface ClientConfig {
  apiKey: string;
  secretKey: string;
  token: string; // base64-encoded apiKey:secretKey
  region: AmplitudeRegion;
}

export let createAmplitudeClient = (ctx: {
  auth: { apiKey?: string; secretKey?: string; token?: string; region?: AmplitudeRegion };
  config?: { region?: unknown };
}) => {
  if (!ctx.auth.apiKey || !ctx.auth.secretKey) {
    throw amplitudeServiceError(
      'This tool requires a project API key and secret key connection.'
    );
  }
  let region = ctx.auth.region ?? ctx.config?.region ?? 'US';
  if (region !== 'US' && region !== 'EU') {
    throw amplitudeServiceError(
      'Amplitude region must be US or EU. Reconnect with the correct data residency region.'
    );
  }
  return new AmplitudeClient({
    apiKey: ctx.auth.apiKey,
    secretKey: ctx.auth.secretKey,
    token: Buffer.from(`${ctx.auth.apiKey}:${ctx.auth.secretKey}`).toString('base64'),
    region
  });
};

export class AmplitudeClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  private withErrorHandling(ax: ReturnType<typeof createAxios>) {
    ax.interceptors.response.use(
      response => {
        let data: unknown = response.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          let result = data as Record<string, unknown>;
          if (
            result.success === false ||
            result.error ||
            (typeof result.code === 'number' && result.code >= 400)
          ) {
            throw amplitudeApiError({ response }, 'request');
          }
        }
        return response;
      },
      error => Promise.reject(amplitudeApiError(error))
    );
    return ax;
  }

  private getIngestionAxios() {
    return this.withErrorHandling(
      createAxios({
        baseURL: getIngestionBaseUrl(this.config.region)
      })
    );
  }

  private getUserMappingAxios() {
    return this.withErrorHandling(
      createAxios({
        baseURL: getUserMappingBaseUrl(this.config.region)
      })
    );
  }

  private getAnalyticsAxios() {
    let ax = this.withErrorHandling(
      createAxios({
        baseURL: getApiBaseUrl(this.config.region),
        headers: {
          Authorization: `Basic ${this.config.token}`
        }
      })
    );
    ax.interceptors.request.use(request => {
      if (
        request.url?.startsWith('/2/taxonomy/') &&
        request.data &&
        typeof request.data === 'object'
      ) {
        let form = new URLSearchParams();
        for (let [key, value] of Object.entries(request.data)) {
          if (value !== undefined) form.set(key, String(value));
        }
        request.data = form.toString();
        request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
      return request;
    });
    return ax;
  }

  private getProfileAxios() {
    return this.withErrorHandling(
      createAxios({
        baseURL: getProfileBaseUrl(this.config.region),
        headers: {
          Authorization: `Api-Key ${this.config.secretKey}`
        }
      })
    );
  }

  private getExportAxios() {
    return this.withErrorHandling(
      createAxios({
        baseURL: getBaseUrl(this.config.region),
        headers: {
          Authorization: `Basic ${this.config.token}`
        }
      })
    );
  }

  // --- Event Ingestion ---

  async trackEvents(events: AmplitudeEvent[], options?: { minIdLength?: number }) {
    let ax = this.getIngestionAxios();

    let body: Record<string, unknown> = {
      api_key: this.config.apiKey,
      events: events.map(e => this.serializeEvent(e))
    };

    if (options?.minIdLength) {
      body.options = { min_id_length: options.minIdLength };
    }

    let response = await ax.post('/2/httpapi', body);
    return response.data;
  }

  async batchTrackEvents(events: AmplitudeEvent[], options?: { minIdLength?: number }) {
    let ax = this.getIngestionAxios();

    let body: Record<string, unknown> = {
      api_key: this.config.apiKey,
      events: events.map(e => this.serializeEvent(e))
    };

    if (options?.minIdLength) {
      body.options = { min_id_length: options.minIdLength };
    }

    let response = await ax.post('/batch', body);
    return response.data;
  }

  private serializeEvent(event: AmplitudeEvent): Record<string, unknown> {
    let serialized: Record<string, unknown> = {
      event_type: event.eventType
    };
    if (event.userId) serialized.user_id = event.userId;
    if (event.deviceId) serialized.device_id = event.deviceId;
    if (event.time !== undefined) serialized.time = event.time;
    if (event.eventProperties) serialized.event_properties = event.eventProperties;
    if (event.userProperties) serialized.user_properties = event.userProperties;
    if (event.groups) serialized.groups = event.groups;
    if (event.appVersion) serialized.app_version = event.appVersion;
    if (event.platform) serialized.platform = event.platform;
    if (event.osName) serialized.os_name = event.osName;
    if (event.osVersion) serialized.os_version = event.osVersion;
    if (event.deviceBrand) serialized.device_brand = event.deviceBrand;
    if (event.deviceManufacturer) serialized.device_manufacturer = event.deviceManufacturer;
    if (event.deviceModel) serialized.device_model = event.deviceModel;
    if (event.carrier) serialized.carrier = event.carrier;
    if (event.country) serialized.country = event.country;
    if (event.region) serialized.region = event.region;
    if (event.city) serialized.city = event.city;
    if (event.dma) serialized.dma = event.dma;
    if (event.language) serialized.language = event.language;
    if (event.price !== undefined) serialized.price = event.price;
    if (event.quantity !== undefined) serialized.quantity = event.quantity;
    if (event.revenue !== undefined) serialized.revenue = event.revenue;
    if (event.productId) serialized.product_id = event.productId;
    if (event.revenueType) serialized.revenue_type = event.revenueType;
    if (event.locationLat !== undefined) serialized.location_lat = event.locationLat;
    if (event.locationLng !== undefined) serialized.location_lng = event.locationLng;
    if (event.ip) serialized.ip = event.ip;
    if (event.idfa) serialized.idfa = event.idfa;
    if (event.idfv) serialized.idfv = event.idfv;
    if (event.adid) serialized.adid = event.adid;
    if (event.androidId) serialized.android_id = event.androidId;
    if (event.sessionId !== undefined) serialized.session_id = event.sessionId;
    if (event.insertId) serialized.insert_id = event.insertId;
    return serialized;
  }

  // --- Identify API ---

  async identify(identification: {
    userId?: string;
    deviceId?: string;
    userProperties: Record<string, unknown>;
  }) {
    let ax = this.getIngestionAxios();

    let identifyPayload = {
      user_id: identification.userId,
      device_id: identification.deviceId,
      user_properties: identification.userProperties
    };

    let response = await ax.post(
      '/identify',
      new URLSearchParams({
        api_key: this.config.apiKey,
        identification: JSON.stringify(identifyPayload)
      })
    );
    return response.data;
  }

  async groupIdentify(
    groupType: string,
    groupValue: string,
    groupProperties: Record<string, unknown>
  ) {
    let ax = this.getIngestionAxios();

    let identifyPayload = {
      group_type: groupType,
      group_value: groupValue,
      group_properties: groupProperties
    };

    let response = await ax.post(
      '/groupidentify',
      new URLSearchParams({
        api_key: this.config.apiKey,
        identification: JSON.stringify(identifyPayload)
      })
    );
    return response.data;
  }

  // --- User Mapping (Aliasing) ---

  async mapUserIdentities(mapping: { userId: string; globalUserId: string }) {
    let ax = this.getUserMappingAxios();

    let response = await ax.post('/usermap', null, {
      params: {
        api_key: this.config.apiKey,
        mapping: JSON.stringify({
          user_id: mapping.userId,
          global_user_id: mapping.globalUserId
        })
      }
    });
    return response.data;
  }

  // --- Dashboard REST API ---

  async getActiveAndNewUserCounts(params: {
    start: string;
    end: string;
    m?: string;
    interval?: number;
    segment?: string;
    groupBy?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    validateDateRange(params.start, params.end);
    validateInterval(params.interval);
    if (params.m && !['active', 'new'].includes(params.m))
      throw amplitudeServiceError(
        'The active users endpoint supports active or new. Use a paying-property segment for paying users.'
      );
    let response = await ax.get('/2/users', {
      params: {
        start: params.start,
        end: params.end,
        m: params.m,
        i: params.interval,
        s: serializeSegment(params.segment),
        g: serializeGroupBy(params.groupBy)
      }
    });
    return response.data;
  }

  async getSessionLengthDistribution(params: { start: string; end: string }) {
    validateDateRange(params.start, params.end);
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/sessions/length', { params });
    return response.data;
  }

  async getAverageSessionsPerUser(params: { start: string; end: string }) {
    validateDateRange(params.start, params.end);
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/sessions/peruser', { params });
    return response.data;
  }

  async getEventSegmentation(params: {
    e: string;
    start: string;
    end: string;
    m?: string;
    interval?: number;
    segment?: string;
    groupBy?: string;
    limit?: number;
    e2?: string;
    formula?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    validateDateRange(params.start, params.end);
    validateInterval(params.interval, true);
    let event = parseEvent(params.e, 'events');
    let metric = params.m === 'avg' ? 'average' : params.m === 'hist' ? 'histogram' : params.m;
    if (
      metric &&
      ![
        'uniques',
        'totals',
        'pct_dau',
        'average',
        'histogram',
        'sums',
        'value_avg',
        'formula'
      ].includes(metric)
    )
      throw amplitudeServiceError(
        `Metric ${metric} is not supported by Amplitude event segmentation. Use average, histogram, or another documented metric.`
      );
    if (metric === 'formula' && !params.formula)
      throw amplitudeServiceError('formula is required when metric is formula.');
    if (
      metric &&
      ['histogram', 'sums', 'value_avg'].includes(metric) &&
      (!Array.isArray(event.group_by) || event.group_by.length === 0)
    )
      throw amplitudeServiceError(
        'Property metrics require group_by inside the events definition.'
      );
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 1000)
    )
      throw amplitudeServiceError('limit must be an integer from 1 to 1000.');
    let response = await ax.get('/2/events/segmentation', {
      params: {
        e: JSON.stringify(event),
        e2:
          params.e2 === undefined
            ? undefined
            : JSON.stringify(parseEvent(params.e2, 'secondEvent')),
        start: params.start,
        end: params.end,
        m: metric,
        i: params.interval,
        s: serializeSegment(params.segment),
        g: serializeGroupBy(params.groupBy),
        limit: params.limit,
        formula: params.formula
      }
    });
    return response.data;
  }

  async getFunnelAnalysis(params: {
    e: string;
    start: string;
    end: string;
    mode?: string;
    n?: string;
    conversionWindow?: string;
    segment?: string;
    groupBy?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    validateDateRange(params.start, params.end);
    let events = parseEvents(params.e);
    let seconds =
      params.conversionWindow === undefined
        ? undefined
        : Number(params.conversionWindow) * 86400;
    if (seconds !== undefined && (!Number.isSafeInteger(seconds) || seconds <= 0))
      throw amplitudeServiceError('conversionWindow must be a positive number of days.');
    let query = new URLSearchParams({ start: params.start, end: params.end });
    for (let event of events) query.append('e', JSON.stringify(event));
    for (let [key, value] of Object.entries({
      mode: params.mode,
      n: params.n,
      cs: seconds,
      s: serializeSegment(params.segment),
      g: serializeGroupBy(params.groupBy)
    })) {
      if (value !== undefined) query.set(key, String(value));
    }
    let response = await ax.get('/2/funnels', { params: query });
    return response.data;
  }

  async getRetention(params: {
    se: string;
    re: string;
    start: string;
    end: string;
    rm?: string;
    rb?: string;
    interval?: number;
    segment?: string;
    groupBy?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    validateDateRange(params.start, params.end);
    validateInterval(params.interval);
    if (params.rm === 'bracket') {
      if (!params.rb)
        throw amplitudeServiceError('brackets is required for bracket retention.');
      let brackets = z
        .array(z.tuple([z.number().int().nonnegative(), z.number().int().positive()]))
        .min(1)
        .safeParse(parseJson(params.rb, 'brackets'));
      if (!brackets.success || brackets.data.some(([start, end]) => end <= start))
        throw amplitudeServiceError(
          'brackets must be JSON pairs of increasing nonnegative day bounds, for example [[0,5],[5,10]].'
        );
    }
    let response = await ax.get('/2/retention', {
      params: {
        se: JSON.stringify(parseEvent(params.se, 'startEvent')),
        re: JSON.stringify(parseEvent(params.re, 'returnEvent')),
        start: params.start,
        end: params.end,
        // The live API rejects explicit n-day; omitting rm selects its documented default.
        rm:
          params.rm === 'n-day'
            ? undefined
            : params.rm === 'unbounded'
              ? 'rolling'
              : params.rm,
        rb: params.rb,
        i: params.interval,
        s: serializeSegment(params.segment),
        g: serializeGroupBy(params.groupBy)
      }
    });
    return response.data;
  }

  async getUserComposition(params: { start: string; end: string; p: string }) {
    validateDateRange(params.start, params.end);
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/composition', { params });
    return response.data;
  }

  async getChartResults(chartId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get(`/3/chart/${encodeURIComponent(chartId)}/csv`, {
      responseType: 'text'
    });
    let content =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    let contentTypeHeader = response.headers?.['content-type'];
    let contentType =
      typeof contentTypeHeader === 'string'
        ? contentTypeHeader.split(';')[0]?.trim()
        : undefined;

    return {
      content,
      contentType: contentType || 'text/csv',
      byteLength: Buffer.byteLength(content)
    };
  }

  // --- User Profile API ---

  async getUserProfile(params: { userId?: string; amplitudeId?: number }) {
    if (this.config.region === 'EU')
      throw amplitudeServiceError(
        'Amplitude User Profile API is not available for EU data region projects.'
      );
    let ax = this.getProfileAxios();

    let queryParams: Record<string, unknown> = {
      get_amp_props: true,
      get_cohort_ids: true,
      get_computations: false
    };
    if (params.userId) queryParams.user_id = params.userId;
    if (params.amplitudeId !== undefined) {
      let activity = await this.getAnalyticsAxios().get('/2/useractivity', {
        params: { user: params.amplitudeId, limit: 1 }
      });
      let user = parseResponse(
        z.object({
          userData: z
            .object({
              user_id: z.string().nullish(),
              device_ids: z.array(z.string()).nullish()
            })
            .passthrough()
        }),
        activity.data,
        'user lookup'
      ).userData;
      let deviceId = user.device_ids?.find(id => id.trim().length > 0);
      if (user.user_id) queryParams.user_id = user.user_id;
      else if (deviceId) queryParams.device_id = deviceId;
      else
        throw amplitudeServiceError(
          'This Amplitude ID has no resolvable user or device ID for the User Profile API.'
        );
    }

    let response = await ax.get('/v1/userprofile', { params: queryParams });
    let computations = await ax.get('/v1/userprofile', {
      params: {
        ...queryParams,
        get_amp_props: false,
        get_cohort_ids: false,
        get_computations: true
      }
    });
    let data = parseResponse(
      z.object({ userData: recordSchema }),
      response.data,
      'user profile'
    );
    let computed = parseResponse(
      z.object({ userData: z.object({ amp_props: recordSchema.nullish() }) }),
      computations.data,
      'user computations'
    );
    return {
      userData: { ...data.userData, computed_user_properties: computed.userData.amp_props }
    };
  }

  // --- Behavioral Cohorts API ---

  async listCohorts() {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/3/cohorts');
    return response.data;
  }

  async getCohort(cohortId: string) {
    let result = await this.listCohorts();
    let cohorts = parseResponse(
      z.object({ cohorts: z.array(recordSchema) }),
      result,
      'list cohorts'
    ).cohorts;
    let cohort = cohorts.find(item => {
      let id = item.id ?? item.cohort_id;
      return id !== undefined && String(id) === cohortId;
    });

    if (!cohort) {
      throw amplitudeServiceError(`Amplitude cohort "${cohortId}" was not found.`);
    }

    return cohort;
  }

  async downloadCohort(cohortId: string, props?: boolean) {
    let ax = this.getAnalyticsAxios();
    let params: Record<string, unknown> = {};
    if (props !== undefined) params.props = props ? 1 : 0;
    let response = await ax.get(`/5/cohorts/request/${encodeURIComponent(cohortId)}`, {
      params
    });
    return response.data;
  }

  async getCohortDownloadStatus(requestId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get(`/5/cohorts/request-status/${encodeURIComponent(requestId)}`);
    return response.data;
  }

  async uploadCohort(params: {
    name: string;
    appId: number;
    idType: 'BY_AMP_ID' | 'BY_USER_ID';
    ids: string[];
    owner?: string;
    published?: boolean;
    skipSave?: boolean;
    skipInvalidIds?: boolean;
    countGroup?: string;
    existingCohortId?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {
      name: params.name,
      app_id: params.appId,
      id_type: params.idType,
      ids: params.ids
    };
    if (params.owner) body.owner = params.owner;
    if (params.published !== undefined) body.published = params.published;
    if (params.skipSave !== undefined) body.skip_save = params.skipSave;
    if (params.skipInvalidIds !== undefined) body.skip_invalid_ids = params.skipInvalidIds;
    if (params.countGroup) body.cg = params.countGroup;
    if (params.existingCohortId) body.existing_cohort_id = params.existingCohortId;

    let response = await ax.post('/3/cohorts/upload', body);
    return response.data;
  }

  async getCohortUsage() {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/3/cohorts/usage');
    return response.data;
  }

  async updateCohortMembership(params: {
    cohortId: string;
    memberships: Array<{
      ids: string[];
      idType: 'BY_ID' | 'BY_NAME';
      operation: 'ADD' | 'REMOVE';
    }>;
    countGroup?: string;
    skipInvalidIds?: boolean;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {
      cohort_id: params.cohortId,
      memberships: params.memberships.map(membership => ({
        ids: membership.ids,
        id_type: membership.idType,
        operation: membership.operation
      }))
    };
    if (params.countGroup) body.count_group = params.countGroup;
    if (params.skipInvalidIds !== undefined) body.skip_invalid_ids = params.skipInvalidIds;

    let response = await ax.post('/3/cohorts/membership', body);
    return response.data;
  }

  // --- Taxonomy API ---

  async getEventTypes() {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/taxonomy/event');
    return response.data;
  }

  async getEventType(eventType: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get(`/2/taxonomy/event/${encodeURIComponent(eventType)}`);
    return response.data;
  }

  async createEventType(params: {
    eventType: string;
    category?: string;
    description?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {
      event_type: params.eventType
    };
    if (params.category !== undefined) body.category = params.category;
    if (params.description !== undefined) body.description = params.description;

    let response = await ax.post('/2/taxonomy/event', body);
    return response.data;
  }

  async updateEventType(
    eventType: string,
    params: {
      newEventType?: string;
      category?: string;
      description?: string;
    }
  ) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {};
    if (params.newEventType) body.new_event_type = params.newEventType;
    if (params.category !== undefined) body.category = params.category;
    if (params.description !== undefined) body.description = params.description;

    let response = await ax.put(`/2/taxonomy/event/${encodeURIComponent(eventType)}`, body);
    return response.data;
  }

  async deleteEventType(eventType: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.delete(`/2/taxonomy/event/${encodeURIComponent(eventType)}`);
    return response.data;
  }

  async getEventProperties(eventType: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/taxonomy/event-property', {
      params: { event_type: eventType }
    });
    return response.data;
  }

  async getEventProperty(eventProperty: string, eventType: string) {
    let response = await this.getAnalyticsAxios().get('/2/taxonomy/event-property', {
      params: { event_property: eventProperty, event_type: eventType }
    });
    let data = parseResponse(
      z.union([recordSchema, z.array(recordSchema)]),
      response.data.data,
      'event property lookup'
    );
    let property = Array.isArray(data)
      ? data.find(
          item => item.event_property === eventProperty && item.event_type === eventType
        )
      : data;
    if (!property)
      throw amplitudeServiceError(
        `Event property "${eventProperty}" was not found on "${eventType}".`
      );
    return { ...response.data, data: property };
  }

  async createEventProperty(params: {
    eventType: string;
    eventProperty: string;
    description?: string;
    type?: string;
    regex?: string;
    enumValues?: string;
    isArrayType?: boolean;
    isRequired?: boolean;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {
      event_type: params.eventType,
      event_property: params.eventProperty
    };
    if (params.description !== undefined) body.description = params.description;
    if (params.type) body.type = params.type;
    if (params.regex !== undefined) body.regex = params.regex;
    if (params.enumValues !== undefined) body.enum_values = params.enumValues;
    if (params.isArrayType !== undefined) body.is_array_type = params.isArrayType;
    if (params.isRequired !== undefined) body.is_required = params.isRequired;

    let response = await ax.post('/2/taxonomy/event-property', body);
    return response.data;
  }

  async updateEventProperty(
    eventProperty: string,
    eventType: string,
    params: {
      newEventPropertyValue?: string;
      description?: string;
      type?: string;
      regex?: string;
      enumValues?: string;
      isArrayType?: boolean;
      isRequired?: boolean;
    }
  ) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {
      event_type: eventType
    };
    if (params.newEventPropertyValue)
      body.new_event_property_value = params.newEventPropertyValue;
    if (params.description !== undefined) body.description = params.description;
    if (params.type) body.type = params.type;
    if (params.regex !== undefined) body.regex = params.regex;
    if (params.enumValues !== undefined) body.enum_values = params.enumValues;
    if (params.isArrayType !== undefined) body.is_array_type = params.isArrayType;
    if (params.isRequired !== undefined) body.is_required = params.isRequired;

    let response = await ax.put(
      `/2/taxonomy/event-property/${encodeURIComponent(eventProperty)}`,
      body
    );
    return response.data;
  }

  async deleteEventProperty(eventProperty: string, eventType: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.delete(
      `/2/taxonomy/event-property/${encodeURIComponent(eventProperty)}`,
      {
        data: { event_type: eventType }
      }
    );
    return response.data;
  }

  async getUserProperties() {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/taxonomy/user-property');
    return response.data;
  }

  async getUserProperty(userProperty: string) {
    let response = await this.getAnalyticsAxios().get(
      `/2/taxonomy/user-property/${encodeURIComponent(userProperty)}`
    );
    return response.data;
  }

  async createUserProperty(params: {
    userProperty: string;
    description?: string;
    type?: string;
    regex?: string;
    enumValues?: string;
    isArrayType?: boolean;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {
      user_property: params.userProperty
    };
    if (params.description !== undefined) body.description = params.description;
    if (params.type) body.type = params.type;
    if (params.regex !== undefined) body.regex = params.regex;
    if (params.enumValues !== undefined) body.enum_values = params.enumValues;
    if (params.isArrayType !== undefined) body.is_array_type = params.isArrayType;

    let response = await ax.post('/2/taxonomy/user-property', body);
    return response.data;
  }

  async updateUserProperty(
    userProperty: string,
    params: {
      newUserPropertyValue?: string;
      description?: string;
      type?: string;
      regex?: string;
      enumValues?: string;
      isArrayType?: boolean;
    }
  ) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {};
    if (params.newUserPropertyValue)
      body.new_user_property_value = params.newUserPropertyValue;
    if (params.description !== undefined) body.description = params.description;
    if (params.type) body.type = params.type;
    if (params.regex !== undefined) body.regex = params.regex;
    if (params.enumValues !== undefined) body.enum_values = params.enumValues;
    if (params.isArrayType !== undefined) body.is_array_type = params.isArrayType;

    let response = await ax.put(
      `/2/taxonomy/user-property/${encodeURIComponent(userProperty)}`,
      body
    );
    return response.data;
  }

  async deleteUserProperty(userProperty: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.delete(
      `/2/taxonomy/user-property/${encodeURIComponent(userProperty)}`
    );
    return response.data;
  }

  // --- Event Categories (Taxonomy) ---

  async getEventCategories() {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/taxonomy/category');
    return response.data;
  }

  async createEventCategory(params: { name: string }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.post('/2/taxonomy/category', { category_name: params.name });
    return response.data;
  }

  async deleteEventCategory(categoryId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.delete(`/2/taxonomy/category/${encodeURIComponent(categoryId)}`);
    return response.data;
  }

  async getEventCategory(categoryName: string) {
    let response = await this.getAnalyticsAxios().get(
      `/2/taxonomy/category/${encodeURIComponent(categoryName)}`
    );
    return response.data;
  }

  async updateEventCategory(categoryId: string, name: string) {
    let response = await this.getAnalyticsAxios().put(
      `/2/taxonomy/category/${encodeURIComponent(categoryId)}`,
      { category_name: name }
    );
    return response.data;
  }

  // --- Chart Annotations ---

  async listAnnotations(params?: {
    start?: string;
    end?: string;
    category?: string;
    chartId?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/3/annotations', {
      params: {
        start: params?.start,
        end: params?.end,
        category: params?.category,
        chart_id: params?.chartId
      }
    });
    return response.data;
  }

  async getAnnotation(annotationId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get(`/3/annotations/${encodeURIComponent(annotationId)}`);
    return response.data;
  }

  async createAnnotation(params: {
    label: string;
    start: string;
    details?: string;
    end?: string;
    category?: string;
    chartId?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {
      label: params.label,
      start: params.start
    };
    if (params.details) body.details = params.details;
    if (params.end) body.end = params.end;
    if (params.category !== undefined) body.category = params.category;
    if (params.chartId) body.chart_id = params.chartId;

    let response = await ax.post('/3/annotations', body);
    return response.data;
  }

  async updateAnnotation(
    annotationId: string,
    params: {
      label?: string;
      start?: string;
      details?: string;
      end?: string | null;
      category?: string;
      chartId?: string | null;
    }
  ) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {};
    if (params.label) body.label = params.label;
    if (params.start) body.start = params.start;
    if (params.details !== undefined) body.details = params.details;
    if (params.end !== undefined) body.end = params.end;
    if (params.category !== undefined) body.category = params.category;
    if (params.chartId !== undefined) body.chart_id = params.chartId;

    let response = await ax.put(`/3/annotations/${encodeURIComponent(annotationId)}`, body);
    return response.data;
  }

  async deleteAnnotation(annotationId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.delete(`/3/annotations/${encodeURIComponent(annotationId)}`);
    return response.data;
  }

  // --- Export API ---

  async exportEvents(params: { start: string; end: string }) {
    validateDateRange(params.start, params.end, 'hour');
    let ax = this.getExportAxios();
    let response = await ax.get('/api/2/export', {
      params: { start: params.start, end: params.end },
      responseType: 'arraybuffer'
    });

    let buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
    let contentTypeHeader = response.headers?.['content-type'];
    let contentType =
      typeof contentTypeHeader === 'string'
        ? contentTypeHeader.split(';')[0]?.trim()
        : undefined;

    return {
      contentBase64: buffer.toString('base64'),
      contentType: contentType || 'application/zip',
      byteLength: buffer.byteLength
    };
  }

  // --- User Privacy / Deletion ---

  async requestUserDeletion(params: {
    userId?: string;
    amplitudeId?: number;
    requester?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {};
    if (params.userId) {
      body.user_ids = [params.userId];
    }
    if (params.amplitudeId !== undefined) {
      body.amplitude_ids = [params.amplitudeId];
    }
    if (params.requester) body.requester = params.requester;

    let response = await ax.post('/2/deletions/users', body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async requestBulkUserDeletion(params: {
    userIds?: string[];
    amplitudeIds?: number[];
    requester?: string;
    deleteFromOrg?: boolean;
    ignoreInvalidId?: boolean;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, unknown> = {};
    if (params.userIds) body.user_ids = params.userIds;
    if (params.amplitudeIds) body.amplitude_ids = params.amplitudeIds;
    if (params.requester) body.requester = params.requester;
    // The v1 privacy API validates capitalized string booleans, not JSON booleans.
    if (params.deleteFromOrg !== undefined)
      body.delete_from_org = params.deleteFromOrg ? 'True' : 'False';
    if (params.ignoreInvalidId !== undefined)
      body.ignore_invalid_id = params.ignoreInvalidId ? 'True' : 'False';

    let response = await ax.post('/2/deletions/users', body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async getDeletionJobs(params?: { startDay?: string; endDay?: string }) {
    if (!params?.startDay || !params.endDay)
      throw amplitudeServiceError(
        'statusFilter.startDay and statusFilter.endDay are required to check deletion jobs.'
      );
    validateDateRange(params.startDay, params.endDay, 'iso-day');
    let ax = this.getAnalyticsAxios();
    let queryParams: Record<string, unknown> = {};
    if (params?.startDay) queryParams.start_day = params.startDay;
    if (params?.endDay) queryParams.end_day = params.endDay;

    let response = await ax.get('/2/deletions/users', { params: queryParams });
    return response.data;
  }
}
