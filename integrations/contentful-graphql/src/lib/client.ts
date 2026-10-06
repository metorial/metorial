import { ServiceError } from '@lowerdeck/error';
import {
  getIntrospectionQuery,
  getOperationAST,
  Kind,
  parse,
  stripIgnoredCharacters
} from 'graphql';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import type { z } from 'zod';
import {
  graphQLResponseSchema,
  introspectionSchema,
  queryIntrospectionSchema,
  spaceListInputSchema,
  spacePageSchema
} from './schemas';
import {
  assertNoCredentials,
  serializeJson,
  validateLocator,
  validateToken
} from './validation';

const REQUEST_BYTES = 8 * 1024;
const RESPONSE_BYTES = 8 * 1024 * 1024;
export interface GraphQLClientConfig {
  token: string;
  spaceId: string;
  environmentId: string;
  region: 'us' | 'eu';
  preview?: boolean;
  previewToken?: string;
  managementToken?: string;
}
let ownValue = (value: unknown, key: string): unknown => {
  try {
    if (!value || typeof value !== 'object') return undefined;
    let descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
};
let transportError = (error: unknown) => {
  if (error instanceof ServiceError) return error;
  let response = ownValue(error, 'response');
  let data = ownValue(error, 'data');
  let status =
    ownValue(response, 'status') ??
    ownValue(ownValue(data, 'upstream'), 'status') ??
    ownValue(data, 'status');
  let safeStatus =
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? status
      : undefined;
  return buildApiServiceError(error, {
    providerLabel: 'Contentful',
    reason: 'upstream_error',
    parent: {},
    extractResponse: () => ({ status: safeStatus }),
    extractMessage: () =>
      'The request failed. Check the token family, region, space and environment; retry rate-limited requests later.'
  });
};
let createHttp = (baseURL: string, token: string) =>
  createAuthenticatedAxios({
    baseURL,
    authHeader: { value: `Bearer ${token}` },
    errorAdapter: transportError,
    timeout: 30000,
    maxRedirects: 0,
    maxBodyLength: REQUEST_BYTES,
    maxContentLength: RESPONSE_BYTES
  });
let credentials = (config: {
  token: string;
  previewToken?: string;
  managementToken?: string;
}) => [
  validateToken(config.token, 'Content Delivery API'),
  ...(config.previewToken === undefined
    ? []
    : [validateToken(config.previewToken, 'Content Preview API')]),
  ...(config.managementToken === undefined
    ? []
    : [validateToken(config.managementToken, 'Content Management API')])
];
let parseResponse = <T>(data: unknown, schema: z.ZodType<T>, secrets: string[]): T => {
  let serialized: string;
  try {
    serialized = serializeJson(data, RESPONSE_BYTES);
  } catch {
    throw createApiServiceError(
      'Contentful returned malformed or oversized JSON. Retry with a smaller query or page.',
      { reason: 'invalid_response' }
    );
  }
  assertNoCredentials(serialized, secrets);
  let result = schema.safeParse(data);
  if (!result.success)
    throw createApiServiceError(
      'Contentful returned an unexpected response shape. Retry the query or schema discovery.',
      { reason: 'invalid_response' }
    );
  return result.data;
};
let rejectSchemaErrors = (result: z.infer<typeof graphQLResponseSchema>) => {
  if (result.errors?.length)
    throw createApiServiceError(
      'Contentful could not return a complete schema. Verify the key, space, environment and content model before retrying.',
      { reason: 'schema_query_failed' }
    );
};

export class ContentfulGraphQLClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private secrets: string[];
  private path: string;
  constructor(config: GraphQLClientConfig) {
    this.secrets = credentials(config);
    if (config.preview && config.previewToken === undefined)
      throw createApiServiceError(
        'Configure a Content Preview API token before requesting preview content. Draft fields also require preview: true in the query.',
        { reason: 'missing_preview_token' }
      );
    if (config.region !== 'us' && config.region !== 'eu')
      throw createApiServiceError('Select the Contentful US or EU data-residency region.', {
        reason: 'invalid_region'
      });
    let token = config.preview
      ? validateToken(config.previewToken, 'Content Preview API')
      : config.token;
    this.http = createHttp(
      config.region === 'eu'
        ? 'https://graphql.eu.contentful.com'
        : 'https://graphql.contentful.com',
      token
    );
    this.path = `/content/v1/spaces/${encodeURIComponent(validateLocator(config.spaceId, 'space'))}/environments/${encodeURIComponent(validateLocator(config.environmentId, 'environment'))}`;
  }
  async query(query: string, variables?: Record<string, unknown>, operationName?: string) {
    let body = pickDefined({ query, variables, operationName });
    let serialized = serializeJson(body, REQUEST_BYTES);
    assertNoCredentials(serialized, this.secrets);
    if (typeof query !== 'string' || !query.trim())
      throw createApiServiceError('Provide a nonempty GraphQL query.', {
        reason: 'invalid_query'
      });
    if (operationName !== undefined && !/^[_A-Za-z][_0-9A-Za-z]*$/.test(operationName))
      throw createApiServiceError(
        'Provide an exact GraphQL operation name, or omit it for a single query.',
        { reason: 'invalid_operation' }
      );
    try {
      let document = parse(query, { maxTokens: REQUEST_BYTES });
      if (
        document.definitions.some(
          definition =>
            definition.kind !== Kind.OPERATION_DEFINITION &&
            definition.kind !== Kind.FRAGMENT_DEFINITION
        )
      )
        throw new TypeError();
      let operation = getOperationAST(document, operationName);
      if (!operation || operation.operation !== 'query') throw new TypeError();
    } catch {
      throw createApiServiceError(
        'Provide a syntactically valid read-only GraphQL query. Select operationName when multiple operations are present; mutations and subscriptions are unsupported.',
        { reason: 'invalid_query' }
      );
    }
    let response = await this.http.post<unknown>(this.path, body);
    if (response.status !== 200)
      throw createApiServiceError('Contentful did not return a completed GraphQL response.', {
        reason: 'invalid_response',
        upstreamStatus: response.status
      });
    return parseResponse(response.data, graphQLResponseSchema, this.secrets);
  }
  async introspect() {
    let result = await this.query(
      stripIgnoredCharacters(getIntrospectionQuery({ descriptions: true })),
      undefined,
      'IntrospectionQuery'
    );
    rejectSchemaErrors(result);
    let schema = parseResponse(result.data, introspectionSchema, this.secrets).__schema;
    if (
      !schema.types.some(type => type.name === schema.queryType.name && type.kind === 'OBJECT')
    )
      throw createApiServiceError(
        'Contentful returned a schema without its root query type.',
        { reason: 'invalid_response' }
      );
    if (
      schema.types.some(
        type =>
          (type.kind === 'OBJECT' || type.kind === 'INTERFACE') && !Array.isArray(type.fields)
      )
    )
      throw createApiServiceError(
        'Contentful returned incomplete object fields. Retry schema discovery.',
        { reason: 'invalid_response' }
      );
    return schema;
  }
  async getAvailableContentTypes() {
    // Standard introspection covers every type wrapper; the output selects root fields.
    let schema = await this.introspect();
    let root = schema.types.find(type => type.name === schema.queryType.name);
    return parseResponse(
      { __schema: { queryType: { fields: root?.fields } } },
      queryIntrospectionSchema,
      this.secrets
    ).__schema.queryType.fields;
  }
}

