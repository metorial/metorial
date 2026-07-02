import { pickDefined } from 'slates';
import { z } from 'zod';
import {
  BusinessCentralClient,
  businessCentralEntityPath,
  type ODataListResponse
} from '../../lib/business-central/client';
import { businessCentralValidationError } from '../../lib/business-central/errors';

export type BusinessCentralContext = {
  auth: {
    businessCentralToken?: string;
    businessCentralTenantId?: string;
    businessCentralEnvironmentName?: string;
  };
  config?: {
    businessCentralTenantId?: string;
    businessCentralEnvironmentName?: string;
    businessCentralCompanyId?: string;
    businessCentralDefaultLimit?: number;
  };
  input: {
    businessCentralTenantId?: string;
    businessCentralEnvironmentName?: string;
    businessCentralCompanyId?: string;
    limit?: number;
    skip?: number;
  };
};

export type ODataInput = {
  limit?: number;
  skip?: number;
  select?: string[];
  expand?: string[];
  odataFilter?: string;
};

export let rawRecordSchema = z
  .record(z.string(), z.unknown())
  .describe('Raw Business Central record for fields not normalized by this tool.');

export let environmentInputFields = {
  businessCentralTenantId: z
    .string()
    .optional()
    .describe(
      'Override Business Central tenant ID or domain segment for this request. Omit to use the common endpoint.'
    ),
  businessCentralEnvironmentName: z
    .string()
    .optional()
    .describe(
      'Override Business Central environment name. Defaults to configured value or production.'
    )
};

export let companyInputFields = {
  ...environmentInputFields,
  businessCentralCompanyId: z
    .string()
    .optional()
    .describe(
      'Business Central company GUID. Overrides configured default businessCentralCompanyId.'
    )
};

export let listInputFields = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe(
      'Maximum number of records to return. Defaults to configured businessCentralDefaultLimit or 50.'
    ),
  skip: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Number of records to skip for OData pagination.'),
  select: z
    .array(z.string())
    .optional()
    .describe('Optional OData $select fields. Use Business Central API field names.'),
  odataFilter: z
    .string()
    .optional()
    .describe('Advanced OData $filter expression. Combined with structured filters using and.')
};

export let expandedListInputFields = {
  ...listInputFields,
  expand: z
    .array(z.string())
    .optional()
    .describe('Optional OData $expand navigation properties.')
};

export let pageOutputSchema = z.object({
  count: z.number().describe('Number of records returned in this response.'),
  limit: z.number().describe('Requested page size.'),
  skip: z.number().describe('Requested skip offset.'),
  nextSkip: z.number().optional().describe('Next skip offset when another page is likely.'),
  odataNextLink: z.string().optional().describe('Raw Business Central @odata.nextLink.')
});

export let addressSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional()
});

export let dimensionSetLineSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  displayName: z.string().optional(),
  valueCode: z.string().optional(),
  valueDisplayName: z.string().optional(),
  record: rawRecordSchema
});

export let stringValue = (record: Record<string, unknown>, key: string) => {
  let value = record[key];
  return typeof value === 'string' ? value : undefined;
};

export let numberValue = (record: Record<string, unknown>, key: string) => {
  let value = record[key];
  return typeof value === 'number' ? value : undefined;
};

export let booleanValue = (record: Record<string, unknown>, key: string) => {
  let value = record[key];
  return typeof value === 'boolean' ? value : undefined;
};

export let arrayValue = (record: Record<string, unknown>, key: string) => {
  let value = record[key];
  return Array.isArray(value) ? value : undefined;
};

export let recordArrayValue = (record: Record<string, unknown>, key: string) =>
  arrayValue(record, key)?.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
  );

export let nestedODataRecords = (record: Record<string, unknown>, ...keys: string[]) => {
  for (let key of keys) {
    let value = record[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item)
      );
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      let list = (value as Record<string, unknown>).value;
      if (Array.isArray(list)) {
        return list.filter(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && !Array.isArray(item)
        );
      }
    }
  }

  return undefined;
};

export let compactRecord = <T extends object>(value: T) => pickDefined(value);

export let mapAddress = (record: Record<string, unknown>) =>
  compactRecord({
    addressLine1: stringValue(record, 'addressLine1'),
    addressLine2: stringValue(record, 'addressLine2'),
    city: stringValue(record, 'city'),
    state: stringValue(record, 'state'),
    country: stringValue(record, 'country'),
    postalCode: stringValue(record, 'postalCode')
  });

