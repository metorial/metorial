import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

let subUserResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  status: z.string(),
  created_at: z.string(),
  traffic: z.number(),
  traffic_limit: z.number().nullable(),
  service_type: z.string(),
  auto_disable: z.boolean()
});
let whitelistResponseSchema = z.object({
  id: z.number(),
  ip: z.string(),
  enabled: z.boolean(),
  created_at: z.string()
});
let subscriptionNumberSchema = z.preprocess(
  value => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
  z.number().nullish()
);
let subscriptionResponseSchema = z
  .object({
    traffic_limit: subscriptionNumberSchema,
    traffic_per_period: subscriptionNumberSchema,
    users_limit: subscriptionNumberSchema,
    ip_address_limit: subscriptionNumberSchema,
    valid_from: z.string().nullish(),
    valid_until: z.string().nullish(),
    service_type: z.string().nullish()
  })
  .passthrough();

export interface SubUser {
  subUserId: number;
  username: string;
  status: string;
  createdAt: string;
  traffic: number;
  trafficLimit: number | null;
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
  trafficLimit?: number;
  trafficPerPeriod?: number;
  usersLimit?: number;
  ipAddressLimit?: number;
  validFrom?: string;
  validUntil?: string;
  serviceType?: string;
}
export interface ProxyEndpoint {
  type: string;
  availableLocations: unknown[];
  url: string;
}

let parseResponse = <T>(schema: z.ZodType<T>, data: unknown, operation: string): T => {
  let parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw createApiServiceError(`Decodo returned an invalid response while ${operation}.`);
  }
  return parsed.data;
};
let mapSubUser = (data: unknown): SubUser => {
  let raw = parseResponse(subUserResponseSchema, data, 'retrieving a sub-user');
  return {
    subUserId: raw.id,
    username: raw.username,
    status: raw.status,
    createdAt: raw.created_at,
    traffic: raw.traffic,
    trafficLimit: raw.traffic_limit,
    serviceType: raw.service_type,
    autoDisable: raw.auto_disable
  };
};
let validateId = (id: number) => {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createApiServiceError('Provide a positive whole-number resource ID.');
  }
};
let validateTrafficLimit = (trafficLimit?: number) => {
  if (trafficLimit !== undefined && (!Number.isFinite(trafficLimit) || trafficLimit < 0)) {
    throw createApiServiceError('Traffic limits must be a non-negative number of GB.');
  }
};

let acceptedMutationReadError = (cause: unknown, mutation: 'create' | 'update') => {
  let readError = buildApiServiceError(cause, {
    providerLabel: 'Decodo Public',
    reason: 'decodo_public_api_error',
    operation: 'read-back'
  });
  let message = `Decodo accepted the ${mutation} request, but retrieving the sub-user afterward failed. Use List Sub-Users${mutation === 'update' ? ' or Get Sub-User' : ''} to recheck the resource before retrying the ${mutation}.`;
  let error = createApiServiceError(message, { parent: readError });
  Object.assign(error.data, readError.data, { message, mutationAccepted: true });
  return error;
};

