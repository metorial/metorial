import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://api.addresszen.com/v1';

export class AddressZenClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private managementToken?: string;

  constructor(opts: { token: string; managementToken?: string }) {
    this.managementToken = opts.managementToken;
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${opts.token}` },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'AddressZen',
          reason: 'addresszen_request_failed'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (typeof response.data?.code === 'number' && response.data.code !== 2000) {
        throw createApiServiceError(
          `AddressZen API request failed: ${response.data.message || 'Unsuccessful response'}`,
          {
            reason: 'addresszen_request_failed',
            upstreamStatus: response.status,
            upstreamCode: String(response.data.code)
          }
        );
      }
      return response;
    });
  }

  private managementHeaders() {
    if (!this.managementToken) {
      throw createApiServiceError(
        'Reconnect with an AddressZen Management Key to retrieve private key details, usage, logs, or update settings.'
      );
    }
    return { Authorization: `Bearer ${this.managementToken}` };
  }

  private usageParams(params?: { startDate?: string; endDate?: string; tags?: string }) {
    let queryParams: Record<string, string | number> = {};
    for (let [field, value] of [
      ['start', params?.startDate],
      ['end', params?.endDate]
    ] as const) {
      if (value === undefined) continue;
      let timestamp = Date.parse(value);
      if (!Number.isFinite(timestamp) || timestamp < 0) {
        throw createApiServiceError(
          `The ${field} date must be a valid ISO 8601 date after 1970.`
        );
      }
      queryParams[field] = timestamp;
    }
    let start = queryParams.start;
    let end = queryParams.end ?? Date.now();
    if (typeof start === 'number' && typeof end === 'number') {
      if (start > end || end - start > 90 * 24 * 60 * 60 * 1000) {
        throw createApiServiceError(
          'The usage date range must be ordered and no longer than 90 days.'
        );
      }
    }
    if (params?.tags) {
      if (params.tags.split(',').filter(tag => tag.trim()).length > 3) {
        throw createApiServiceError('Usage statistics support at most three tags.');
      }
      queryParams.tags = params.tags;
    }
    return queryParams;
  }

  async autocompleteAddresses(params: {
    query: string;
    limit?: number;
    postcode?: string;
    postcodeOutward?: string;
    dataset?: string;
    context?: string;
    postalCode?: string;
    city?: string;
    stateCode?: string;
    filter?: Record<string, string>;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      query: params.query
    };
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.postcode) queryParams.postcode = params.postcode;
    if (params.postcodeOutward) queryParams.postcode_outward = params.postcodeOutward;
    if (params.dataset) queryParams.dataset = params.dataset;
    if (params.context) queryParams.context = params.context;
    if (params.postalCode) queryParams.postal_code_3 = params.postalCode;
    if (params.city) queryParams.city = params.city;
    if (params.stateCode) queryParams.state_code = params.stateCode;
    if (params.filter) {
      for (let [key, value] of Object.entries(params.filter)) {
        queryParams[key] = value;
      }
    }

    let res = await this.axios.get('/autocomplete/addresses', { params: queryParams });
    return res.data;
  }

  async resolveAddress(addressId: string, format: 'gbr' | 'usa' = 'usa'): Promise<any> {
    let res = await this.axios.get(
      `/autocomplete/addresses/${encodeURIComponent(addressId)}/${format}`
    );
    return res.data;
  }

  async getAddresses(params: {
    query?: string;
    postcode?: string;
    latitude?: number;
    longitude?: number;
    limit?: number;
    page?: number;
    filter?: Record<string, string>;
    tags?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.query) queryParams.query = params.query;
    if (params.postcode) queryParams.postcode = params.postcode;
    if (params.latitude !== undefined) queryParams.lat = params.latitude;
    if (params.longitude !== undefined) queryParams.lon = params.longitude;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.tags) queryParams.tags = params.tags;
    if (params.filter) {
      for (let [key, value] of Object.entries(params.filter)) {
        queryParams[key] = value;
      }
    }

    let res = await this.axios.get('/addresses', { params: queryParams });
    return res.data;
  }

  async verifyAddress(params: {
    query: string;
    zipCode?: string;
    city?: string;
    state?: string;
    tags?: string;
    context?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      query: params.query
    };
    if (params.zipCode) body.zip_code = params.zipCode;
    if (params.city) body.city = params.city;
    if (params.state) body.state = params.state;

    let queryParams: Record<string, any> = {};
    if (params.tags) queryParams.tags = params.tags;
    if (params.context) queryParams.context = params.context;

    let res = await this.axios.post('/verify/addresses', body, { params: queryParams });
    return res.data;
  }

  async cleanseAddress(params: { query: string; tags?: string }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.tags) queryParams.tags = params.tags;

    let res = await this.axios.post(
      '/cleanse/addresses',
      { query: params.query },
      { params: queryParams }
    );
    return res.data;
  }

  async validateEmail(email: string): Promise<any> {
    let res = await this.axios.get('/emails', { params: { query: email } });
    return res.data;
  }

  async validatePhoneNumber(phoneNumber: string, currentCarrier?: boolean): Promise<any> {
    let res = await this.axios.get('/phone_numbers', {
      params: { query: phoneNumber, current_carrier: currentCarrier ? 'true' : undefined }
    });
    return res.data;
  }

  async getKeyAvailability(key: string): Promise<any> {
    let res = await this.axios.get(`/keys/${encodeURIComponent(key)}`);
    return res.data;
  }

  async getKeyDetails(key: string): Promise<any> {
    let res = await this.axios.get(`/keys/${encodeURIComponent(key)}/details`, {
      headers: this.managementHeaders()
    });
    return res.data;
  }

  async updateKeyDetails(key: string, updates: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/keys/${encodeURIComponent(key)}/details`, updates, {
      headers: this.managementHeaders()
    });
    return res.data;
  }

  async getKeyUsage(
    key: string,
    params?: {
      startDate?: string;
      endDate?: string;
      tags?: string;
    }
  ): Promise<any> {
    let queryParams = this.usageParams(params);

    let res = await this.axios.get(`/keys/${encodeURIComponent(key)}/usage`, {
      params: queryParams,
      headers: this.managementHeaders()
    });
    return res.data;
  }

  async getKeyLookups(
    key: string,
    params?: {
      startDate?: string;
      endDate?: string;
      tags?: string;
    }
  ): Promise<any> {
    let queryParams = this.usageParams({
      startDate: params?.startDate,
      endDate: params?.endDate
    });

    let res = await this.axios.get(`/keys/${encodeURIComponent(key)}/lookups`, {
      params: queryParams,
      headers: this.managementHeaders(),
      responseType: 'text'
    });
    return res.data;
  }

  getKeyLookupsDownload(key: string, params?: { startDate?: string; endDate?: string }) {
    let query = Object.fromEntries(
      Object.entries(this.usageParams(params)).map(([name, value]) => [name, String(value)])
    );
    return {
      url: `${BASE_URL}/keys/${encodeURIComponent(key)}/lookups`,
      headers: this.managementHeaders(),
      query
    };
  }
}
