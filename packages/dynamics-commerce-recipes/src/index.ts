import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createTextAttachment,
  requestAxiosData,
  type SlateAttachment,
  setIfDefined
} from 'slates';
import { z } from 'zod';

export let DYNAMICS_COMMERCE_PROVIDER_LABEL = 'Dynamics 365 Commerce Retail Server';
export let DYNAMICS_COMMERCE_VALIDATION_REASON = 'dynamics_commerce_validation_error';
export let DYNAMICS_COMMERCE_API_ERROR_REASON = 'dynamics_commerce_api_error';
export let DEFAULT_COMMERCE_PAGE_SIZE = 50;
export let MAX_COMMERCE_PAGE_SIZE = 200;
export let COMMERCE_METADATA_MIME_TYPE = 'application/xml';

export type CommerceId = string | number;
export type CommerceMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type CommerceQueryValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | ReadonlyArray<string | number | boolean | Date | null | undefined>;
export type CommerceQueryParams = Record<string, CommerceQueryValue>;

export type CommerceRequestSpec = {
  method: CommerceMethod;
  path: string;
  operation: string;
  query?: CommerceQueryParams;
  body?: unknown;
  responseType?: 'json' | 'text' | 'arraybuffer';
};

export type CommerceHttpRequestConfig = {
  params?: CommerceQueryParams;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text' | 'arraybuffer';
};

export type CommerceHttpResponse<T = unknown> = {
  data: T;
  headers?: Record<string, unknown>;
};

export type CommerceHttpClient = {
  get: <T = unknown>(
    url: string,
    config?: CommerceHttpRequestConfig
  ) => Promise<CommerceHttpResponse<T>>;
  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: CommerceHttpRequestConfig
  ) => Promise<CommerceHttpResponse<T>>;
  patch: <T = unknown>(
    url: string,
    data?: unknown,
    config?: CommerceHttpRequestConfig
  ) => Promise<CommerceHttpResponse<T>>;
  delete: <T = unknown>(
    url: string,
    config?: CommerceHttpRequestConfig & { data?: unknown }
  ) => Promise<CommerceHttpResponse<T>>;
};

export type CommerceClientConfig = {
  retailServerUrl: string;
  accessToken?: string;
  operatingUnitNumber?: string;
  locale?: string;
  channelId?: CommerceId;
  api?: CommerceHttpClient;
  headers?: Record<string, string>;
  defaultPageSize?: number;
  maxPageSize?: number;
};

export type CommerceContextLike = {
  auth?: {
    token?: string;
    accessToken?: string;
    retailServerUrl?: string;
    operatingUnitNumber?: string;
    locale?: string;
    channelId?: CommerceId;
  };
  config?: {
    retailServerUrl?: string;
    commerceUrl?: string;
    operatingUnitNumber?: string;
    locale?: string;
    channelId?: CommerceId;
    defaultPageSize?: number;
    maxPageSize?: number;
  };
};

export type CommercePaginationInput = {
  top?: number;
  pageSize?: number;
  skip?: number;
  pageToken?: string;
  defaultPageSize?: number;
  maxPageSize?: number;
};

export type CommerceProjectionInput = {
  channelId?: CommerceId;
  catalogId?: CommerceId;
  locale?: string;
  currencyCode?: string;
};

export type CommercePropertyPrimitive = string | number | boolean | Date | null;
export type CommerceAdditionalFields = Record<string, CommercePropertyPrimitive>;

let localHttpHosts = new Set(['localhost', '127.0.0.1', '::1']);

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

let isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export let commerceServiceError = (
  message: string,
  options: { reason?: string; upstreamStatus?: number | string; parent?: unknown } = {}
) =>
  createApiServiceError(message, {
    reason: options.reason ?? DYNAMICS_COMMERCE_VALIDATION_REASON,
    upstreamStatus: options.upstreamStatus,
    parent: options.parent
  });

export let commerceApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: DYNAMICS_COMMERCE_PROVIDER_LABEL,
    reason: DYNAMICS_COMMERCE_API_ERROR_REASON,
    operation,
    detailKeys: [
      'message',
      'Message',
      'detail',
      'error',
      'error_description',
      'ErrorMessage',
      'ExceptionMessage',
      'LocalizedMessage',
      'code',
      'Code'
    ],
    nestedKeys: ['errors', 'Errors', 'details', 'Details', 'innererror', 'InnerError'],
    extractUpstreamCode: (_error, response, helpers) => {
      let data = response?.data;
      if (helpers.isRecord(data)) {
        for (let key of ['code', 'Code', 'ErrorCode']) {
          if (typeof data[key] === 'string') return data[key];
        }
      }

      return undefined;
    }
  });

export let requireCommerceString = (value: unknown, label: string) => {
  if (!isNonEmptyString(value)) {
    throw commerceServiceError(`${label} is required.`);
  }

  return value.trim();
};

export let requireCommerceId = (value: unknown, label: string): CommerceId => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (isNonEmptyString(value)) return value.trim();
  throw commerceServiceError(`${label} is required.`);
};

export let requireCommerceArray = <T>(value: readonly T[] | undefined, label: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw commerceServiceError(`${label} must include at least one item.`);
  }

  return value;
};

let assertSafeRetailServerPath = (path: string) => {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    throw commerceServiceError('Retail Server request path must be relative.');
  }

  let segments = path.split('/').filter(Boolean);
  if (segments.some(segment => segment === '..')) {
    throw commerceServiceError('Retail Server request path cannot contain parent traversal.');
  }
};

