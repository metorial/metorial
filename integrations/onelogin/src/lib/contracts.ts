import { z } from 'zod';
import { fail } from './validation';

export { z };

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const string = z.string().nullish();
const number = z.number().nullish();
const record = z.record(z.string(), z.unknown()).nullish();
export const user = z
  .object({
    id,
    username: string,
    email: string,
    firstname: string,
    lastname: string,
    company: string,
    department: string,
    title: string,
    phone: string,
    status: number,
    state: number,
    group_id: number,
    role_ids: z.array(id).nullish(),
    external_id: string,
    directory_id: number,
    manager_user_id: number,
    custom_attributes: record,
    created_at: string,
    updated_at: string,
    last_login: string,
    activated_at: string,
    password_changed_at: string,
    locked_until: string,
    invalid_login_attempts: number
  })
  .passthrough();
export const role = z
  .object({
    id,
    name: z.string(),
    apps: z.array(id).optional(),
    users: z.array(id).optional(),
    admins: z.array(id).optional()
  })
  .passthrough();
export const app = z
  .object({
    id,
    name: z.string(),
    connector_id: number,
    description: string,
    notes: string,
    icon_url: string,
    auth_method: number,
    policy_id: number,
    visible: z.boolean().nullish(),
    role_ids: z.array(id).nullish(),
    provisioning: record,
    sso: record,
    configuration: record,
    parameters: record,
    created_at: string,
    updated_at: string
  })
  .passthrough();
export const group = z.object({ id, name: z.string(), reference: string }).passthrough();
const member = z
  .object({ id, email: string, first_name: string, last_name: string })
  .passthrough();
export const fullGroup = group.extend({
  policy: z.object({ id, name: z.string() }).nullable(),
  users: z.array(member),
  admins: z.array(member)
});
export const event = z
  .object({
    id,
    event_type_id: id,
    created_at: string,
    user_id: number,
    user_name: string,
    actor_user_id: number,
    actor_user_name: string,
    app_id: number,
    app_name: string,
    ipaddr: string,
    role_id: number,
    role_name: string,
    group_id: number,
    group_name: string,
    custom_message: string,
    notes: string,
    error_description: string,
    risk_score: number
  })
  .passthrough();
export const eventType = z.object({ id, name: z.string(), description: string }).passthrough();
export const factor = z
  .object({ factor_id: id, name: z.string(), auth_factor_name: string })
  .passthrough();
const deviceId = z
  .union([id, z.string().regex(/^[1-9][0-9]*$/)])
  .refine(value => Number.isSafeInteger(Number(value)));
export const device = z
  .object({
    device_id: deviceId,
    user_display_name: string,
    type_display_name: string,
    auth_factor_name: string,
    default: z.boolean().nullish()
  })
  .passthrough();
export const enrollment = z
  .object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'accepted']),
    auth_factor_name: string,
    type_display_name: string,
    expires_at: string,
    device_id: deviceId.nullish(),
    factor_data: z.record(z.string(), z.unknown()).nullish()
  })
  .passthrough();
export const nativePagination = z
  .object({
    after_cursor: z.string().nullish(),
    before_cursor: z.string().nullish(),
    next_link: z.string().nullish(),
    previous_link: z.string().nullish(),
    total_count: z.number().int().nonnegative().optional()
  })
  .passthrough();
export const v1Status = z
  .object({
    status: z.object({ error: z.literal(false), code: z.literal(200) }).passthrough()
  })
  .passthrough();
export const publicPagination = z.object({
  afterCursor: z.string().nullable(),
  beforeCursor: z.string().nullable(),
  currentPage: z.number().int().positive().nullable(),
  totalPages: z.number().int().nonnegative().nullable(),
  totalCount: z.number().int().nonnegative().nullable()
});
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    fail(
      'OneLogin returned an unexpected native response. A preceding write may have taken effect; reconcile it in OneLogin before retrying.'
    );
  return parsed.data;
}
