import { randomUUID } from 'node:crypto';
import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

export let FINOPS_ODATA_MAX_PAGE_SIZE = 10_000;
export let FINOPS_DEFAULT_PAGE_SIZE = 100;
export let FINOPS_DEFAULT_MAX_PAGES = 10;
export let FINOPS_MAX_PAGE_COUNT = 100;

export type FinOpsHttpRequestConfig = {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
};

export type FinOpsHttpResponse<T = unknown> = {
  data: T;
};

export type FinOpsHttpClient = {
  get: <T = unknown>(
    url: string,
    config?: FinOpsHttpRequestConfig
  ) => Promise<FinOpsHttpResponse<T>>;
  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: FinOpsHttpRequestConfig
  ) => Promise<FinOpsHttpResponse<T>>;
  patch: <T = unknown>(
    url: string,
    data?: unknown,
    config?: FinOpsHttpRequestConfig
  ) => Promise<FinOpsHttpResponse<T>>;
  delete: <T = unknown>(
    url: string,
    config?: FinOpsHttpRequestConfig
  ) => Promise<FinOpsHttpResponse<T>>;
};

export type DynamicsFinOpsAuth = {
  token: string;
};

export type DynamicsFinOpsConfig = {
  baseUrl?: string;
  environmentUrl?: string;
  instanceUrl?: string;
  resourceUrl?: string;
  defaultLegalEntity?: string;
};

export type CreateDynamicsFinOpsClientContext = {
  auth: DynamicsFinOpsAuth;
  config: DynamicsFinOpsConfig;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let assertNonEmptyString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw dynamicsFinOpsServiceError(`${field} is required.`);
  }

  return value.trim();
};

let assertBoundedInteger = (value: unknown, field: string, min: number, max: number) => {
  if (!Number.isInteger(value) || typeof value !== 'number' || value < min || value > max) {
    throw dynamicsFinOpsServiceError(`${field} must be an integer between ${min} and ${max}.`);
  }

  return value;
};

export let dynamicsFinOpsServiceError = (
  message: string,
  reason = 'dynamics_finops_validation'
) =>
  createApiServiceError(message, {
    reason
  });

export let dynamicsFinOpsApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Dynamics 365 Finance and Operations',
    reason: 'dynamics_finops_api_error',
    operation,
    detailKeys: [
      'message',
      'Message',
      'detail',
      'Detail',
      'error',
      'error_description',
      'ExceptionMessage',
      'value',
      'code'
    ],
    nestedKeys: ['error', 'innererror', 'details', 'Errors', 'errors'],
    extractUpstreamCode: (_error, response, helpers) => {
      let data = response?.data;
      if (!helpers.isRecord(data)) return undefined;

      let nestedError = data.error;
      if (helpers.isRecord(nestedError) && typeof nestedError.code === 'string') {
        return nestedError.code;
      }

      if (typeof data.code === 'string') {
        return data.code;
      }

      return undefined;
    }
  });

export let normalizeFinOpsBaseUrl = (baseUrl: string) => {
  let trimmed = assertNonEmptyString(baseUrl, 'Finance and Operations base URL');

  try {
    let url = new URL(trimmed);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw dynamicsFinOpsServiceError(
        'Finance and Operations base URL must use http or https.'
      );
    }

    let pathname = url.pathname.replace(/\/+$/, '');
    if (pathname.toLowerCase().endsWith('/data')) {
      pathname = pathname.slice(0, -'/data'.length);
    }

    url.pathname = pathname || '/';
    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/$/, '');
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }

    throw dynamicsFinOpsServiceError(
      'Finance and Operations base URL must be an absolute URL.'
    );
  }
};

export let resolveFinOpsBaseUrl = (config: DynamicsFinOpsConfig) => {
  let baseUrl =
    config.baseUrl ?? config.environmentUrl ?? config.instanceUrl ?? config.resourceUrl;

  if (!baseUrl) {
    throw dynamicsFinOpsServiceError(
      'Missing Finance and Operations base URL. Set config.baseUrl, environmentUrl, instanceUrl, or resourceUrl.'
    );
  }

  return normalizeFinOpsBaseUrl(baseUrl);
};

export let buildFinOpsDataUrl = (baseUrl: string) => `${normalizeFinOpsBaseUrl(baseUrl)}/data`;

export let createFinOpsAuthHeaders = (auth: DynamicsFinOpsAuth) => ({
  Authorization: `Bearer ${assertNonEmptyString(auth.token, 'Finance and Operations access token')}`
});

export let createDynamicsFinOpsHttpClient = ({
  baseUrl,
  token
}: {
  baseUrl: string;
  token: string;
}): FinOpsHttpClient =>
  createAuthenticatedAxios({
    baseURL: `${normalizeFinOpsBaseUrl(baseUrl)}/`,
    authHeader: {
      value: `Bearer ${assertNonEmptyString(token, 'Finance and Operations access token')}`
    }
  }) as unknown as FinOpsHttpClient;

export let normalizeFinOpsLegalEntity = (legalEntity: string) =>
  assertNonEmptyString(legalEntity, 'legalEntity').toUpperCase();

export type FinOpsLegalEntityOptions = {
  legalEntity?: string;
  dataAreaId?: string;
  defaultLegalEntity?: string;
  crossCompany?: boolean;
};

