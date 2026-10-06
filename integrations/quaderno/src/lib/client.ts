import { createAxios } from 'slates';
import {
  apiFailure,
  date,
  invalid,
  object,
  type Row,
  records,
  required,
  resource,
  routeId,
  safeResponse,
  stringValue
} from './validation';
export const apiVersion = '20241028';
export type Environment = 'production' | 'sandbox';
export interface ClientConfig {
  token: string;
  accountName?: string;
  authMethod?: 'oauth' | 'api_key';
  environment?: Environment;
}
export const domain = (environment: Environment) =>
  environment === 'sandbox' ? 'sandbox-quadernoapp.com' : 'quadernoapp.com';
export function accountName(value: string): string {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value))
    throw invalid(
      'Account name must be the lowercase Quaderno subdomain, without a URL or dots.'
    );
  return value;
}
export function endpoint(environment: Environment, account?: string) {
  return `https://${account ? `${accountName(account)}.` : ''}${domain(environment)}/api/`;
}
export function authorizationEndpoint(href: string, environment: Environment) {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw invalid('Quaderno returned an invalid account endpoint.');
  }
  const suffix = `.${domain(environment)}`;
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith(suffix) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/api/' ||
    url.search ||
    url.hash
  )
    throw invalid('Quaderno returned an unexpected account endpoint. Check the environment.');
  const account = accountName(url.hostname.slice(0, -suffix.length));
  return { accountName: account, apiEndpoint: endpoint(environment, account) };
}
export class Client {
  private http: ReturnType<typeof createAxios>;
  private token: string;
  readonly environment: Environment;
  readonly accountName?: string;
  readonly baseURL: string;
  pagination: { hasMore?: boolean; nextPage?: string; nextCursor?: string } = {};
  constructor(config: ClientConfig) {
    this.token = required(config.token, 'Access token or API key');
    this.environment = config.environment ?? 'production';
    if (this.environment !== 'production' && this.environment !== 'sandbox')
      throw invalid('Select production or sandbox.');
    if (
      config.authMethod !== undefined &&
      config.authMethod !== 'oauth' &&
      config.authMethod !== 'api_key'
    )
      throw invalid('Reconnect using a supported authentication method.');
    this.accountName =
      config.accountName === undefined ? undefined : accountName(config.accountName);
    this.baseURL = endpoint(this.environment, this.accountName);
    this.http = createAxios({
      baseURL: this.baseURL,
      timeout: 30000,
      maxRedirects: 0,
      ...(config.authMethod === 'oauth'
        ? {
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Content-Type': 'application/json',
              Accept: `application/json; api_version: ${apiVersion}`
            }
          }
        : {
            auth: { username: this.token, password: '' },
            headers: {
              'Content-Type': 'application/json',
              Accept: `application/json; api_version: ${apiVersion}`
            }
          })
    });
  }
  async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Row,
    params?: Row,
    compatibility = false
  ): Promise<unknown> {
    if (path !== 'authorization' && !this.accountName)
      throw invalid(
        'Set the accountName from get_current_account before using account tools.'
      );
    if (!/^[a-zA-Z0-9_/-]+(?:\.json)?$/.test(path) || path.includes('..'))
      throw invalid('Invalid resource path.');
    let response: { data: unknown; headers: Record<string, unknown> };
    try {
      response = await this.http.request<unknown>({
        method,
        url: path,
        data: body,
        params,
        ...(compatibility ? { headers: { Accept: 'application/json' } } : {})
      });
    } catch (error) {
      apiFailure(error, method !== 'GET' || path.endsWith('/deliver'));
    }
    const secrets = [this.token, Buffer.from(`${this.token}:`).toString('base64')];
    const result = safeResponse(response.data, secrets);
    this.pagination = {};
    if (Array.isArray(result)) {
      const hasMore = response.headers['x-pages-hasmore'];
      if (hasMore !== undefined) {
        if (![true, false, 'true', 'false'].includes(hasMore as boolean | string))
          throw invalid('Quaderno returned an invalid pagination header.');
        this.pagination.hasMore = hasMore === true || hasMore === 'true';
      }
      const next = response.headers['x-pages-nextpage'];
      if (typeof next === 'string' && next) {
        const parsed = this.cursor(next, path);
        this.pagination.nextPage = parsed.toString();
        this.pagination.nextCursor = parsed.searchParams.get('created_before') ?? undefined;
      }
      if (this.pagination.hasMore === true && !this.pagination.nextPage) {
        const last = result.at(-1);
        if (last) this.pagination.nextCursor = String(resource(last).id);
        if (!this.pagination.nextCursor)
          throw invalid('Quaderno omitted a continuation cursor.');
      }
    }
    return result;
  }
  private cursor(value: string, path: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw invalid('Use the next-page URL from the same list tool.');
    }
    if (
      url.origin !== new URL(this.baseURL).origin ||
      ![`/api/${path}`, `/api/${path}.json`].includes(url.pathname) ||
      url.username ||
      url.password ||
      url.hash
    )
      throw invalid(
        'The pagination URL must use the same account, environment and list route.'
      );
    const allowed = new Set([
      'created_before',
      'limit',
      'q',
      'date',
      'state',
      'contact',
      'processor_id',
      'country',
      'region'
    ]);
    for (const [key, item] of url.searchParams) {
      if (!allowed.has(key) || !item || url.searchParams.getAll(key).length !== 1)
        throw invalid('The pagination URL contains unsupported parameters.');
      if (
        [this.token, Buffer.from(`${this.token}:`).toString('base64')].some(secret =>
          item.includes(secret)
        )
      )
        throw invalid('The pagination URL contains an authentication secret.');
    }
    const before = url.searchParams.get('created_before');
    if (!before || !/^[a-zA-Z0-9_-]{1,128}$/.test(before))
      throw invalid('The pagination URL must contain a valid created_before cursor.');
    const limit = url.searchParams.get('limit');
    if (limit && (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100))
      throw invalid('The pagination limit must be between 1 and 100.');
    if (
      [this.token, Buffer.from(`${this.token}:`).toString('base64')].some(secret =>
        url.toString().includes(secret)
      )
    )
      throw invalid('The pagination URL contains an authentication secret.');
    return url;
  }
  async list(path: string, input: Row = {}, filters: Row = {}) {
    if (input.page !== undefined && input.page !== 1)
      throw invalid(
        'Quaderno uses cursor pagination. Use page 1, then createdBefore or nextPage from the previous result.'
      );
    if (
      input.limit !== undefined &&
      (!Number.isInteger(input.limit) || Number(input.limit) < 1 || Number(input.limit) > 100)
    )
      throw invalid('The list limit must be between 1 and 100.');
    if (input.createdBefore !== undefined) routeId(required(input.createdBefore, 'Cursor'));
    let params: Row = { ...filters, created_before: input.createdBefore, limit: input.limit };
    if (input.nextPage !== undefined) {
      if (
        Object.entries(input).some(
          ([key, value]) => key !== 'nextPage' && value !== undefined
        ) ||
        Object.values(filters).some(v => v !== undefined)
      )
        throw invalid('Use nextPage alone; its URL already contains the cursor and filters.');
      params = Object.fromEntries(
        this.cursor(required(input.nextPage, 'Next page'), path).searchParams
      );
    }
    if (params.date !== undefined) {
      const dates = required(params.date, 'Date range').replaceAll('/', '-').split(',');
      if (dates.length === 1) params.date = `${date(dates[0]!)},${date(dates[0]!)}`;
      else if (dates.length === 2 && date(dates[0]!) <= date(dates[1]!))
        params.date = dates.join(',');
      else throw invalid('Use a date or ordered start,end date range.');
    }
    return records(await this.request('GET', path, undefined, params)).map(resource);
  }
  async get(path: string, id: string) {
    const result = resource(await this.request('GET', `${path}/${routeId(id)}`));
    if (String(result.id) !== id.trim())
      throw invalid('Quaderno returned a different resource than requested.');
    return result;
  }
  async create(path: string, body: Row, compatibility = false) {
    return resource(await this.request('POST', path, body, undefined, compatibility));
  }
  async update(path: string, id: string, body: Row) {
    await this.get(path, id);
    const result = resource(await this.request('PUT', `${path}/${routeId(id)}`, body));
    if (String(result.id) !== id.trim())
      throw invalid(
        'Quaderno returned a different resource after the update. Independently verify the requested record before retrying.'
      );
    return result;
  }
  async remove(path: string, id: string, compatibility = false) {
    await this.request(
      'DELETE',
      `${path}/${routeId(id)}${compatibility ? '.json' : ''}`,
      undefined,
      undefined,
      compatibility
    );
  }
  async deliver(path: string, id: string) {
    await this.get(path, id);
    await this.request('GET', `${path}/${routeId(id)}/deliver`);
  }
  async authorization() {
    const identity = object(object(await this.request('GET', 'authorization')).identity);
    const id =
      typeof identity.id === 'string'
        ? required(identity.id, 'Identity ID')
        : String(resource(identity).id);
    const discovered = authorizationEndpoint(
      required(identity.href, 'Account endpoint'),
      this.environment
    );
    if (this.accountName && discovered.accountName !== this.accountName)
      throw invalid(
        'The connection belongs to a different Quaderno account. Correct accountName.'
      );
    return {
      identityId: id,
      name: stringValue(identity.name),
      email: stringValue(identity.email),
      ...discovered,
      environment: this.environment
    };
  }
}
