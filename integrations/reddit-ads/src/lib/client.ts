import { AuthConfigSecretRedactor, createAuthenticatedAxios, pickDefined } from 'slates';
import {
  enumValue,
  id,
  integer,
  invalid,
  ORIGIN,
  type RedditAuth,
  type Row,
  row,
  safeApiError,
  sanitize,
  text,
  unexpected
} from './contracts';

export type ResourceKind = 'campaign' | 'adGroup' | 'ad' | 'audience';
export const collections = {
  campaign: 'campaigns',
  adGroup: 'ad_groups',
  ad: 'ads',
  audience: 'custom_audiences'
} as const;
export class RedditAdsClient {
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  private readonly redactor: AuthConfigSecretRedactor;
  readonly accountId?: string;
  constructor(auth: RedditAuth, accountId?: string) {
    text(auth.token, 'Credential');
    if (auth.authKind === 'conversion' || (auth.authKind === undefined && auth.pixelId))
      invalid(
        'Conversion tokens cannot manage advertising accounts. Connect with adsread/adsedit OAuth for this operation.'
      );
    this.accountId = accountId === undefined ? undefined : id(accountId, 'Ad account ID');
    this.redactor = new AuthConfigSecretRedactor({
      token: auth.token,
      refreshToken: auth.refreshToken
    });
    this.http = createAuthenticatedAxios({
      baseURL: `${ORIGIN}/api/v3`,
      authHeader: { value: `Bearer ${auth.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: safeApiError
    });
  }
  account() {
    return (
      this.accountId ??
      invalid(
        'Provide accountId from list_ad_accounts, or reconnect an existing account-specific connection.'
      )
    );
  }
  private pagePath(path: string, nextUrl?: unknown): string {
    if (nextUrl === undefined) return path;
    let url: URL;
    try {
      url = new URL(text(nextUrl, 'nextUrl'));
    } catch {
      return invalid('nextUrl must be an absolute URL returned by Reddit.');
    }
    if (
      url.origin !== ORIGIN ||
      url.pathname !== `/api/v3${path}` ||
      url.username ||
      url.password ||
      url.hash
    )
      invalid('nextUrl must refer to the same Reddit endpoint and account.');
    for (const [key, value] of url.searchParams) {
      if (
        ![
          'page.token',
          'page.size',
          'id',
          'campaign_id',
          'ad_group_id',
          'configured_status',
          'effective_status',
          'ad_account_id',
          'role'
        ].includes(key) ||
        this.redactor.redactEmbedded(value) !== value
      )
        invalid('nextUrl contains unsupported or credential-bearing query parameters.');
    }
    return url.toString();
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: Row,
    params?: Row,
    nextUrl?: unknown,
    empty = false
  ): Promise<Row> {
    const response = await this.http.request({
      method,
      url: this.pagePath(path, nextUrl),
      data: data === undefined ? undefined : { data: pickDefined(data) },
      params: nextUrl === undefined ? pickDefined(params ?? {}) : undefined
    });
    if (empty) {
      if (response.status !== 204) unexpected();
      return {};
    }
    if (![200, 201].includes(response.status)) unexpected();
    return row(sanitize(response.data, this.redactor));
  }
  async page(path: string, input: Row = {}, params: Row = {}, data?: Row) {
    if (input.pageSize !== undefined) integer(input.pageSize, 'pageSize', 1);
    if (
      typeof input.pageSize === 'number' &&
      input.pageSize > (path === '/me/businesses' ? 700 : 1000)
    )
      invalid(
        `pageSize exceeds the limit for this endpoint (${path === '/me/businesses' ? 700 : 1000}).`
      );
    const envelope = await this.request(
      data === undefined ? 'GET' : 'POST',
      path,
      data,
      { ...params, 'page.size': input.pageSize },
      input.nextUrl
    );
    if (!Array.isArray(envelope.data)) unexpected();
    const items = (envelope.data as unknown[]).map(row);
    const pagination = row(envelope.pagination);
    const nextUrl =
      pagination.next_url === undefined ||
      pagination.next_url === null ||
      pagination.next_url === ''
        ? undefined
        : text(pagination.next_url, 'Provider next URL');
    if (nextUrl !== undefined) this.pagePath(path, nextUrl);
    return { items, nextUrl, hasMore: nextUrl !== undefined };
  }
  async getMe() {
    const result = row((await this.request('GET', '/me')).data);
    id(result.id, 'Actor ID');
    enumValue(result.type, ['MEMBER', 'SYSTEM_USER'], 'Actor type');
    return result;
  }
  async getAccount() {
    const result = row((await this.request('GET', `/ad_accounts/${this.account()}`)).data);
    if (result.id !== this.account()) unexpected();
    text(result.name, 'Provider account name');
    text(result.currency, 'Provider account currency');
    return result;
  }
  async getResource(kind: ResourceKind, resourceId: string) {
    const result = row(
      (await this.request('GET', `/${collections[kind]}/${id(resourceId)}`)).data
    );
    if (result.id !== resourceId || result.ad_account_id !== this.account())
      invalid(
        'The returned resource does not belong to the selected account, or its identity is inconsistent.'
      );
    return result;
  }
  async list(kind: ResourceKind, input: Row) {
    const params: Row = {};
    if (kind === 'campaign' && input.status === 'DRAFT')
      invalid(
        'DRAFT is not a documented campaign status. Use PAUSED for campaigns that must not deliver.'
      );
    if (kind === 'adGroup' && input.campaignId !== undefined)
      params.campaign_id = id(input.campaignId, 'Campaign ID');
    if (kind === 'ad' && input.adGroupId !== undefined)
      params.ad_group_id = id(input.adGroupId, 'Ad group ID');
    const page = await this.page(
      `/ad_accounts/${this.account()}/${collections[kind]}`,
      input,
      params
    );
    for (const item of page.items) {
      id(item.id);
      if (item.ad_account_id !== this.account()) unexpected();
      if (
        (kind === 'adGroup' &&
          input.campaignId !== undefined &&
          item.campaign_id !== input.campaignId) ||
        (kind === 'ad' &&
          input.adGroupId !== undefined &&
          item.ad_group_id !== input.adGroupId)
      )
        unexpected();
    }
    return {
      ...page,
      items:
        kind === 'campaign' && input.status !== undefined
          ? page.items.filter(item =>
              input.status === 'COMPLETED'
                ? item.effective_status === 'COMPLETED'
                : item.configured_status === input.status
            )
          : page.items
    };
  }
  async write(kind: ResourceKind, resourceId: string | undefined, payload: Row) {
    if (!Object.keys(pickDefined(payload)).length)
      invalid('Provide at least one field to change.');
    if (resourceId !== undefined) await this.getResource(kind, resourceId);
    const result = row(
      (
        await this.request(
          resourceId === undefined ? 'POST' : 'PATCH',
          resourceId === undefined
            ? `/ad_accounts/${this.account()}/${collections[kind]}`
            : `/${collections[kind]}/${id(resourceId)}`,
          payload
        )
      ).data
    );
    id(result.id);
    if (
      result.ad_account_id !== this.account() ||
      (resourceId !== undefined && result.id !== resourceId)
    )
      unexpected();
    for (const field of ['campaign_id', 'ad_group_id'])
      if (payload[field] !== undefined && result[field] !== payload[field]) unexpected();
    return result;
  }
  businesses(input: Row) {
    return this.page('/me/businesses', input);
  }
  accounts(businessId: string, input: Row) {
    return this.page(
      `/businesses/${id(businessId, 'Business ID')}/ad_accounts/query`,
      input,
      {},
      {}
    );
  }
  pixels(input: Row) {
    return this.page(`/ad_accounts/${this.account()}/pixels`, input);
  }
  funds(input: Row = {}) {
    return this.page(`/ad_accounts/${this.account()}/funding_instruments`, input);
  }
  async audienceUsers(audienceId: string, payload: Row) {
    const audience = await this.getResource('audience', audienceId);
    if (audience.type !== 'CUSTOMER_LIST')
      invalid('Audience membership changes require a CUSTOMER_LIST audience.');
    await this.request(
      'PATCH',
      `/custom_audiences/${id(audienceId)}/users`,
      payload,
      undefined,
      undefined,
      true
    );
  }
  async deleteAudience(audienceId: string) {
    await this.getResource('audience', audienceId);
    await this.request(
      'DELETE',
      `/custom_audiences/${id(audienceId)}`,
      undefined,
      undefined,
      undefined,
      true
    );
  }
  async report(input: Row, payload: Row) {
    if (input.pageSize !== undefined && integer(input.pageSize, 'pageSize', 1) > 1000)
      invalid('pageSize must be at most 1000.');
    const path = `/ad_accounts/${this.account()}/reports`;
    const envelope = await this.request(
      'POST',
      path,
      payload,
      { 'page.size': input.pageSize },
      input.nextUrl
    );
    const data = row(envelope.data);
    if (!Array.isArray(data.metrics)) unexpected();
    (data.metrics as unknown[]).forEach(row);
    const pagination = row(envelope.pagination);
    const nextUrl =
      pagination.next_url == null || pagination.next_url === ''
        ? undefined
        : text(pagination.next_url, 'Provider next URL');
    if (nextUrl !== undefined) this.pagePath(path, nextUrl);
    return { report: data, nextUrl, hasMore: nextUrl !== undefined };
  }
}
export const createClient = (ctx: {
  auth: RedditAuth;
  config: Row;
  input: { accountId?: string };
}) =>
  new RedditAdsClient(
    ctx.auth,
    ctx.input.accountId ??
      (typeof ctx.config.accountId === 'string' ? ctx.config.accountId : undefined)
  );