export let normalizeRetailServerBaseUrl = (retailServerUrl: string) => {
  let trimmed = requireCommerceString(retailServerUrl, 'retailServerUrl');
  let url: URL;

  try {
    url = new URL(trimmed);
  } catch (error) {
    throw commerceServiceError('retailServerUrl must be an absolute URL.', { parent: error });
  }

  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && localHttpHosts.has(url.hostname))
  ) {
    throw commerceServiceError(
      'retailServerUrl must use HTTPS, except localhost URLs used for local development.'
    );
  }

  let pathSegments = url.pathname.split('/').filter(Boolean);
  let commerceIndex = pathSegments.findIndex(segment => segment.toLowerCase() === 'commerce');
  let normalizedSegments =
    commerceIndex >= 0
      ? pathSegments.slice(0, commerceIndex + 1)
      : [...pathSegments, 'Commerce'];

  url.pathname = `/${normalizedSegments.join('/')}/`;
  url.search = '';
  url.hash = '';

  return url.toString();
};

export let resolveRetailServerBaseUrl = (input: {
  retailServerUrl?: string;
  commerceUrl?: string;
  authRetailServerUrl?: string;
}) =>
  normalizeRetailServerBaseUrl(
    input.retailServerUrl ?? input.commerceUrl ?? input.authRetailServerUrl ?? ''
  );

let appendQueryParam = (
  searchParams: URLSearchParams,
  key: string,
  value: Exclude<CommerceQueryValue, readonly unknown[]>
) => {
  if (value === undefined || value === null) return;
  let serialized = value instanceof Date ? value.toISOString() : String(value);
  searchParams.append(key, serialized);
};

export let buildRetailServerUrl = (
  retailServerUrl: string,
  path = '',
  query: CommerceQueryParams = {}
) => {
  let baseUrl = normalizeRetailServerBaseUrl(retailServerUrl);
  let relativePath = path.replace(/^\/+/, '');
  assertSafeRetailServerPath(relativePath);

  let url = new URL(relativePath || '.', baseUrl);
  let searchParams = new URLSearchParams();

  for (let [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (let item of value) {
        appendQueryParam(searchParams, key, item);
      }
    } else {
      appendQueryParam(
        searchParams,
        key,
        value as Exclude<CommerceQueryValue, readonly unknown[]>
      );
    }
  }

  url.search = searchParams.toString();
  return url.toString();
};

export let buildCommerceQueryParams = (params: CommerceQueryParams = {}) => {
  let query: CommerceQueryParams = {};

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      let cleanValues = value.filter(item => item !== undefined && item !== null);
      if (cleanValues.length > 0) query[key] = cleanValues;
      continue;
    }

    query[key] = value;
  }

  return query;
};

export let buildRetailServerHeaders = (input: {
  accessToken?: string;
  operatingUnitNumber?: string;
  locale?: string;
  channelId?: CommerceId;
  contentType?: string | false;
  headers?: Record<string, string>;
}) => {
  let headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (input.contentType !== false) {
    headers['Content-Type'] = input.contentType ?? 'application/json';
  }

  if (isNonEmptyString(input.accessToken)) {
    headers.Authorization = `Bearer ${input.accessToken.trim()}`;
  }

  if (isNonEmptyString(input.operatingUnitNumber)) {
    headers.OUN = input.operatingUnitNumber.trim();
  }

  if (isNonEmptyString(input.locale)) {
    headers['Accept-Language'] = input.locale.trim();
  }

  return {
    ...headers,
    ...input.headers
  };
};

export let resolveCommerceClientConfig = (ctx: CommerceContextLike): CommerceClientConfig => {
  let retailServerUrl = resolveRetailServerBaseUrl({
    retailServerUrl: ctx.config?.retailServerUrl,
    commerceUrl: ctx.config?.commerceUrl,
    authRetailServerUrl: ctx.auth?.retailServerUrl
  });

  return {
    retailServerUrl,
    accessToken: ctx.auth?.accessToken ?? ctx.auth?.token,
    operatingUnitNumber: ctx.config?.operatingUnitNumber ?? ctx.auth?.operatingUnitNumber,
    locale: ctx.config?.locale ?? ctx.auth?.locale,
    channelId: ctx.config?.channelId ?? ctx.auth?.channelId,
    defaultPageSize: ctx.config?.defaultPageSize,
    maxPageSize: ctx.config?.maxPageSize
  };
};

export let compactCommerceValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => compactCommerceValue(item)).filter(item => item !== undefined);
  }

  if (!isPlainObject(value)) return value;

  let output: Record<string, unknown> = {};
  for (let [key, child] of Object.entries(value)) {
    if (child === undefined) continue;
    output[key] = compactCommerceValue(child);
  }

  return output;
};

export let buildCommercePropertyValue = (value: CommercePropertyPrimitive) => {
  if (value instanceof Date) return { DateTimeOffsetValue: value.toISOString() };
  if (typeof value === 'boolean') return { BooleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { IntegerValue: value } : { DecimalValue: value };
  }

  return { StringValue: value === null ? null : String(value) };
};

export let buildCommerceExtensionProperties = (fields?: CommerceAdditionalFields) => {
  if (!fields) return undefined;

  let entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return undefined;

  return entries.map(([key, value]) => ({
    Key: key,
    Value: buildCommercePropertyValue(value)
  }));
};

export let withCommerceExtensionProperties = <T extends Record<string, unknown>>(
  body: T,
  additionalFields?: CommerceAdditionalFields
) => {
  let extensionProperties = buildCommerceExtensionProperties(additionalFields);
  if (!extensionProperties) return body;

  return {
    ...body,
    ExtensionProperties: [
      ...(Array.isArray(body.ExtensionProperties) ? body.ExtensionProperties : []),
      ...extensionProperties
    ]
  };
};

