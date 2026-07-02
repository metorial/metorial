import { createAxios } from 'slates';

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
  eventProperties?: Record<string, any>;
  userProperties?: Record<string, any>;
  groups?: Record<string, any>;
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

export class AmplitudeClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  // --- Event Ingestion ---

  async trackEvents(events: AmplitudeEvent[], options?: { minIdLength?: number }) {
    let ax = createAxios({
      baseURL: getIngestionBaseUrl(this.config.region)
    });

    let body: Record<string, any> = {
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
    let ax = createAxios({
      baseURL: getIngestionBaseUrl(this.config.region)
    });

    let body: Record<string, any> = {
      api_key: this.config.apiKey,
      events: events.map(e => this.serializeEvent(e))
    };

    if (options?.minIdLength) {
      body.options = { min_id_length: options.minIdLength };
    }

    let response = await ax.post('/batch', body);
    return response.data;
  }

  private serializeEvent(event: AmplitudeEvent): Record<string, any> {
    let serialized: Record<string, any> = {
      event_type: event.eventType
    };
    if (event.userId) serialized.user_id = event.userId;
    if (event.deviceId) serialized.device_id = event.deviceId;
    if (event.time) serialized.time = event.time;
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
    userProperties: Record<string, any>;
  }) {
    let ax = createAxios({
      baseURL: getIngestionBaseUrl(this.config.region)
    });

    let identifyPayload = {
      user_id: identification.userId,
      device_id: identification.deviceId,
      user_properties: identification.userProperties
    };

    let response = await ax.post('/identify', null, {
      params: {
        api_key: this.config.apiKey,
        identification: JSON.stringify(identifyPayload)
      }
    });
    return response.data;
  }

  async groupIdentify(
    groupType: string,
    groupValue: string,
    groupProperties: Record<string, any>
  ) {
    let ax = createAxios({
      baseURL: getIngestionBaseUrl(this.config.region)
    });

    let identifyPayload = {
      group_type: groupType,
      group_value: groupValue,
      group_properties: groupProperties
    };

    let response = await ax.post('/groupidentify', null, {
      params: {
        api_key: this.config.apiKey,
        identification: JSON.stringify(identifyPayload)
      }
    });
    return response.data;
  }

  // --- User Mapping (Aliasing) ---

  async mapUserIdentities(mapping: { userId: string; globalUserId: string }) {
    let ax = createAxios({
      baseURL: getIngestionBaseUrl(this.config.region)
    });

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

  private getAnalyticsAxios() {
    return createAxios({
      baseURL: getApiBaseUrl(this.config.region),
      headers: {
        Authorization: `Basic ${this.config.token}`
      }
    });
  }

  async getActiveAndNewUserCounts(params: {
    start: string;
    end: string;
    m?: string;
    interval?: number;
    segment?: string;
    groupBy?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/users', { params });
    return response.data;
  }

  async getSessionLengthDistribution(params: { start: string; end: string }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/sessions/length', { params });
    return response.data;
  }

  async getAverageSessionsPerUser(params: { start: string; end: string }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/sessions/average', { params });
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
  }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/events/segmentation', { params });
    return response.data;
  }

  async getFunnelAnalysis(params: {
    e: string;
    start: string;
    end: string;
    mode?: string;
    n?: string;
    segment?: string;
    groupBy?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/funnels', { params });
    return response.data;
  }

  async getRetention(params: {
    se: string;
    re: string;
    start: string;
    end: string;
    rm?: string;
    segment?: string;
    groupBy?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/retention', { params });
    return response.data;
  }

  async getUserComposition(params: { start: string; end: string; p: string }) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/composition', { params });
    return response.data;
  }

  async getChartResults(chartId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get(`/3/chart/${chartId}/query`);
    return response.data;
  }

  // --- User Profile API ---

  async getUserProfile(params: { userId?: string; amplitudeId?: number }) {
    let ax = createAxios({
      baseURL: getProfileBaseUrl(this.config.region),
      headers: {
        Authorization: `Api-Key ${this.config.secretKey}`
      }
    });

    let queryParams: Record<string, any> = {};
    if (params.userId) queryParams.user_id = params.userId;
    if (params.amplitudeId) queryParams.amplitude_id = params.amplitudeId;

    let response = await ax.get('/v1/userprofile', { params: queryParams });
    return response.data;
  }

  // --- Behavioral Cohorts API ---

  async listCohorts() {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/3/cohorts');
    return response.data;
  }

  async getCohort(cohortId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get(`/3/cohorts/${cohortId}`);
    return response.data;
  }

  async downloadCohort(cohortId: string, props?: boolean) {
    let ax = this.getAnalyticsAxios();
    let params: Record<string, any> = {};
    if (props !== undefined) params.props = props ? 1 : 0;
    let response = await ax.get(`/5/cohorts/request/${cohortId}`, { params });
    return response.data;
  }

  async getCohortDownloadStatus(requestId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get(`/5/cohorts/request/status/${requestId}`);
    return response.data;
  }

  async uploadCohort(params: {
    name: string;
    appId: number;
    idType: 'BY_AMP_ID' | 'BY_USER_ID';
    ids: string[];
    owner?: string;
    existingCohortId?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, any> = {
      name: params.name,
      app_id: params.appId,
      id_type: params.idType,
      ids: params.ids
    };
    if (params.owner) body.owner = params.owner;
    if (params.existingCohortId) body.existing_cohort_id = params.existingCohortId;

    let response = await ax.post('/3/cohorts/upload', body);
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
    let body: Record<string, any> = {
      event_type: params.eventType
    };
    if (params.category) body.category = params.category;
    if (params.description) body.description = params.description;

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
    let body: Record<string, any> = {};
    if (params.newEventType) body.new_event_type = params.newEventType;
    if (params.category) body.category = params.category;
    if (params.description) body.description = params.description;

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
    let body: Record<string, any> = {
      event_type: params.eventType,
      event_property: params.eventProperty
    };
    if (params.description) body.description = params.description;
    if (params.type) body.type = params.type;
    if (params.regex) body.regex = params.regex;
    if (params.enumValues) body.enum_values = params.enumValues;
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
    let body: Record<string, any> = {
      event_type: eventType
    };
    if (params.newEventPropertyValue)
      body.new_event_property_value = params.newEventPropertyValue;
    if (params.description) body.description = params.description;
    if (params.type) body.type = params.type;
    if (params.regex) body.regex = params.regex;
    if (params.enumValues) body.enum_values = params.enumValues;
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
        params: { event_type: eventType }
      }
    );
    return response.data;
  }

  async getUserProperties() {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/taxonomy/user-property');
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
    let body: Record<string, any> = {
      user_property: params.userProperty
    };
    if (params.description) body.description = params.description;
    if (params.type) body.type = params.type;
    if (params.regex) body.regex = params.regex;
    if (params.enumValues) body.enum_values = params.enumValues;
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
    let body: Record<string, any> = {};
    if (params.newUserPropertyValue)
      body.new_user_property_value = params.newUserPropertyValue;
    if (params.description) body.description = params.description;
    if (params.type) body.type = params.type;
    if (params.regex) body.regex = params.regex;
    if (params.enumValues) body.enum_values = params.enumValues;
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
    let response = await ax.post('/2/taxonomy/category', { event_category: params.name });
    return response.data;
  }

  async deleteEventCategory(categoryId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.delete(`/2/taxonomy/category/${encodeURIComponent(categoryId)}`);
    return response.data;
  }

  // --- Chart Annotations ---

  async listAnnotations() {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get('/2/annotations');
    return response.data;
  }

  async getAnnotation(annotationId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.get(`/2/annotations/${annotationId}`);
    return response.data;
  }

  async createAnnotation(params: { label: string; date: string; details?: string }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, any> = {
      label: params.label,
      date: params.date
    };
    if (params.details) body.details = params.details;

    let response = await ax.post('/2/annotations', body);
    return response.data;
  }

  async updateAnnotation(
    annotationId: string,
    params: {
      label?: string;
      date?: string;
      details?: string;
    }
  ) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, any> = {};
    if (params.label) body.label = params.label;
    if (params.date) body.date = params.date;
    if (params.details) body.details = params.details;

    let response = await ax.put(`/2/annotations/${annotationId}`, body);
    return response.data;
  }

  async deleteAnnotation(annotationId: string) {
    let ax = this.getAnalyticsAxios();
    let response = await ax.delete(`/2/annotations/${annotationId}`);
    return response.data;
  }

  // --- Export API ---

  async exportEvents(params: { start: string; end: string }) {
    let ax = createAxios({
      baseURL: getBaseUrl(this.config.region),
      headers: {
        Authorization: `Basic ${this.config.token}`
      }
    });
    let response = await ax.get('/api/2/export', {
      params: { start: params.start, end: params.end }
    });
    return response.data;
  }

  // --- User Privacy / Deletion ---

  async requestUserDeletion(params: {
    userId?: string;
    amplitudeId?: number;
    requester?: string;
  }) {
    let ax = this.getAnalyticsAxios();
    let body: Record<string, any> = {};
    if (params.userId) {
      body.user_ids = [params.userId];
    }
    if (params.amplitudeId) {
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
    let body: Record<string, any> = {};
    if (params.userIds) body.user_ids = params.userIds;
    if (params.amplitudeIds) body.amplitude_ids = params.amplitudeIds;
    if (params.requester) body.requester = params.requester;
    if (params.deleteFromOrg !== undefined) body.delete_from_org = params.deleteFromOrg;
    if (params.ignoreInvalidId !== undefined) body.ignore_invalid_id = params.ignoreInvalidId;

    let response = await ax.post('/2/deletions/users', body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async getDeletionJobs(params?: { startDay?: string; endDay?: string }) {
    let ax = this.getAnalyticsAxios();
    let queryParams: Record<string, any> = {};
    if (params?.startDay) queryParams.start_day = params.startDay;
    if (params?.endDay) queryParams.end_day = params.endDay;

    let response = await ax.get('/2/deletions/users', { params: queryParams });
    return response.data;
  }
}
