import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let validateInteger = (value: number | undefined, field: string, min: number, max: number) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) {
    throw createApiServiceError(`${field} must be a whole number between ${min} and ${max}.`, {
      reason: 'invalid_input'
    });
  }
};

let validateCoordinates = (
  params: { latitude?: number; longitude?: number },
  requirePair = true
) => {
  for (let [field, value, min, max] of [
    ['latitude', params.latitude, -90, 90],
    ['longitude', params.longitude, -180, 180]
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < min || value > max)) {
      throw createApiServiceError(`${field} must be between ${min} and ${max}.`, {
        reason: 'invalid_input'
      });
    }
  }
  if (requirePair && (params.latitude === undefined) !== (params.longitude === undefined)) {
    throw createApiServiceError('Provide latitude and longitude together.', {
      reason: 'invalid_input'
    });
  }
};

let validateLocation = (params: {
  location?: string;
  latitude?: number;
  longitude?: number;
}) => {
  validateCoordinates(params);
  if (
    params.location !== undefined &&
    (!params.location.trim() || params.location.length > 250)
  ) {
    throw createApiServiceError('location must contain between 1 and 250 characters.', {
      reason: 'invalid_input'
    });
  }
  if (!params.location && params.latitude === undefined) {
    throw createApiServiceError('Provide a location or both latitude and longitude.', {
      reason: 'invalid_input'
    });
  }
};

let validateText = (
  value: string,
  field: string,
  max = Number.MAX_SAFE_INTEGER,
  allowEmpty = false
) => {
  if ((!allowEmpty && !value.trim()) || value.length > max) {
    throw createApiServiceError(
      `${field} must ${allowEmpty ? '' : 'not be empty and must '}contain at most ${max} characters.`,
      {
        reason: 'invalid_input'
      }
    );
  }
};

export interface BusinessSearchParams {
  term?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string;
  locale?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  price?: string;
  openNow?: boolean;
  openAt?: number;
  attributes?: string;
  devicePlatform?: string;
}

export interface BusinessMatchParams {
  name: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  address2?: string;
  address3?: string;
  zipCode?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
  matchThreshold?: string;
  yelpBusinessId?: string;
}

export interface AiChatParams {
  query: string;
  chatId?: string;
  latitude?: number;
  longitude?: number;
  locale?: string;
}

