import { AuthConfigSecretRedactor, createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };
export type Row = Record<string, unknown>;
export const row = (value: unknown): value is Row =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export function invalid(message: string, reason = 'invalid_input'): never {
  throw createApiServiceError(message, { reason });
}
export function required(value: string | undefined, label: string, maximum = 2048): string {
  if (!value || value.trim() !== value || value.length > maximum)
    invalid(`Provide a non-empty ${label} without surrounding whitespace.`);
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) invalid(`${label} contains prohibited control characters.`);
    if (character.length === 1 && code >= 0xd800 && code <= 0xdfff)
      invalid(`${label} must contain valid Unicode characters.`);
  }
  return value;
}
export const segment = (value: string | undefined, label: string) =>
  encodeURIComponent(required(value, label));
export function phone(value: string | undefined, label = 'phone number'): string {
  const number = required(value, label);
  if (!/^\+[1-9]\d{6,14}$/.test(number)) invalid(`Provide ${label} in E.164 format.`);
  return number;
}
export function httpUrl(value: string, label: string, empty = false): string {
  if (empty && value === '') return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid(`Provide an absolute HTTP or HTTPS ${label}.`);
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash)
    invalid(`Provide a credential-free HTTP or HTTPS ${label} without a fragment.`);
  return value;
}
export function integer(
  value: unknown,
  label: string,
  min: number,
  max: number
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    invalid(`${label} must be an integer from ${min} to ${max}.`);
  return value;
}
export function paging(input?: { pageNumber?: number; pageSize?: number }, max = 250) {
  const page = integer(input?.pageNumber, 'pageNumber', 1, 1_000_000);
  const size = integer(input?.pageSize, 'pageSize', 1, max);
  return {
    ...(page === undefined ? {} : { 'page[number]': page }),
    ...(size === undefined ? {} : { 'page[size]': size })
  };
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    invalid(
      'Telnyx returned an incomplete or incompatible response. A write may already have taken effect; inspect its native status before retrying.',
      'invalid_response'
    );
  return parsed.data;
}
export function exact(actual: string, expected: string, label: string) {
  if (actual !== expected)
    invalid(
      `Telnyx returned a different ${label}. Inspect the requested resource before retrying any write.`,
      'receipt_mismatch'
    );
}
export function receipt(value: Row, expected: Row) {
  for (const [key, wanted] of Object.entries(expected)) {
    if (wanted === undefined) continue;
    const actual = value[key];
    if (row(wanted) && row(actual)) {
      receipt(actual, wanted);
      continue;
    }
    const emptyWebhook = key.startsWith('webhook_') && wanted === '' && actual === null;
    const arraysEqual =
      Array.isArray(wanted) &&
      Array.isArray(actual) &&
      wanted.length === actual.length &&
      [...wanted].sort().every((item, index) => item === [...actual].sort()[index]);
    if (!emptyWebhook && !arraysEqual && JSON.stringify(actual) !== JSON.stringify(wanted))
      invalid(
        'Telnyx did not confirm the requested fields. The write may have taken effect; inspect the exact resource before retrying.',
        'unconfirmed_write'
      );
  }
}

// Shared literal substitution supplies the credential matcher; this boundary also checks
// encoded reflections and object keys, which ordinary output serialization does not substitute.
export function secretFree(value: unknown, token: string): boolean {
  const variants = new Set<string>([token]);
  let encoded = token;
  for (let layer = 0; layer < 5; layer++) {
    encoded = encodeURIComponent(encoded);
    variants.add(encoded);
  }
  variants.add(Buffer.from(token).toString('base64'));
  variants.add(
    [...token]
      .map(character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)
      .join('')
  );
  const redactor = new AuthConfigSecretRedactor(
    Object.fromEntries([...variants].map((value, index) => [`credential${index}`, value]))
  );
  const seen = new Set<object>();
  let count = 0;
  const visit = (entry: unknown, depth: number): boolean => {
    if (++count > 100_000 || depth > 30) return false;
    if (typeof entry === 'string') return redactor.redactEmbedded(entry) === entry;
    if (!entry || typeof entry !== 'object' || seen.has(entry)) return true;
    seen.add(entry);
    return Object.entries(entry).every(
      ([key, item]) => visit(key, depth + 1) && visit(item, depth + 1)
    );
  };
  return visit(value, 0);
}
export const dateFields = {
  created_at: z.string().optional(),
  updated_at: z.string().optional()
};
const optionalText = z.string().nullish();
export const money = z.string().regex(/^-?\d+(?:\.\d+)?$/);
export const metaSchema = z
  .object({
    page_number: z.number().int().positive().optional(),
    page_size: z.number().int().positive().optional(),
    total_pages: z.number().int().nonnegative().optional(),
    total_results: z.number().int().nonnegative().optional()
  })
  .passthrough();
export const messageSchema = z
  .object({
    id: z.string().min(1),
    from: z.object({ phone_number: z.string() }).passthrough(),
    to: z
      .array(z.object({ phone_number: z.string(), status: optionalText }).passthrough())
      .min(1),
    text: optionalText,
    type: z.string().optional(),
    direction: z.string().optional(),
    created_at: z.string().optional(),
    received_at: optionalText,
    sent_at: optionalText,
    completed_at: optionalText,
    parts: z.number().int().nonnegative().optional(),
    cost: z.object({ amount: money.nullish(), currency: optionalText }).passthrough().nullish()
  })
  .passthrough();