export class PublicApiClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(apiKey: string, authMethod?: string) {
    if (!apiKey.trim() || (authMethod !== undefined && authMethod !== 'api_key')) {
      throw createApiServiceError('Connect using API Key (Public API) authentication.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.decodo.com/v2',
      authHeader: { value: apiKey },
      headers: { Accept: 'application/json' },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Decodo Public',
          reason: 'decodo_public_api_error'
        })
    });
  }

  async listSubUsers(): Promise<SubUser[]> {
    let response = await this.axios.get('/sub-users');
    let data = parseResponse(
      z.array(subUserResponseSchema),
      response.data,
      'listing sub-users'
    );
    return data.map(mapSubUser);
  }

  async getSubUser(subUserId: number): Promise<SubUser> {
    validateId(subUserId);
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
    validateTrafficLimit(params.trafficLimit);
    let response = await this.axios.post(
      '/sub-users',
      pickDefined({
        username: params.username,
        password: params.password,
        traffic_limit: params.trafficLimit,
        service_type: params.serviceType ?? 'residential_proxies',
        auto_disable: params.autoDisable
      })
    );
    if (subUserResponseSchema.safeParse(response.data).success)
      return mapSubUser(response.data);
    // The documented 201 response is empty; discover the created ID by its unique username.
    let created: SubUser | undefined;
    try {
      created = (await this.listSubUsers()).find(user => user.username === params.username);
    } catch (error) {
      throw acceptedMutationReadError(error, 'create');
    }
    if (!created) {
      throw createApiServiceError(
        'Decodo accepted the create request, but the new sub-user could not be retrieved. Use List Sub-Users before retrying.'
      );
    }
    return created;
  }

  async updateSubUser(
    subUserId: number,
    params: { password?: string; trafficLimit?: number; autoDisable?: boolean }
  ): Promise<SubUser> {
    validateId(subUserId);
    validateTrafficLimit(params.trafficLimit);
    let body = pickDefined({
      password: params.password,
      traffic_limit: params.trafficLimit,
      auto_disable: params.autoDisable
    });
    if (!Object.keys(body).length) {
      throw createApiServiceError(
        'Provide a password, traffic limit, or auto-disable setting to update.'
      );
    }
    let response = await this.axios.put(`/sub-users/${subUserId}`, body);
    if (subUserResponseSchema.safeParse(response.data).success)
      return mapSubUser(response.data);
    // The documented 201 response is empty; retrieve the confirmed resource state.
    try {
      return await this.getSubUser(subUserId);
    } catch (error) {
      throw acceptedMutationReadError(error, 'update');
    }
  }

  async deleteSubUser(subUserId: number): Promise<void> {
    validateId(subUserId);
    await this.axios.delete(`/sub-users/${subUserId}`);
  }

  async getSubUserTraffic(
    subUserId: number,
    params: { type: string; from?: string; to?: string; serviceType?: string }
  ): Promise<SubUserTraffic> {
    validateId(subUserId);
    for (let date of [params.from, params.to]) {
      if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw createApiServiceError('Traffic report dates must use yyyy-mm-dd format.');
      }
    }
    if (params.from && params.to && params.from > params.to) {
      throw createApiServiceError(
        'The traffic report start date must not be after its end date.'
      );
    }
    let response = await this.axios.get(`/sub-users/${subUserId}/traffic`, {
      params: pickDefined({
        type: params.type,
        from: params.from,
        to: params.to,
        service_type: params.serviceType
      })
    });
    let data = parseResponse(
      z.object({ traffic: z.number(), traffic_rx: z.number(), traffic_tx: z.number() }),
      response.data,
      'retrieving traffic usage'
    );
    return { traffic: data.traffic, trafficRx: data.traffic_rx, trafficTx: data.traffic_tx };
  }

  async listWhitelistedIps(): Promise<WhitelistedIp[]> {
    let response = await this.axios.get('/whitelisted-ips');
    let data = parseResponse(
      z.array(whitelistResponseSchema),
      response.data,
      'listing whitelisted IPs'
    );
    return data.map(raw => ({
      whitelistId: raw.id,
      ip: raw.ip,
      enabled: raw.enabled,
      createdAt: raw.created_at
    }));
  }

  async addWhitelistedIps(ips: string[]): Promise<void> {
    if (!ips.length || ips.some(ip => !ip.trim())) {
      throw createApiServiceError('Provide at least one non-empty IP address to whitelist.');
    }
    await this.axios.post('/whitelisted-ips', { IPAddressList: ips });
  }

  async deleteWhitelistedIp(whitelistId: number): Promise<void> {
    validateId(whitelistId);
    await this.axios.delete(`/whitelisted-ips/${whitelistId}`);
  }

  async getSubscriptions(): Promise<Subscription[]> {
    let response = await this.axios.get('/subscriptions');
    let data = parseResponse(
      z.array(subscriptionResponseSchema),
      Array.isArray(response.data) ? response.data : [response.data],
      'retrieving subscriptions'
    );
    return data.map(s => ({
      ...s,
      trafficLimit: s.traffic_limit ?? undefined,
      trafficPerPeriod: s.traffic_per_period ?? undefined,
      usersLimit: s.users_limit ?? undefined,
      ipAddressLimit: s.ip_address_limit ?? undefined,
      validFrom: s.valid_from ?? undefined,
      validUntil: s.valid_until ?? undefined,
      serviceType: s.service_type ?? undefined
    }));
  }

  async getEndpoints(): Promise<ProxyEndpoint[]> {
    let response = await this.axios.get('/endpoints');
    let types = parseResponse(
      z.array(z.object({ type: z.string(), url: z.string() })),
      response.data,
      'listing endpoint types'
    );
    return Promise.all(
      types.map(async type => ({
        ...(await this.getEndpointsByType(type.type)),
        url: type.url
      }))
    );
  }

  async getEndpointsByType(type: string): Promise<ProxyEndpoint> {
    let response = await this.axios.get(`/endpoints/${encodeURIComponent(type)}`);
    let locations = parseResponse(
      z.array(
        z
          .object({ location: z.string(), hostname: z.string(), port_range: z.string() })
          .passthrough()
      ),
      response.data,
      'retrieving endpoint locations'
    );
    return { type, availableLocations: locations, url: `endpoints/${type}` };
  }

  async getAllocatedTrafficLimit(): Promise<{ allocatedTrafficLimit: number }> {
    let response = await this.axios.get('/allocated-traffic-limit');
    let data = parseResponse(
      z.object({ allocated_traffic_limit: z.number() }),
      response.data,
      'retrieving allocated traffic'
    );
    return { allocatedTrafficLimit: data.allocated_traffic_limit };
  }
}
