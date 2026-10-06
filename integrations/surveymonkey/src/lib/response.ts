import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let invalid = (message: string) =>
  createApiServiceError(message, { reason: 'surveymonkey_validation' });
export let malformed = () =>
  createApiServiceError(
    'SurveyMonkey returned an invalid or incomplete result. Read the resource before retrying a write; its outcome may be uncertain.',
    { reason: 'surveymonkey_response' }
  );

export let id = z.string().regex(/^\d+$/).describe('Exact numeric resource ID, kept as text');
export let nativeId = z
  .union([id, z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)])
  .transform(String);
export let pageInput = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional();
export let perPageInput = z.number().int().min(1).max(1000).optional();
let text = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
let count = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .nullish()
  .transform(value => value ?? undefined);
let maybeId = nativeId.nullish().transform(value => value ?? undefined);
let fields = z
  .record(z.string(), z.string())
  .nullish()
  .transform(value => value ?? undefined);

export let surveySchema = z
  .object({
    id: nativeId,
    title: z.string(),
    nickname: text,
    language: text,
    question_count: count,
    page_count: count,
    response_count: count,
    date_created: text,
    date_modified: text,
    preview: text,
    edit_url: text,
    collect_url: text,
    analyze_url: text,
    href: text,
    owner: maybeId,
    is_owner: z.boolean().optional(),
    folder_id: maybeId,
    pages: z.array(z.record(z.string(), z.unknown())).optional()
  })
  .passthrough();
export let collectorSchema = z
  .object({
    id: nativeId,
    type: z.string(),
    name: text,
    status: text,
    url: text,
    survey_id: maybeId,
    date_created: text,
    date_modified: text,
    response_count: count,
    allow_multiple_responses: z.boolean().optional()
  })
  .passthrough();
export let collectorListSchema = collectorSchema.partial().extend({ id: nativeId });
export let contactListSchema = z
  .object({ id: nativeId, name: z.string(), href: text })
  .passthrough();
export let contactSchema = z
  .object({
    id: nativeId,
    first_name: text,
    last_name: text,
    email: text,
    phone_number: text,
    custom_fields: fields,
    status: z
      .union([z.string(), z.boolean()])
      .nullish()
      .transform(value => value ?? undefined),
    href: text
  })
  .passthrough();
export let responseSchema = z
  .object({
    id: nativeId,
    survey_id: maybeId,
    collector_id: maybeId,
    recipient_id: maybeId,
    response_status: text,
    date_created: text,
    date_modified: text,
    total_time: count,
    ip_address: text,
    edit_url: text,
    analyze_url: text,
    custom_variables: fields,
    pages: z.array(z.record(z.string(), z.unknown())).optional()
  })
  .passthrough();
export let userSchema = z
  .object({
    id: nativeId,
    username: text,
    first_name: text,
    last_name: text,
    email: text,
    account_type: text,
    language: text,
    date_created: text,
    date_last_login: text,
    scopes: z.unknown().optional()
  })
  .passthrough();
export let messageSchema = z
  .object({
    id: nativeId,
    type: z.string(),
    status: z.string(),
    is_scheduled: z.boolean().optional(),
    scheduled_date: text,
    subject: text,
    body: text,
    date_created: text
  })
  .passthrough();
export let bulkSchema = z
  .object({
    succeeded: z.array(z.record(z.string(), z.unknown())),
    invalids: z.array(z.unknown()),
    existing: z.array(z.unknown()),
    bounced: z.array(z.unknown()).optional(),
    opted_out: z.array(z.unknown()).optional(),
    duplicate: z.array(z.unknown()).optional()
  })
  .passthrough();
export let pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    per_page: z.number().int().min(1).max(1000),
    total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    links: z.object({ self: text, next: text, last: text }).passthrough()
  });
export let parse = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  let result = schema.safeParse(value);
  if (!result.success) throw malformed();
  return result.data;
};