export const profileSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    enabled: z.boolean().optional(),
    whitelisted_destinations: z.array(z.string()).optional(),
    webhook_url: optionalText,
    webhook_failover_url: optionalText,
    webhook_api_version: optionalText,
    organization_id: z.string().optional(),
    number_pool_settings: z.record(z.string(), z.unknown()).nullish(),
    sms: z.record(z.string(), z.unknown()).optional(),
    call: z.record(z.string(), z.unknown()).optional(),
    flashcall: z.record(z.string(), z.unknown()).optional(),
    whatsapp: z.record(z.string(), z.unknown()).optional(),
    ...dateFields
  })
  .passthrough();
export const phoneSchema = z
  .object({
    id: z.string().min(1),
    phone_number: z.string(),
    status: optionalText,
    connection_id: optionalText,
    connection_name: optionalText,
    billing_group_id: optionalText,
    tags: z.array(z.string()).optional(),
    external_pin: optionalText,
    ...dateFields
  })
  .passthrough();
export const availableSchema = z
  .object({
    phone_number: z.string(),
    phone_number_type: z.string().optional(),
    reservable: z.boolean().optional(),
    region_information: z
      .array(z.object({ region_name: z.string(), region_type: z.string() }))
      .optional(),
    features: z.array(z.object({ name: z.string() }).passthrough()).optional(),
    cost_information: z
      .object({ currency: z.string(), monthly_cost: money, upfront_cost: money.optional() })
      .optional()
  })
  .passthrough();
export const orderSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(['pending', 'success', 'failure']),
    phone_numbers_count: z.number().int().nonnegative(),
    phone_numbers: z.array(z.object({ phone_number: z.string() }).passthrough()).optional(),
    requirements_met: z.boolean().optional(),
    ...dateFields
  })
  .passthrough();
export const verificationSchema = z
  .object({
    id: z.string().min(1),
    phone_number: z.string(),
    verify_profile_id: z.string(),
    type: z.enum(['sms', 'call', 'flashcall', 'whatsapp']),
    status: z.string(),
    timeout_secs: z.number().int().nonnegative().optional(),
    ...dateFields
  })
  .passthrough();
export const faxSchema = z
  .object({
    id: z.string().min(1),
    connection_id: z.string(),
    from: z.string(),
    to: z.string(),
    status: z.enum([
      'queued',
      'media.processed',
      'originated',
      'sending',
      'delivered',
      'failed',
      'initiated',
      'receiving',
      'media.processing',
      'received'
    ]),
    direction: z.enum(['inbound', 'outbound']),
    media_url: optionalText,
    stored_media_url: optionalText,
    preview_url: optionalText,
    failure_reason: optionalText,
    ...dateFields
  })
  .passthrough();
export const callSchema = z
  .object({
    call_control_id: z.string().min(1),
    call_leg_id: z.string().min(1),
    call_session_id: z.string().min(1),
    is_alive: z.boolean(),
    duration: z.number().optional(),
    start_time: optionalText,
    end_time: optionalText
  })
  .passthrough();
export const simSchema = z
  .object({
    id: z.string().min(1),
    iccid: optionalText,
    status: z.object({ value: z.string(), reason: optionalText }).passthrough(),
    sim_card_group_id: optionalText,
    tags: z.array(z.string()).optional(),
    ipv4: optionalText,
    imsi: optionalText,
    current_billing_period_consumed_data: z
      .object({ amount: money, unit: z.string() })
      .optional(),
    actions_in_progress: z.boolean().optional(),
    ...dateFields
  })
  .passthrough();
export const simActionSchema = z
  .object({
    id: z.string().min(1),
    sim_card_id: z.string().min(1),
    action_type: z.enum(['enable', 'disable', 'set_standby']),
    status: z.object({
      value: z.enum(['in-progress', 'completed', 'failed', 'interrupted']),
      reason: optionalText
    }),
    ...dateFields
  })
  .passthrough();
export const connectionSchema = z
  .object({
    id: z.string().min(1),
    connection_name: z.string(),
    record_type: z.string(),
    active: z.boolean(),
    ...dateFields
  })
  .passthrough();
export const balanceSchema = z
  .object({
    balance: money,
    currency: z.string().regex(/^[A-Z]{3}$/),
    pending: money.optional(),
    credit_limit: money.optional(),
    available_credit: money.optional()
  })
  .passthrough();
export const lookupSchema = z
  .object({
    phone_number: z.string(),
    country_code: optionalText,
    national_format: optionalText,
    carrier: z
      .object({
        name: optionalText,
        type: optionalText,
        mobile_country_code: optionalText,
        mobile_network_code: optionalText
      })
      .passthrough()
      .nullish(),
    caller_name: z.object({ caller_name: optionalText }).passthrough().nullish(),
    portability: z
      .object({
        line_type: optionalText,
        ported_status: optionalText,
        city: optionalText,
        state: optionalText
      })
      .passthrough()
      .nullish()
  })
  .passthrough();
