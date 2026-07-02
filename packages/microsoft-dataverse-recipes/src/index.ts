import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createBase64Attachment,
  getBase64ByteLength,
  getResponseHeaderValue,
  requestAxios,
  requestAxiosData,
  type SlateAttachment
} from 'slates';
import { z } from 'zod';

export let DATAVERSE_DEFAULT_API_VERSION = 'v9.2';
export let DATAVERSE_DEFAULT_MAX_PAGE_SIZE = 5000;
export let DATAVERSE_DEFAULT_MAX_PAGES = 10;
export let DATAVERSE_MAX_PAGES = 100;
export let DATAVERSE_MAX_RECORDS = 50_000;
export let DATAVERSE_DEFAULT_NAMESPACE = 'Microsoft.Dynamics.CRM';

export type DataversePrimitiveKeyValue = string | number | boolean | Date | null;
export type DataverseRecordKey = string | Record<string, DataversePrimitiveKeyValue>;
export type DataverseRecord = Record<string, unknown>;

export type DataverseRecipeAuth = {
  token?: string;
  instanceUrl?: string;
  tenantId?: string;
  refreshToken?: string;
  expiresAt?: string;
};

export type DataverseRecipeConfig = {
  instanceUrl?: string;
  apiVersion?: string;
};

export type DataverseRecipeContext = {
  auth?: DataverseRecipeAuth;
  config?: DataverseRecipeConfig;
};

export type DataverseHttpResponse<T = unknown> = {
  data: T;
  headers?: unknown;
};

export type DataverseHttpClient = {
  get: <T = unknown>(
    url: string,
    config?: Record<string, unknown>
  ) => Promise<DataverseHttpResponse<T>>;
  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: Record<string, unknown>
  ) => Promise<DataverseHttpResponse<T>>;
  patch: <T = unknown>(
    url: string,
    data?: unknown,
    config?: Record<string, unknown>
  ) => Promise<DataverseHttpResponse<T>>;
  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: Record<string, unknown>
  ) => Promise<DataverseHttpResponse<T>>;
  delete: <T = unknown>(
    url: string,
    config?: Record<string, unknown>
  ) => Promise<DataverseHttpResponse<T>>;
};

export type DataverseListResponse<T extends DataverseRecord = DataverseRecord> = {
  records: T[];
  nextLink: string | null;
  count?: number;
};

export type DataverseListAllResponse<T extends DataverseRecord = DataverseRecord> =
  DataverseListResponse<T> & {
    pagesRead: number;
    complete: boolean;
  };

let dataverseRecordSchema = z.record(z.string(), z.unknown());
let dataverseRecordKeyValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
let dataverseAlternateKeySchema = z.record(z.string(), dataverseRecordKeyValueSchema);

export let createRecordInputSchema = z.object({
  entitySetName: z.string().describe('OData entity set name, such as accounts or contacts'),
  data: dataverseRecordSchema.describe('Record column values to create'),
  detectDuplicates: z
    .boolean()
    .optional()
    .describe('When true, asks Dataverse to detect duplicate records'),
  returnRepresentation: z
    .boolean()
    .optional()
    .describe('When true, requests the created record representation in the response')
});

export let getRecordInputSchema = z.object({
  entitySetName: z.string().describe('OData entity set name'),
  recordId: z.string().optional().describe('Record GUID'),
  alternateKey: dataverseAlternateKeySchema.optional().describe('Alternate key values'),
  select: z.array(z.string()).optional().describe('Columns to return'),
  expand: z.string().optional().describe('OData $expand expression')
});

export let updateRecordInputSchema = z.object({
  entitySetName: z.string().describe('OData entity set name'),
  recordId: z.string().optional().describe('Record GUID'),
  alternateKey: dataverseAlternateKeySchema.optional().describe('Alternate key values'),
  data: dataverseRecordSchema.describe('Record column values to update'),
  returnRepresentation: z
    .boolean()
    .optional()
    .describe('When true, requests the updated record representation in the response')
});

export let deleteRecordInputSchema = z.object({
  entitySetName: z.string().describe('OData entity set name'),
  recordId: z.string().optional().describe('Record GUID'),
  alternateKey: dataverseAlternateKeySchema.optional().describe('Alternate key values')
});

export let listRecordsInputSchema = z.object({
  entitySetName: z.string().describe('OData entity set name'),
  select: z.array(z.string()).optional().describe('Columns to return'),
  filter: z.string().optional().describe('OData $filter expression'),
  orderBy: z.string().optional().describe('OData $orderby expression'),
  expand: z.string().optional().describe('OData $expand expression'),
  top: z.number().int().positive().optional().describe('OData $top value'),
  pageSize: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Preferred page size for Dataverse pagination'),
  nextLink: z.string().optional().describe('Dataverse @odata.nextLink from a previous page'),
  includeCount: z.boolean().optional().describe('Whether to request @odata.count')
});

export let paginateRecordsInputSchema = listRecordsInputSchema.extend({
  maxPages: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum pages to follow; capped by the recipe package'),
  maxRecords: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum records to collect; capped by the recipe package')
});

export let fetchXmlInputSchema = z.object({
  entitySetName: z.string().describe('OData entity set name'),
  fetchXml: z.string().describe('FetchXML query document'),
  pageSize: z.number().int().positive().optional().describe('Preferred page size')
});

export let dataverseSearchInputSchema = z.object({
  search: z.string().describe('Search term for the Dataverse Search API'),
  entities: z
    .array(
      z.object({
        name: z.string().describe('Table logical name'),
        selectColumns: z.array(z.string()).optional().describe('Columns to include'),
        searchColumns: z.array(z.string()).optional().describe('Columns to search')
      })
    )
    .optional()
    .describe('Tables and columns to search'),
  filter: z.string().optional().describe('Dataverse Search filter expression'),
  top: z.number().int().positive().optional().describe('Maximum result count'),
  skip: z.number().int().nonnegative().optional().describe('Number of results to skip'),
  facets: z.array(z.string()).optional().describe('Facet expressions')
});