export let normalizeCommercePageSize = (input: CommercePaginationInput = {}) => {
  let maxPageSize = input.maxPageSize ?? MAX_COMMERCE_PAGE_SIZE;
  if (!Number.isInteger(maxPageSize) || maxPageSize < 1) {
    throw commerceServiceError('maxPageSize must be a positive integer.');
  }

  let requested =
    input.top ?? input.pageSize ?? input.defaultPageSize ?? DEFAULT_COMMERCE_PAGE_SIZE;
  if (!Number.isInteger(requested) || requested < 1) {
    throw commerceServiceError('pageSize/top must be a positive integer.');
  }

  return Math.min(requested, maxPageSize);
};

export let normalizeCommerceSkip = (input: CommercePaginationInput = {}) => {
  if (input.pageToken !== undefined) {
    if (!/^\d+$/.test(input.pageToken)) {
      throw commerceServiceError('pageToken must be a non-negative numeric skip token.');
    }

    return Number(input.pageToken);
  }

  let skip = input.skip ?? 0;
  if (!Number.isInteger(skip) || skip < 0) {
    throw commerceServiceError('skip must be a non-negative integer.');
  }

  return skip;
};

export let buildCommerceQueryResultSettings = (input: CommercePaginationInput = {}) => ({
  Paging: {
    Top: normalizeCommercePageSize(input),
    Skip: normalizeCommerceSkip(input)
  }
});

export let buildCommerceODataPaginationQuery = (input: CommercePaginationInput = {}) => ({
  $top: normalizeCommercePageSize(input),
  $skip: normalizeCommerceSkip(input)
});

export let getCommerceCollection = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];

  for (let key of ['value', 'Value', 'Results', 'results', 'Items', 'items']) {
    let value = response[key];
    if (Array.isArray(value)) return value;
  }

  return [];
};

export let getCommerceNextPageToken = (
  response: unknown,
  input: CommercePaginationInput = {}
) => {
  if (isRecord(response)) {
    for (let key of ['nextPageToken', 'NextPageToken', '@odata.nextLink']) {
      let value = response[key];
      if (isNonEmptyString(value)) return value;
    }
  }

  let top = normalizeCommercePageSize(input);
  let skip = normalizeCommerceSkip(input);
  let count = getCommerceCollection(response).length;

  return count >= top ? String(skip + count) : undefined;
};

export let buildCommercePageSummary = (
  response: unknown,
  input: CommercePaginationInput = {}
) => {
  let top = normalizeCommercePageSize(input);
  let skip = normalizeCommerceSkip(input);

  return {
    top,
    skip,
    count: getCommerceCollection(response).length,
    nextPageToken: getCommerceNextPageToken(response, input)
  };
};

let odataStringLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;

export let buildCommerceEntityPath = (entitySetName: string, key: CommerceId) => {
  let entitySet = requireCommerceString(entitySetName, 'entitySetName');
  let normalizedKey =
    typeof key === 'number'
      ? String(key)
      : odataStringLiteral(requireCommerceString(key, 'key'));

  return `${entitySet}(${normalizedKey})`;
};

export let buildCommerceActionPath = (controller: string, action: string) =>
  `${requireCommerceString(controller, 'controller')}/${requireCommerceString(action, 'action')}`;

export let buildCommerceProjectionDomain = (input: CommerceProjectionInput = {}) =>
  compactCommerceValue({
    ChannelId: input.channelId,
    CatalogId: input.catalogId,
    Locale: input.locale,
    CurrencyCode: input.currencyCode
  });

export let buildCommerceRequest = (spec: CommerceRequestSpec): CommerceRequestSpec => ({
  ...spec,
  query: spec.query ? buildCommerceQueryParams(spec.query) : undefined,
  body: spec.body === undefined ? undefined : compactCommerceValue(spec.body)
});

export let buildRetailServerMetadataRequest = (): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'GET',
    path: '$metadata',
    operation: 'download Retail Server metadata',
    responseType: 'text'
  });

export let createRetailServerMetadataAttachment = (
  metadataXml: string,
  mimeType = COMMERCE_METADATA_MIME_TYPE
): SlateAttachment => createTextAttachment(metadataXml, mimeType);

export let buildListChannelsRequest = (
  input: CommercePaginationInput = {}
): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'GET',
    path: 'OrgUnits',
    operation: 'list channels and stores',
    query: buildCommerceODataPaginationQuery(input)
  });

export let buildGetChannelConfigurationRequest = (): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('OrgUnits', 'GetOrgUnitConfiguration'),
    operation: 'get channel configuration',
    body: {}
  });

export let buildGetStoreRequest = (input: { storeNumber: CommerceId }): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'GET',
    path: buildCommerceEntityPath(
      'OrgUnits',
      requireCommerceId(input.storeNumber, 'storeNumber')
    ),
    operation: 'get store'
  });

