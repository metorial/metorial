import { pickDefined } from 'slates';
import { z } from 'zod';
import type { TripletexAuthOutput } from '../auth';
import type { TripletexConfig } from '../config';
import { TripletexClient, type TripletexListResponse } from '../lib/client';
import { tripletexValidationError } from '../lib/errors';

export type ToolContext = {
  auth: TripletexAuthOutput;
  config: TripletexConfig;
};

export let rawRecordSchema = z.record(z.string(), z.any()).describe('Raw Tripletex record');

export let pagingInputShape = {
  from: z.number().int().min(0).optional().describe('Tripletex paging offset'),
  count: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Number of records to return, up to 1000'),
  sorting: z.string().optional().describe('Tripletex sorting pattern'),
  fields: z.string().optional().describe('Tripletex fields pattern'),
  companyId: z
    .string()
    .optional()
    .describe('Override target company id for this call. Omit or use 0 for default company.')
};

export let listMetadataSchema = {
  from: z.number().optional().describe('Returned paging offset'),
  count: z.number().optional().describe('Returned item count'),
  fullResultSize: z.number().optional().describe('Tripletex full result size when supplied'),
  versionDigest: z.string().nullable().optional().describe('Tripletex version digest')
};

export let idRefSchema = z
  .object({ id: z.number() })
  .describe('Tripletex resource reference by numeric id');

export let addressSchema = z
  .object({
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    countryId: z.number().optional().describe('Tripletex country id')
  })
  .optional()
  .describe('Tripletex address fields');

export let createClient = (ctx: ToolContext) => new TripletexClient(ctx.auth);

export let companyIdFor = (ctx: ToolContext, inputCompanyId?: string) =>
  inputCompanyId ?? ctx.config.companyId ?? ctx.auth.companyId;

export let asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export let asNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

export let asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

export let asBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

export let ref = (id: number | undefined) => (id === undefined ? undefined : { id });

export let addressBody = (
  address:
    | {
        addressLine1?: string;
        addressLine2?: string;
        postalCode?: string;
        city?: string;
        countryId?: number;
      }
    | undefined
) => {
  if (!address) return undefined;
  return pickDefined({
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    postalCode: address.postalCode,
    city: address.city,
    country: ref(address.countryId)
  });
};

export let ensureCreateName = (id: number | undefined, name: string | undefined) => {
  if (id === undefined && !name?.trim()) {
    throw tripletexValidationError('name is required when creating a new record.');
  }
};

export let ensureUpdatePayload = (
  id: number | undefined,
  body: Record<string, unknown>,
  resourceLabel: string
) => {
  if (id === undefined) return;

  let hasEditableField = Object.entries(body).some(
    ([key, value]) => key !== 'id' && key !== 'version' && value !== undefined
  );

  if (!hasEditableField) {
    throw tripletexValidationError(
      `At least one ${resourceLabel} field must be provided when updating.`
    );
  }
};

export let listOutput = (response: TripletexListResponse) => ({
  from: response.from,
  count: response.count,
  fullResultSize: response.fullResultSize,
  versionDigest: response.versionDigest
});

export let commonParams = (input: {
  from?: number;
  count?: number;
  sorting?: string;
  fields?: string;
}) =>
  pickDefined({
    from: input.from,
    count: input.count,
    sorting: input.sorting,
    fields: input.fields
  });

export let entityName = (record: Record<string, unknown>) =>
  asString(record.name) ?? asString(record.displayName) ?? String(record.id ?? 'record');