export let metadataInputSchema = z.object({
  logicalName: z.string().optional().describe('Table logical name'),
  select: z.array(z.string()).optional().describe('Metadata properties to select'),
  filter: z.string().optional().describe('Metadata OData $filter expression'),
  includeAttributes: z.boolean().optional().describe('Whether to expand attribute metadata')
});

export let relationshipInputSchema = z.object({
  relationshipAction: z
    .enum(['associate', 'disassociate', 'get_related'])
    .describe('Relationship operation to perform'),
  relationshipType: z
    .enum(['single', 'collection'])
    .optional()
    .describe(
      'Use single for lookup-valued navigation properties; collection for collection-valued relationships'
    ),
  entitySetName: z.string().describe('Source entity set name'),
  recordId: z.string().describe('Source record GUID'),
  navigationProperty: z.string().describe('Navigation property name'),
  targetEntitySetName: z.string().optional().describe('Target entity set name'),
  targetRecordId: z.string().optional().describe('Target record GUID'),
  select: z.array(z.string()).optional().describe('Columns to return for get_related'),
  filter: z.string().optional().describe('OData $filter for get_related'),
  top: z.number().int().positive().optional().describe('Maximum related records to return')
});

export let invokeOperationInputSchema = z.object({
  operationType: z.enum(['action', 'function']).describe('Dataverse operation kind'),
  bindingType: z
    .enum(['unbound', 'entity', 'collection'])
    .optional()
    .describe(
      'Whether the operation is unbound, bound to a record, or bound to an entity set'
    ),
  operationName: z.string().describe('Action or function name'),
  namespace: z
    .string()
    .optional()
    .describe('Namespace for bound operations; defaults to Microsoft.Dynamics.CRM'),
  entitySetName: z.string().optional().describe('Entity set for bound operations'),
  recordId: z.string().optional().describe('Record GUID for entity-bound operations'),
  parameters: dataverseRecordSchema.optional().describe('Function parameters'),
  requestBody: dataverseRecordSchema.optional().describe('Action request body')
});

export let fileColumnDownloadInputSchema = z.object({
  entitySetName: z.string().describe('OData entity set name'),
  recordId: z.string().describe('Record GUID'),
  columnName: z.string().describe('File or image column logical name'),
  fileName: z.string().optional().describe('Fallback attachment file name'),
  mimeType: z.string().optional().describe('Fallback MIME type')
});

export let fileColumnUploadInputSchema = z.object({
  entityLogicalName: z.string().describe('Table logical name'),
  primaryIdAttribute: z.string().optional().describe('Primary ID column logical name'),
  recordId: z.string().describe('Record GUID'),
  columnName: z.string().describe('File or image column logical name'),
  fileName: z.string().describe('File name to store in Dataverse'),
  contentBase64: z.string().describe('Base64 file content'),
  mimeType: z.string().optional().describe('MIME type'),
  chunkSizeBytes: z.number().int().positive().optional().describe('Upload block size in bytes')
});

export let batchInputSchema = z.object({
  operations: z
    .array(
      z.object({
        method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']),
        url: z.string().describe('Relative Dataverse Web API URL'),
        headers: z.record(z.string(), z.string()).optional(),
        body: z.unknown().optional(),
        contentId: z.string().optional()
      })
    )
    .describe('Operations to include in a Dataverse $batch request')
});

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let requiredText = (value: unknown, label: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw dataverseValidationError(`${label} is required.`);
  }

  return value.trim();
};

let encodePathSegment = (value: string) =>
  encodeURIComponent(requiredText(value, 'Path segment'));

let stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export let dataverseValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'microsoft_dataverse_validation_error' });

export let dataverseApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Microsoft Dataverse',
    reason: 'microsoft_dataverse_api_error',
    operation,
    detailKeys: ['message', 'Message', 'detail', 'error_description', 'code', 'Code', 'title'],
    nestedKeys: ['error', 'innererror', 'details', 'errors'],
    extractUpstreamCode: (_error, response) => {
      let data = response?.data;
      if (isRecord(data) && isRecord(data.error) && typeof data.error.code === 'string') {
        return data.error.code;
      }
      if (isRecord(data) && typeof data.code === 'string') {
        return data.code;
      }
      return undefined;
    }
  });

export let normalizeDataverseInstanceUrl = (instanceUrl: string) => {
  let value = requiredText(instanceUrl, 'Dataverse instance URL');
  let withoutApiPath = stripTrailingSlash(value).replace(/\/api\/data\/v\d+(?:\.\d+)?$/i, '');

  try {
    let url = new URL(withoutApiPath);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw dataverseValidationError('Dataverse instance URL must use http or https.');
    }

    url.search = '';
    url.hash = '';
    return stripTrailingSlash(url.toString());
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    throw dataverseValidationError('Dataverse instance URL must be an absolute URL.');
  }
};

export let resolveDataverseInstanceUrl = (
  ctx: DataverseRecipeContext,
  options: { instanceUrl?: string } = {}
) =>
  normalizeDataverseInstanceUrl(
    options.instanceUrl ?? ctx.auth?.instanceUrl ?? ctx.config?.instanceUrl ?? ''
  );

export let buildDataverseApiBaseUrl = (
  instanceUrl: string,
  apiVersion = DATAVERSE_DEFAULT_API_VERSION
) =>
  `${normalizeDataverseInstanceUrl(instanceUrl)}/api/data/${requiredText(apiVersion, 'Dataverse API version')}`;

export let createDataverseHttpClient = (config: {
  token: string;
  instanceUrl: string;
  apiVersion?: string;
}) =>
  createAuthenticatedAxios({
    baseURL: buildDataverseApiBaseUrl(config.instanceUrl, config.apiVersion),
    authHeader: { value: `Bearer ${requiredText(config.token, 'Dataverse access token')}` },
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0'
    },
    errorAdapter: error => dataverseApiError(error)
  }) as DataverseHttpClient;

