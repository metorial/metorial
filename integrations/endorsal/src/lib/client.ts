import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

let BASE_URL = 'https://api.endorsal.io/v1';

type ProviderRecord = Record<string, unknown>;
export type SearchMatch = {
  field: string;
  operator: '=' | '>' | '>=' | '<' | '<=' | '!=' | 'contains' | 'in';
  value: unknown;
};
export type ListOptions = { limit?: number; page?: number };

export interface EndorsalContact {
  _id: string;
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  externalID?: string;
  importedFrom?: string;
  avatar?: string;
  location?: string;
  position?: string;
  company?: string;
  website?: string;
  property?: string;
  customAttributes?: ProviderRecord;
  activity?: ProviderRecord;
  archived?: boolean;
  added?: number;
  updated?: number;
}

export interface EndorsalTestimonial {
  _id: string;
  name?: string;
  comments?: string;
  property?: string;
  rating?: number;
  avatar?: string;
  avatarDetails?: ProviderRecord;
  email?: string;
  location?: string;
  position?: string;
  company?: string;
  approved?: number;
  featured?: number;
  added?: number;
  updated?: number;
  tags?: string[];
  source?: string;
}

export interface EndorsalCampaign {
  _id: string;
  name?: string;
  property?: string;
  enabled?: boolean;
  stats?: ProviderRecord;
  rules?: ProviderRecord;
  created?: number;
  updated?: number;
}

export interface EndorsalWidget {
  _id: string;
  name?: string;
  property?: string;
  type?: string;
  enabled?: boolean;
  config?: ProviderRecord;
  created?: number;
  updated?: number;
}

export interface EndorsalListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);
let booleanValue = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
let recordValue = (value: unknown) => (isApiErrorRecord(value) ? value : undefined);
let timestampValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d{13,}$/.test(value) && Number.isFinite(Number(value)))
    return Number(value);
  return undefined;
};
let numberValue = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
let stringArrayValue = (value: unknown) =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;

let resourceRecord = (value: unknown, resource: string): ProviderRecord & { _id: string } => {
  if (!isApiErrorRecord(value) || typeof value._id !== 'string' || !value._id) {
    throw createApiServiceError(`Endorsal returned an invalid ${resource} response.`, {
      reason: 'invalid_provider_response'
    });
  }
  return { ...value, _id: value._id };
};

let contactFromResponse = (value: unknown): EndorsalContact => {
  let c = resourceRecord(value, 'contact');
  let activity = recordValue(c.activity);
  return {
    _id: c._id,
    email: stringValue(c.email),
    phone: stringValue(c.phone),
    name: stringValue(c.name),
    firstName: stringValue(c.firstName),
    lastName: stringValue(c.lastName),
    externalID: stringValue(c.externalID),
    importedFrom: stringValue(c.importedFrom),
    avatar: stringValue(c.avatar),
    location: stringValue(c.location),
    position: stringValue(c.position),
    company: stringValue(c.company),
    website: stringValue(c.website),
    property: stringValue(c.propertyID) ?? stringValue(c.property),
    customAttributes: recordValue(c.customAttributes),
    activity,
    archived: booleanValue(c.archived),
    added: timestampValue(c.added) ?? timestampValue(activity?.added),
    updated: timestampValue(c.updated) ?? timestampValue(activity?.updated)
  };
};

let testimonialFromResponse = (value: unknown): EndorsalTestimonial => {
  let t = resourceRecord(value, 'testimonial');
  let avatarDetails = recordValue(t.avatar);
  return {
    _id: t._id,
    name: stringValue(t.name),
    comments: stringValue(t.comments),
    property: stringValue(t.propertyID) ?? stringValue(t.property),
    rating: numberValue(t.rating),
    avatar: stringValue(t.avatar) ?? stringValue(avatarDetails?.url),
    avatarDetails,
    email: stringValue(t.email),
    location: stringValue(t.location),
    position: stringValue(t.position),
    company: stringValue(t.company),
    approved: numberValue(t.approved),
    featured: numberValue(t.featured),
    added: timestampValue(t.added),
    updated: timestampValue(t.updated),
    tags: stringArrayValue(t.tags),
    source: stringValue(t.source)
  };
};

let campaignFromResponse = (value: unknown): EndorsalCampaign => {
  let c = resourceRecord(value, 'campaign');
  return {
    _id: c._id,
    name: stringValue(c.name),
    property: stringValue(c.propertyID) ?? stringValue(c.property),
    enabled: booleanValue(c.enabled) ?? booleanValue(c.live),
    stats: recordValue(c.stats),
    rules: recordValue(c.rules),
    created: timestampValue(c.created) ?? timestampValue(c.added),
    updated: timestampValue(c.updated) ?? timestampValue(c.edited)
  };
};

