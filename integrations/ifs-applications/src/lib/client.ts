import { createAuthenticatedAxios, requestAxios, requestAxiosData } from 'slates';
import { ifsApplicationsApiError, ifsApplicationsServiceError } from './errors';
import { normalizeAbsoluteUrl, requestIfsAccessToken } from './oauth';

export type ApiClass = 'premium' | 'integration' | 'standard' | 'standardEntity';
export let projectionEndpoints = ['main', 'int', 'b2b'] as const;
export type ProjectionEndpoint = (typeof projectionEndpoints)[number];

export type IfsAuthState = {
  token: string;
  tokenType?: string;
  expiresAt?: string;
  refreshToken?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
};

export type ProjectionSummary = {
  name?: string;
  apiClass?: string;
  category?: string;
  description?: string;
  version?: string;
  source?: string;
  entitySetCount?: number;
  serviceUrl?: string;
  openApiUrl?: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type ProjectionListResult = {
  projections: ProjectionSummary[];
  nextPageToken?: string;
};

export type ProjectionQueryResult = {
  records: Record<string, unknown>[];
  count?: number;
  nextPageToken?: string;
};

type IfsApiResourceKind = 'projection' | 'entity';

let IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
let TOKEN_EXPIRY_SKEW_MS = 60_000;

let apiClassToCategory: Record<ApiClass, string> = {
  premium: 'Premium',
  integration: 'Integration',
  standard: 'Standard',
  standardEntity: 'StandardEntity'
};

let apiClassAliases: Record<ApiClass, string[]> = {
  premium: ['premium'],
  integration: ['integration'],
  standard: ['standard'],
  standardEntity: ['standardentity', 'standard entity', 'entityservice', 'entity service']
};

let escapeODataString = (value: string) => value.replace(/'/g, "''");

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let firstString = (record: Record<string, unknown>, keys: string[]) => {
  for (let key of keys) {
    let value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return undefined;
};

let firstNumber = (record: Record<string, unknown>, keys: string[]) => {
  for (let key of keys) {
    let value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return undefined;
};

let categoryValue = (record: Record<string, unknown>) => {
  let categories =
    record.Categories ?? record.categories ?? record.Category ?? record.category;

  if (Array.isArray(categories)) {
    let values = categories.filter((value): value is string => typeof value === 'string');
    return values.length > 0 ? values.join(', ') : undefined;
  }

  return typeof categories === 'string' && categories.trim() ? categories.trim() : undefined;
};

let stringValues = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return [value.trim()];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && !!item.trim());
  }

  return [];
};

let scalarMetadata = (record: Record<string, unknown>) => {
  let metadata: Record<string, string | number | boolean | null> = {};

  for (let [key, value] of Object.entries(record)) {
    if (Object.keys(metadata).length >= 30) break;
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      metadata[key] = value;
    }
  }

  return metadata;
};

let normalizeComparable = (value: string | undefined) =>
  value?.toLowerCase().replace(/[^a-z0-9]+/g, '');

let matchesStandardEntityMarker = (value: string | undefined) => {
  let normalized = normalizeComparable(value);
  if (!normalized) return false;

  return apiClassAliases.standardEntity.some(alias => {
    let normalizedAlias = normalizeComparable(alias);
    return normalizedAlias
      ? normalized === normalizedAlias || normalized.includes(normalizedAlias)
      : false;
  });
};

let apiResourceKindForProjectionRecord = (
  record: Record<string, unknown>
): IfsApiResourceKind => {
  let values = [
    ...stringValues(record.ApiClass),
    ...stringValues(record.APIClass),
    ...stringValues(record.apiClass),
    ...stringValues(record.Class),
    ...stringValues(record.Categories),
    ...stringValues(record.categories),
    ...stringValues(record.Category),
    ...stringValues(record.category)
  ];

  return values.some(matchesStandardEntityMarker) ? 'entity' : 'projection';
};