export let formatDataverseODataString = (value: string) => value.replace(/'/g, "''");

export let formatDataverseODataLiteral = (value: unknown): string => {
  if (typeof value === 'string') {
    return `'${formatDataverseODataString(value)}'`;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (value === null) {
    return 'null';
  }
  return JSON.stringify(value);
};

export let normalizeDataverseGuid = (value: string) => {
  let guid = requiredText(value, 'Dataverse record ID').replace(/[{}]/g, '');
  if (guid.startsWith('(') && guid.endsWith(')')) {
    guid = guid.slice(1, -1);
  }

  if (
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(guid)
  ) {
    throw dataverseValidationError(
      'Dataverse record ID must be a GUID. Use alternateKey for alternate keys.'
    );
  }

  return guid;
};

export let formatDataverseKeyValue = (value: DataversePrimitiveKeyValue) => {
  if (typeof value === 'string') {
    return `'${encodeURIComponent(formatDataverseODataString(value))}'`;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return `'${encodeURIComponent(value.toISOString())}'`;
  }
  return 'null';
};

export let formatDataverseRecordKey = (recordKey: DataverseRecordKey) => {
  if (typeof recordKey === 'string') {
    return normalizeDataverseGuid(recordKey);
  }

  let entries = Object.entries(recordKey);
  if (entries.length === 0) {
    throw dataverseValidationError('At least one alternate key value is required.');
  }

  return entries
    .map(([key, value]) => `${encodePathSegment(key)}=${formatDataverseKeyValue(value)}`)
    .join(',');
};

export let buildDataverseRecordPath = (entitySetName: string, recordKey: DataverseRecordKey) =>
  `${encodePathSegment(entitySetName)}(${formatDataverseRecordKey(recordKey)})`;

export let buildDataverseEntitySetPath = (entitySetName: string) =>
  encodePathSegment(entitySetName);

let encodeQueryValue = (value: string) => encodeURIComponent(value);

let addCsvQuery = (params: string[], key: string, values?: string[]) => {
  if (!values || values.length === 0) return;
  params.push(
    `${key}=${values.map(value => encodeQueryValue(requiredText(value, key))).join(',')}`
  );
};

export type DataverseODataQueryOptions = {
  select?: string[];
  filter?: string;
  orderBy?: string;
  expand?: string;
  top?: number;
  skip?: number;
  includeCount?: boolean;
  fetchXml?: string;
  custom?: Record<string, string | number | boolean | undefined>;
};

export let buildDataverseODataQuery = (options: DataverseODataQueryOptions = {}) => {
  let params: string[] = [];

  addCsvQuery(params, '$select', options.select);

  if (options.filter) params.push(`$filter=${encodeQueryValue(options.filter)}`);
  if (options.orderBy) params.push(`$orderby=${encodeQueryValue(options.orderBy)}`);
  if (options.expand) params.push(`$expand=${encodeQueryValue(options.expand)}`);
  if (options.top !== undefined)
    params.push(`$top=${normalizeDataversePositiveInteger(options.top, '$top')}`);
  if (options.skip !== undefined)
    params.push(`$skip=${normalizeDataverseNonNegativeInteger(options.skip, '$skip')}`);
  if (options.includeCount) params.push('$count=true');
  if (options.fetchXml) params.push(`fetchXml=${encodeQueryValue(options.fetchXml)}`);

  for (let [key, value] of Object.entries(options.custom ?? {})) {
    if (value === undefined) continue;
    params.push(`${encodeQueryValue(key)}=${encodeQueryValue(String(value))}`);
  }

  return params.length > 0 ? `?${params.join('&')}` : '';
};

export let buildDataverseCollectionUrl = (
  entitySetName: string,
  options: DataverseODataQueryOptions = {}
) => `${buildDataverseEntitySetPath(entitySetName)}${buildDataverseODataQuery(options)}`;

export let buildDataverseRecordUrl = (
  entitySetName: string,
  recordKey: DataverseRecordKey,
  options: Pick<DataverseODataQueryOptions, 'select' | 'expand'> = {}
) =>
  `${buildDataverseRecordPath(entitySetName, recordKey)}${buildDataverseODataQuery(options)}`;

export let normalizeDataversePositiveInteger = (
  value: number,
  label: string,
  max?: number
) => {
  if (!Number.isInteger(value) || value < 1) {
    throw dataverseValidationError(`${label} must be a positive integer.`);
  }
  if (max !== undefined && value > max) {
    throw dataverseValidationError(`${label} cannot exceed ${max}.`);
  }
  return value;
};

export let normalizeDataverseNonNegativeInteger = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 0) {
    throw dataverseValidationError(`${label} must be a non-negative integer.`);
  }
  return value;
};

export let normalizeDataversePagination = (
  options: { pageSize?: number; maxPages?: number; maxRecords?: number } = {}
) => ({
  pageSize:
    options.pageSize === undefined
      ? undefined
      : normalizeDataversePositiveInteger(
          options.pageSize,
          'pageSize',
          DATAVERSE_DEFAULT_MAX_PAGE_SIZE
        ),
  maxPages:
    options.maxPages === undefined
      ? DATAVERSE_DEFAULT_MAX_PAGES
      : normalizeDataversePositiveInteger(options.maxPages, 'maxPages', DATAVERSE_MAX_PAGES),
  maxRecords:
    options.maxRecords === undefined
      ? undefined
      : normalizeDataversePositiveInteger(
          options.maxRecords,
          'maxRecords',
          DATAVERSE_MAX_RECORDS
        )
});

let preferHeaders = (values: string[]) =>
  values.length > 0
    ? {
        Prefer: values.join(',')
      }
    : undefined;

export let buildDataverseListHeaders = (pageSize?: number) => {
  let pagination = normalizeDataversePagination({ pageSize });
  return preferHeaders(
    pagination.pageSize !== undefined ? [`odata.maxpagesize=${pagination.pageSize}`] : []
  );
};

export type DataverseAttributeMetadata = {
  logicalName?: string;
  schemaName?: string;
  type?: string;
  displayName?: string;
  description?: string;
  requiredLevel?: string;
  isValidForCreate?: boolean;
  isValidForUpdate?: boolean;
  isValidForRead?: boolean;
  targets?: string[];
  attributeOf?: string;
  metadataId?: string;
};

