import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';

export { pickDefined, z };
export type Row = Record<string, unknown>;
export function fail(message: string, reason = 'aircall_validation'): never {
  throw createApiServiceError(message, { reason, parent: {} });
}
export const row = (value: unknown, label = 'native response'): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail(
      `Aircall returned an invalid ${label}. Reconcile possible effects before retrying.`,
      'aircall_receipt'
    );
  return value as Row;
};
export const text = (value: unknown, label: string, max = 10000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    return fail(`${label} must be nonempty text within ${max} characters.`);
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c < 32 && c !== 9 && c !== 10 && c !== 13)
      fail(`${label} contains unsupported control characters.`);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail(`${label} contains malformed Unicode.`);
    } else if (c >= 0xdc00 && c <= 0xdfff) fail(`${label} contains malformed Unicode.`);
  }
  return value;
};
export const integer = (
  value: unknown,
  label: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    return fail(`${label} must be an exact integer from ${min} to ${max}.`);
  return value;
};
export const id = (value: unknown, label = 'ID'): number => integer(value, label, 1);
export const exactId = (numeric: unknown, exact?: unknown): string => {
  let result: string;
  if (exact !== undefined) {
    result = text(exact, 'callIdExact', 19);
    if (!/^[1-9]\d*$/.test(result) || BigInt(result) > 9223372036854775807n)
      return fail(
        'callIdExact must be a positive decimal Int64 string from list_calls or get_call.'
      );
    if (numeric !== undefined && String(id(numeric, 'callId')) !== result)
      return fail(
        'callId and callIdExact identify different calls. Supply one exact identifier.'
      );
  } else result = String(id(numeric, 'callId'));
  return result;
};
export const nativeCallId = (value: unknown): string =>
  typeof value === 'string' ? exactId(undefined, value) : exactId(value);
export const numericCallId = (value: string): number | undefined => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};
export const phone = (value: unknown): string => {
  const result = text(value, 'Phone number', 16);
  if (!/^\+[1-9]\d{5,14}$/.test(result))
    fail('Use an E.164 phone number, including the leading + and country code.');
  return result;
};
export const email = (value: unknown): string => {
  const result = text(value, 'Email address', 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('Supply a valid email address.');
  return result;
};
export const timestamp = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') integer(value, 'Native timestamp');
  else if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value))
    fail('Aircall returned an invalid native timestamp.', 'aircall_receipt');
  const date = new Date(typeof value === 'number' ? value * 1000 : value);
  if (!Number.isFinite(date.getTime()))
    fail('Aircall returned an invalid native timestamp.', 'aircall_receipt');
  return date.toISOString();
};
const nullableText = (value: unknown): string | null =>
  value == null ? null : text(value, 'Native text');
const optionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean')
    fail('Aircall returned an invalid native boolean.', 'aircall_receipt');
  return value;
};
const list = (value: unknown, label: string): Row[] => {
  if (!Array.isArray(value) || value.length > 1000)
    fail(`Aircall returned an invalid or oversized ${label}.`, 'aircall_receipt');
  return value.map(item => row(item, label));
};
export const native = (value: unknown, label = 'resource'): Row => {
  const result = row(value, label);
  id(result.id, `${label} ID`);
  return result;
};
export const same = (value: Row, expected: number | string): Row => {
  if (String(value.id) !== String(expected))
    fail(
      'Aircall returned a different resource ID. Reconcile possible effects before retrying.',
      'aircall_receipt'
    );
  return value;
};
export const mapContact = (value: unknown) => {
  const c = native(value, 'contact');
  return {
    contactId: id(c.id),
    firstName: nullableText(c.first_name),
    lastName: nullableText(c.last_name),
    fullName: nullableText(c.name),
    companyName: nullableText(c.company_name),
    information: nullableText(c.information),
    phoneNumbers: list(c.phone_numbers, 'phone numbers').map(p => ({
      phoneNumberId: id(p.id),
      label: p.label == null ? undefined : text(p.label, 'Native phone label'),
      value: text(p.value, 'Native phone number')
    })),
    emails: list(c.emails, 'emails').map(e => ({
      emailId: id(e.id),
      label: e.label == null ? undefined : text(e.label, 'Native email label'),
      value: text(e.value, 'Native email')
    })),
    createdAt: timestamp(c.created_at),
    updatedAt: timestamp(c.updated_at) ?? null
  };
};
export const mapUser = (value: unknown) => {
  const u = native(value, 'user');
  return {
    userId: id(u.id),
    name: text(u.name, 'Native user name'),
    email: email(u.email),
    available: optionalBoolean(u.available),
    availabilityStatus: nullableText(u.availability_status),
    timeZone: nullableText(u.time_zone),
    language: nullableText(u.language),
    wrapUpTime: u.wrap_up_time == null ? null : integer(u.wrap_up_time, 'Wrap-up time'),
    createdAt: timestamp(u.created_at)
  };
};
export const mapNumber = (value: unknown) => {
  const n = native(value, 'number');
  return {
    numberId: id(n.id),
    name: nullableText(n.name),
    digits: text(n.digits, 'Native number'),
    country: nullableText(n.country),
    timeZone: nullableText(n.time_zone),
    open: optionalBoolean(n.open),
    liveRecordingActivated: optionalBoolean(n.live_recording_activated),
    createdAt: timestamp(n.created_at)
  };
};
export const mapTag = (value: unknown) => {
  const t = native(value, 'tag');
  return {
    tagId: id(t.id),
    tagName: text(t.name, 'Native tag name'),
    createdAt: timestamp(t.created_at)
  };
};
export const mapTeam = (value: unknown) => {
  const t = native(value, 'team');
  const users = list(t.users, 'team users').map(u => ({
    userId: id(u.id),
    name: text(u.name, 'Native user name')
  }));
  return { teamId: id(t.id), teamName: text(t.name, 'Native team name'), users };
};
export const mapCall = (value: unknown) => {
  const c = row(value, 'call'),
    callIdExact = nativeCallId(c.id);
  const seconds = (v: unknown) => (v == null ? null : integer(v, 'Native call timing'));
  return {
    callId: numericCallId(callIdExact),
    callIdExact,
    direction: text(c.direction, 'Native call direction'),
    status: text(c.status, 'Native call status'),
    rawDigits: text(c.raw_digits, 'Native call digits'),
    startedAt: seconds(c.started_at),
    answeredAt: seconds(c.answered_at),
    endedAt: seconds(c.ended_at),
    duration: seconds(c.duration),
    recording: nullableText(c.recording),
    voicemail: nullableText(c.voicemail),
    archived: optionalBoolean(c.archived),
    missedCallReason: nullableText(c.missed_call_reason),
    userName: c.user == null ? null : text(row(c.user).name, 'Native user name'),
    numberDigits: c.number == null ? null : text(row(c.number).digits, 'Native number'),
    tags: list(c.tags, 'call tags').map(t => ({
      tagId: id(t.id),
      tagName: text(t.name, 'Native tag name')
    })),
    commentsCount: list(c.comments, 'call comments').length
  };
};
export const callFields = {
  callId: z
    .number()
    .optional()
    .describe('Exact numeric ID when safely representable; otherwise use callIdExact.'),
  callIdExact: z
    .string()
    .describe('Exact decimal Int64 call ID. Use callIdExact in call tools.'),
  direction: z.string(),
  status: z.string(),
  rawDigits: z.string(),
  startedAt: z.number().nullable(),
  answeredAt: z.number().nullable(),
  endedAt: z.number().nullable(),
  duration: z.number().nullable(),
  recording: z
    .string()
    .nullable()
    .describe(
      'Sensitive direct MP3 URL, valid for one hour; use download_call_media for a downloadable file.'
    ),
  voicemail: z
    .string()
    .nullable()
    .describe(
      'Sensitive direct MP3 URL, valid for one hour; use download_call_media for a downloadable file.'
    ),
  archived: z.boolean().optional(),
  missedCallReason: z.string().nullable()
};
export const callInputs = {
  callId: z
    .number()
    .optional()
    .describe('Safe numeric call ID from list_calls. Supply callIdExact for larger IDs.'),
  callIdExact: z
    .string()
    .optional()
    .describe(
      'Exact decimal Int64 call ID from list_calls or get_call; supply instead of callId.'
    )
};
export const json = (value: unknown): unknown => {
  let count = 0;
  const visit = (v: unknown, depth: number): void => {
    if (++count > 200000 || depth > 40)
      fail('Aircall JSON exceeds the supported structural bound.', 'aircall_receipt');
    if (typeof v === 'number' && !Number.isFinite(v))
      fail('Aircall returned a non-finite number.', 'aircall_receipt');
    if (Array.isArray(v)) for (const item of v) visit(item, depth + 1);
    else if (v && typeof v === 'object')
      for (const item of Object.values(v)) visit(item, depth + 1);
  };
  visit(value, 0);
  return value;
};
export const parseNativeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return json(value);
  if (Buffer.byteLength(value) > 8 * 1024 * 1024)
    fail('Aircall response exceeds 8 MiB.', 'aircall_receipt');
  if (!value.trim()) return undefined;
  const protectedText = value.replace(
    /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    token => {
      if (token.startsWith('"')) return token;
      const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
      if (!match) return token;
      const fraction = match[3] ?? '',
        exponent = Number(match[4] ?? 0);
      let digits = `${match[2]}${fraction}`,
        shift = exponent - fraction.length;
      if (!Number.isSafeInteger(shift) || Math.abs(shift) > 64 || digits.length > 128)
        return token;
      if (shift < 0) {
        const removed = digits.slice(digits.length + shift);
        if (digits.length < -shift || /[1-9]/.test(removed)) return token;
        digits = digits.slice(0, digits.length + shift) || '0';
      } else digits += '0'.repeat(shift);
      const exact = BigInt(`${match[1]}${digits}`);
      return exact > BigInt(Number.MAX_SAFE_INTEGER) || exact < BigInt(Number.MIN_SAFE_INTEGER)
        ? JSON.stringify(exact.toString())
        : token;
    }
  );
  try {
    return json(JSON.parse(protectedText));
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    return fail('Aircall returned malformed JSON.', 'aircall_receipt');
  }
};
export const upstream = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  const e = error && typeof error === 'object' ? (error as Row) : {};
  const data = e.data && typeof e.data === 'object' ? (e.data as Row) : {};
  if (
    data.code === 'bad_request' &&
    typeof data.reason === 'string' &&
    data.reason.startsWith('aircall_')
  )
    return error;
  return buildApiServiceError(error, {
    providerLabel: 'Aircall',
    reason: 'aircall_api_error',
    operation,
    parent: {},
    extractMessage: () =>
      'Check permissions and supplied IDs; reconcile possible effects before retrying writes.',
    extractStatus: (_error, response) =>
      response?.status ?? (typeof data.status === 'number' ? data.status : undefined)
  });
};
export const absent = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const d = (error as Row).data;
  return (
    !!d &&
    typeof d === 'object' &&
    (d as Row).reason === 'aircall_api_error' &&
    (d as Row).upstreamStatus === 404
  );
};
