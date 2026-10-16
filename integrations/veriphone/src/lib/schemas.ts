import { z } from 'zod';

export let verificationResponseSchema = z.object({
  status: z.string(),
  phone: z.string(),
  phone_valid: z.boolean(),
  phone_type: z.string().nullable(),
  phone_region: z.string().nullable(),
  country: z.string().nullable(),
  country_code: z.string().nullable(),
  country_prefix: z.string().nullable(),
  international_number: z.string().nullable(),
  local_number: z.string().nullable(),
  e164: z.string().nullable(),
  carrier: z.string().nullable()
});

export let exampleResponseSchema = z.object({
  status: z.string(),
  phone_type: z.string(),
  country_code: z.string(),
  country_prefix: z.string(),
  international_number: z.string(),
  local_number: z.string(),
  e164: z.string()
});

export let currentCarrierSchema = z.looseObject({
  status: z.string(),
  phone: z.string(),
  phone_valid: z.boolean(),
  reason: z.string().optional(),
  phone_type: z.string().optional(),
  phone_region: z.string().optional(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  country_prefix: z.string().optional(),
  international_number: z.string().optional(),
  local_number: z.string().optional(),
  e164: z.string().optional(),
  carrier: z.string().optional(),
  mode: z.string().optional(),
  timezone: z.array(z.string()).optional(),
  geographical: z.boolean().optional(),
  original_carrier: z.string().optional(),
  original_line_type: z.string().optional(),
  original_mccmnc: z.string().nullable().optional(),
  current_carrier: z.string().nullable().optional(),
  current_line_type: z.string().nullable().optional(),
  current_mccmnc: z.string().nullable().optional(),
  ported: z.boolean().nullable().optional(),
  carrier_data_source: z.string().optional(),
  current_lookup: z.string().optional(),
  shortcode_cost: z.string().optional()
});

let modeUsageSchema = z.looseObject({ count: z.number(), credits: z.number() });

export let creditsSchema = z.looseObject({
  email: z.string().describe('Account email associated with the API key'),
  counter: z.number().describe('Usage counter for the current billing period'),
  active: z.boolean().describe('Whether the account is active'),
  payg: z.number().describe('Pay-as-you-go credits remaining'),
  limit: z.number().describe('Monthly verification limit'),
  plan: z.string().describe('Current plan name'),
  renew: z.number().describe('Day of month when the usage counter resets'),
  last_reset: z.looseObject({ seconds: z.number(), nanos: z.number() }),
  usage: z.looseObject({ static: modeUsageSchema, current: modeUsageSchema })
});

export let coverageSchema = z.looseObject({
  countries: z.array(z.looseObject({ iso: z.string(), covered: z.boolean() })),
  updatedAt: z.string()
});

export let uploadSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  filesize: z.number().optional(),
  created: z.string().optional(),
  firstrow: z.number().optional(),
  lastrow: z.number().optional(),
  column: z.number().optional(),
  position: z.number().optional(),
  stage: z.string().optional(),
  speed: z.number().optional(),
  billable: z.number().optional(),
  syntaxerr: z.number().optional(),
  valid: z.number().optional(),
  invalid: z.number().optional(),
  record1: z.string().optional(),
  record2: z.string().optional()
});

export let uploadResultSchema = z.looseObject({
  result: z.literal('success'),
  id: z.string(),
  column: z.number(),
  firstrow: z.number(),
  lastrow: z.number(),
  record1: z.string().optional(),
  record2: z.string().optional()
});

export let bulkFileIdSchema = z
  .string()
  .describe('Upload ID returned by upload_bulk_file or list_bulk_files.');