export let buildSearchStoresRequest = (
  input: {
    searchText?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  } & CommercePaginationInput
): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('OrgUnits', 'Search'),
    operation: 'search stores',
    body: {
      storeSearchCriteria: {
        SearchText: input.searchText,
        Latitude: input.latitude,
        Longitude: input.longitude,
        Radius: input.radius
      },
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildListCatalogsRequest = (
  input: {
    channelId?: CommerceId;
    activeOnly?: boolean;
  } & CommercePaginationInput
): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Catalogs', 'GetCatalogs'),
    operation: 'list catalogs',
    body: {
      channelId: input.channelId,
      activeOnly: input.activeOnly,
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildGetCatalogRequest = (input: {
  catalogId: CommerceId;
  channelId?: CommerceId;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Catalogs', 'GetCatalog'),
    operation: 'get catalog',
    body: {
      catalogId: requireCommerceId(input.catalogId, 'catalogId'),
      channelId: input.channelId
    }
  });

export let buildSearchProductsRequest = (
  input: {
    searchText?: string;
    categoryId?: CommerceId;
    channelId?: CommerceId;
    catalogId?: CommerceId;
    refiners?: unknown[];
    includeAttributes?: boolean;
  } & CommercePaginationInput
): CommerceRequestSpec => {
  let hasSearchText = isNonEmptyString(input.searchText);
  let hasCategoryId = input.categoryId !== undefined;

  if (hasSearchText && hasCategoryId) {
    throw commerceServiceError(
      'Provide searchText or categoryId for product search, not both.'
    );
  }

  let path = hasCategoryId
    ? buildCommerceActionPath('Products', 'SearchByCategory')
    : buildCommerceActionPath('Products', 'SearchByText');

  return buildCommerceRequest({
    method: 'POST',
    path,
    operation: 'search products',
    body: {
      searchText: hasSearchText ? input.searchText?.trim() : undefined,
      categoryId: input.categoryId,
      channelId: input.channelId,
      catalogId: input.catalogId,
      refiners: input.refiners,
      includeAttributes: input.includeAttributes,
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });
};

export let buildGetProductRequest = (input: {
  productId: CommerceId;
  channelId?: CommerceId;
  catalogId?: CommerceId;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetById'),
    operation: 'get product',
    body: {
      recordId: requireCommerceId(input.productId, 'productId'),
      channelId: input.channelId,
      catalogId: input.catalogId
    }
  });

export let buildGetProductsByIdsRequest = (input: {
  productIds: CommerceId[];
  channelId?: CommerceId;
  catalogId?: CommerceId;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetByIds'),
    operation: 'get products by ids',
    body: {
      productIds: requireCommerceArray(input.productIds, 'productIds'),
      channelId: input.channelId,
      catalogId: input.catalogId
    }
  });

export let buildGetActivePricesRequest = (input: {
  productIds: CommerceId[];
  channelId?: CommerceId;
  catalogId?: CommerceId;
  customerAccountNumber?: string;
  activeDate?: string;
  currencyCode?: string;
  affiliationLoyaltyTiers?: unknown[];
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetActivePrices'),
    operation: 'get active prices',
    body: {
      productIds: requireCommerceArray(input.productIds, 'productIds'),
      projectDomain: buildCommerceProjectionDomain(input),
      customerId: input.customerAccountNumber,
      activeDate: input.activeDate,
      affiliationLoyaltyTiers: input.affiliationLoyaltyTiers
    }
  });

export let buildGetProductAvailabilitiesRequest = (input: {
  itemIds: string[];
  channelId?: CommerceId;
  catalogId?: CommerceId;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetProductAvailabilities'),
    operation: 'get product availabilities',
    body: {
      itemIds: requireCommerceArray(input.itemIds, 'itemIds'),
      channelId: input.channelId,
      catalogId: input.catalogId
    }
  });

export let buildGetEstimatedAvailabilityRequest = (
  input: {
    productIds?: CommerceId[];
    itemIds?: string[];
    channelId?: CommerceId;
    warehouseIds?: string[];
    inventoryLocationIds?: string[];
    deliveryMode?: string;
  } & CommercePaginationInput
): CommerceRequestSpec => {
  if (!input.productIds?.length && !input.itemIds?.length) {
    throw commerceServiceError(
      'productIds or itemIds is required for estimated availability.'
    );
  }

  return buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetEstimatedAvailability'),
    operation: 'get estimated availability',
    body: {
      searchCriteria: {
        ProductIds: input.productIds,
        ItemIds: input.itemIds,
        ChannelId: input.channelId,
        WarehouseIds: input.warehouseIds,
        InventoryLocationIds: input.inventoryLocationIds,
        DeliveryMode: input.deliveryMode
      },
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });
};

export let buildCreateCustomerRequest = (input: {
  customer: Record<string, unknown>;
  additionalFields?: CommerceAdditionalFields;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: 'Customers',
    operation: 'create customer',
    body: withCommerceExtensionProperties(
      {
        ...input.customer
      },
      input.additionalFields
    )
  });

export let buildUpdateCustomerRequest = (input: {
  accountNumber: CommerceId;
  customer: Record<string, unknown>;
  additionalFields?: CommerceAdditionalFields;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'PATCH',
    path: buildCommerceEntityPath(
      'Customers',
      requireCommerceId(input.accountNumber, 'accountNumber')
    ),
    operation: 'update customer',
    body: withCommerceExtensionProperties(
      {
        ...input.customer
      },
      input.additionalFields
    )
  });

export let buildSearchCustomersRequest = (
  input: {
    keyword?: string;
    email?: string;
    phone?: string;
    customerGroup?: string;
  } & CommercePaginationInput
): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Customers', 'Search'),
    operation: 'search customers',
    body: {
      customerSearchCriteria: {
        Keyword: input.keyword,
        Email: input.email,
        Phone: input.phone,
        CustomerGroup: input.customerGroup
      },
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildGetCustomersByAccountNumbersRequest = (input: {
  accountNumbers: string[];
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Customers', 'GetByAccountNumbers'),
    operation: 'get customers by account numbers',
    body: {
      accountNumbers: requireCommerceArray(input.accountNumbers, 'accountNumbers')
    }
  });

export let buildGetCustomerOrderHistoryRequest = (
  input: {
    accountNumber: CommerceId;
    channelId?: CommerceId;
  } & CommercePaginationInput
): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Customers', 'GetOrderHistory'),
    operation: 'get customer order history',
    body: {
      accountNumber: requireCommerceId(input.accountNumber, 'accountNumber'),
      channelId: input.channelId,
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildCreateCartRequest = (input: {
  cart?: Record<string, unknown>;
  customerAccountNumber?: string;
  channelId?: CommerceId;
  catalogId?: CommerceId;
  additionalFields?: CommerceAdditionalFields;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: 'Carts',
    operation: 'create cart',
    body: withCommerceExtensionProperties(
      {
        ...(input.cart ?? {}),
        CustomerId: input.customerAccountNumber,
        ChannelId: input.channelId,
        CatalogId: input.catalogId
      },
      input.additionalFields
    )
  });

export let buildGetCartRequest = (input: { cartId: string }): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'GET',
    path: buildCommerceEntityPath('Carts', requireCommerceString(input.cartId, 'cartId')),
    operation: 'get cart'
  });

export let buildAddCartLinesRequest = (input: {
  cartId: string;
  cartLines: unknown[];
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'AddCartLines'),
    operation: 'add cart lines',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      cartLines: requireCommerceArray(input.cartLines, 'cartLines')
    }
  });

