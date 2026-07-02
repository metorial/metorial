import { z } from 'zod';
import { PowerOfficeClient, paginationParams } from '../lib/client';
import { powerOfficeValidationError } from '../lib/errors';

export let rawRecordSchema = z
  .record(z.string(), z.unknown())
  .describe('Raw PowerOffice record for fields not normalized by this tool.');

export let paginationInputSchema = {
  pageNumber: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('PowerOffice page number to return. Defaults to 1.'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .describe('PowerOffice page size. Defaults to 1000 and cannot exceed 5000.'),
  fields: z
    .string()
    .optional()
    .describe('Comma-separated PowerOffice Fields selector, for example "Id,Name".'),
  orderBy: z
    .string()
    .optional()
    .describe('PowerOffice OrderBy expression, for example "Name asc".'),
  useDatabaseValidation: z
    .boolean()
    .optional()
    .describe('Ask PowerOffice to validate filter values against the database.')
};

export let paginationOutputSchema = z.object({
  pageNumber: z.number().describe('PowerOffice page number requested.'),
  pageSize: z.number().describe('PowerOffice page size requested.'),
  count: z.number().describe('Number of records returned in this page.')
});

export type PaginationInput = {
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
  orderBy?: string;
  useDatabaseValidation?: boolean;
};

export let buildListParams = (
  input: PaginationInput,
  filters: Record<string, unknown> = {}
) => ({
  ...filters,
  ...paginationParams(input)
});

export let pageSummary = (input: PaginationInput, count: number) => ({
  pageNumber: input.pageNumber ?? 1,
  pageSize: input.pageSize ?? 1000,
  count
});

let value = (record: Record<string, unknown>, key: string) => record[key];

export let stringValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return typeof child === 'string' ? child : undefined;
};

export let numberValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return typeof child === 'number' ? child : undefined;
};

export let booleanValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return typeof child === 'boolean' ? child : undefined;
};

export let arrayValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return Array.isArray(child) ? child : undefined;
};

export let recordValue = (record: Record<string, unknown>, key: string) => {
  let child = value(record, key);
  return typeof child === 'object' && child !== null && !Array.isArray(child)
    ? (child as Record<string, unknown>)
    : undefined;
};

export let compactOutput = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(
    Object.entries(input).filter(([, child]) => child !== undefined)
  ) as Partial<T>;

export let createClient = (ctx: { auth: any }) =>
  new PowerOfficeClient({
    token: ctx.auth.token,
    expiresAt: ctx.auth.expiresAt,
    tokenType: ctx.auth.tokenType,
    environment: ctx.auth.environment,
    subscriptionKey: ctx.auth.subscriptionKey
  });

export let requireAtLeastOne = (values: Record<string, unknown>, message: string) => {
  if (
    Object.values(values).some(child => child !== undefined && child !== null && child !== '')
  ) {
    return;
  }

  throw powerOfficeValidationError(message);
};

export let requireExactlyOne = (values: Record<string, unknown>, message: string) => {
  let provided = Object.values(values).filter(
    child => child !== undefined && child !== null && child !== ''
  );

  if (provided.length === 1) return;
  throw powerOfficeValidationError(message);
};

export let joinFilter = (values: string[] | number[] | undefined) =>
  values && values.length > 0 ? values.join(',') : undefined;

export let contactAddressInputSchema = z
  .object({
    addressLine1: z.string().nullable().optional().describe('Street address line 1.'),
    addressLine2: z.string().nullable().optional().describe('Street address line 2.'),
    zipCode: z.string().nullable().optional().describe('Postal code.'),
    city: z.string().nullable().optional().describe('City.'),
    countryCode: z
      .string()
      .nullable()
      .optional()
      .describe('ISO country code, for example "NO".')
  })
  .describe('PowerOffice contact postal address.');

export let contactAddressOutputSchema = z
  .object({
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    zipCode: z.string().optional(),
    city: z.string().optional(),
    countryCode: z.string().optional()
  })
  .describe('Postal address.');

export let mapAddress = (address: Record<string, unknown> | undefined) =>
  address
    ? compactOutput({
        addressLine1: stringValue(address, 'AddressLine1'),
        addressLine2: stringValue(address, 'AddressLine2'),
        zipCode: stringValue(address, 'ZipCode'),
        city: stringValue(address, 'City'),
        countryCode: stringValue(address, 'CountryCode')
      })
    : undefined;

export let buildAddressBody = (
  address:
    | {
        addressLine1?: string | null;
        addressLine2?: string | null;
        zipCode?: string | null;
        city?: string | null;
        countryCode?: string | null;
      }
    | undefined
) =>
  address === undefined
    ? undefined
    : {
        AddressLine1: address.addressLine1,
        AddressLine2: address.addressLine2,
        ZipCode: address.zipCode,
        City: address.city,
        CountryCode: address.countryCode
      };

export let accountingDimensionOutputSchema = z.object({
  departmentCode: z.string().optional(),
  departmentId: z.number().optional(),
  projectCode: z.string().optional(),
  projectId: z.number().optional(),
  locationCode: z.string().optional(),
  locationId: z.number().optional(),
  dim1Code: z.string().optional(),
  dim1Id: z.number().optional(),
  dim2Code: z.string().optional(),
  dim2Id: z.number().optional(),
  dim3Code: z.string().optional(),
  dim3Id: z.number().optional()
});

export let mapDimensions = (record: Record<string, unknown>) =>
  compactOutput({
    departmentCode: stringValue(record, 'DepartmentCode'),
    departmentId: numberValue(record, 'DepartmentId'),
    projectCode: stringValue(record, 'ProjectCode'),
    projectId: numberValue(record, 'ProjectId'),
    locationCode: stringValue(record, 'LocationCode'),
    locationId: numberValue(record, 'LocationId'),
    dim1Code: stringValue(record, 'Dim1Code'),
    dim1Id: numberValue(record, 'Dim1Id'),
    dim2Code: stringValue(record, 'Dim2Code'),
    dim2Id: numberValue(record, 'Dim2Id'),
    dim3Code: stringValue(record, 'Dim3Code'),
    dim3Id: numberValue(record, 'Dim3Id')
  });