let matchesApiClass = (record: ProjectionSummary, apiClass: ApiClass | undefined) => {
  if (!apiClass) return true;

  let aliases = apiClassAliases[apiClass];
  let values = [
    record.apiClass,
    record.category,
    record.metadata.ApiClass,
    record.metadata.APIClass,
    record.metadata.Categories,
    record.metadata.Category
  ]
    .map(value => (typeof value === 'string' ? value : undefined))
    .filter((value): value is string => value !== undefined);

  if (values.length === 0) return true;

  return values.some(value => {
    let normalized = normalizeComparable(value);
    return aliases.some(alias => normalized === normalizeComparable(alias));
  });
};

let extractRecords = (data: unknown) => {
  if (isRecord(data)) {
    if (Array.isArray(data.value)) {
      return data.value.filter(isRecord);
    }

    let d = data.d;
    if (isRecord(d) && Array.isArray(d.results)) {
      return d.results.filter(isRecord);
    }
  }

  return [];
};

let extractCount = (data: unknown) => {
  if (!isRecord(data)) return undefined;

  let count =
    data['@odata.count'] ??
    data['odata.count'] ??
    (isRecord(data.d) ? data.d.__count : undefined);

  if (typeof count === 'number' && Number.isFinite(count)) return count;
  if (typeof count === 'string' && Number.isFinite(Number(count))) return Number(count);
  return undefined;
};

let extractNextLink = (data: unknown) => {
  if (!isRecord(data)) return undefined;

  let nextLink =
    data['@odata.nextLink'] ??
    data['odata.nextLink'] ??
    (isRecord(data.d) ? data.d.__next : undefined);

  return typeof nextLink === 'string' && nextLink.trim() ? nextLink.trim() : undefined;
};

let searchParamsFromUrlOrQuery = (value: string) => {
  let trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('?')) {
    return new URLSearchParams(trimmed.slice(1));
  }

  let queryIndex = trimmed.indexOf('?');
  if (queryIndex >= 0) {
    return new URLSearchParams(trimmed.slice(queryIndex + 1));
  }

  try {
    let parsed = new URL(trimmed, 'https://ifs-cloud.local');
    return parsed.search ? parsed.searchParams : undefined;
  } catch {
    return undefined;
  }
};

let firstSearchParam = (params: URLSearchParams, keys: string[]) => {
  for (let key of keys) {
    let value = params.get(key);
    if (value?.trim()) return value.trim();
  }

  return undefined;
};

export let nextPageTokenFromLink = (nextLink: string | undefined) => {
  if (!nextLink) return undefined;

  let params = searchParamsFromUrlOrQuery(nextLink);
  if (!params) return nextLink;

  let skipToken = firstSearchParam(params, ['$skiptoken', '$skipToken', 'skiptoken']);
  if (skipToken) return skipToken;

  let skip = firstSearchParam(params, ['$skip', 'skip']);
  return skip ? `skip:${skip}` : nextLink;
};

export let paginationParamsFromSkipToken = (skipToken: string | undefined) => {
  let trimmed = skipToken?.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith('skip:')) {
    return { $skip: trimmed.slice('skip:'.length) };
  }

  let params = searchParamsFromUrlOrQuery(trimmed);
  if (params) {
    let parsedSkipToken = firstSearchParam(params, ['$skiptoken', '$skipToken', 'skiptoken']);
    if (parsedSkipToken) return { $skiptoken: parsedSkipToken };

    let parsedSkip = firstSearchParam(params, ['$skip', 'skip']);
    if (parsedSkip) return { $skip: parsedSkip };
  }

  return { $skiptoken: trimmed };
};

export let validateIfsIdentifier = (value: string, label: string) => {
  let trimmed = value.trim();

  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    throw ifsApplicationsServiceError(
      `${label} must be a simple IFS OData identifier using letters, numbers, and underscores only, starting with a letter.`,
      { reason: 'ifs_identifier_invalid' }
    );
  }

  return trimmed;
};

let normalizeBaseUrl = (value: string) => {
  let baseUrl = normalizeAbsoluteUrl(value, 'IFS base URL');

  if (/\/(?:main|int|b2b)(?:\/|$)/i.test(new URL(baseUrl).pathname)) {
    throw ifsApplicationsServiceError(
      'IFS baseUrl must be the tenant root URL without /main, /int, or /b2b.',
      { reason: 'ifs_base_url_includes_endpoint_segment' }
    );
  }

  return baseUrl;
};