export let resolveFinOpsLegalEntity = ({
  legalEntity,
  dataAreaId,
  defaultLegalEntity,
  crossCompany
}: FinOpsLegalEntityOptions) => {
  let explicitValue = legalEntity ?? dataAreaId;

  if (explicitValue) {
    return normalizeFinOpsLegalEntity(explicitValue);
  }

  if (crossCompany) {
    return undefined;
  }

  return defaultLegalEntity ? normalizeFinOpsLegalEntity(defaultLegalEntity) : undefined;
};

let encodeODataString = (value: string) => encodeURIComponent(value).replace(/'/g, "''");

export let formatODataStringLiteral = (value: string) => `'${encodeODataString(value)}'`;

let hasControlCharacter = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    let code = value.charCodeAt(index);
    if (code < 32 || code === 127) {
      return true;
    }
  }

  return false;
};

let validateODataIdentifier = (value: string, field: string) => {
  let trimmed = assertNonEmptyString(value, field);

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    throw dynamicsFinOpsServiceError(`${field} must be a valid OData identifier.`);
  }

  return trimmed;
};

let validateODataPath = (value: string, field: string) =>
  assertNonEmptyString(value, field)
    .split('/')
    .map((part, index) => validateODataIdentifier(part, `${field}[${index}]`))
    .join('/');

let assertSafeODataExpression = (value: string, field: string) => {
  let trimmed = assertNonEmptyString(value, field);

  if (hasControlCharacter(trimmed)) {
    throw dynamicsFinOpsServiceError(`${field} cannot contain control characters.`);
  }

  return trimmed;
};

export type FinOpsODataOrderBy =
  | string
  | {
      field: string;
      direction?: 'asc' | 'desc';
    };

export type FinOpsODataQuery = {
  select?: string[];
  filter?: string;
  orderBy?: FinOpsODataOrderBy[];
  expand?: string[];
  top?: number;
  skip?: number;
  count?: boolean;
  crossCompany?: boolean;
  legalEntity?: string;
  dataAreaId?: string;
};

export type BuildFinOpsODataParamsOptions = {
  defaultLegalEntity?: string;
  dataAreaIdField?: string | false;
  maxPageSize?: number;
};

let formatOrderBy = (orderBy: FinOpsODataOrderBy, index: number) => {
  if (typeof orderBy === 'string') {
    let trimmed = assertNonEmptyString(orderBy, `orderBy[${index}]`);
    let [fieldName, direction, extra] = trimmed.split(/\s+/);

    if (extra || (direction && !['asc', 'desc'].includes(direction.toLowerCase()))) {
      throw dynamicsFinOpsServiceError(
        `orderBy[${index}] must be a safe field path with an optional asc or desc direction.`
      );
    }

    return `${validateODataPath(fieldName, `orderBy[${index}].field`)}${direction ? ` ${direction.toLowerCase()}` : ''}`;
  }

  let field = validateODataPath(orderBy.field, `orderBy[${index}].field`);
  return `${field}${orderBy.direction ? ` ${orderBy.direction}` : ''}`;
};

export let applyFinOpsLegalEntityFilter = (
  filter: string | undefined,
  legalEntity: string | undefined,
  dataAreaIdField = 'dataAreaId'
) => {
  if (!legalEntity) {
    return filter;
  }

  let field = validateODataIdentifier(dataAreaIdField, 'dataAreaIdField');
  let legalEntityFilter = `${field} eq ${formatODataStringLiteral(legalEntity)}`;

  return filter ? `(${filter}) and ${legalEntityFilter}` : legalEntityFilter;
};

export let buildFinOpsODataParams = (
  query: FinOpsODataQuery = {},
  options: BuildFinOpsODataParamsOptions = {}
) => {
  let params: Record<string, unknown> = {};
  let maxPageSize = options.maxPageSize ?? FINOPS_ODATA_MAX_PAGE_SIZE;

  assertBoundedInteger(maxPageSize, 'maxPageSize', 1, FINOPS_ODATA_MAX_PAGE_SIZE);

  if (query.select?.length) {
    params.$select = query.select
      .map((field, index) => validateODataPath(field, `select[${index}]`))
      .join(',');
  }

  if (query.expand?.length) {
    params.$expand = query.expand
      .map((field, index) => validateODataIdentifier(field, `expand[${index}]`))
      .join(',');
  }

  if (query.orderBy?.length) {
    params.$orderby = query.orderBy.map(formatOrderBy).join(',');
  }

  if (query.top !== undefined) {
    params.$top = assertBoundedInteger(query.top, 'top', 0, maxPageSize);
  }

  if (query.skip !== undefined) {
    params.$skip = assertBoundedInteger(query.skip, 'skip', 0, Number.MAX_SAFE_INTEGER);
  }

  if (query.count !== undefined) {
    params.$count = query.count ? 'true' : 'false';
  }

  if (query.crossCompany) {
    params['cross-company'] = 'true';
  }

  let filter = query.filter ? assertSafeODataExpression(query.filter, 'filter') : undefined;
  let legalEntity = resolveFinOpsLegalEntity({
    legalEntity: query.legalEntity,
    dataAreaId: query.dataAreaId,
    defaultLegalEntity: options.defaultLegalEntity,
    crossCompany: query.crossCompany
  });

  if (options.dataAreaIdField !== false) {
    filter = applyFinOpsLegalEntityFilter(
      filter,
      legalEntity,
      options.dataAreaIdField ?? 'dataAreaId'
    );
  }

  if (filter) {
    params.$filter = filter;
  }

  return params;
};