export let listAccountSpaces = async (
  config: { region?: 'us' | 'eu' },
  auth: { token: string; previewToken?: string; managementToken?: string },
  input: z.infer<typeof spaceListInputSchema>
) => {
  if (auth.managementToken === undefined)
    throw createApiServiceError(
      'Space discovery requires an optional Content Management API token. Without it, use the space ID from your delivery or preview key settings directly in the other tools.',
      { reason: 'missing_management_token' }
    );
  let secrets = credentials(auth);
  let region = config.region ?? 'us';
  if (region !== 'us' && region !== 'eu')
    throw createApiServiceError('Select the Contentful US or EU data-residency region.', {
      reason: 'invalid_region'
    });
  let parsed = spaceListInputSchema.safeParse(input);
  if (!parsed.success)
    throw createApiServiceError('Provide valid space pagination inputs.', {
      reason: 'invalid_pagination'
    });
  input = parsed.data;
  if (
    ((input.pageNext !== undefined || input.pagePrev !== undefined) &&
      input.cursor !== true) ||
    (input.pageNext !== undefined && input.pagePrev !== undefined) ||
    (input.cursor === true && input.skip !== undefined)
  )
    throw createApiServiceError(
      'Use either offset skip or cursor=true with at most one pageNext/pagePrev value.',
      { reason: 'invalid_pagination' }
    );
  if (input.query !== undefined && (!input.query.trim() || input.query.length > 1024))
    throw createApiServiceError(
      'Omit query for all spaces, or provide a nonempty space ID or name search.',
      { reason: 'invalid_search' }
    );
  let baseURL =
    region === 'eu' ? 'https://api.eu.contentful.com' : 'https://api.contentful.com';
  let cursorValue = (value: string | undefined, direction: 'pageNext' | 'pagePrev') => {
    if (value === undefined) return undefined;
    if (!value || value.length > 8192 || value !== value.trim())
      throw createApiServiceError(
        'Use the nonempty native continuation returned by Contentful.',
        { reason: 'invalid_pagination' }
      );
    if (/^https?:/i.test(value) || value.startsWith('/')) {
      let continuation: URL;
      try {
        continuation = new URL(value, baseURL);
      } catch {
        throw createApiServiceError(
          'Use the native Contentful continuation for this region.',
          { reason: 'invalid_pagination' }
        );
      }
      let cursor = continuation.searchParams.get(direction);
      if (
        continuation.origin !== baseURL ||
        continuation.pathname !== '/spaces' ||
        continuation.username ||
        continuation.password ||
        continuation.hash ||
        !cursor ||
        continuation.searchParams.getAll(direction).length !== 1
      )
        throw createApiServiceError(
          'Use a same-region /spaces continuation with the matching page direction.',
          { reason: 'invalid_pagination' }
        );
      return cursor;
    }
    return value;
  };
  let params = pickDefined({
    ...input,
    pageNext: cursorValue(input.pageNext, 'pageNext'),
    pagePrev: cursorValue(input.pagePrev, 'pagePrev')
  });
  assertNoCredentials(serializeJson(params, REQUEST_BYTES), secrets);
  let response = await createHttp(baseURL, auth.managementToken).get<unknown>('/spaces', {
    params
  });
  if (response.status !== 200)
    throw createApiServiceError('Contentful did not return a completed spaces page.', {
      reason: 'invalid_response',
      upstreamStatus: response.status
    });
  let page = parseResponse(response.data, spacePageSchema, secrets);
  if (input.cursor === true) {
    if (
      page.pages === undefined ||
      page.skip !== undefined ||
      page.total !== undefined ||
      (input.limit !== undefined && page.items.length > input.limit) ||
      (page.limit !== undefined &&
        (page.items.length > page.limit ||
          (input.limit !== undefined && page.limit !== input.limit)))
    )
      throw createApiServiceError('Contentful did not return the requested cursor page.', {
        reason: 'invalid_response'
      });
  } else if (
    page.skip === undefined ||
    page.limit === undefined ||
    page.total === undefined ||
    page.pages !== undefined ||
    page.skip !== (input.skip ?? 0) ||
    page.items.length > page.limit ||
    page.items.length + page.skip > page.total ||
    (input.limit !== undefined && page.limit !== input.limit)
  ) {
    throw createApiServiceError('Contentful did not return a consistent offset page.', {
      reason: 'invalid_response'
    });
  }
  if (new Set(page.items.map(item => item.sys.id)).size !== page.items.length)
    throw createApiServiceError('Contentful returned duplicate spaces in one page.', {
      reason: 'invalid_response'
    });
  return {
    spaces: page.items.map(item => ({
      id: item.sys.id,
      name: item.name,
      organizationId: item.sys.organization?.sys.id
    })),
    skip: page.skip,
    limit: page.limit,
    total: page.total,
    pages: page.pages,
    pagination: input.cursor === true ? ('cursor' as const) : ('offset' as const)
  };
};