let topWithDefault = (top: number | undefined, defaultPageSize: number | undefined) =>
  top ?? defaultPageSize ?? 50;

let projectionEndpointWithDefault = (value: string | undefined): ProjectionEndpoint => {
  if (!value) return 'int';

  if ((projectionEndpoints as readonly string[]).includes(value)) {
    return value as ProjectionEndpoint;
  }

  throw ifsApplicationsServiceError('projectionEndpoint must be one of main, int, or b2b.', {
    reason: 'ifs_projection_endpoint_invalid'
  });
};

let isTokenExpiring = (expiresAt: string | undefined) => {
  if (!expiresAt) return false;

  let parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) return false;
  return parsed <= Date.now() + TOKEN_EXPIRY_SKEW_MS;
};

export class IfsApplicationsClient {
  private token: string;
  private tokenType?: string;
  private expiresAt?: string;
  private refreshToken?: string;
  private tokenUrl?: string;
  private clientId?: string;
  private clientSecret?: string;
  private scope?: string;
  private defaultPageSize?: number;

  constructor(config: {
    baseUrl: string;
    auth: IfsAuthState;
    defaultPageSize?: number;
  }) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.token = config.auth.token;
    this.tokenType = config.auth.tokenType;
    this.expiresAt = config.auth.expiresAt;
    this.refreshToken = config.auth.refreshToken;
    this.tokenUrl = config.auth.tokenUrl;
    this.clientId = config.auth.clientId;
    this.clientSecret = config.auth.clientSecret;
    this.scope = config.auth.scope;
    this.defaultPageSize = config.defaultPageSize;
  }

  private baseUrl: string;

  private async getToken() {
    if (!isTokenExpiring(this.expiresAt)) {
      return this.token;
    }

    if (!this.tokenUrl || !this.clientId || !this.clientSecret) {
      throw ifsApplicationsServiceError(
        'IFS access token is expired and client credential details are not available for refresh.',
        { reason: 'ifs_oauth_refresh_unavailable' }
      );
    }

    let refreshed = await requestIfsAccessToken({
      tokenUrl: this.tokenUrl,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      scope: this.scope,
      previousRefreshToken: this.refreshToken
    });

    this.token = refreshed.token;
    this.tokenType = refreshed.tokenType;
    this.expiresAt = refreshed.expiresAt;
    this.refreshToken = refreshed.refreshToken;
    this.scope = refreshed.scope ?? this.scope;

    return this.token;
  }

  private async createHttp() {
    let token = await this.getToken();

    return createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: {
        value: `${this.tokenType ?? 'Bearer'} ${token}`
      },
      contentType: false,
      headers: {
        Accept: 'application/json'
      }
    });
  }

  private projectionServicePath(
    projectionName: string,
    resourceKind: IfsApiResourceKind = 'projection',
    projectionEndpoint?: ProjectionEndpoint
  ) {
    let projection = validateIfsIdentifier(projectionName, 'projectionName');
    let endpoint = projectionEndpointWithDefault(projectionEndpoint);
    return `/${endpoint}/ifsapplications/${resourceKind}/v1/${projection}.svc`;
  }

  private projectionOpenApiUrl(
    projectionName: string,
    resourceKind: IfsApiResourceKind = 'projection'
  ) {
    return `${this.baseUrl}${this.projectionServicePath(projectionName, resourceKind)}/$openapi`;
  }

  private projectionServiceUrl(
    projectionName: string,
    resourceKind: IfsApiResourceKind = 'projection'
  ) {
    return `${this.baseUrl}${this.projectionServicePath(projectionName, resourceKind)}/`;
  }

  private summarizeProjection(record: Record<string, unknown>): ProjectionSummary {
    let name = firstString(record, [
      'Name',
      'ProjectionName',
      'Projection',
      'ServiceName',
      'name',
      'projectionName'
    ]);
    let category = categoryValue(record);
    let entitySetCount =
      firstNumber(record, ['EntitySetCount', 'EntitySetsCount', 'entitySetCount']) ??
      (Array.isArray(record.EntitySets) ? record.EntitySets.length : undefined);
    let resourceKind = apiResourceKindForProjectionRecord(record);

    return {
      name,
      apiClass: firstString(record, ['ApiClass', 'APIClass', 'apiClass', 'Class']),
      category,
      description: firstString(record, ['Description', 'description', 'Title', 'title']),
      version: firstString(record, ['Version', 'version', 'Release', 'release']),
      source: firstString(record, ['Source', 'source', 'Origin', 'origin']),
      entitySetCount,
      serviceUrl: name ? this.projectionServiceUrl(name, resourceKind) : undefined,
      openApiUrl: name ? this.projectionOpenApiUrl(name, resourceKind) : undefined,
      metadata: scalarMetadata(record)
    };
  }

  async listApiProjections(options: {
    apiClass?: ApiClass;
    nameContains?: string;
    category?: string;
    top?: number;
    skipToken?: string;
  }): Promise<ProjectionListResult> {
    let http = await this.createHttp();
    let category =
      options.category?.trim() || apiClassToCategory[options.apiClass ?? 'integration'];
    let params: Record<string, string | number | undefined> = {
      $format: 'json',
      $filter: `Categories eq '${escapeODataString(category)}'`,
      $top: topWithDefault(options.top, this.defaultPageSize),
      ...paginationParamsFromSkipToken(options.skipToken)
    };

    let data = await requestAxiosData<unknown>(
      'list API projections',
      () =>
        http.get('/main/ifsapplications/projection/v1/AllProjections.svc/Projections', {
          params
        }),
      ifsApplicationsApiError
    );

    let nameQuery = options.nameContains?.trim().toLowerCase();
    let projections = extractRecords(data)
      .map(record => this.summarizeProjection(record))
      .filter(projection => matchesApiClass(projection, options.apiClass))
      .filter(projection => {
        if (!nameQuery) return true;
        return (
          projection.name?.toLowerCase().includes(nameQuery) ||
          projection.description?.toLowerCase().includes(nameQuery)
        );
      });

    return {
      projections,
      nextPageToken: nextPageTokenFromLink(extractNextLink(data))
    };
  }

  async exportProjectionOpenApi(options: {
    projectionName: string;
    openApiVersion: 'v3' | 'v2';
  }): Promise<{
    content: string;
    mimeType: string;
    byteLength: number;
  }> {
    let http = await this.createHttp();
    let path = `${this.projectionServicePath(options.projectionName)}/$openapi${
      options.openApiVersion === 'v2' ? '?V2' : ''
    }`;

    let response = await requestAxios<unknown>(
      'export projection OpenAPI',
      () => http.get(path),
      ifsApplicationsApiError
    );

    let content =
      typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data ?? {}, null, 2);

    return {
      content,
      mimeType: 'application/json',
      byteLength: Buffer.byteLength(content, 'utf8')
    };
  }

  async queryProjectionRecords(options: {
    projectionName: string;
    projectionEndpoint?: ProjectionEndpoint;
    entitySet: string;
    select?: string[];
    filter?: string;
    orderBy?: string;
    top?: number;
    skipToken?: string;
    includeCount?: boolean;
  }): Promise<ProjectionQueryResult> {
    let http = await this.createHttp();
    let projectionName = validateIfsIdentifier(options.projectionName, 'projectionName');
    let projectionEndpoint = projectionEndpointWithDefault(options.projectionEndpoint);
    let entitySet = validateIfsIdentifier(options.entitySet, 'entitySet');
    let select = options.select?.map(field => validateIfsIdentifier(field, 'select field'));

    let params: Record<string, string | number | boolean | undefined> = {
      $format: 'json',
      $select: select && select.length > 0 ? select.join(',') : undefined,
      $filter: options.filter?.trim() || undefined,
      $orderby: options.orderBy?.trim() || undefined,
      $top: topWithDefault(options.top, this.defaultPageSize),
      ...paginationParamsFromSkipToken(options.skipToken),
      $count: options.includeCount || undefined
    };

    let data = await requestAxiosData<unknown>(
      'query projection records',
      () =>
        http.get(
          `${this.projectionServicePath(projectionName, 'projection', projectionEndpoint)}/${entitySet}`,
          {
            params
          }
        ),
      ifsApplicationsApiError
    );

    return {
      records: extractRecords(data),
      count: extractCount(data),
      nextPageToken: nextPageTokenFromLink(extractNextLink(data))
    };
  }
}
