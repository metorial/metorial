import { createAxios } from 'slates';

let BASE_URL = 'https://api.addresszen.com/v1';

export class AddressZenClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      params: {
        api_key: opts.token
      }
    });
  }

  async autocompleteAddresses(params: {
    query: string;
    limit?: number;
    postcode?: string;
    postcodeOutward?: string;
    dataset?: string;
    filter?: Record<string, string>;
  }): Promise<any> {
    let queryParams: Record<string, any> = {
      q: params.query
    };
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.postcode) queryParams.postcode = params.postcode;
    if (params.postcodeOutward) queryParams.postcode_outward = params.postcodeOutward;
    if (params.dataset) queryParams.dataset = params.dataset;
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
  }): Promise<any> {
    let body: Record<string, any> = {
      query: params.query
    };
    if (params.zipCode) body.zip_code = params.zipCode;
    if (params.city) body.city = params.city;
    if (params.state) body.state = params.state;

    let queryParams: Record<string, any> = {};
    if (params.tags) queryParams.tags = params.tags;

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

  async validatePhoneNumber(phoneNumber: string): Promise<any> {
    let res = await this.axios.get('/phone_numbers', { params: { query: phoneNumber } });
    return res.data;
  }

  async getKeyAvailability(key: string): Promise<any> {
    let res = await this.axios.get(`/keys/${encodeURIComponent(key)}`);
    return res.data;
  }

  async getKeyDetails(key: string): Promise<any> {
    let res = await this.axios.get(`/keys/${encodeURIComponent(key)}/details`);
    return res.data;
  }

  async updateKeyDetails(key: string, updates: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/keys/${encodeURIComponent(key)}/details`, updates);
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
    let queryParams: Record<string, any> = {};
    if (params?.startDate) queryParams.start = params.startDate;
    if (params?.endDate) queryParams.end = params.endDate;
    if (params?.tags) queryParams.tags = params.tags;

    let res = await this.axios.get(`/keys/${encodeURIComponent(key)}/usage`, {
      params: queryParams
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
    let queryParams: Record<string, any> = {};
    if (params?.startDate) queryParams.start = params.startDate;
    if (params?.endDate) queryParams.end = params.endDate;
    if (params?.tags) queryParams.tags = params.tags;

    let res = await this.axios.get(`/keys/${encodeURIComponent(key)}/lookups`, {
      params: queryParams
    });
    return res.data;
  }
}