export type DataverseEntityMetadata = {
  logicalName?: string;
  entitySetName?: string;
  schemaName?: string;
  displayName?: string;
  description?: string;
  primaryIdAttribute?: string;
  primaryNameAttribute?: string;
  ownershipType?: string;
  isActivity?: boolean;
  metadataId?: string;
  attributes?: DataverseAttributeMetadata[];
};

export let parseDataverseLocalizedLabel = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;

  let userLabel = value.UserLocalizedLabel;
  if (isRecord(userLabel) && typeof userLabel.Label === 'string') {
    return userLabel.Label;
  }

  let labels = value.LocalizedLabels;
  if (Array.isArray(labels)) {
    for (let label of labels) {
      if (isRecord(label) && typeof label.Label === 'string') {
        return label.Label;
      }
    }
  }

  return undefined;
};

let parseRequiredLevel = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  let managed = value.Value;
  return typeof managed === 'string' ? managed : undefined;
};

export let parseDataverseAttributeMetadata = (
  attribute: unknown
): DataverseAttributeMetadata => {
  if (!isRecord(attribute)) return {};

  return {
    logicalName: typeof attribute.LogicalName === 'string' ? attribute.LogicalName : undefined,
    schemaName: typeof attribute.SchemaName === 'string' ? attribute.SchemaName : undefined,
    type: typeof attribute.AttributeType === 'string' ? attribute.AttributeType : undefined,
    displayName: parseDataverseLocalizedLabel(attribute.DisplayName),
    description: parseDataverseLocalizedLabel(attribute.Description),
    requiredLevel: parseRequiredLevel(attribute.RequiredLevel),
    isValidForCreate:
      typeof attribute.IsValidForCreate === 'boolean' ? attribute.IsValidForCreate : undefined,
    isValidForUpdate:
      typeof attribute.IsValidForUpdate === 'boolean' ? attribute.IsValidForUpdate : undefined,
    isValidForRead:
      typeof attribute.IsValidForRead === 'boolean' ? attribute.IsValidForRead : undefined,
    targets: Array.isArray(attribute.Targets)
      ? attribute.Targets.filter((target): target is string => typeof target === 'string')
      : undefined,
    attributeOf: typeof attribute.AttributeOf === 'string' ? attribute.AttributeOf : undefined,
    metadataId: typeof attribute.MetadataId === 'string' ? attribute.MetadataId : undefined
  };
};

export let parseDataverseEntityMetadata = (entity: unknown): DataverseEntityMetadata => {
  if (!isRecord(entity)) return {};

  return {
    logicalName: typeof entity.LogicalName === 'string' ? entity.LogicalName : undefined,
    entitySetName: typeof entity.EntitySetName === 'string' ? entity.EntitySetName : undefined,
    schemaName: typeof entity.SchemaName === 'string' ? entity.SchemaName : undefined,
    displayName: parseDataverseLocalizedLabel(entity.DisplayName),
    description: parseDataverseLocalizedLabel(entity.Description),
    primaryIdAttribute:
      typeof entity.PrimaryIdAttribute === 'string' ? entity.PrimaryIdAttribute : undefined,
    primaryNameAttribute:
      typeof entity.PrimaryNameAttribute === 'string'
        ? entity.PrimaryNameAttribute
        : undefined,
    ownershipType: typeof entity.OwnershipType === 'string' ? entity.OwnershipType : undefined,
    isActivity: typeof entity.IsActivity === 'boolean' ? entity.IsActivity : undefined,
    metadataId: typeof entity.MetadataId === 'string' ? entity.MetadataId : undefined,
    attributes: Array.isArray(entity.Attributes)
      ? entity.Attributes.map(parseDataverseAttributeMetadata)
      : undefined
  };
};

export type DataverseRelationshipType = 'single' | 'collection';

export type DataverseRelationshipRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: DataverseRecord;
};

let relativeRecordBinding = (entitySetName: string, recordKey: DataverseRecordKey) =>
  buildDataverseRecordPath(entitySetName, recordKey);

let absoluteRecordBinding = (
  apiBaseUrl: string,
  entitySetName: string,
  recordKey: DataverseRecordKey
) => `${stripTrailingSlash(apiBaseUrl)}/${relativeRecordBinding(entitySetName, recordKey)}`;

export let buildDataverseAssociateRequest = (params: {
  sourceEntitySetName: string;
  sourceRecordKey: DataverseRecordKey;
  navigationProperty: string;
  targetEntitySetName: string;
  targetRecordKey: DataverseRecordKey;
  relationshipType: DataverseRelationshipType;
  apiBaseUrl?: string;
}): DataverseRelationshipRequest => {
  let sourcePath = buildDataverseRecordPath(
    params.sourceEntitySetName,
    params.sourceRecordKey
  );
  let navigationProperty = encodePathSegment(params.navigationProperty);
  let apiBaseUrl = requiredText(params.apiBaseUrl, 'Dataverse API base URL');

  if (params.relationshipType === 'single') {
    return {
      method: 'PUT',
      url: `${sourcePath}/${navigationProperty}/$ref`,
      body: {
        '@odata.id': absoluteRecordBinding(
          apiBaseUrl,
          params.targetEntitySetName,
          params.targetRecordKey
        )
      }
    };
  }

  return {
    method: 'POST',
    url: `${sourcePath}/${navigationProperty}/$ref`,
    body: {
      '@odata.id': absoluteRecordBinding(
        apiBaseUrl,
        params.targetEntitySetName,
        params.targetRecordKey
      )
    }
  };
};

export let buildDataverseDisassociateRequest = (params: {
  sourceEntitySetName: string;
  sourceRecordKey: DataverseRecordKey;
  navigationProperty: string;
  relationshipType: DataverseRelationshipType;
  targetRecordKey?: DataverseRecordKey;
}): DataverseRelationshipRequest => {
  let sourcePath = buildDataverseRecordPath(
    params.sourceEntitySetName,
    params.sourceRecordKey
  );
  let navigationProperty = encodePathSegment(params.navigationProperty);

  if (params.relationshipType === 'single') {
    return {
      method: 'DELETE',
      url: `${sourcePath}/${navigationProperty}/$ref`
    };
  }

  if (params.targetRecordKey === undefined) {
    throw dataverseValidationError(
      'targetRecordKey is required for collection disassociation.'
    );
  }

  return {
    method: 'DELETE',
    url: `${sourcePath}/${navigationProperty}(${formatDataverseRecordKey(params.targetRecordKey)})/$ref`
  };
};

