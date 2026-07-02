import { createAxios } from 'slates';

export interface SubUser {
  subUserId: number;
  username: string;
  status: string;
  createdAt: string;
  traffic: number;
  trafficLimit: number;
  serviceType: string;
  autoDisable: boolean;
}

export interface SubUserTraffic {
  traffic: number;
  trafficRx: number;
  trafficTx: number;
}

export interface WhitelistedIp {
  whitelistId: number;
  ip: string;
  enabled: boolean;
  createdAt: string;
}

export interface Subscription {
  trafficLimit: number;
  trafficPerPeriod: number;
  usersLimit: number;
  ipAddressLimit: number;
  validFrom: string;
  validUntil: string;
  serviceType: string;
  [key: string]: any;
}

export interface ProxyEndpoint {
  type: string;
  availableLocations: any[];
  url: string;
}

let mapSubUser = (raw: any): SubUser => ({
  subUserId: raw.id,
  username: raw.username,
  status: raw.status,
  createdAt: raw.created_at,
  traffic: raw.traffic,
  trafficLimit: raw.traffic_limit,
  serviceType: raw.service_type,
  autoDisable: raw.auto_disable
});

let mapWhitelistedIp = (raw: any): WhitelistedIp => ({
  whitelistId: raw.id,
  ip: raw.ip,
  enabled: raw.enabled,
  createdAt: raw.created_at
});

export class PublicApiClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(apiKey: string) {
    this.axios = createAxios({
      baseURL: 'https://api.decodo.com/v2',
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // Sub-user management

  async listSubUsers(): Promise<SubUser[]> {
    let response = await this.axios.get('/sub-users');
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map(mapSubUser);
  }

  async getSubUser(subUserId: number): Promise<SubUser> {
    let response = await this.axios.get(`/sub-users/${subUserId}`);
    return mapSubUser(response.data);
  }

  async createSubUser(params: {
    username: string;
    password: string;
    trafficLimit?: number;
    serviceType?: string;
    autoDisable?: boolean;
  }): Promise<SubUser> {
    let body: Record<string, any> = {
      username: params.username,
      password: params.password
    };
    if (params.trafficLimit !== undefined) body.traffic_limit = params.trafficLimit;
    if (params.serviceType !== undefined) body.service_type = params.serviceType;
    if (params.autoDisable !== undefined) body.auto_disable = params.autoDisable;
    let response = await this.axios.post('/sub-users', body);
    return mapSubUser(response.data);
  }

  async updateSubUser(
    subUserId: number,
    params: {
      password?: string;
      trafficLimit?: number;
      autoDisable?: boolean;
    }
  ): Promise<SubUser> {
    let body: Record<string, any> = {};
    if (params.password !== undefined) body.password = params.password;
    if (params.trafficLimit !== undefined) body.traffic_limit = params.trafficLimit;
    if (params.autoDisable !== undefined) body.auto_disable = params.autoDisable;
    let response = await this.axios.put(`/sub-users/${subUserId}`, body);
    return mapSubUser(response.data);
  }

  async deleteSubUser(subUserId: number): Promise<void> {
    await this.axios.delete(`/sub-users/${subUserId}`);
  }

  async getSubUserTraffic(
    subUserId: number,
    params: {
      type: string;
      from?: string;
      to?: string;
      serviceType?: string;
    }
  ): Promise<SubUserTraffic> {
    let query: Record<string, string> = { type: params.type };
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.serviceType) query.service_type = params.serviceType;
    let response = await this.axios.get(`/sub-users/${subUserId}/traffic`, { params: query });
    let data = response.data;
    return {
      traffic: data.traffic,
      trafficRx: data.traffic_rx,
      trafficTx: data.traffic_tx
    };
  }

  // Whitelisted IPs

  async listWhitelistedIps(): Promise<WhitelistedIp[]> {
    let response = await this.axios.get('/whitelisted-ips');
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map(mapWhitelistedIp);
  }

  async addWhitelistedIps(ips: string[]): Promise<void> {
    await this.axios.post('/whitelisted-ips', { IPAddressList: ips });
  }

  async deleteWhitelistedIp(whitelistId: number): Promise<void> {
    await this.axios.delete(`/whitelisted-ips/${whitelistId}`);
  }

  // Subscriptions

  async getSubscriptions(): Promise<Subscription[]> {
    let response = await this.axios.get('/subscriptions');
    let data = Array.isArray(response.data) ? response.data : [response.data];
    return data.map((s: any) => ({
      trafficLimit: s.traffic_limit,
      trafficPerPeriod: s.traffic_per_period,
      usersLimit: s.users_limit,
      ipAddressLimit: s.ip_address_limit,
      validFrom: s.valid_from,
      validUntil: s.valid_until,
      serviceType: s.service_type,
      ...s
    }));
  }

  // Endpoints

  async getEndpoints(): Promise<ProxyEndpoint[]> {
    let response = await this.axios.get('/endpoints');
    let data = Array.isArray(response.data) ? response.data : [];
    return data.map((e: any) => ({
      type: e.type,
      availableLocations: e.available_locations || [],
      url: e.url
    }));
  }

  async getEndpointsByType(type: string): Promise<ProxyEndpoint> {
    let response = await this.axios.get(`/endpoints/${type}`);
    let e = response.data;
    return {
      type: e.type,
      availableLocations: e.available_locations || [],
      url: e.url
    };
  }

  // Allocated traffic limit

  async getAllocatedTrafficLimit(): Promise<any> {
    let response = await this.axios.get('/allocated-traffic-limit');
    return response.data;
  }
}
