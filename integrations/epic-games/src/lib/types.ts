import { createApiServiceError } from 'slates';
import { z } from 'zod';
export function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      `Epic Games returned an invalid ${label}. Check the service response before retrying.`
    );
  return result.data;
}
export const accountSchema = z.object({
  accountId: z.string(),
  displayName: z.string().optional(),
  preferredLanguage: z.string().optional(),
  linkedAccounts: z
    .array(
      z.object({
        identityProviderId: z.string().optional(),
        displayName: z.string().optional()
      })
    )
    .optional()
});
export const externalAccountSchema = z.object({
  accountId: z.string(),
  identityProviderId: z.string(),
  displayName: z.string().optional(),
  lastLogin: z.string().optional()
});
export const sanctionSchema = z.object({
  referenceId: z.string(),
  productUserId: z.string().optional(),
  action: z.string(),
  justification: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  pending: z.boolean().optional(),
  automated: z.boolean().optional(),
  timestamp: z.string().optional(),
  expirationTimestamp: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  displayName: z.string().nullable().optional(),
  deploymentId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional()
});
export const pagingSchema = z.object({
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive()
});
export const reportSchema = z.object({
  productId: z.string().optional(),
  sandboxId: z.string().optional(),
  deploymentId: z.string().optional(),
  time: z.string(),
  reportingPlayerId: z.string(),
  reportedPlayerId: z.string(),
  reasonId: z.number().int(),
  message: z.string().optional(),
  context: z.string().optional()
});
export const ownershipSchema = z.object({
  namespace: z.string(),
  itemId: z.string(),
  owned: z.boolean()
});
export const entitlementSchema = z.object({
  id: z.string(),
  entitlementName: z.string(),
  namespace: z.string(),
  catalogItemId: z.string(),
  entitlementType: z.string(),
  grantDate: z.string(),
  consumable: z.boolean(),
  status: z.string(),
  useCount: z.number().int().nonnegative(),
  entitlementSource: z.string().optional()
});
export function page<T>(
  schema: z.ZodType<T>,
  data: unknown,
  offset: number,
  limit: number,
  label: string
) {
  const result = parse(
    z.object({ elements: z.array(schema), paging: pagingSchema }),
    data,
    label
  );
  if (
    result.paging.offset !== offset ||
    result.paging.limit !== limit ||
    result.elements.length > limit ||
    (result.paging.total < offset + result.elements.length && result.elements.length > 0)
  )
    throw createApiServiceError(
      'Epic Games returned inconsistent native pagination; no complete inventory is claimed.'
    );
  return result;
}
export function sanctions(data: unknown) {
  const envelope = parse(
    z.object({ elements: z.array(z.record(z.string(), z.unknown())) }),
    data,
    'sanction envelope'
  );
  return envelope.elements.map(item => {
    const record = { ...item };
    for (const key of ['timestamp', 'expirationTimestamp'])
      if (typeof record[key] === 'number') {
        const value = record[key];
        if (!Number.isSafeInteger(value) || !Number.isFinite(new Date(value * 1000).getTime()))
          throw createApiServiceError(
            'A sanction timestamp cannot be represented faithfully.'
          );
        record[key] = new Date(value * 1000).toISOString();
      }
    return parse(sanctionSchema, record, 'sanction record');
  });
}