export let buildDataverseGetRelatedUrl = (params: {
  entitySetName: string;
  recordKey: DataverseRecordKey;
  navigationProperty: string;
  query?: Pick<DataverseODataQueryOptions, 'select' | 'filter' | 'top' | 'expand'>;
}) =>
  `${buildDataverseRecordPath(params.entitySetName, params.recordKey)}/${encodePathSegment(
    params.navigationProperty
  )}${buildDataverseODataQuery(params.query)}`;

let encodeOperationName = (operationName: string) =>
  requiredText(operationName, 'Operation name')
    .split('.')
    .map(part => encodePathSegment(part))
    .join('.');

let qualifyBoundOperationName = (operationName: string, namespace?: string) => {
  let name = requiredText(operationName, 'Operation name');
  if (name.includes('.')) return encodeOperationName(name);
  return `${encodeOperationName(namespace ?? DATAVERSE_DEFAULT_NAMESPACE)}.${encodeOperationName(name)}`;
};

let buildFunctionParameterSuffix = (parameters?: DataverseRecord) => {
  let entries = Object.entries(parameters ?? {});
  if (entries.length === 0) {
    return { pathSuffix: '()', querySuffix: '' };
  }

  let aliases = entries
    .map(([key]) => `${encodePathSegment(key)}=@${encodePathSegment(key)}`)
    .join(',');
  let query = entries
    .map(
      ([key, value]) =>
        `@${encodePathSegment(key)}=${encodeURIComponent(formatDataverseODataLiteral(value))}`
    )
    .join('&');

  return {
    pathSuffix: `(${aliases})`,
    querySuffix: `?${query}`
  };
};

export type DataverseOperationRequest = {
  method: 'GET' | 'POST';
  url: string;
  body?: DataverseRecord;
};

export let buildDataverseOperationRequest = (params: {
  operationType: 'action' | 'function';
  bindingType?: 'unbound' | 'entity' | 'collection';
  operationName: string;
  namespace?: string;
  entitySetName?: string;
  recordKey?: DataverseRecordKey;
  parameters?: DataverseRecord;
  requestBody?: DataverseRecord;
}): DataverseOperationRequest => {
  let bindingType = params.bindingType ?? 'unbound';
  let operationPath: string;

  if (bindingType === 'unbound') {
    operationPath = encodeOperationName(params.operationName);
  } else if (bindingType === 'collection') {
    operationPath = `${buildDataverseEntitySetPath(
      requiredText(params.entitySetName, 'Entity set name')
    )}/${qualifyBoundOperationName(params.operationName, params.namespace)}`;
  } else {
    if (params.recordKey === undefined) {
      throw dataverseValidationError('recordKey is required for entity-bound operations.');
    }
    operationPath = `${buildDataverseRecordPath(
      requiredText(params.entitySetName, 'Entity set name'),
      params.recordKey
    )}/${qualifyBoundOperationName(params.operationName, params.namespace)}`;
  }

  if (params.operationType === 'function') {
    let suffix = buildFunctionParameterSuffix(params.parameters);
    return {
      method: 'GET',
      url: `${operationPath}${suffix.pathSuffix}${suffix.querySuffix}`
    };
  }

  return {
    method: 'POST',
    url: operationPath,
    body: params.requestBody ?? {}
  };
};

export type DataverseFileAttachmentData = {
  attachment: SlateAttachment;
  metadata: {
    fileName?: string;
    mimeType?: string;
    sizeBytes: number;
    attachmentCount: number;
  };
};

let contentToBase64 = (content: string | ArrayBuffer | Uint8Array) => {
  if (typeof content === 'string') {
    return content;
  }
  return Buffer.from(
    content instanceof ArrayBuffer ? new Uint8Array(content) : content
  ).toString('base64');
};

let fileNameFromContentDisposition = (contentDisposition?: string) => {
  if (!contentDisposition) return undefined;

  let utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  let quotedMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return quotedMatch?.[1];
};

export let buildDataverseFileAttachmentData = (params: {
  content: string | ArrayBuffer | Uint8Array;
  headers?: unknown;
  fileName?: string;
  mimeType?: string;
}): DataverseFileAttachmentData => {
  let contentBase64 = contentToBase64(params.content);
  let mimeType = params.mimeType ?? getResponseHeaderValue(params.headers, 'content-type');
  let fileName =
    params.fileName ??
    fileNameFromContentDisposition(
      getResponseHeaderValue(params.headers, 'content-disposition')
    );

  return {
    attachment: createBase64Attachment(contentBase64, mimeType),
    metadata: {
      fileName,
      mimeType,
      sizeBytes: getBase64ByteLength(contentBase64),
      attachmentCount: 1
    }
  };
};

export let buildDataverseFileColumnValueUrl = (params: {
  entitySetName: string;
  recordKey: DataverseRecordKey;
  columnName: string;
}) =>
  `${buildDataverseRecordPath(params.entitySetName, params.recordKey)}/${encodePathSegment(
    params.columnName
  )}/$value`;

export let buildDataverseFileTarget = (params: {
  entityLogicalName: string;
  recordId: string;
  primaryIdAttribute?: string;
}) => {
  let entityLogicalName = requiredText(params.entityLogicalName, 'Entity logical name');
  return {
    '@odata.type': `${DATAVERSE_DEFAULT_NAMESPACE}.${entityLogicalName}`,
    [params.primaryIdAttribute ?? `${entityLogicalName}id`]: normalizeDataverseGuid(
      params.recordId
    )
  };
};