let decodeXmlEntity = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

let parseXmlAttributes = (source: string) => {
  let attributes: Record<string, string> = {};
  let attributePattern = /([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(source))) {
    attributes[match[1]] = decodeXmlEntity(match[3] ?? match[4] ?? '');
  }

  return attributes;
};

export type FinOpsMetadataProperty = {
  name: string;
  type: string;
  nullable?: boolean;
  maxLength?: number;
  isKey: boolean;
};

export type FinOpsMetadataNavigationProperty = {
  name: string;
  type: string;
  partner?: string;
};

export type FinOpsMetadataEntityType = {
  namespace: string;
  name: string;
  fullName: string;
  keys: string[];
  properties: Record<string, FinOpsMetadataProperty>;
  navigationProperties: Record<string, FinOpsMetadataNavigationProperty>;
};

export type FinOpsMetadataEntitySet = {
  name: string;
  entityTypeName: string;
  entityType?: FinOpsMetadataEntityType;
};

export type FinOpsMetadataModel = {
  entityTypes: Record<string, FinOpsMetadataEntityType>;
  entitySets: Record<string, FinOpsMetadataEntitySet>;
};

export let parseFinOpsMetadata = (metadataXml: string): FinOpsMetadataModel => {
  let xml = assertNonEmptyString(metadataXml, '$metadata XML');
  let entityTypes: Record<string, FinOpsMetadataEntityType> = {};
  let entitySets: Record<string, FinOpsMetadataEntitySet> = {};
  let schemaPattern = /<Schema\b([^>]*)>([\s\S]*?)<\/Schema>/g;
  let schemaMatch: RegExpExecArray | null;

  while ((schemaMatch = schemaPattern.exec(xml))) {
    let schemaAttributes = parseXmlAttributes(schemaMatch[1]);
    let namespace = schemaAttributes.Namespace ?? '';
    let schemaBody = schemaMatch[2];
    let entityTypePattern = /<EntityType\b([^>]*)>([\s\S]*?)<\/EntityType>/g;
    let entityTypeMatch: RegExpExecArray | null;

    while ((entityTypeMatch = entityTypePattern.exec(schemaBody))) {
      let entityAttributes = parseXmlAttributes(entityTypeMatch[1]);
      let name = entityAttributes.Name;
      if (!name) continue;

      let body = entityTypeMatch[2];
      let keys: string[] = [];
      let keyBlock = /<Key\b[^>]*>([\s\S]*?)<\/Key>/.exec(body)?.[1] ?? '';
      let keyPattern = /<PropertyRef\b([^/>]*)\/?>/g;
      let keyMatch: RegExpExecArray | null;

      while ((keyMatch = keyPattern.exec(keyBlock))) {
        let keyName = parseXmlAttributes(keyMatch[1]).Name;
        if (keyName) {
          keys.push(keyName);
        }
      }

      let properties: Record<string, FinOpsMetadataProperty> = {};
      let propertyPattern = /<Property\b([^/>]*)\/?>/g;
      let propertyMatch: RegExpExecArray | null;

      while ((propertyMatch = propertyPattern.exec(body))) {
        let attributes = parseXmlAttributes(propertyMatch[1]);
        let propertyName = attributes.Name;
        if (!propertyName) continue;

        properties[propertyName] = {
          name: propertyName,
          type: attributes.Type ?? 'Edm.String',
          nullable:
            attributes.Nullable === undefined ? undefined : attributes.Nullable !== 'false',
          maxLength: attributes.MaxLength ? Number(attributes.MaxLength) : undefined,
          isKey: keys.includes(propertyName)
        };
      }

      let navigationProperties: Record<string, FinOpsMetadataNavigationProperty> = {};
      let navigationPattern = /<NavigationProperty\b([^/>]*)\/?>/g;
      let navigationMatch: RegExpExecArray | null;

      while ((navigationMatch = navigationPattern.exec(body))) {
        let attributes = parseXmlAttributes(navigationMatch[1]);
        let propertyName = attributes.Name;
        if (!propertyName) continue;

        navigationProperties[propertyName] = {
          name: propertyName,
          type: attributes.Type ?? '',
          partner: attributes.Partner
        };
      }

      let fullName = namespace ? `${namespace}.${name}` : name;
      let entityType: FinOpsMetadataEntityType = {
        namespace,
        name,
        fullName,
        keys,
        properties,
        navigationProperties
      };

      entityTypes[fullName] = entityType;
      entityTypes[name] = entityType;
    }

    let entitySetPattern = /<EntitySet\b([^>]*)\/?>/g;
    let entitySetMatch: RegExpExecArray | null;

    while ((entitySetMatch = entitySetPattern.exec(schemaBody))) {
      let attributes = parseXmlAttributes(entitySetMatch[1]);
      let name = attributes.Name;
      let entityTypeName = attributes.EntityType;

      if (!name || !entityTypeName) continue;

      entitySets[name] = {
        name,
        entityTypeName,
        entityType:
          entityTypes[entityTypeName] ?? entityTypes[entityTypeName.split('.').pop() ?? '']
      };
    }
  }

  for (let entitySet of Object.values(entitySets)) {
    entitySet.entityType =
      entitySet.entityType ??
      entityTypes[entitySet.entityTypeName] ??
      entityTypes[entitySet.entityTypeName.split('.').pop() ?? ''];
  }

  return {
    entityTypes,
    entitySets
  };
};