export let buildUpdateCartLinesRequest = (input: {
  cartId: string;
  cartLines: unknown[];
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'UpdateCartLines'),
    operation: 'update cart lines',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      cartLines: requireCommerceArray(input.cartLines, 'cartLines')
    }
  });

export let buildRemoveCartLinesRequest = (input: {
  cartId: string;
  lineIds: string[];
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'RemoveCartLines'),
    operation: 'remove cart lines',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      cartLineIds: requireCommerceArray(input.lineIds, 'lineIds')
    }
  });

export let buildAddCartDiscountCodeRequest = (input: {
  cartId: string;
  discountCode: string;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'AddDiscountCode'),
    operation: 'add cart discount code',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      discountCode: requireCommerceString(input.discountCode, 'discountCode')
    }
  });

export let buildRemoveCartDiscountCodesRequest = (input: {
  cartId: string;
  discountCodes: string[];
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'RemoveDiscountCodes'),
    operation: 'remove cart discount codes',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      discountCodes: requireCommerceArray(input.discountCodes, 'discountCodes')
    }
  });

export let buildCheckoutCartRequest = (input: {
  cartId: string;
  receiptEmail?: string;
  tokenizedPaymentCard?: unknown;
  cartTenderLines?: unknown[];
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'Checkout'),
    operation: 'checkout cart',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      receiptEmail: input.receiptEmail,
      tokenizedPaymentCard: input.tokenizedPaymentCard,
      cartTenderLines: input.cartTenderLines
    }
  });

export let buildGetCartPromotionsRequest = (input: { cartId: string }): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'GetPromotions'),
    operation: 'get cart promotions',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId')
    }
  });

export let buildSearchOrdersRequest = (
  input: {
    customerAccountNumber?: string;
    salesId?: string;
    receiptId?: string;
    channelReferenceId?: string;
    startDate?: string;
    endDate?: string;
  } & CommercePaginationInput
): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('SalesOrders', 'Search'),
    operation: 'search orders',
    body: {
      salesOrderSearchCriteria: {
        CustomerAccountNumber: input.customerAccountNumber,
        SalesId: input.salesId,
        ReceiptId: input.receiptId,
        ChannelReferenceId: input.channelReferenceId,
        StartDate: input.startDate,
        EndDate: input.endDate
      },
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildGetOrderByTransactionIdRequest = (input: {
  transactionId: string;
  searchLocationValue?: number;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('SalesOrders', 'GetSalesOrderDetailsByTransactionId'),
    operation: 'get order by transaction id',
    body: {
      transactionId: requireCommerceString(input.transactionId, 'transactionId'),
      searchLocationValue: input.searchLocationValue
    }
  });

export let buildGetOrderBySalesIdRequest = (input: { salesId: string }): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('SalesOrders', 'GetSalesOrderDetailsBySalesId'),
    operation: 'get order by sales id',
    body: {
      salesId: requireCommerceString(input.salesId, 'salesId')
    }
  });

export let buildCreateSalesOrderRequest = (input: {
  salesOrder: Record<string, unknown>;
  additionalFields?: CommerceAdditionalFields;
}): CommerceRequestSpec =>
  buildCommerceRequest({
    method: 'POST',
    path: 'SalesOrders',
    operation: 'create sales order',
    body: withCommerceExtensionProperties(
      {
        ...input.salesOrder
      },
      input.additionalFields
    )
  });

export class DynamicsCommerceRetailServerClient {
  private api: CommerceHttpClient;
  readonly retailServerUrl: string;
  readonly defaultPageSize?: number;
  readonly maxPageSize?: number;

  constructor(config: CommerceClientConfig) {
    this.retailServerUrl = normalizeRetailServerBaseUrl(config.retailServerUrl);
    this.defaultPageSize = config.defaultPageSize;
    this.maxPageSize = config.maxPageSize;

    this.api =
      config.api ??
      (createAuthenticatedAxios({
        baseURL: this.retailServerUrl,
        authHeader: config.accessToken ? { value: `Bearer ${config.accessToken}` } : undefined,
        headers: buildRetailServerHeaders({
          accessToken: undefined,
          operatingUnitNumber: config.operatingUnitNumber,
          locale: config.locale,
          channelId: config.channelId,
          headers: config.headers
        })
      }) as CommerceHttpClient);
  }

  private withDefaults<T extends CommercePaginationInput>(
    input: T
  ): T & CommercePaginationInput {
    return {
      defaultPageSize: this.defaultPageSize,
      maxPageSize: this.maxPageSize,
      ...input
    };
  }

  async execute<T = unknown>(request: CommerceRequestSpec): Promise<T> {
    let normalized = buildCommerceRequest(request);
    let config: CommerceHttpRequestConfig = {
      params: normalized.query,
      responseType: normalized.responseType
    };

    return requestAxiosData<T>(
      normalized.operation,
      (() => {
        switch (normalized.method) {
          case 'GET':
            return this.api.get<T>(normalized.path, config);
          case 'POST':
            return this.api.post<T>(normalized.path, normalized.body, config);
          case 'PATCH':
            return this.api.patch<T>(normalized.path, normalized.body, config);
          case 'DELETE':
            return this.api.delete<T>(normalized.path, {
              ...config,
              data: normalized.body
            });
        }
      }) as any,
      commerceApiError
    );
  }