export let buildInitializeFileBlocksUploadBody = (params: {
  entityLogicalName: string;
  recordId: string;
  columnName: string;
  fileName: string;
  primaryIdAttribute?: string;
}) => ({
  Target: buildDataverseFileTarget(params),
  FileAttributeName: requiredText(params.columnName, 'File column name'),
  FileName: requiredText(params.fileName, 'File name')
});

export let buildUploadBlockBody = (params: {
  continuationToken: string;
  blockId: string;
  contentBase64: string;
}) => ({
  FileContinuationToken: requiredText(params.continuationToken, 'File continuation token'),
  BlockId: requiredText(params.blockId, 'Block ID'),
  BlockData: requiredText(params.contentBase64, 'Block content')
});

export let buildCommitFileBlocksUploadBody = (params: {
  continuationToken: string;
  fileName: string;
  blockList: string[];
  mimeType?: string;
}) => ({
  FileContinuationToken: requiredText(params.continuationToken, 'File continuation token'),
  FileName: requiredText(params.fileName, 'File name'),
  MimeType: params.mimeType,
  BlockList: params.blockList
});

export let buildInitializeFileBlocksDownloadBody = (params: {
  entityLogicalName: string;
  recordId: string;
  columnName: string;
  primaryIdAttribute?: string;
}) => ({
  Target: buildDataverseFileTarget(params),
  FileAttributeName: requiredText(params.columnName, 'File column name')
});

export let buildDownloadBlockBody = (params: {
  continuationToken: string;
  offset: number;
  blockLength: number;
}) => ({
  FileContinuationToken: requiredText(params.continuationToken, 'File continuation token'),
  Offset: normalizeDataverseNonNegativeInteger(params.offset, 'offset'),
  BlockLength: normalizeDataversePositiveInteger(params.blockLength, 'blockLength')
});

export type DataverseBatchOperation = {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  contentId?: string;
};

let normalizeBatchUrl = (url: string) => {
  let value = requiredText(url, 'Batch operation URL');
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return value.replace(/^\/+/, '');
};

let isBatchWrite = (method: DataverseBatchOperation['method']) => method !== 'GET';

let appendHttpOperation = (lines: string[], operation: DataverseBatchOperation) => {
  lines.push('Content-Type: application/http');
  lines.push('Content-Transfer-Encoding: binary');
  if (operation.contentId) {
    lines.push(`Content-ID: ${operation.contentId}`);
  }
  lines.push('');
  lines.push(`${operation.method} ${normalizeBatchUrl(operation.url)} HTTP/1.1`);
  lines.push('Accept: application/json');

  for (let [key, value] of Object.entries(operation.headers ?? {})) {
    lines.push(`${key}: ${value}`);
  }

  if (operation.body !== undefined) {
    lines.push('Content-Type: application/json; charset=utf-8');
    lines.push('');
    lines.push(JSON.stringify(operation.body));
  } else {
    lines.push('');
  }
};

export let buildDataverseBatchRequest = (
  operations: DataverseBatchOperation[],
  options: { batchBoundary?: string; changeSetBoundary?: string } = {}
) => {
  if (operations.length === 0) {
    throw dataverseValidationError('At least one batch operation is required.');
  }

  let batchBoundary = options.batchBoundary ?? `batch_${crypto.randomUUID()}`;
  let changeSetBoundary = options.changeSetBoundary ?? `changeset_${crypto.randomUUID()}`;
  let lines: string[] = [];
  let changeSetOpen = false;

  let closeChangeSet = () => {
    if (changeSetOpen) {
      lines.push(`--${changeSetBoundary}--`);
      changeSetOpen = false;
    }
  };

  for (let operation of operations) {
    if (isBatchWrite(operation.method)) {
      if (!changeSetOpen) {
        lines.push(`--${batchBoundary}`);
        lines.push(`Content-Type: multipart/mixed;boundary=${changeSetBoundary}`);
        lines.push('');
        changeSetOpen = true;
      }
      lines.push(`--${changeSetBoundary}`);
      appendHttpOperation(lines, operation);
      continue;
    }

    closeChangeSet();
    lines.push(`--${batchBoundary}`);
    appendHttpOperation(lines, operation);
  }

  closeChangeSet();
  lines.push(`--${batchBoundary}--`);
  lines.push('');

  return {
    method: 'POST' as const,
    url: '$batch',
    headers: {
      'Content-Type': `multipart/mixed;boundary=${batchBoundary}`
    },
    body: lines.join('\r\n')
  };
};

let parseDataverseSearchResponse = (data: unknown) => {
  let parsed = data;
  for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return data;
    }
  }
  return parsed;
};

let keyFromInput = (
  recordId?: string,
  alternateKey?: Record<string, DataversePrimitiveKeyValue>
) => {
  if (recordId) return recordId;
  if (alternateKey) return alternateKey;
  throw dataverseValidationError('Either recordId or alternateKey is required.');
};

export class DataverseClient {
  readonly instanceUrl: string;
  readonly apiVersion: string;
  readonly apiBaseUrl: string;
  private http: DataverseHttpClient;

  constructor(config: {
    token: string;
    instanceUrl: string;
    apiVersion?: string;
    http?: DataverseHttpClient;
  }) {
    this.instanceUrl = normalizeDataverseInstanceUrl(config.instanceUrl);
    this.apiVersion = config.apiVersion ?? DATAVERSE_DEFAULT_API_VERSION;
    this.apiBaseUrl = buildDataverseApiBaseUrl(this.instanceUrl, this.apiVersion);
    this.http =
      config.http ??
      createDataverseHttpClient({
        token: config.token,
        instanceUrl: this.instanceUrl,
        apiVersion: this.apiVersion
      });
  }

  private data<T>(operation: string, request: () => Promise<DataverseHttpResponse<T>>) {
    return requestAxiosData<T>(operation, request as any, dataverseApiError);
  }

  private response<T>(operation: string, request: () => Promise<DataverseHttpResponse<T>>) {
    return requestAxios<T>(operation, request as any, dataverseApiError);
  }