let widgetFromResponse = (value: unknown): EndorsalWidget => {
  let w = resourceRecord(value, 'widget');
  let config = pickDefined({
    widgetTheme: w.widgetTheme,
    themeSettings: w.themeSettings,
    widgetLayout: w.widgetLayout,
    carouselSettings: w.carouselSettings,
    gridSettings: w.gridSettings,
    source: w.source,
    hideTestimonials: w.hideTestimonials,
    hiddenTestimonials: w.hiddenTestimonials,
    onlyShowFeatured: w.onlyShowFeatured,
    showSource: w.showSource,
    showBranding: w.showBranding,
    randomize: w.randomize,
    showRecency: w.showRecency,
    widgetTag: w.widgetTag
  });
  return {
    _id: w._id,
    name: stringValue(w.name) ?? stringValue(w.widgetName),
    property: stringValue(w.propertyID) ?? stringValue(w.property),
    type: stringValue(w.type) ?? stringValue(w.widgetType) ?? stringValue(w.widgetLayout),
    enabled: booleanValue(w.enabled),
    config: recordValue(w.config) ?? (Object.keys(config).length ? config : undefined),
    created: timestampValue(w.created),
    updated: timestampValue(w.updated) ?? timestampValue(w.edited)
  };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${config.token}` }
    });
  }

  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<ProviderRecord> {
    let response = await requestAxiosData<unknown>(
      `${method.toUpperCase()} ${path}`,
      () => this.axios.request({ method, url: path, data, params }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Endorsal',
          reason: 'endorsal_api_error',
          operation
        })
    );
    if (!isApiErrorRecord(response)) {
      throw createApiServiceError('Endorsal returned an invalid API response.', {
        reason: 'invalid_provider_response'
      });
    }
    if (response.success === false) {
      throw createApiServiceError(
        `Endorsal API request failed: ${extractApiErrorMessage({ response: { data: response } }, { fallbackMessage: 'The request was not successful.' })}`,
        { reason: 'endorsal_api_error' }
      );
    }
    return response;
  }

  private responseData(response: ProviderRecord) {
    return 'data' in response ? response.data : response;
  }

  private confirmMutation(response: ProviderRecord) {
    if (response.success !== true) {
      throw createApiServiceError('Endorsal did not confirm that the operation succeeded.', {
        reason: 'invalid_provider_response'
      });
    }
  }

  private async list<T>(
    path: string,
    mapper: (value: unknown) => T,
    options: ListOptions = {},
    query?: SearchMatch[]
  ): Promise<EndorsalListResponse<T>> {
    let page = options.page ?? 1;
    let limit = options.limit;
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      (limit !== undefined && (!Number.isInteger(limit) || limit < 1))
    ) {
      throw createApiServiceError('Page and limit must be positive whole numbers.');
    }
    if (
      query?.some(
        match =>
          match.value === undefined || (match.operator === 'in' && !Array.isArray(match.value))
      )
    ) {
      throw createApiServiceError(
        'Each search condition needs a value; the in operator requires an array.'
      );
    }
    let response = await this.request(
      query ? 'post' : 'get',
      path,
      query ? { query } : undefined
    );
    let values = this.responseData(response);
    if (!Array.isArray(values)) {
      throw createApiServiceError('Endorsal returned an invalid list response.', {
        reason: 'invalid_provider_response'
      });
    }
    // The documented endpoints return the complete property list, with no pagination parameters.
    let size = limit ?? values.length;
    let offset = (page - 1) * size;
    return {
      data: values.slice(offset, offset + size).map(mapper),
      total: values.length,
      page,
      limit
    };
  }

  async listContacts(params?: ListOptions) {
    return this.list('/contacts', contactFromResponse, params);
  }

  async searchContacts(query: SearchMatch[]) {
    return this.list('/contacts/search', contactFromResponse, undefined, query);
  }

  async getContact(contactId: string) {
    return contactFromResponse(
      this.responseData(
        await this.request('get', `/contacts/${encodeURIComponent(contactId)}`)
      )
    );
  }

  async createContact(
    data: {
      email?: string;
      phone?: string;
      name?: string;
      externalID?: string;
      importedFrom?: string;
      avatar?: string;
      location?: string;
      position?: string;
      company?: string;
      website?: string;
      propertyID?: string;
      customAttributes?: ProviderRecord;
    },
    params?: { campaignID?: string }
  ) {
    return contactFromResponse(
      this.responseData(await this.request('post', '/contacts', pickDefined(data), params))
    );
  }

  async updateContact(
    contactId: string,
    fields: {
      name?: string;
      email?: string;
      phone?: string;
      avatar?: string;
      location?: string;
      position?: string;
      company?: string;
      website?: string;
      customAttributes?: ProviderRecord;
    }
  ) {
    let data = pickDefined(fields);
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one contact field to update.');
    this.confirmMutation(
      await this.request('patch', `/contacts/${encodeURIComponent(contactId)}`, {
        fields: data
      })
    );
    return this.getContact(contactId);
  }

  async archiveContact(contactId: string) {
    let contact = await this.getContact(contactId);
    this.confirmMutation(
      await this.request('delete', `/contacts/${encodeURIComponent(contactId)}`)
    );
    return contact;
  }

  async listTestimonials(params?: ListOptions) {
    return this.list('/testimonials', testimonialFromResponse, params);
  }

  async searchTestimonials(query: SearchMatch[]) {
    return this.list('/testimonials/search', testimonialFromResponse, undefined, query);
  }

  async getTestimonial(testimonialId: string) {
    return testimonialFromResponse(
      this.responseData(
        await this.request('get', `/testimonials/${encodeURIComponent(testimonialId)}`)
      )
    );
  }

  async createTestimonial(data: {
    name: string;
    comments: string;
    propertyID: string;
    rating?: number;
    avatar?: string;
    email?: string;
    location?: string;
    position?: string;
    company?: string;
    approved?: number;
    featured?: number;
    added?: number;
  }) {
    if (data.rating !== undefined && !Number.isInteger(data.rating)) {
      throw createApiServiceError('Testimonial ratings must be whole numbers from 1 to 5.');
    }
    return testimonialFromResponse(
      this.responseData(await this.request('post', '/testimonials', pickDefined(data)))
    );
  }

  async updateTestimonial(
    testimonialId: string,
    fields: {
      name?: string;
      comments?: string;
      rating?: number;
      avatar?: string;
      email?: string;
      location?: string;
      position?: string;
      company?: string;
      approved?: number;
      featured?: number;
    }
  ) {
    let data = pickDefined(fields);
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one testimonial field to update.');
    if (fields.rating !== undefined && !Number.isInteger(fields.rating)) {
      throw createApiServiceError('Testimonial ratings must be whole numbers from 1 to 5.');
    }
    this.confirmMutation(
      await this.request('patch', `/testimonials/${encodeURIComponent(testimonialId)}`, {
        fields: data
      })
    );
    return this.getTestimonial(testimonialId);
  }

  async deleteTestimonial(testimonialId: string): Promise<void> {
    this.confirmMutation(
      await this.request('delete', `/testimonials/${encodeURIComponent(testimonialId)}`)
    );
  }

  async getTestimonialsForContact(contactId: string, params?: ListOptions) {
    return this.list(
      `/contacts/${encodeURIComponent(contactId)}/testimonials`,
      testimonialFromResponse,
      params
    );
  }

  async getTestimonialsForTag(tagId: string, params?: ListOptions) {
    return this.list(
      `/tags/${encodeURIComponent(tagId)}/testimonials`,
      testimonialFromResponse,
      params
    );
  }

  async listCampaigns(params?: ListOptions) {
    return this.list('/autorequests/campaigns', campaignFromResponse, params);
  }

  async getCampaign(campaignId: string) {
    return campaignFromResponse(
      this.responseData(
        await this.request('get', `/autorequests/campaigns/${encodeURIComponent(campaignId)}`)
      )
    );
  }

  async listWidgets(params?: ListOptions) {
    return this.list('/widgets', widgetFromResponse, params);
  }

  async listTags() {
    return this.list('/tags', value => resourceRecord(value, 'tag'));
  }

  async createSuperLink(data: {
    name?: string;
    email?: string;
    company?: string;
    position?: string;
    location?: string;
    propertyID: string;
    [key: string]: unknown;
  }) {
    let response = this.responseData(
      await this.request('post', '/superlinks', pickDefined(data))
    );
    if (!isApiErrorRecord(response) || typeof response.url !== 'string' || !response.url) {
      throw createApiServiceError('Endorsal returned no SuperLink URL.', {
        reason: 'invalid_provider_response'
      });
    }
    return { ...response, url: response.url };
  }
}