export let resolveFinOpsEntitySet = (metadata: FinOpsMetadataModel, entitySetName: string) => {
  let name = validateODataIdentifier(entitySetName, 'entitySetName');
  let entitySet = metadata.entitySets[name];

  if (!entitySet) {
    throw dynamicsFinOpsServiceError(`Unknown Finance and Operations entity set "${name}".`);
  }

  if (!entitySet.entityType) {
    throw dynamicsFinOpsServiceError(
      `Entity set "${name}" does not have resolvable $metadata entity type information.`
    );
  }

  return entitySet;
};

let getKeyValue = (keyValues: Record<string, unknown>, key: string) => {
  if (Object.hasOwn(keyValues, key)) {
    return keyValues[key];
  }

  let matchingKey = Object.keys(keyValues).find(
    candidate => candidate.toLowerCase() === key.toLowerCase()
  );

  return matchingKey ? keyValues[matchingKey] : undefined;
};

let formatODataKeyValue = (value: unknown, property: FinOpsMetadataProperty) => {
  if (value === undefined || value === null) {
    throw dynamicsFinOpsServiceError(`Missing key value for ${property.name}.`);
  }

  let type = property.type.replace(/^Collection\((.*)\)$/, '$1');
  if (property.name.toLowerCase() === 'dataareaid' && typeof value === 'string') {
    return formatODataStringLiteral(normalizeFinOpsLegalEntity(value));
  }

  if (type === 'Edm.Boolean') {
    if (typeof value !== 'boolean') {
      throw dynamicsFinOpsServiceError(`${property.name} key must be a boolean.`);
    }

    return value ? 'true' : 'false';
  }

  if (
    [
      'Edm.Byte',
      'Edm.Decimal',
      'Edm.Double',
      'Edm.Int16',
      'Edm.Int32',
      'Edm.Int64',
      'Edm.SByte',
      'Edm.Single'
    ].includes(type)
  ) {
    if (typeof value !== 'number' && typeof value !== 'bigint') {
      throw dynamicsFinOpsServiceError(`${property.name} key must be numeric.`);
    }

    return String(value);
  }

  if (type === 'Edm.Guid' || type === 'Edm.Date' || type === 'Edm.DateTimeOffset') {
    return encodeURIComponent(assertNonEmptyString(value, `${property.name} key`));
  }

  return formatODataStringLiteral(assertNonEmptyString(value, `${property.name} key`));
};

export let buildFinOpsEntityKeyPredicate = (
  entitySet: FinOpsMetadataEntitySet,
  keyValues: Record<string, unknown>
) => {
  let entityType = entitySet.entityType;

  if (!entityType || entityType.keys.length === 0) {
    throw dynamicsFinOpsServiceError(
      `Entity set "${entitySet.name}" does not expose key metadata.`
    );
  }

  let keyParts = entityType.keys.map(key => {
    let property = entityType.properties[key];

    if (!property) {
      throw dynamicsFinOpsServiceError(
        `Entity set "${entitySet.name}" key "${key}" is missing property metadata.`
      );
    }

    return `${key}=${formatODataKeyValue(getKeyValue(keyValues, key), property)}`;
  });

  return keyParts.join(',');
};

export let buildFinOpsEntityPath = (
  metadata: FinOpsMetadataModel,
  entitySetName: string,
  keyValues: Record<string, unknown>
) => {
  let entitySet = resolveFinOpsEntitySet(metadata, entitySetName);
  return `${entitySet.name}(${buildFinOpsEntityKeyPredicate(entitySet, keyValues)})`;
};

export let buildFinOpsDataPath = (path: string) => {
  let cleanPath = assertNonEmptyString(path, 'path').replace(/^\/+/, '');
  return cleanPath.startsWith('data/') ? cleanPath : `data/${cleanPath}`;
};

export let buildFinOpsDataEntityPath = (entitySetName: string) =>
  buildFinOpsDataPath(validateODataIdentifier(entitySetName, 'entitySetName'));

export type FinOpsODataPage<T = Record<string, unknown>> = {
  items: T[];
  nextLink?: string;
  raw: unknown;
};

export type FinOpsODataAllPagesResult<T = Record<string, unknown>> = {
  items: T[];
  nextLink?: string;
  pagesFetched: number;
  truncated: boolean;
};

let normalizeODataPage = <T>(response: unknown): FinOpsODataPage<T> => {
  if (!isRecord(response) || !Array.isArray(response.value)) {
    throw dynamicsFinOpsServiceError(
      'Finance and Operations OData list response did not contain a value array.',
      'dynamics_finops_response'
    );
  }

  let nextLink = response['@odata.nextLink'];

  return {
    items: response.value as T[],
    nextLink: typeof nextLink === 'string' ? nextLink : undefined,
    raw: response
  };
};

