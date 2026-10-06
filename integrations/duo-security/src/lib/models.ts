import { requireValue, z } from './contracts';

const text = z.string(),
  count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  id = text.regex(/^[A-Za-z0-9]{20}$/),
  optional = text.nullable().optional();
export const phone = z
  .object({
    phone_id: id,
    number: optional,
    name: optional,
    type: optional,
    platform: optional,
    activated: z.boolean().optional(),
    model: optional,
    last_seen: optional
  })
  .passthrough();
export const group = z
  .object({
    group_id: id,
    name: text,
    desc: optional,
    status: optional,
    push_enabled: z.boolean().optional(),
    sms_enabled: z.boolean().optional(),
    voice_enabled: z.boolean().optional(),
    mobile_otp_enabled: z.boolean().optional()
  })
  .passthrough();
export const user = z
  .object({
    user_id: id,
    username: text,
    status: text,
    is_enrolled: z.boolean(),
    email: optional,
    realname: optional,
    firstname: optional,
    lastname: optional,
    notes: optional,
    created: count.optional(),
    last_login: count.nullable().optional(),
    phones: z.array(phone).optional(),
    groups: z.array(group).optional(),
    tokens: z
      .array(z.object({ token_id: id, serial: optional, type: optional }).passthrough())
      .optional()
  })
  .passthrough();
export const admin = z
  .object({
    admin_id: id,
    name: text,
    email: text,
    phone: optional,
    role: optional,
    status: optional,
    last_login: count.nullable().optional(),
    created: count.optional(),
    activation_url: text.optional(),
    activation_url_expires: count.optional()
  })
  .passthrough();
export const integration = z
  .object({
    integration_key: id,
    name: text,
    type: optional,
    adminapi_admins: count.optional(),
    groups_allowed: z.array(text).optional(),
    notes: optional,
    self_service_allowed: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
    username_normalization_policy: optional
  })
  .passthrough();
const log = z
  .object({
    timestamp: count.optional(),
    credits: z.number().finite().nonnegative().optional()
  })
  .passthrough();
const metadata = z
  .object({
    total_objects: count.optional(),
    next_offset: z.union([count, z.array(text).length(2)]).optional()
  })
  .passthrough();
export function validateNative(method: string, path: string, data: unknown) {
  const envelope = z
    .object({ stat: z.literal('OK'), response: z.unknown(), metadata: metadata.optional() })
    .passthrough()
    .safeParse(data);
  requireValue(
    envelope.success,
    'Duo did not confirm the operation. Check API grants, application type and request parameters.'
  );
  const parts = path.split('/'),
    kind = parts[3],
    tail = parts[4];
  let schema: z.ZodType = z.unknown();
  if (
    method === 'DELETE' ||
    (['groups', 'phones'].includes(parts[5] ?? '') && method === 'POST')
  )
    schema = z.literal('');
  else if (tail === 'enroll') schema = text.min(1);
  else if (parts[5] === 'bypass_codes') schema = z.array(text.min(1));
  else if (parts[5] === 'groups') schema = z.array(group);
  else if (parts[5] === 'phones') schema = z.array(phone);
  else if (kind === 'users') schema = tail || method === 'POST' ? user : z.array(user);
  else if (kind === 'groups') schema = tail || method === 'POST' ? group : z.array(group);
  else if (kind === 'phones') schema = tail || method === 'POST' ? phone : z.array(phone);
  else if (kind === 'admins') schema = tail || method === 'POST' ? admin : z.array(admin);
  else if (kind === 'integrations')
    schema = tail || method === 'POST' ? integration : z.array(integration);
  else if (kind === 'logs')
    schema =
      parts[2] === 'v2'
        ? z.object({ authlogs: z.array(log), metadata: metadata.optional() }).passthrough()
        : z.array(log);
  else if (kind === 'settings')
    schema = z
      .object({
        name: text.optional(),
        lockout_threshold: count.optional(),
        lockout_expire_duration: count.nullable().optional(),
        inactive_user_expiration: count.optional(),
        sms_message: optional,
        fraud_email: optional,
        caller_id: optional
      })
      .passthrough();
  else if (kind === 'info')
    schema = z
      .object({
        admin_count: count,
        integration_count: count,
        user_count: count,
        telephony_credits_remaining: z.number().finite().nonnegative(),
        edition: text.optional()
      })
      .passthrough();
  if (
    method === 'GET' &&
    !tail &&
    ['users', 'groups', 'phones', 'admins', 'integrations'].includes(kind ?? '')
  ) {
    const meta = envelope.data.metadata;
    if (meta?.next_offset !== undefined)
      requireValue(
        typeof meta.next_offset === 'number',
        'Duo returned an invalid collection cursor.'
      );
  }
  requireValue(
    schema.safeParse(envelope.data.response).success,
    'Duo returned an invalid native receipt; the operation state is unconfirmed.'
  );
}

export function withoutIntegrationSecrets(path: string, data: unknown) {
  if (
    !/^\/admin\/v[123]\/integrations(?:\/[A-Za-z0-9]{20})?$/.test(path) ||
    !data ||
    typeof data !== 'object' ||
    !('response' in data)
  )
    return data;
  const omit = (row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    const { secret_key: _secret, ...safe } = row as Record<string, unknown>;
    return safe;
  };
  return {
    ...data,
    response: Array.isArray(data.response) ? data.response.map(omit) : omit(data.response)
  };
}
