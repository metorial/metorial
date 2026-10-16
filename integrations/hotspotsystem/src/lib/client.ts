import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue
} from 'slates';
import { z } from 'zod';

const scalar = z.union([z.string(), z.number()]);
const locationSchema = z.object({ id: scalar, name: z.string() }).passthrough();
const customerSchema = z
  .object({
    id: scalar,
    user_name: z.string(),
    name: z.string(),
    email: z.string(),
    company_name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country_code: z.string(),
    phone: z.string(),
    social_network: z.string(),
    social_id: z.string(),
    social_username: z.string(),
    social_link: z.string(),
    social_gender: z.string(),
    social_age_range: z.string(),
    social_followers_count: z.string(),
    registered_at: z.string()
  })
  .passthrough();
const voucherSchema = z
  .object({
    serial: z.string(),
    voucher_code: z.string(),
    limit_tl: scalar,
    simultaneous_use: scalar,
    limit_dl: scalar,
    limit_ul: scalar,
    usage_exp: z.string(),
    validity: scalar,
    price_enduser: scalar,
    currency: z.string()
  })
  .passthrough();
const baseTransactionSchema = z
  .object({
    id: scalar,
    operator: z.string(),
    location_id: scalar,
    user_name: z.string(),
    action_date_gmt: z.string(),
    user_agent: z.string(),
    customer: z.string(),
    newsletter: scalar,
    company_name: z.string(),
    email: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country_code: z.string(),
    phone: z.string()
  })
  .passthrough();
const macTransactionSchema = baseTransactionSchema.extend({
  package_id: z.string(),
  q1: z.string().optional(),
  a1: z.string().optional(),
  q2: z.string().optional(),
  a2: z.string().optional(),
  q3: z.string().optional(),
  a3: z.string().optional(),
  q4: z.string().optional(),
  a4: z.string().optional(),
  q5: z.string().optional(),
  a5: z.string().optional()
});
const paymentTransactionSchema = baseTransactionSchema.extend({
  amount: scalar,
  currency: z.string(),
  language: z.string(),
  smscountry: z.string()
});
const socialTransactionSchema = baseTransactionSchema.extend({
  package_id: z.string(),
  social_id: z.string(),
  social_username: z.string(),
  social_link: z.string(),
  social_gender: z.string(),
  social_age_range: z.string(),
  social_followers_count: z.string(),
  social_network: z.string()
});
const userSchema = z.object({ userId: scalar, operator: z.string() }).passthrough();
const pageSchema = <S extends z.ZodType>(item: S) =>
  z
    .object({
      metadata: z.object({ total_count: z.number().nonnegative() }).passthrough(),
      items: z.array(item)
    })
    .passthrough();

export type BaseTransaction = z.infer<typeof baseTransactionSchema>;
export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort?: string;
}

export class Client {
  private apiClient: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (typeof config.token !== 'string' || !config.token.trim()) {
      throw createApiServiceError('A HotspotSystem API key is required.', {
        reason: 'hotspotsystem_missing_api_key'
      });
    }
    this.apiClient = createAuthenticatedAxios({
      baseURL: 'https://api.hotspotsystem.com/v2.0',
      timeout: 30_000,
      authHeader: { name: 'sn-apikey', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'HotspotSystem',
          reason: 'hotspotsystem_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['error', 'message'],
          parent: {}
        })
    });
  }

  private async request<S extends z.ZodType>(
    path: string,
    schema: S,
    params?: PaginationParams
  ) {
    for (let [field, value] of Object.entries({
      limit: params?.limit,
      offset: params?.offset
    })) {
      if (
        value !== undefined &&
        (!Number.isInteger(value) || value < (field === 'limit' ? 1 : 0))
      ) {
        throw createApiServiceError(
          `${field} must be ${field === 'limit' ? 'a positive' : 'a non-negative'} integer.`,
          { reason: 'hotspotsystem_invalid_pagination' }
        );
      }
    }
    let response = await this.apiClient.get<unknown>(path, { params });
    let parsed = schema.safeParse(response.data);
    if (!parsed.success) {
      let fields = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
      throw createApiServiceError(
        `HotspotSystem returned invalid data for ${path}: ${fields}.`,
        {
          reason: 'hotspotsystem_invalid_response'
        }
      );
    }
    return {
      data: parsed.data,
      raw: response.data,
      linkHeader: getResponseHeaderValue(response.headers, 'link')
    };
  }

  private scopedPath(resource: string, locationId?: string) {
    if (locationId !== undefined && !locationId.trim()) {
      throw createApiServiceError(
        'locationId must be non-empty. Use list_locations to find a location.',
        {
          reason: 'hotspotsystem_invalid_location'
        }
      );
    }
    return locationId === undefined
      ? `/${resource}`
      : `/locations/${encodeURIComponent(locationId)}/${resource}`;
  }

  async getMe() {
    return this.request('/me', userSchema);
  }

  async ping() {
    return this.request('/ping', z.object({ ping: z.string() }).passthrough());
  }

  async getLocations(params?: PaginationParams) {
    return this.request('/locations', pageSchema(locationSchema), params);
  }

  async getLocationOptions() {
    return this.request(
      '/locations/options',
      z.object({ items: z.array(locationSchema) }).passthrough()
    );
  }

  async getCustomers(params?: PaginationParams & { locationId?: string }) {
    let { locationId, ...query } = params ?? {};
    return this.request(
      this.scopedPath('customers', locationId),
      pageSchema(customerSchema),
      query
    );
  }

  async getSubscribers(params?: PaginationParams & { locationId?: string }) {
    let { locationId, ...query } = params ?? {};
    return this.request(
      this.scopedPath('subscribers', locationId),
      pageSchema(customerSchema),
      query
    );
  }

  async getVouchers(params?: PaginationParams & { locationId?: string }) {
    let { locationId, ...query } = params ?? {};
    return this.request(
      this.scopedPath('vouchers', locationId),
      pageSchema(voucherSchema),
      query
    );
  }

  async getMacTransactions(params?: PaginationParams & { locationId?: string }) {
    let { locationId, ...query } = params ?? {};
    return this.request(
      this.scopedPath('transactions/mac', locationId),
      pageSchema(macTransactionSchema),
      query
    );
  }

  async getVoucherTransactions(params?: PaginationParams & { locationId?: string }) {
    let { locationId, ...query } = params ?? {};
    return this.request(
      this.scopedPath('transactions/voucher', locationId),
      pageSchema(paymentTransactionSchema),
      query
    );
  }

  async getSocialTransactions(params?: PaginationParams & { locationId?: string }) {
    let { locationId, ...query } = params ?? {};
    return this.request(
      this.scopedPath('transactions/social', locationId),
      pageSchema(socialTransactionSchema),
      query
    );
  }

  async getPaidTransactions(params?: PaginationParams & { locationId?: string }) {
    let { locationId, ...query } = params ?? {};
    return this.request(
      this.scopedPath('transactions/paid', locationId),
      pageSchema(paymentTransactionSchema),
      query
    );
  }
}