export class Client {
  private placesAxios: ReturnType<typeof createAuthenticatedAxios>;
  private aiAxios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('A Yelp API key is required.', { reason: 'invalid_auth' });
    }
    let options = {
      authHeader: { value: `Bearer ${config.token}` },
      maxRedirects: 0,
      errorAdapter: (error: unknown) =>
        buildApiServiceError(error, {
          providerLabel: 'Yelp',
          reason: 'yelp_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['description', 'message', 'code'],
          nestedKeys: ['error'],
          extractUpstreamCode: (_error, response, helpers) => {
            if (!helpers.isRecord(response?.data)) return undefined;
            let body = response.data;
            return helpers.isRecord(body.error) && typeof body.error.code === 'string'
              ? body.error.code
              : undefined;
          }
        })
    };
    this.placesAxios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.yelp.com/v3'
    });
    this.aiAxios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.yelp.com/ai'
    });
  }

  async searchBusinesses(params: BusinessSearchParams) {
    validateLocation(params);
    validateInteger(params.radius, 'radius', 0, 40000);
    validateInteger(params.limit, 'limit', 0, 50);
    validateInteger(params.offset, 'offset', 0, 1000);
    validateInteger(params.openAt, 'openAt', Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    if (params.term !== undefined) validateText(params.term, 'term', 300, true);
    if (params.openNow !== undefined && params.openAt !== undefined) {
      throw createApiServiceError('openNow and openAt cannot be used together.', {
        reason: 'invalid_input'
      });
    }
    let response = await this.placesAxios.get('/businesses/search', {
      params: {
        term: params.term,
        location: params.location,
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius,
        categories: params.categories,
        locale: params.locale,
        limit: params.limit,
        offset: params.offset,
        sort_by: params.sortBy,
        price: params.price,
        open_now: params.openNow,
        open_at: params.openAt,
        attributes: params.attributes,
        device_platform: params.devicePlatform
      }
    });
    return response.data;
  }

  async searchByPhone(phone: string, locale?: string) {
    if (!/^\+[0-9 +()\-.x/]+$/.test(phone) || phone.length > 32) {
      throw createApiServiceError(
        'phone must start with + and include a country code, with at most 32 characters.',
        { reason: 'invalid_input' }
      );
    }
    let response = await this.placesAxios.get('/businesses/search/phone', {
      params: {
        phone,
        locale
      }
    });
    return response.data;
  }

  async searchTransactions(
    transactionType: string,
    params: {
      location?: string;
      latitude?: number;
      longitude?: number;
      term?: string;
      categories?: string;
      price?: string;
    }
  ) {
    validateLocation(params);
    if (params.term !== undefined) validateText(params.term, 'term', 300, true);
    let response = await this.placesAxios.get(`/transactions/${transactionType}/search`, {
      params: {
        location: params.location,
        latitude: params.latitude,
        longitude: params.longitude,
        term: params.term,
        categories: params.categories,
        price: params.price
      }
    });
    return response.data;
  }

  async getBusinessDetails(
    businessIdOrAlias: string,
    locale?: string,
    devicePlatform?: string
  ) {
    validateText(businessIdOrAlias, 'businessIdOrAlias');
    let response = await this.placesAxios.get(
      `/businesses/${encodeURIComponent(businessIdOrAlias)}`,
      {
        params: {
          locale,
          device_platform: devicePlatform
        }
      }
    );
    return response.data;
  }

  async getBusinessReviews(
    businessIdOrAlias: string,
    params?: {
      locale?: string;
      sortBy?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    validateText(businessIdOrAlias, 'businessIdOrAlias');
    validateInteger(params?.limit, 'limit', 0, 50);
    validateInteger(params?.offset, 'offset', 0, 1000);
    let response = await this.placesAxios.get(
      `/businesses/${encodeURIComponent(businessIdOrAlias)}/reviews`,
      {
        params: {
          locale: params?.locale,
          sort_by: params?.sortBy,
          limit: params?.limit,
          offset: params?.offset
        }
      }
    );
    return response.data;
  }

  async autocomplete(
    text: string,
    params?: {
      latitude?: number;
      longitude?: number;
      locale?: string;
    }
  ) {
    validateText(text, 'text');
    validateCoordinates(params ?? {});
    let response = await this.placesAxios.get('/autocomplete', {
      params: {
        text,
        latitude: params?.latitude,
        longitude: params?.longitude,
        locale: params?.locale
      }
    });
    return response.data;
  }

  async matchBusiness(params: BusinessMatchParams) {
    validateCoordinates(params);
    validateText(params.name, 'name', 64);
    validateText(params.address1, 'address1', 64, true);
    validateText(params.city, 'city', 64);
    validateText(params.state, 'state', 3);
    if (!/^[A-Z]{2}$/.test(params.country)) {
      throw createApiServiceError('country must be an uppercase two-letter country code.', {
        reason: 'invalid_input'
      });
    }
    validateInteger(params.limit, 'limit', 1, 10);
    if (params.zipCode !== undefined) validateText(params.zipCode, 'zipCode', 12, true);
    if (params.address2 !== undefined) validateText(params.address2, 'address2', 64, true);
    if (params.address3 !== undefined) validateText(params.address3, 'address3', 64, true);
    if (params.yelpBusinessId !== undefined && params.yelpBusinessId.length !== 22) {
      throw createApiServiceError('yelpBusinessId must be a 22-character Yelp business ID.', {
        reason: 'invalid_input'
      });
    }
    let response = await this.placesAxios.get('/businesses/matches', {
      params: {
        name: params.name,
        address1: params.address1,
        city: params.city,
        state: params.state,
        country: params.country,
        address2: params.address2,
        address3: params.address3,
        postal_code: params.zipCode,
        phone: params.phone,
        latitude: params.latitude,
        longitude: params.longitude,
        limit: params.limit,
        match_threshold: params.matchThreshold,
        yelp_business_id: params.yelpBusinessId
      }
    });
    return response.data;
  }

  async aiChat(params: AiChatParams) {
    validateText(params.query, 'query', 1000);
    validateCoordinates(params, false);
    let body: Record<string, unknown> = {
      query: params.query
    };

    if (params.chatId) {
      body.chat_id = params.chatId;
    }

    let userContext: Record<string, unknown> = {};
    if (params.latitude !== undefined) userContext.latitude = params.latitude;
    if (params.longitude !== undefined) userContext.longitude = params.longitude;
    if (params.locale) userContext.locale = params.locale;

    if (Object.keys(userContext).length > 0) {
      body.user_context = userContext;
    }

    let response = await this.aiAxios.post('/chat/v2', body);
    return response.data;
  }

  async listCategories(locale?: string) {
    let response = await this.placesAxios.get('/categories', { params: { locale } });
    return response.data;
  }

  async getCategory(alias: string, locale?: string) {
    validateText(alias, 'alias');
    let response = await this.placesAxios.get(`/categories/${encodeURIComponent(alias)}`, {
      params: { locale }
    });
    return response.data;
  }
}