  async downloadMetadata() {
    return this.execute<string>(buildRetailServerMetadataRequest());
  }

  async downloadMetadataAttachment() {
    return createRetailServerMetadataAttachment(await this.downloadMetadata());
  }

  async listChannels(input: CommercePaginationInput = {}) {
    return this.execute(buildListChannelsRequest(this.withDefaults(input)));
  }

  async getChannelConfiguration() {
    return this.execute(buildGetChannelConfigurationRequest());
  }

  async getStore(input: { storeNumber: CommerceId }) {
    return this.execute(buildGetStoreRequest(input));
  }

  async searchStores(input: Parameters<typeof buildSearchStoresRequest>[0]) {
    return this.execute(buildSearchStoresRequest(this.withDefaults(input)));
  }

  async listCatalogs(input: Parameters<typeof buildListCatalogsRequest>[0]) {
    return this.execute(buildListCatalogsRequest(this.withDefaults(input)));
  }

  async getCatalog(input: Parameters<typeof buildGetCatalogRequest>[0]) {
    return this.execute(buildGetCatalogRequest(input));
  }

  async searchProducts(input: Parameters<typeof buildSearchProductsRequest>[0]) {
    return this.execute(buildSearchProductsRequest(this.withDefaults(input)));
  }

  async getProduct(input: Parameters<typeof buildGetProductRequest>[0]) {
    return this.execute(buildGetProductRequest(input));
  }

  async getProductsByIds(input: Parameters<typeof buildGetProductsByIdsRequest>[0]) {
    return this.execute(buildGetProductsByIdsRequest(input));
  }

  async getActivePrices(input: Parameters<typeof buildGetActivePricesRequest>[0]) {
    return this.execute(buildGetActivePricesRequest(input));
  }

  async getProductAvailabilities(
    input: Parameters<typeof buildGetProductAvailabilitiesRequest>[0]
  ) {
    return this.execute(buildGetProductAvailabilitiesRequest(input));
  }

  async getEstimatedAvailability(
    input: Parameters<typeof buildGetEstimatedAvailabilityRequest>[0]
  ) {
    return this.execute(buildGetEstimatedAvailabilityRequest(this.withDefaults(input)));
  }

  async createCustomer(input: Parameters<typeof buildCreateCustomerRequest>[0]) {
    return this.execute(buildCreateCustomerRequest(input));
  }

  async updateCustomer(input: Parameters<typeof buildUpdateCustomerRequest>[0]) {
    return this.execute(buildUpdateCustomerRequest(input));
  }

  async searchCustomers(input: Parameters<typeof buildSearchCustomersRequest>[0]) {
    return this.execute(buildSearchCustomersRequest(this.withDefaults(input)));
  }

  async getCustomersByAccountNumbers(
    input: Parameters<typeof buildGetCustomersByAccountNumbersRequest>[0]
  ) {
    return this.execute(buildGetCustomersByAccountNumbersRequest(input));
  }

  async getCustomerOrderHistory(
    input: Parameters<typeof buildGetCustomerOrderHistoryRequest>[0]
  ) {
    return this.execute(buildGetCustomerOrderHistoryRequest(this.withDefaults(input)));
  }

  async createCart(input: Parameters<typeof buildCreateCartRequest>[0]) {
    return this.execute(buildCreateCartRequest(input));
  }

  async getCart(input: Parameters<typeof buildGetCartRequest>[0]) {
    return this.execute(buildGetCartRequest(input));
  }

  async addCartLines(input: Parameters<typeof buildAddCartLinesRequest>[0]) {
    return this.execute(buildAddCartLinesRequest(input));
  }

  async updateCartLines(input: Parameters<typeof buildUpdateCartLinesRequest>[0]) {
    return this.execute(buildUpdateCartLinesRequest(input));
  }

  async removeCartLines(input: Parameters<typeof buildRemoveCartLinesRequest>[0]) {
    return this.execute(buildRemoveCartLinesRequest(input));
  }

  async addCartDiscountCode(input: Parameters<typeof buildAddCartDiscountCodeRequest>[0]) {
    return this.execute(buildAddCartDiscountCodeRequest(input));
  }

  async removeCartDiscountCodes(
    input: Parameters<typeof buildRemoveCartDiscountCodesRequest>[0]
  ) {
    return this.execute(buildRemoveCartDiscountCodesRequest(input));
  }

  async checkoutCart(input: Parameters<typeof buildCheckoutCartRequest>[0]) {
    return this.execute(buildCheckoutCartRequest(input));
  }

  async getCartPromotions(input: Parameters<typeof buildGetCartPromotionsRequest>[0]) {
    return this.execute(buildGetCartPromotionsRequest(input));
  }

  async searchOrders(input: Parameters<typeof buildSearchOrdersRequest>[0]) {
    return this.execute(buildSearchOrdersRequest(this.withDefaults(input)));
  }

  async getOrderByTransactionId(
    input: Parameters<typeof buildGetOrderByTransactionIdRequest>[0]
  ) {
    return this.execute(buildGetOrderByTransactionIdRequest(input));
  }

  async getOrderBySalesId(input: Parameters<typeof buildGetOrderBySalesIdRequest>[0]) {
    return this.execute(buildGetOrderBySalesIdRequest(input));
  }

  async createSalesOrder(input: Parameters<typeof buildCreateSalesOrderRequest>[0]) {
    return this.execute(buildCreateSalesOrderRequest(input));
  }
}

