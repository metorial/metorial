import { createAxios } from 'slates';

let apiClient = createAxios({
  baseURL: 'https://api.hotspotsystem.com/v2.0'
});

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  metadata: { total_count: number };
  items: T[];
}

export interface Location {
  id: string;
  name: string;
}

export interface LocationOption {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  user_name: string;
  name: string;
  email: string;
  company_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country_code: string;
  phone: string;
  social_network: string;
  social_id: string;
  social_username: string;
  social_link: string;
  social_gender: string;
  social_age_range: string;
  social_followers_count: string;
  registered_at: string;
}

export interface Voucher {
  serial: string;
  voucher_code: string;
  limit_tl: string;
  simultaneous_use: string;
  limit_dl: string;
  limit_ul: string;
  usage_exp: string;
  validity: string;
  price_enduser: string;
  currency: string;
}

export interface MacTransaction {
  id: string;
  operator: string;
  location_id: string;
  user_name: string;
  action_date_gmt: string;
  package_id: string;
  user_agent: string;
  customer: string;
  newsletter: string;
  company_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country_code: string;
  phone: string;
  q1: string;
  a1: string;
  q2: string;
  a2: string;
  q3: string;
  a3: string;
  q4: string;
  a4: string;
  q5: string;
  a5: string;
}

export interface VoucherTransaction {
  id: string;
  operator: string;
  location_id: string;
  user_name: string;
  customer: string;
  action_date_gmt: string;
  amount: string;
  currency: string;
  user_agent: string;
  newsletter: string;
  company_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country_code: string;
  phone: string;
  language: string;
  smscountry: string;
}

export interface SocialTransaction {
  id: string;
  operator: string;
  location_id: string;
  user_name: string;
  action_date_gmt: string;
  package_id: string;
  user_agent: string;
  customer: string;
  newsletter: string;
  company_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country_code: string;
  phone: string;
  social_id: string;
  social_username: string;
  social_link: string;
  social_gender: string;
  social_age_range: string;
  social_followers_count: string;
  social_network: string;
}

export interface PaidTransaction {
  id: string;
  operator: string;
  location_id: string;
  user_name: string;
  customer: string;
  action_date_gmt: string;
  amount: string;
  currency: string;
  user_agent: string;
  newsletter: string;
  company_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country_code: string;
  phone: string;
  language: string;
  smscountry: string;
}

export interface UserInfo {
  userId: string;
  operator: string;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return { 'sn-apikey': this.token };
  }

  async getMe(): Promise<UserInfo> {
    let response = await apiClient.get('/me', { headers: this.headers() });
    return response.data;
  }

  async ping(): Promise<{ ping: string }> {
    let response = await apiClient.get('/ping', { headers: this.headers() });
    return response.data;
  }

  async getLocations(params?: PaginationParams): Promise<PaginatedResponse<Location>> {
    let response = await apiClient.get('/locations', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getLocationOptions(): Promise<PaginatedResponse<LocationOption>> {
    let response = await apiClient.get('/locations/options', {
      headers: this.headers()
    });
    return response.data;
  }

  async getCustomers(
    params?: PaginationParams & { locationId?: string }
  ): Promise<PaginatedResponse<Customer>> {
    let { locationId, ...queryParams } = params ?? {};
    let path = locationId ? `/locations/${locationId}/customers` : '/customers';
    let response = await apiClient.get(path, {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async getSubscribers(
    params?: PaginationParams & { locationId?: string }
  ): Promise<PaginatedResponse<Customer>> {
    let { locationId, ...queryParams } = params ?? {};
    let path = locationId ? `/locations/${locationId}/subscribers` : '/subscribers';
    let response = await apiClient.get(path, {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async getVouchers(
    params?: PaginationParams & { locationId?: string }
  ): Promise<PaginatedResponse<Voucher>> {
    let { locationId, ...queryParams } = params ?? {};
    let path = locationId ? `/locations/${locationId}/vouchers` : '/vouchers';
    let response = await apiClient.get(path, {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async getMacTransactions(
    params?: PaginationParams & { locationId?: string }
  ): Promise<PaginatedResponse<MacTransaction>> {
    let { locationId, ...queryParams } = params ?? {};
    let path = locationId ? `/locations/${locationId}/transactions/mac` : '/transactions/mac';
    let response = await apiClient.get(path, {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async getVoucherTransactions(
    params?: PaginationParams & { locationId?: string }
  ): Promise<PaginatedResponse<VoucherTransaction>> {
    let { locationId, ...queryParams } = params ?? {};
    let path = locationId
      ? `/locations/${locationId}/transactions/voucher`
      : '/transactions/voucher';
    let response = await apiClient.get(path, {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async getSocialTransactions(
    params?: PaginationParams & { locationId?: string }
  ): Promise<PaginatedResponse<SocialTransaction>> {
    let { locationId, ...queryParams } = params ?? {};
    let path = locationId
      ? `/locations/${locationId}/transactions/social`
      : '/transactions/social';
    let response = await apiClient.get(path, {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  async getPaidTransactions(
    params?: PaginationParams & { locationId?: string }
  ): Promise<PaginatedResponse<PaidTransaction>> {
    let { locationId, ...queryParams } = params ?? {};
    let path = locationId
      ? `/locations/${locationId}/transactions/paid`
      : '/transactions/paid';
    let response = await apiClient.get(path, {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }
}