export type DataManagementExportToPackageInput = {
  definitionGroupId: string;
  packageName: string;
  executionId?: string;
  reExecute?: boolean;
  legalEntityId?: string;
};

export type DataManagementImportFromPackageInput = {
  packageUrl: string;
  definitionGroupId: string;
  executionId?: string;
  execute?: boolean;
  overwrite?: boolean;
  legalEntityId?: string;
};

export type DataManagementExecutionInput = {
  executionId: string;
};

export let DATA_MANAGEMENT_ACTION_PATHS = {
  exportToPackage:
    'DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.ExportToPackage',
  importFromPackage:
    'DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.ImportFromPackage',
  getExecutionSummaryStatus:
    'DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetExecutionSummaryStatus',
  getExecutionSummaryPageUrl:
    'DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetExecutionSummaryPageUrl',
  getImportStagingErrorFileUrl:
    'DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetImportStagingErrorFileUrl',
  getExportedPackageUrl:
    'DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetExportedPackageUrl',
  getMessageStatus:
    'DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetMessageStatus'
} as const;

export let createFinOpsExecutionId = (prefix = 'slates') => `${prefix}-${randomUUID()}`;

let normalizeOptionalLegalEntityId = (legalEntityId?: string) =>
  legalEntityId ? normalizeFinOpsLegalEntity(legalEntityId) : undefined;

export let buildDataManagementExportToPackageRequest = (
  input: DataManagementExportToPackageInput
) => ({
  path: buildFinOpsDataPath(DATA_MANAGEMENT_ACTION_PATHS.exportToPackage),
  body: pickDefined({
    definitionGroupId: assertNonEmptyString(input.definitionGroupId, 'definitionGroupId'),
    packageName: assertNonEmptyString(input.packageName, 'packageName'),
    executionId: input.executionId ?? createFinOpsExecutionId('export'),
    reExecute: input.reExecute ?? false,
    legalEntityId: normalizeOptionalLegalEntityId(input.legalEntityId)
  })
});

export let buildDataManagementImportFromPackageRequest = (
  input: DataManagementImportFromPackageInput
) => ({
  path: buildFinOpsDataPath(DATA_MANAGEMENT_ACTION_PATHS.importFromPackage),
  body: pickDefined({
    packageUrl: assertNonEmptyString(input.packageUrl, 'packageUrl'),
    definitionGroupId: assertNonEmptyString(input.definitionGroupId, 'definitionGroupId'),
    executionId: input.executionId ?? createFinOpsExecutionId('import'),
    execute: input.execute ?? true,
    overwrite: input.overwrite ?? false,
    legalEntityId: normalizeOptionalLegalEntityId(input.legalEntityId)
  })
});

export let buildDataManagementExecutionRequest = (
  actionPath: string,
  input: DataManagementExecutionInput
) => ({
  path: buildFinOpsDataPath(actionPath),
  body: {
    executionId: assertNonEmptyString(input.executionId, 'executionId')
  }
});

export let normalizeDataManagementResponseValue = (response: unknown) => {
  if (!isRecord(response) || !('value' in response)) {
    return response;
  }

  let value = response.value;

  if (isRecord(value) && Object.keys(value).length === 1 && 'value' in value) {
    return value.value;
  }

  return value;
};

export type NormalizedDataManagementStatus =
  | 'notRun'
  | 'executing'
  | 'succeeded'
  | 'partiallySucceeded'
  | 'failed'
  | 'canceled'
  | 'unknown';

let DATA_MANAGEMENT_STATUS_MAP: Record<string, NormalizedDataManagementStatus> = {
  notrun: 'notRun',
  not_run: 'notRun',
  executing: 'executing',
  running: 'executing',
  inprocess: 'executing',
  in_process: 'executing',
  succeeded: 'succeeded',
  success: 'succeeded',
  completed: 'succeeded',
  partiallysucceeded: 'partiallySucceeded',
  partially_succeeded: 'partiallySucceeded',
  partiallysucceed: 'partiallySucceeded',
  failed: 'failed',
  error: 'failed',
  canceled: 'canceled',
  cancelled: 'canceled'
};

export let normalizeDataManagementStatus = (statusValue: unknown) => {
  let rawStatus = normalizeDataManagementResponseValue(statusValue);
  let statusText = typeof rawStatus === 'string' ? rawStatus : String(rawStatus ?? '');
  let normalizedKey = statusText.replace(/[\s-]/g, '').toLowerCase();
  let status = DATA_MANAGEMENT_STATUS_MAP[normalizedKey] ?? 'unknown';

  return {
    rawStatus,
    status,
    isTerminal: ['succeeded', 'partiallySucceeded', 'failed', 'canceled', 'unknown'].includes(
      status
    ),
    isSuccess: status === 'succeeded' || status === 'partiallySucceeded'
  };
};

export type RecurringIntegrationActivityInput = {
  activityId: string;
};

export type RecurringIntegrationEnqueueInput = RecurringIntegrationActivityInput & {
  entityName: string;
  body?: unknown;
  contentType?: string;
};