  async createRecord<T extends DataverseRecord = DataverseRecord>(
    entitySetName: string,
    data: DataverseRecord,
    options: { detectDuplicates?: boolean; returnRepresentation?: boolean } = {}
  ) {
    let prefer = options.returnRepresentation === false ? [] : ['return=representation'];
    let headers: Record<string, string> = {
      ...(preferHeaders(prefer) ?? {})
    };

    if (options.detectDuplicates === true) {
      headers['MSCRM.SuppressDuplicateDetection'] = 'false';
    }

    return this.data<T>('create record', () =>
      this.http.post(buildDataverseEntitySetPath(entitySetName), data, { headers })
    );
  }

  async getRecord<T extends DataverseRecord = DataverseRecord>(
    entitySetName: string,
    recordKey: DataverseRecordKey,
    options: Pick<DataverseODataQueryOptions, 'select' | 'expand'> = {}
  ) {
    return this.data<T>('get record', () =>
      this.http.get(buildDataverseRecordUrl(entitySetName, recordKey, options))
    );
  }

  async updateRecord<T extends DataverseRecord = DataverseRecord>(
    entitySetName: string,
    recordKey: DataverseRecordKey,
    data: DataverseRecord,
    options: { returnRepresentation?: boolean; preventCreate?: boolean } = {}
  ) {
    let headers: Record<string, string> = {
      ...(preferHeaders(
        options.returnRepresentation === false ? [] : ['return=representation']
      ) ?? {})
    };
    if (options.preventCreate === true) {
      headers['If-Match'] = '*';
    }

    return this.data<T>('update record', () =>
      this.http.patch(buildDataverseRecordPath(entitySetName, recordKey), data, { headers })
    );
  }

  async deleteRecord(entitySetName: string, recordKey: DataverseRecordKey) {
    await this.response('delete record', () =>
      this.http.delete(buildDataverseRecordPath(entitySetName, recordKey))
    );
  }

  async listRecords<T extends DataverseRecord = DataverseRecord>(
    entitySetName: string,
    options: DataverseODataQueryOptions & {
      pageSize?: number;
      nextLink?: string;
    } = {}
  ): Promise<DataverseListResponse<T>> {
    let url = options.nextLink ?? buildDataverseCollectionUrl(entitySetName, options);
    let data = await this.data<{
      value?: T[];
      '@odata.nextLink'?: string;
      '@odata.count'?: number;
    }>('list records', () =>
      this.http.get(url, {
        headers: buildDataverseListHeaders(options.pageSize)
      })
    );

    return {
      records: data.value ?? [],
      nextLink: data['@odata.nextLink'] ?? null,
      count: data['@odata.count']
    };
  }

  async listAllRecords<T extends DataverseRecord = DataverseRecord>(
    entitySetName: string,
    options: DataverseODataQueryOptions & {
      pageSize?: number;
      nextLink?: string;
      maxPages?: number;
      maxRecords?: number;
    } = {}
  ): Promise<DataverseListAllResponse<T>> {
    let pagination = normalizeDataversePagination(options);
    let records: T[] = [];
    let nextLink = options.nextLink;
    let pagesRead = 0;

    while (pagesRead < pagination.maxPages) {
      let page = await this.listRecords<T>(entitySetName, {
        ...options,
        nextLink,
        pageSize: pagination.pageSize
      });
      pagesRead += 1;

      for (let record of page.records) {
        if (pagination.maxRecords !== undefined && records.length >= pagination.maxRecords) {
          return {
            records,
            nextLink: page.nextLink,
            count: page.count,
            pagesRead,
            complete: false
          };
        }
        records.push(record);
      }

      nextLink = page.nextLink ?? undefined;
      if (!nextLink) {
        return {
          records,
          nextLink: null,
          count: page.count,
          pagesRead,
          complete: true
        };
      }
    }

    return {
      records,
      nextLink: nextLink ?? null,
      pagesRead,
      complete: false
    };
  }

  async fetchXml<T extends DataverseRecord = DataverseRecord>(
    entitySetName: string,
    fetchXml: string,
    options: { pageSize?: number } = {}
  ): Promise<DataverseListResponse<T>> {
    let data = await this.data<{
      value?: T[];
      '@odata.nextLink'?: string;
    }>('fetch xml', () =>
      this.http.get(buildDataverseCollectionUrl(entitySetName, { fetchXml }), {
        headers: buildDataverseListHeaders(options.pageSize)
      })
    );

    return {
      records: data.value ?? [],
      nextLink: data['@odata.nextLink'] ?? null
    };
  }

  async searchRecords(options: z.infer<typeof dataverseSearchInputSchema>) {
    let body: DataverseRecord = {
      search: requiredText(options.search, 'Search term'),
      count: true
    };

    if (options.entities && options.entities.length > 0) {
      body.entities = JSON.stringify(options.entities);
    }
    if (options.filter) body.filter = options.filter;
    if (options.top !== undefined)
      body.top = normalizeDataversePositiveInteger(options.top, 'top');
    if (options.skip !== undefined)
      body.skip = normalizeDataverseNonNegativeInteger(options.skip, 'skip');
    if (options.facets) body.facets = options.facets;

    let data = await this.data<unknown>('search records', () =>
      this.http.post(`${this.instanceUrl}/api/search/v2.0/query`, body)
    );

    return parseDataverseSearchResponse(data);
  }

  async getEntityDefinitions(
    options: Pick<DataverseODataQueryOptions, 'select' | 'filter'> = {}
  ) {
    let data = await this.data<{ value?: unknown[] }>('get entity definitions', () =>
      this.http.get(`EntityDefinitions${buildDataverseODataQuery(options)}`)
    );
    return (data.value ?? []).map(parseDataverseEntityMetadata);
  }

  async getEntityDefinition(
    logicalName: string,
    options: Pick<DataverseODataQueryOptions, 'select' | 'expand'> = {}
  ) {
    let key = `LogicalName='${encodeURIComponent(
      formatDataverseODataString(requiredText(logicalName, 'Entity logical name'))
    )}'`;
    let data = await this.data<unknown>('get entity definition', () =>
      this.http.get(`EntityDefinitions(${key})${buildDataverseODataQuery(options)}`)
    );
    return parseDataverseEntityMetadata(data);
  }

