import { z } from 'zod';
export const nativeId = z
  .string()
  .min(1)
  .max(1024)
  .refine(
    v =>
      v === v.trim() &&
      v !== '.' &&
      v !== '..' &&
      ![...v].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  );
export const userSchema = z.object({
  id: nativeId,
  name: z.string(),
  externalUserId: z.string(),
  isTestUser: z.boolean().optional()
});
export const configValuesSchema = z
  .array(z.object({ externalId: nativeId, value: z.string() }))
  .refine(v => new Set(v.map(s => s.externalId)).size === v.length);
export const authValuesSchema = z
  .array(z.object({ externalId: nativeId, authId: nativeId }))
  .refine(v => new Set(v.map(s => s.externalId)).size === v.length);
export const instanceSchema = z.object({
  id: nativeId,
  name: z.string(),
  enabled: z.boolean(),
  created: z.string(),
  owner: nativeId,
  solution: z.object({ id: nativeId }).optional(),
  solutionVersionFlags: z.object({
    hasNewerVersion: z.boolean(),
    requiresUserInputToUpdateVersion: z.boolean().optional(),
    requiresSystemInputToUpdateVersion: z.boolean().optional()
  }),
  configValues: configValuesSchema,
  authValues: authValuesSchema
});
export const solutionSchema = z.object({
  id: nativeId,
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  configSlots: z
    .array(
      z.object({
        externalId: z.string(),
        title: z.string(),
        defaultValue: z.unknown().optional()
      })
    )
    .optional(),
  customFields: z.array(z.object({ key: z.string(), value: z.unknown() })).optional()
});
export const authenticationSchema = z.object({
  id: nativeId,
  name: z.string(),
  serviceEnvironmentId: nativeId,
  scopes: z.array(z.string()).optional()
});
export const authNodeSchema = z.object({
  id: nativeId,
  name: z.string(),
  service: z.object({
    id: nativeId,
    name: z.string(),
    title: z.string(),
    version: z
      .union([z.string(), z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)])
      .optional()
  })
});
export const serviceSchema = z.object({
  id: nativeId,
  name: z.string(),
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
});
export const connectorSchema = z.object({
  name: z.string(),
  version: z.string(),
  title: z.string(),
  description: z.string(),
  service: serviceSchema.optional()
});
export const operationSchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  hasDynamicOutput: z.boolean(),
  authScopes: z.array(z.string()).optional()
});
export const environmentSchema = z.object({
  id: nativeId,
  title: z.string(),
  scopes: z.array(z.unknown()),
  userDataSchema: z.record(z.string(), z.unknown()),
  credentialsSchema: z.record(z.string(), z.unknown()),
  authenticationType: z.string().optional()
});