export type RecurringIntegrationAckInput = RecurringIntegrationActivityInput & {
  messageId: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
};

export type RecurringIntegrationMessageStatusInput = {
  messageId: string;
};

let encodePathPart = (value: string, field: string) =>
  encodeURIComponent(assertNonEmptyString(value, field));

export let buildRecurringIntegrationEnqueueRequest = (
  input: RecurringIntegrationEnqueueInput
) => {
  let activityId = encodePathPart(input.activityId, 'activityId');
  let entityName = encodeURIComponent(assertNonEmptyString(input.entityName, 'entityName'));

  return {
    path: `api/connector/enqueue/${activityId}?entity=${entityName}`,
    body: input.body,
    headers: {
      'Content-Type': input.contentType ?? 'application/octet-stream'
    }
  };
};

export let buildRecurringIntegrationDequeueRequest = (
  input: RecurringIntegrationActivityInput
) => ({
  path: `api/connector/dequeue/${encodePathPart(input.activityId, 'activityId')}`
});

export let buildRecurringIntegrationAckRequest = (input: RecurringIntegrationAckInput) => ({
  path: `api/connector/ack/${encodePathPart(input.activityId, 'activityId')}`,
  body: pickDefined({
    messageId: assertNonEmptyString(input.messageId, 'messageId'),
    status: input.status ?? 'success',
    errorMessage: input.errorMessage
  })
});

export let buildRecurringIntegrationMessageStatusRequest = (
  input: RecurringIntegrationMessageStatusInput
) => ({
  path: buildFinOpsDataPath(DATA_MANAGEMENT_ACTION_PATHS.getMessageStatus),
  body: {
    messageId: assertNonEmptyString(input.messageId, 'messageId')
  }
});

export let odataQueryInputSchema = z.object({
  select: z.array(z.string()).optional().describe('OData fields for $select'),
  filter: z.string().optional().describe('OData $filter expression'),
  orderBy: z.array(z.string()).optional().describe('OData $orderby field directions'),
  expand: z
    .array(z.string())
    .optional()
    .describe('First-level navigation properties to expand'),
  top: z.number().int().min(0).max(FINOPS_ODATA_MAX_PAGE_SIZE).optional(),
  skip: z.number().int().min(0).optional(),
  count: z.boolean().optional(),
  crossCompany: z.boolean().optional().describe('Whether to query across companies'),
  legalEntity: z.string().optional().describe('Legal entity / dataAreaId filter value'),
  dataAreaId: z.string().optional().describe('Alias for legalEntity')
});

export let finOpsODataOperationInputSchema = z.object({
  action: z
    .enum(['list', 'get', 'create', 'update', 'delete'])
    .describe(
      'OData action variant. get/update/delete require keyValues. create/update require record.'
    ),
  entitySetName: z.string().describe('Finance and Operations /data entity set name'),
  keyValues: z.record(z.string(), z.unknown()).optional(),
  record: z.record(z.string(), z.unknown()).optional(),
  query: odataQueryInputSchema.optional(),
  maxPages: z.number().int().min(1).max(FINOPS_MAX_PAGE_COUNT).optional()
});

export let dataManagementPackageOperationInputSchema = z.object({
  action: z
    .enum([
      'export_to_package',
      'import_from_package',
      'get_execution_summary_status',
      'get_execution_summary_page_url',
      'get_exported_package_url',
      'get_import_staging_error_file_url'
    ])
    .describe('Data Management package action variant.'),
  definitionGroupId: z.string().optional(),
  packageName: z.string().optional(),
  packageUrl: z.string().optional(),
  executionId: z.string().optional(),
  reExecute: z.boolean().optional(),
  execute: z.boolean().optional(),
  overwrite: z.boolean().optional(),
  legalEntityId: z.string().optional()
});

export let recurringIntegrationOperationInputSchema = z.object({
  action: z.enum(['enqueue', 'dequeue', 'ack', 'get_message_status']),
  activityId: z.string().optional(),
  entityName: z.string().optional(),
  messageId: z.string().optional(),
  status: z.enum(['success', 'failure']).optional(),
  errorMessage: z.string().optional(),
  contentType: z.string().optional()
});

export let validateFinOpsODataOperationInput = (
  input: z.infer<typeof finOpsODataOperationInputSchema>
) => {
  if (['get', 'update', 'delete'].includes(input.action) && !input.keyValues) {
    throw dynamicsFinOpsServiceError(`${input.action} requires keyValues.`);
  }

  if (['create', 'update'].includes(input.action) && !input.record) {
    throw dynamicsFinOpsServiceError(`${input.action} requires record.`);
  }

  return input;
};

export let validateDataManagementPackageOperationInput = (
  input: z.infer<typeof dataManagementPackageOperationInputSchema>
) => {
  if (
    input.action === 'export_to_package' &&
    (!input.definitionGroupId || !input.packageName)
  ) {
    throw dynamicsFinOpsServiceError(
      'export_to_package requires definitionGroupId and packageName.'
    );
  }

  if (
    input.action === 'import_from_package' &&
    (!input.definitionGroupId || !input.packageUrl)
  ) {
    throw dynamicsFinOpsServiceError(
      'import_from_package requires definitionGroupId and packageUrl.'
    );
  }

  if (
    [
      'get_execution_summary_status',
      'get_execution_summary_page_url',
      'get_exported_package_url',
      'get_import_staging_error_file_url'
    ].includes(input.action) &&
    !input.executionId
  ) {
    throw dynamicsFinOpsServiceError(`${input.action} requires executionId.`);
  }

  return input;
};

