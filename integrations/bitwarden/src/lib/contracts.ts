import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const fail = (message: string): never => {
  throw createApiServiceError(message, { reason: 'bitwarden_contract' });
};
export const uuid = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
    fail('Use an exact Bitwarden UUID from the corresponding list tool.');
  return (value as string).toLowerCase();
};
export function ids(values: string[]) {
  const result = values.map(uuid);
  if (new Set(result).size !== result.length) fail('Provide each association ID only once.');
  return result;
}
export function legacyAccess(value: boolean) {
  if (value)
    fail(
      'The published current organization Public API does not accept accessAll. Assign explicit collections instead; no change was sent.'
    );
}
export function role(value: number) {
  if (![0, 1, 2, 4].includes(value))
    fail(
      'Use a current role: 0 Owner, 1 Admin, 2 User or 4 Custom. The legacy Manager role 3 is unsupported.'
    );
}
export function policyType(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 22)
    fail('Use a policyType from list_policies (current documented values 0 through 22).');
  return value;
}
export const associationSchema = z.object({
  id: z.string(),
  readOnly: z.boolean(),
  hidePasswords: z.boolean().nullable().optional(),
  manage: z.boolean().nullable().optional()
});
export const permissionsSchema = z
  .object({
    accessEventLogs: z.boolean().optional(),
    accessImportExport: z.boolean().optional(),
    accessReports: z.boolean().optional(),
    createNewCollections: z.boolean().optional(),
    editAnyCollection: z.boolean().optional(),
    deleteAnyCollection: z.boolean().optional(),
    manageGroups: z.boolean().optional(),
    managePolicies: z.boolean().optional(),
    manageSso: z.boolean().optional(),
    manageUsers: z.boolean().optional(),
    manageResetPassword: z.boolean().optional(),
    manageScim: z.boolean().optional(),
    manageAccessRules: z.boolean().optional()
  })
  .strict();
export const memberSchema = z.object({
  object: z.literal('member'),
  id: z.string(),
  userId: z.string().nullable(),
  name: z
    .string()
    .nullable()
    .optional()
    .transform(v => v ?? null),
  email: z.string(),
  twoFactorEnabled: z.boolean(),
  status: z.number().int(),
  type: z.number().int(),
  accessAll: z
    .boolean()
    .optional()
    .transform(v => v ?? null),
  externalId: z
    .string()
    .nullable()
    .optional()
    .transform(v => v ?? null),
  collections: z
    .array(associationSchema)
    .nullable()
    .optional()
    .transform(v => (v === undefined ? undefined : (v ?? []))),
  permissions: permissionsSchema.nullable().optional()
});
export const groupSchema = z.object({
  object: z.literal('group'),
  id: z.string(),
  name: z.string(),
  accessAll: z
    .boolean()
    .optional()
    .transform(v => v ?? null),
  externalId: z
    .string()
    .nullable()
    .optional()
    .transform(v => v ?? null),
  collections: z
    .array(associationSchema)
    .nullable()
    .optional()
    .transform(v => (v === undefined ? undefined : (v ?? [])))
});
export const collectionSchema = z.object({
  object: z.literal('collection'),
  id: z.string(),
  externalId: z
    .string()
    .nullable()
    .optional()
    .transform(v => v ?? null),
  groups: z
    .array(associationSchema)
    .nullable()
    .optional()
    .transform(v => (v === undefined ? undefined : (v ?? [])))
});
export const policySchema = z.object({
  object: z.literal('policy'),
  id: z.string(),
  type: z.number().int(),
  enabled: z.boolean(),
  data: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .transform(v => (v === undefined ? undefined : (v ?? null)))
});
const nullableId = z
  .string()
  .nullable()
  .optional()
  .transform(v => v ?? null);
export const eventSchema = z.object({
  object: z.literal('event'),
  type: z.number().int(),
  itemId: nullableId,
  collectionId: nullableId,
  groupId: nullableId,
  policyId: nullableId,
  memberId: nullableId,
  actingUserId: nullableId,
  date: z.string(),
  device: z
    .number()
    .int()
    .nullable()
    .optional()
    .transform(v => v ?? null),
  ipAddress: z
    .string()
    .nullable()
    .optional()
    .transform(v => v ?? null)
});
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    return fail(
      'Bitwarden returned an unexpected response. Visibility or mutation outcome may be uncertain; verify the exact resource before retrying.'
    );
  return result.data;
}
export function bound<T extends { id: string }>(value: T, expected: string) {
  if (uuid(value.id) !== uuid(expected))
    fail(
      'Bitwarden returned a different resource ID. No further change was sent; reconcile the exact resource.'
    );
  return value;
}
export function requireVisible(value: unknown, fields: string[]) {
  for (const field of fields)
    if (
      !value ||
      typeof value !== 'object' ||
      !Object.hasOwn(value, field) ||
      (value as Record<string, unknown>)[field] === undefined
    )
      fail(
        `The current ${field} field is not visible. No replacement was sent because its existing value cannot be preserved; obtain complete read access or supply an explicit replacement.`
      );
}
export function text(value: string, max: number, label: string, allowEmpty = false) {
  if (
    (!allowEmpty && !value.trim()) ||
    value.length > max ||
    Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    fail(`${label} must be valid text within the documented ${max}-character limit.`);
  try {
    encodeURIComponent(value);
  } catch {
    fail(`${label} contains malformed Unicode.`);
  }
  return value;
}