  async getEntityAttributes(logicalName: string) {
    let key = `LogicalName='${encodeURIComponent(
      formatDataverseODataString(requiredText(logicalName, 'Entity logical name'))
    )}'`;
    let data = await this.data<{ value?: unknown[] }>('get entity attributes', () =>
      this.http.get(
        `EntityDefinitions(${key})/Attributes${buildDataverseODataQuery({
          select: [
            'LogicalName',
            'SchemaName',
            'DisplayName',
            'Description',
            'AttributeType',
            'RequiredLevel',
            'IsValidForCreate',
            'IsValidForUpdate',
            'IsValidForRead',
            'Targets',
            'AttributeOf',
            'MetadataId'
          ]
        })}`
      )
    );
    return (data.value ?? []).map(parseDataverseAttributeMetadata);
  }

  async associateRecord(params: {
    sourceEntitySetName: string;
    sourceRecordKey: DataverseRecordKey;
    navigationProperty: string;
    targetEntitySetName: string;
    targetRecordKey: DataverseRecordKey;
    relationshipType: DataverseRelationshipType;
  }) {
    let request = buildDataverseAssociateRequest({
      ...params,
      apiBaseUrl: this.apiBaseUrl
    });

    if (request.method === 'PUT') {
      await this.response('associate record', () => this.http.put(request.url, request.body));
      return;
    }

    await this.response('associate record', () => this.http.post(request.url, request.body));
  }

  async disassociateRecord(params: {
    sourceEntitySetName: string;
    sourceRecordKey: DataverseRecordKey;
    navigationProperty: string;
    relationshipType: DataverseRelationshipType;
    targetRecordKey?: DataverseRecordKey;
  }) {
    let request = buildDataverseDisassociateRequest(params);

    await this.response('disassociate record', () => this.http.delete(request.url));
  }

  async getRelatedRecords<T extends DataverseRecord = DataverseRecord>(params: {
    entitySetName: string;
    recordKey: DataverseRecordKey;
    navigationProperty: string;
    query?: Pick<DataverseODataQueryOptions, 'select' | 'filter' | 'top' | 'expand'>;
  }) {
    let data = await this.data<{ value?: T[]; '@odata.nextLink'?: string }>(
      'get related records',
      () => this.http.get(buildDataverseGetRelatedUrl(params))
    );

    return {
      records: data.value ?? [],
      nextLink: data['@odata.nextLink'] ?? null
    };
  }

  async invokeOperation(params: Parameters<typeof buildDataverseOperationRequest>[0]) {
    let request = buildDataverseOperationRequest(params);

    if (request.method === 'GET') {
      return this.data<unknown>('invoke function', () => this.http.get(request.url));
    }

    return this.data<unknown>('invoke action', () =>
      this.http.post(request.url, request.body)
    );
  }

  async downloadFileColumn(params: z.infer<typeof fileColumnDownloadInputSchema>) {
    let response = await this.response<ArrayBuffer>('download file column', () =>
      this.http.get(
        buildDataverseFileColumnValueUrl({
          entitySetName: params.entitySetName,
          recordKey: params.recordId,
          columnName: params.columnName
        }),
        { responseType: 'arraybuffer' }
      )
    );

    return buildDataverseFileAttachmentData({
      content: response.data,
      headers: response.headers,
      fileName: params.fileName,
      mimeType: params.mimeType
    });
  }

  async uploadFileColumn(params: z.infer<typeof fileColumnUploadInputSchema>) {
    let chunkSize = params.chunkSizeBytes ?? 4 * 1024 * 1024;
    normalizeDataversePositiveInteger(chunkSize, 'chunkSizeBytes');

    let initialize = await this.data<{ FileContinuationToken?: string }>(
      'initialize file upload',
      () =>
        this.http.post(
          'InitializeFileBlocksUpload',
          buildInitializeFileBlocksUploadBody(params)
        )
    );
    let continuationToken = requiredText(
      initialize.FileContinuationToken,
      'File upload continuation token'
    );
    let content = Buffer.from(params.contentBase64, 'base64');
    let blockIds: string[] = [];

    for (let offset = 0; offset < content.length; offset += chunkSize) {
      let block = content.subarray(offset, Math.min(offset + chunkSize, content.length));
      let blockId = Buffer.from(String(blockIds.length).padStart(6, '0')).toString('base64');
      blockIds.push(blockId);
      await this.response('upload file block', () =>
        this.http.post(
          'UploadBlock',
          buildUploadBlockBody({
            continuationToken,
            blockId,
            contentBase64: block.toString('base64')
          })
        )
      );
    }

    let result = await this.data<DataverseRecord>('commit file upload', () =>
      this.http.post(
        'CommitFileBlocksUpload',
        buildCommitFileBlocksUploadBody({
          continuationToken,
          fileName: params.fileName,
          mimeType: params.mimeType,
          blockList: blockIds
        })
      )
    );

    return {
      result,
      metadata: {
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: getBase64ByteLength(params.contentBase64),
        blockCount: blockIds.length
      }
    };
  }

  async executeBatch(operations: DataverseBatchOperation[]) {
    let request = buildDataverseBatchRequest(operations);
    return this.data<unknown>('execute batch', () =>
      this.http.post(request.url, request.body, { headers: request.headers })
    );
  }
}

export let createDataverseClientFromContext = (
  ctx: DataverseRecipeContext,
  options: { instanceUrl?: string; apiVersion?: string; http?: DataverseHttpClient } = {}
) => {
  let token = requiredText(ctx.auth?.token, 'Dataverse access token');
  return new DataverseClient({
    token,
    instanceUrl: resolveDataverseInstanceUrl(ctx, options),
    apiVersion: options.apiVersion ?? ctx.config?.apiVersion,
    http: options.http
  });
};

export let dataverseRecordKeyFromInput = (input: {
  recordId?: string;
  alternateKey?: Record<string, DataversePrimitiveKeyValue>;
}) => keyFromInput(input.recordId, input.alternateKey);