export let mapDimensionSetLines = (
  lines: Record<string, unknown>[] | undefined
): z.infer<typeof dimensionSetLineSchema>[] | undefined =>
  lines?.map(line => ({
    ...compactRecord({
      id: stringValue(line, 'id'),
      code: stringValue(line, 'code'),
      displayName: stringValue(line, 'displayName'),
      valueCode: stringValue(line, 'valueCode'),
      valueDisplayName: stringValue(line, 'valueDisplayName')
    }),
    record: line
  }));

let requireBusinessCentralToken = (ctx: BusinessCentralContext) => {
  if (!ctx.auth.businessCentralToken?.trim()) {
    throw businessCentralValidationError(
      'Business Central tools require businessCentralToken from oauth_common or oauth_organizations auth.'
    );
  }

  return ctx.auth.businessCentralToken;
};

export let createClient = (ctx: BusinessCentralContext) =>
  new BusinessCentralClient({
    token: requireBusinessCentralToken(ctx),
    tenantId:
      ctx.input.businessCentralTenantId ??
      ctx.config?.businessCentralTenantId ??
      ctx.auth.businessCentralTenantId,
    environmentName:
      ctx.input.businessCentralEnvironmentName ??
      ctx.config?.businessCentralEnvironmentName ??
      ctx.auth.businessCentralEnvironmentName
  });

export let resolveCompanyId = (ctx: BusinessCentralContext) => {
  let companyId = ctx.input.businessCentralCompanyId ?? ctx.config?.businessCentralCompanyId;
  if (!companyId) {
    throw businessCentralValidationError(
      'businessCentralCompanyId is required. Call business_central_list_companies first or configure a default businessCentralCompanyId.'
    );
  }

  return companyId;
};

export let companyPath = (companyId: string) =>
  businessCentralEntityPath('companies', companyId);

export let odataString = (value: string) => `'${value.replace(/'/g, "''")}'`;

export let odataDate = (value: string) => value;

export let containsFilter = (fields: string[], search: string | undefined) => {
  let normalized = search?.trim().toLowerCase();
  if (!normalized) return undefined;

  let literal = odataString(normalized);
  return `(${fields.map(field => `contains(tolower(${field}),${literal})`).join(' or ')})`;
};

export let equalityFilter = (field: string, value: string | undefined) =>
  value ? `${field} eq ${odataString(value)}` : undefined;

export let rawEqualityFilter = (field: string, value: string | undefined) =>
  value ? `${field} eq ${value}` : undefined;

export let dateFromFilter = (field: string, value: string | undefined) =>
  value ? `${field} ge ${odataDate(value)}` : undefined;

export let dateToFilter = (field: string, value: string | undefined) =>
  value ? `${field} le ${odataDate(value)}` : undefined;

export let combineFilters = (filters: Array<string | undefined>) => {
  let provided = filters.map(filter => filter?.trim()).filter(Boolean) as string[];
  if (provided.length === 0) return undefined;
  if (provided.length === 1) return provided[0];
  return provided.map(filter => `(${filter})`).join(' and ');
};

export let buildODataParams = (
  ctx: BusinessCentralContext,
  input: ODataInput,
  filters: Array<string | undefined> = []
) => {
  let limit = input.limit ?? ctx.config?.businessCentralDefaultLimit ?? 50;
  let skip = input.skip ?? 0;
  let filter = combineFilters([...filters, input.odataFilter]);

  return {
    params: compactRecord({
      $top: limit,
      $skip: skip,
      $select: input.select?.join(','),
      $expand: input.expand?.join(','),
      $filter: filter
    }),
    page: {
      limit,
      skip
    }
  };
};

let skipFromNextLink = (nextLink: string | undefined) => {
  if (!nextLink) return undefined;

  try {
    let url = new URL(nextLink);
    let skip = url.searchParams.get('$skip') ?? url.searchParams.get('%24skip');
    if (!skip) return undefined;
    let parsed = Number(skip);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export let pageSummary = <T>(
  response: ODataListResponse<T>,
  page: { limit: number; skip: number }
) => {
  let count = response.value?.length ?? 0;
  let odataNextLink = response['@odata.nextLink'];
  let nextSkip = skipFromNextLink(odataNextLink);

  return {
    count,
    limit: page.limit,
    skip: page.skip,
    nextSkip: nextSkip ?? (count >= page.limit ? page.skip + count : undefined),
    odataNextLink
  };
};

export let requireRecord = (value: unknown, label: string) => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw businessCentralValidationError(`Business Central ${label} did not return an object.`);
};

export let optionalStringEnum = <T extends string>(values: readonly T[]) =>
  z.enum(values as [T, ...T[]]).optional();