export let createDynamicsCommerceRetailServerClient = (config: CommerceClientConfig) =>
  new DynamicsCommerceRetailServerClient(config);

export let createDynamicsCommerceClientFromContext = (ctx: CommerceContextLike) =>
  createDynamicsCommerceRetailServerClient(resolveCommerceClientConfig(ctx));

let commerceAnyRecordSchema = z.record(z.string(), z.any());
let commerceIdSchema = z.union([z.string(), z.number()]);
let commercePaginationSchemaFields = {
  top: z.number().optional().describe('Maximum number of records to request for this page.'),
  pageSize: z.number().optional().describe('Alias for top.'),
  skip: z.number().optional().describe('Number of records to skip.'),
  pageToken: z
    .string()
    .optional()
    .describe('Numeric skip token returned from a previous recipe response.')
};

export let commerceChannelInputSchema = z.object({
  action: z
    .enum(['list_channels', 'get_channel_configuration', 'get_store', 'search_stores'])
    .describe('Channel/store operation to build.'),
  storeNumber: commerceIdSchema.optional().describe('Store number for get_store.'),
  searchText: z.string().optional().describe('Store search text for search_stores.'),
  latitude: z.number().optional().describe('Latitude for location-based store search.'),
  longitude: z.number().optional().describe('Longitude for location-based store search.'),
  radius: z.number().optional().describe('Search radius for location-based store search.'),
  ...commercePaginationSchemaFields
});

export let commerceCatalogInputSchema = z.object({
  action: z.enum(['list_catalogs', 'get_catalog']).describe('Catalog operation to build.'),
  catalogId: commerceIdSchema.optional().describe('Catalog id for get_catalog.'),
  channelId: commerceIdSchema.optional().describe('Commerce channel id.'),
  activeOnly: z.boolean().optional().describe('Only list active catalogs.'),
  ...commercePaginationSchemaFields
});

export let commerceProductInputSchema = z.object({
  action: z
    .enum([
      'search_products',
      'get_product',
      'get_products_by_ids',
      'get_active_prices',
      'get_product_availabilities',
      'get_estimated_availability'
    ])
    .describe('Product, price, or inventory operation to build.'),
  productId: commerceIdSchema.optional().describe('Single product record id for get_product.'),
  productIds: z.array(commerceIdSchema).optional().describe('Product record ids.'),
  itemIds: z.array(z.string()).optional().describe('Inventory item ids.'),
  searchText: z.string().optional().describe('Product search text.'),
  categoryId: commerceIdSchema.optional().describe('Category id for category product search.'),
  channelId: commerceIdSchema.optional().describe('Commerce channel id.'),
  catalogId: commerceIdSchema.optional().describe('Catalog id.'),
  customerAccountNumber: z
    .string()
    .optional()
    .describe('Customer account number for pricing.'),
  activeDate: z.string().optional().describe('Pricing date/time.'),
  currencyCode: z.string().optional().describe('Currency code for pricing.'),
  warehouseIds: z
    .array(z.string())
    .optional()
    .describe('Warehouse ids for availability search.'),
  inventoryLocationIds: z
    .array(z.string())
    .optional()
    .describe('Inventory location ids for availability search.'),
  deliveryMode: z.string().optional().describe('Delivery mode for availability search.'),
  ...commercePaginationSchemaFields
});

export let commerceCustomerOperationInputSchema = z.object({
  action: z
    .enum(['create', 'update', 'search', 'get_by_account_numbers', 'get_order_history'])
    .describe('Customer operation to build.'),
  accountNumber: commerceIdSchema.optional().describe('Customer account number.'),
  accountNumbers: z.array(z.string()).optional().describe('Customer account numbers.'),
  customer: commerceAnyRecordSchema.optional().describe('Customer payload for create/update.'),
  additionalFields: commerceAnyRecordSchema
    .optional()
    .describe('Customer extension properties.'),
  keyword: z.string().optional().describe('Search keyword.'),
  email: z.string().optional().describe('Customer email search value.'),
  phone: z.string().optional().describe('Customer phone search value.'),
  customerGroup: z.string().optional().describe('Customer group search value.'),
  channelId: commerceIdSchema.optional().describe('Commerce channel id.'),
  ...commercePaginationSchemaFields
});

export let commerceCartOperationInputSchema = z.object({
  action: z
    .enum([
      'create',
      'get',
      'add_lines',
      'update_lines',
      'remove_lines',
      'add_discount_code',
      'remove_discount_codes',
      'checkout',
      'get_promotions'
    ])
    .describe('Cart operation to build.'),
  cartId: z.string().optional().describe('Cart id for existing-cart operations.'),
  cart: commerceAnyRecordSchema.optional().describe('Cart payload for create.'),
  cartLines: z.array(z.any()).optional().describe('Cart lines for add/update operations.'),
  lineIds: z.array(z.string()).optional().describe('Cart line ids for remove_lines.'),
  discountCode: z.string().optional().describe('Discount code for add_discount_code.'),
  discountCodes: z
    .array(z.string())
    .optional()
    .describe('Discount codes for remove_discount_codes.'),
  customerAccountNumber: z
    .string()
    .optional()
    .describe('Customer account number for cart create.'),
  channelId: commerceIdSchema.optional().describe('Commerce channel id.'),
  catalogId: commerceIdSchema.optional().describe('Catalog id.'),
  receiptEmail: z.string().optional().describe('Receipt email for checkout.'),
  tokenizedPaymentCard: z.any().optional().describe('Tokenized payment card for checkout.'),
  cartTenderLines: z.array(z.any()).optional().describe('Tender lines for checkout.'),
  additionalFields: commerceAnyRecordSchema.optional().describe('Cart extension properties.')
});