export let validateRecurringIntegrationOperationInput = (
  input: z.infer<typeof recurringIntegrationOperationInputSchema>
) => {
  if (['enqueue', 'dequeue', 'ack'].includes(input.action) && !input.activityId) {
    throw dynamicsFinOpsServiceError(`${input.action} requires activityId.`);
  }

  if (input.action === 'enqueue' && !input.entityName) {
    throw dynamicsFinOpsServiceError('enqueue requires entityName.');
  }

  if (['ack', 'get_message_status'].includes(input.action) && !input.messageId) {
    throw dynamicsFinOpsServiceError(`${input.action} requires messageId.`);
  }

  return input;
};

export class DynamicsFinOpsClient {
  private api: FinOpsHttpClient;
  private baseUrl: string;
  private defaultLegalEntity?: string;

  constructor({
    baseUrl,
    token,
    api,
    defaultLegalEntity
  }: {
    baseUrl: string;
    token: string;
    api?: FinOpsHttpClient;
    defaultLegalEntity?: string;
  }) {
    this.baseUrl = normalizeFinOpsBaseUrl(baseUrl);
    this.api = api ?? createDynamicsFinOpsHttpClient({ baseUrl: this.baseUrl, token });
    this.defaultLegalEntity = defaultLegalEntity
      ? normalizeFinOpsLegalEntity(defaultLegalEntity)
      : undefined;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  getDataUrl() {
    return buildFinOpsDataUrl(this.baseUrl);
  }

  private async request<T>(operation: string, request: () => Promise<unknown>) {
    return requestAxiosData<T>(
      operation,
      request as () => Promise<any>,
      dynamicsFinOpsApiError
    );
  }

  async getMetadataXml() {
    return this.request<string>('get metadata', () =>
      this.api.get('data/$metadata', {
        headers: {
          Accept: 'application/xml'
        }
      })
    );
  }

  async getMetadata() {
    return parseFinOpsMetadata(await this.getMetadataXml());
  }

  async listDataEntityPage<T = Record<string, unknown>>(
    entitySetName: string,
    query: FinOpsODataQuery = {},
    options: BuildFinOpsODataParamsOptions = {}
  ) {
    let response = await this.request<unknown>('list data entity records', () =>
      this.api.get(buildFinOpsDataEntityPath(entitySetName), {
        params: buildFinOpsODataParams(query, {
          defaultLegalEntity: options.defaultLegalEntity ?? this.defaultLegalEntity,
          dataAreaIdField: options.dataAreaIdField,
          maxPageSize: options.maxPageSize
        })
      })
    );

    return normalizeODataPage<T>(response);
  }

  async listDataEntityAll<T = Record<string, unknown>>(
    entitySetName: string,
    query: FinOpsODataQuery = {},
    options: BuildFinOpsODataParamsOptions & {
      maxPages?: number;
      pageSize?: number;
      maxItems?: number;
    } = {}
  ): Promise<FinOpsODataAllPagesResult<T>> {
    let maxPages = assertBoundedInteger(
      options.maxPages ?? FINOPS_DEFAULT_MAX_PAGES,
      'maxPages',
      1,
      FINOPS_MAX_PAGE_COUNT
    );
    let pageSize = assertBoundedInteger(
      options.pageSize ?? query.top ?? FINOPS_DEFAULT_PAGE_SIZE,
      'pageSize',
      1,
      options.maxPageSize ?? FINOPS_ODATA_MAX_PAGE_SIZE
    );
    let maxItems =
      options.maxItems === undefined
        ? undefined
        : assertBoundedInteger(options.maxItems, 'maxItems', 1, Number.MAX_SAFE_INTEGER);
    let items: T[] = [];
    let nextLink: string | undefined;
    let pagesFetched = 0;

    for (; pagesFetched < maxPages; pagesFetched += 1) {
      let page =
        pagesFetched === 0
          ? await this.listDataEntityPage<T>(
              entitySetName,
              {
                ...query,
                top: query.top ?? pageSize
              },
              options
            )
          : normalizeODataPage<T>(
              await this.request<unknown>('list next data entity records page', () =>
                this.api.get(nextLink as string)
              )
            );

      let remaining = maxItems === undefined ? undefined : maxItems - items.length;
      items.push(...(remaining === undefined ? page.items : page.items.slice(0, remaining)));
      nextLink = page.nextLink;

      if (!nextLink || (maxItems !== undefined && items.length >= maxItems)) {
        return {
          items,
          nextLink,
          pagesFetched: pagesFetched + 1,
          truncated: false
        };
      }
    }

    return {
      items,
      nextLink,
      pagesFetched,
      truncated: Boolean(nextLink)
    };
  }

  async getDataEntityRecord<T = Record<string, unknown>>(
    metadata: FinOpsMetadataModel,
    entitySetName: string,
    keyValues: Record<string, unknown>,
    query: FinOpsODataQuery = {}
  ) {
    return this.request<T>('get data entity record', () =>
      this.api.get(
        buildFinOpsDataPath(buildFinOpsEntityPath(metadata, entitySetName, keyValues)),
        {
          params: buildFinOpsODataParams(query, {
            defaultLegalEntity: this.defaultLegalEntity
          })
        }
      )
    );
  }

  async createDataEntityRecord<T = Record<string, unknown>>(
    entitySetName: string,
    record: Record<string, unknown>
  ) {
    return this.request<T>('create data entity record', () =>
      this.api.post(buildFinOpsDataEntityPath(entitySetName), record)
    );
  }

  async updateDataEntityRecord(
    metadata: FinOpsMetadataModel,
    entitySetName: string,
    keyValues: Record<string, unknown>,
    record: Record<string, unknown>
  ) {
    await this.request<unknown>('update data entity record', () =>
      this.api.patch(
        buildFinOpsDataPath(buildFinOpsEntityPath(metadata, entitySetName, keyValues)),
        record
      )
    );
  }

  async deleteDataEntityRecord(
    metadata: FinOpsMetadataModel,
    entitySetName: string,
    keyValues: Record<string, unknown>
  ) {
    await this.request<unknown>('delete data entity record', () =>
      this.api.delete(
        buildFinOpsDataPath(buildFinOpsEntityPath(metadata, entitySetName, keyValues))
      )
    );
  }

  async exportToPackage(input: DataManagementExportToPackageInput) {
    let request = buildDataManagementExportToPackageRequest(input);
    let response = await this.request<unknown>('export data management package', () =>
      this.api.post(request.path, request.body)
    );

    return normalizeDataManagementResponseValue(response);
  }

  async importFromPackage(input: DataManagementImportFromPackageInput) {
    let request = buildDataManagementImportFromPackageRequest(input);
    let response = await this.request<unknown>('import data management package', () =>
      this.api.post(request.path, request.body)
    );

    return normalizeDataManagementResponseValue(response);
  }

  async getExecutionSummaryStatus(input: DataManagementExecutionInput) {
    let request = buildDataManagementExecutionRequest(
      DATA_MANAGEMENT_ACTION_PATHS.getExecutionSummaryStatus,
      input
    );
    let response = await this.request<unknown>('get data management execution status', () =>
      this.api.post(request.path, request.body)
    );

    return normalizeDataManagementStatus(response);
  }

  async getExecutionSummaryPageUrl(input: DataManagementExecutionInput) {
    let request = buildDataManagementExecutionRequest(
      DATA_MANAGEMENT_ACTION_PATHS.getExecutionSummaryPageUrl,
      input
    );
    let response = await this.request<unknown>(
      'get data management execution summary page URL',
      () => this.api.post(request.path, request.body)
    );

    return normalizeDataManagementResponseValue(response);
  }

  async getImportStagingErrorFileUrl(input: DataManagementExecutionInput) {
    let request = buildDataManagementExecutionRequest(
      DATA_MANAGEMENT_ACTION_PATHS.getImportStagingErrorFileUrl,
      input
    );
    let response = await this.request<unknown>('get import staging error file URL', () =>
      this.api.post(request.path, request.body)
    );

    return normalizeDataManagementResponseValue(response);
  }

  async getExportedPackageUrl(input: DataManagementExecutionInput) {
    let request = buildDataManagementExecutionRequest(
      DATA_MANAGEMENT_ACTION_PATHS.getExportedPackageUrl,
      input
    );
    let response = await this.request<unknown>('get exported package URL', () =>
      this.api.post(request.path, request.body)
    );

    return normalizeDataManagementResponseValue(response);
  }

  async enqueueRecurringIntegration(input: RecurringIntegrationEnqueueInput) {
    let request = buildRecurringIntegrationEnqueueRequest(input);
    return this.request<unknown>('enqueue recurring integration message', () =>
      this.api.post(request.path, request.body, {
        headers: request.headers
      })
    );
  }

  async dequeueRecurringIntegration(input: RecurringIntegrationActivityInput) {
    let request = buildRecurringIntegrationDequeueRequest(input);
    return this.request<unknown>('dequeue recurring integration message', () =>
      this.api.get(request.path)
    );
  }

  async ackRecurringIntegration(input: RecurringIntegrationAckInput) {
    let request = buildRecurringIntegrationAckRequest(input);
    return this.request<unknown>('ack recurring integration message', () =>
      this.api.post(request.path, request.body)
    );
  }

  async getRecurringIntegrationMessageStatus(input: RecurringIntegrationMessageStatusInput) {
    let request = buildRecurringIntegrationMessageStatusRequest(input);
    let response = await this.request<unknown>(
      'get recurring integration message status',
      () => this.api.post(request.path, request.body)
    );

    return normalizeDataManagementResponseValue(response);
  }
}

export let createDynamicsFinOpsClient = (ctx: CreateDynamicsFinOpsClientContext) =>
  new DynamicsFinOpsClient({
    baseUrl: resolveFinOpsBaseUrl(ctx.config),
    token: ctx.auth.token,
    defaultLegalEntity: ctx.config.defaultLegalEntity
  });