// Numeric IDs occur in answer/design records despite the API's string ID examples.
export let preserveIds = (value: unknown, depth = 0): unknown => {
  if (depth > 80) throw malformed();
  if (Array.isArray(value)) return value.map(item => preserveIds(item, depth + 1));
  if (value !== null && typeof value === 'object') {
    let result: Record<string, unknown> = {};
    for (let [key, item] of Object.entries(value)) {
      if (
        (key === 'id' || key.endsWith('_id') || key === 'owner') &&
        typeof item === 'number'
      ) {
        if (!Number.isSafeInteger(item) || item < 0) throw malformed();
        result[key] = String(item);
      } else result[key] = preserveIds(item, depth + 1);
    }
    return result;
  }
  return value;
};

let numericToken = (raw: string, start: number) =>
  raw.slice(start).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)?.[0];
let validateNumericId = (token: string) => {
  let value = Number(token);
  if (!Number.isSafeInteger(value) || value < 0) throw malformed();
  let parts = token.match(/^-?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!parts) throw malformed();
  let fraction = parts[2] ?? '';
  let digits = `${parts[1]}${fraction}`.replace(/^0+/, '');
  if (!digits) return;
  let shift = Number(parts[3] ?? '0') - fraction.length;
  if (!Number.isSafeInteger(shift)) throw malformed();
  if (shift < 0) {
    if (-shift >= digits.length || !/^0*$/.test(digits.slice(shift))) throw malformed();
    digits = digits.slice(0, shift);
  } else {
    if (digits.length + shift > 16) throw malformed();
    digits += '0'.repeat(shift);
  }
  if (BigInt(digits) !== BigInt(value)) throw malformed();
};
let stringEnd = (raw: string, start: number) => {
  let position = start + 1;
  for (; position < raw.length; position++) {
    if (raw[position] === '\\') position++;
    else if (raw[position] === '"') return position;
  }
  throw malformed();
};

// Validate native ID tokens before JSON.parse can round them, including recipient arrays.
export let parseNativeJson = (raw: string): unknown => {
  for (let position = 0; position < raw.length; position++) {
    if (raw[position] !== '"') continue;
    let start = position;
    position = stringEnd(raw, start);
    let key: unknown;
    try {
      key = JSON.parse(raw.slice(start, position + 1));
    } catch {
      throw malformed();
    }
    let next = position + 1;
    while (/\s/.test(raw[next] ?? '') && next < raw.length) next++;
    if (
      raw[next] !== ':' ||
      typeof key !== 'string' ||
      !(key === 'id' || key.endsWith('_id') || key === 'owner' || key === 'recipients')
    )
      continue;
    next++;
    while (/\s/.test(raw[next] ?? '') && next < raw.length) next++;
    if (key === 'recipients') {
      if (raw[next] !== '[') continue;
      let depth = 1;
      for (let cursor = next + 1; cursor < raw.length && depth; cursor++) {
        let char = raw[cursor];
        if (char === '"') cursor = stringEnd(raw, cursor);
        else if (char === '[' || char === '{') depth++;
        else if (char === ']' || char === '}') depth--;
        else if (depth === 1 && (char === '-' || /\d/.test(char ?? ''))) {
          let token = numericToken(raw, cursor);
          if (!token) throw malformed();
          validateNumericId(token);
          cursor += token.length - 1;
        }
      }
      if (depth) throw malformed();
      continue;
    }
    let token = numericToken(raw, next);
    if (token) validateNumericId(token);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw malformed();
  }
};

export let pagingOutput = (page: {
  page: number;
  per_page: number;
  total: number;
  nextPage?: number;
}) => ({
  page: page.page,
  total: page.total,
  perPage: page.per_page,
  hasMore: page.nextPage !== undefined,
  nextPage: page.nextPage
});
export let contactOutput = (contact: z.output<typeof contactSchema>) => ({
  contactId: contact.id,
  firstName: contact.first_name,
  lastName: contact.last_name,
  email: contact.email,
  phoneNumber: contact.phone_number,
  status: typeof contact.status === 'string' ? contact.status : undefined,
  statusFlag: typeof contact.status === 'boolean' ? contact.status : undefined,
  customFields: contact.custom_fields
});

export let publicPages = (pages: Record<string, unknown>[] | undefined) =>
  pages === undefined
    ? undefined
    : (JSON.parse(
        JSON.stringify(pages, (key, value) =>
          ['download_url', 'human_download_url'].includes(key) ? undefined : value
        )
      ) as Record<string, unknown>[]);