export let commerceOrderOperationInputSchema = z.object({
  action: z
    .enum(['search', 'get_by_transaction_id', 'get_by_sales_id', 'create'])
    .describe('Order operation to build.'),
  transactionId: z.string().optional().describe('Transaction id for get_by_transaction_id.'),
  salesId: z.string().optional().describe('Sales id for search/get_by_sales_id.'),
  searchLocationValue: z.number().optional().describe('Retail Server search location value.'),
  customerAccountNumber: z.string().optional().describe('Customer account number for search.'),
  receiptId: z.string().optional().describe('Receipt id for search.'),
  channelReferenceId: z.string().optional().describe('Channel reference id for search.'),
  startDate: z.string().optional().describe('Search start date/time.'),
  endDate: z.string().optional().describe('Search end date/time.'),
  salesOrder: commerceAnyRecordSchema.optional().describe('Sales order payload for create.'),
  additionalFields: commerceAnyRecordSchema.optional().describe('Order extension properties.'),
  ...commercePaginationSchemaFields
});

export let buildCustomerOperationRequest = (
  input: z.infer<typeof commerceCustomerOperationInputSchema>
) => {
  switch (input.action) {
    case 'create':
      return buildCreateCustomerRequest({
        customer: input.customer ?? {},
        additionalFields: input.additionalFields as CommerceAdditionalFields | undefined
      });
    case 'update':
      return buildUpdateCustomerRequest({
        accountNumber: requireCommerceId(input.accountNumber, 'accountNumber'),
        customer: input.customer ?? {},
        additionalFields: input.additionalFields as CommerceAdditionalFields | undefined
      });
    case 'search':
      return buildSearchCustomersRequest(input);
    case 'get_by_account_numbers':
      return buildGetCustomersByAccountNumbersRequest({
        accountNumbers: requireCommerceArray(input.accountNumbers, 'accountNumbers')
      });
    case 'get_order_history':
      return buildGetCustomerOrderHistoryRequest({
        accountNumber: requireCommerceId(input.accountNumber, 'accountNumber'),
        channelId: input.channelId,
        top: input.top,
        pageSize: input.pageSize,
        skip: input.skip,
        pageToken: input.pageToken
      });
  }
};

export let buildCartOperationRequest = (
  input: z.infer<typeof commerceCartOperationInputSchema>
) => {
  switch (input.action) {
    case 'create':
      return buildCreateCartRequest({
        cart: input.cart,
        customerAccountNumber: input.customerAccountNumber,
        channelId: input.channelId,
        catalogId: input.catalogId,
        additionalFields: input.additionalFields as CommerceAdditionalFields | undefined
      });
    case 'get':
      return buildGetCartRequest({ cartId: requireCommerceString(input.cartId, 'cartId') });
    case 'add_lines':
      return buildAddCartLinesRequest({
        cartId: requireCommerceString(input.cartId, 'cartId'),
        cartLines: requireCommerceArray(input.cartLines, 'cartLines')
      });
    case 'update_lines':
      return buildUpdateCartLinesRequest({
        cartId: requireCommerceString(input.cartId, 'cartId'),
        cartLines: requireCommerceArray(input.cartLines, 'cartLines')
      });
    case 'remove_lines':
      return buildRemoveCartLinesRequest({
        cartId: requireCommerceString(input.cartId, 'cartId'),
        lineIds: requireCommerceArray(input.lineIds, 'lineIds')
      });
    case 'add_discount_code':
      return buildAddCartDiscountCodeRequest({
        cartId: requireCommerceString(input.cartId, 'cartId'),
        discountCode: requireCommerceString(input.discountCode, 'discountCode')
      });
    case 'remove_discount_codes':
      return buildRemoveCartDiscountCodesRequest({
        cartId: requireCommerceString(input.cartId, 'cartId'),
        discountCodes: requireCommerceArray(input.discountCodes, 'discountCodes')
      });
    case 'checkout':
      return buildCheckoutCartRequest({
        cartId: requireCommerceString(input.cartId, 'cartId'),
        receiptEmail: input.receiptEmail,
        tokenizedPaymentCard: input.tokenizedPaymentCard,
        cartTenderLines: input.cartTenderLines
      });
    case 'get_promotions':
      return buildGetCartPromotionsRequest({
        cartId: requireCommerceString(input.cartId, 'cartId')
      });
  }
};

export let buildOrderOperationRequest = (
  input: z.infer<typeof commerceOrderOperationInputSchema>
) => {
  switch (input.action) {
    case 'search':
      return buildSearchOrdersRequest(input);
    case 'get_by_transaction_id':
      return buildGetOrderByTransactionIdRequest({
        transactionId: requireCommerceString(input.transactionId, 'transactionId'),
        searchLocationValue: input.searchLocationValue
      });
    case 'get_by_sales_id':
      return buildGetOrderBySalesIdRequest({
        salesId: requireCommerceString(input.salesId, 'salesId')
      });
    case 'create':
      return buildCreateSalesOrderRequest({
        salesOrder: input.salesOrder ?? {},
        additionalFields: input.additionalFields as CommerceAdditionalFields | undefined
      });
  }
};

export let applyCommerceChannelDefaults = <T extends Record<string, unknown>>(
  input: T,
  defaults: { channelId?: CommerceId; catalogId?: CommerceId; locale?: string } = {}
) => {
  let output: Record<string, unknown> = { ...input };
  setIfDefined(output, 'channelId', output.channelId ?? defaults.channelId);
  setIfDefined(output, 'catalogId', output.catalogId ?? defaults.catalogId);
  setIfDefined(output, 'locale', output.locale ?? defaults.locale);

  return output as T & {
    channelId?: CommerceId;
    catalogId?: CommerceId;
    locale?: string;
  };
};
