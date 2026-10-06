import { createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export const malformed = () =>
  createApiServiceError(
    'Make returned an incomplete or inconsistent receipt. Read the exact resource before retrying; a write or execution may already have taken effect.',
    { reason: 'invalid_response' }
  );
export function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw malformed();
  return result.data;
}
export function input<T extends z.ZodType>(
  schema: T,
  value: unknown,
  message: string
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw invalid(message);
  return result.data;
}
export const id = z.number().int().safe().positive();
export const count = z.number().int().safe().nonnegative();
export const record = z.record(z.string(), z.unknown());
export const zones = [
  'eu1.make.com',
  'eu2.make.com',
  'us1.make.com',
  'us2.make.com',
  'eu1.make.celonis.com',
  'us1.make.celonis.com'
] as const;
export const zone = z.enum(zones);
export const zoneInput = zone
  .optional()
  .describe(
    'Regional Make host where your organization is located; defaults to eu1.make.com for new connections.'
  );
export const paging = z
  .object({
    limit: count.optional(),
    offset: count.optional(),
    last: z.string().optional(),
    showLast: z.boolean().optional(),
    sortBy: z.string().optional(),
    sortDir: z.string().optional()
  })
  .passthrough();
export const nativeScenario = z
  .object({
    id,
    name: z.string(),
    teamId: id.optional(),
    isActive: z.boolean().optional(),
    isPaused: z.boolean().optional(),
    created: z.string().nullish(),
    lastEdit: z.string().nullish(),
    nextExec: z.string().nullish(),
    description: z.string().nullish(),
    scheduling: record.optional(),
    deleted: z.boolean().optional(),
    deletedAt: z.string().nullish()
  })
  .passthrough();
export const nativeConnection = z
  .object({
    id,
    name: z.string().optional(),
    teamId: id.optional(),
    accountName: z.string().nullish(),
    accountType: z.string().nullish(),
    accountLabel: z.string().nullish(),
    expired: z.boolean().optional()
  })
  .passthrough();
export const nativeStore = z
  .object({
    id,
    name: z.string(),
    teamId: id.optional(),
    records: count.optional(),
    size: z.string().optional(),
    maxSize: z.string().optional(),
    datastructureId: id.optional()
  })
  .passthrough();
export const nativeHook = z
  .object({
    id,
    name: z.string().optional(),
    teamId: id.optional(),
    typeName: z.string().optional(),
    url: z.string().nullish(),
    enabled: z.boolean().optional(),
    gone: z.boolean().optional(),
    scenarioId: id.nullish(),
    queueCount: count.optional(),
    data: record.optional()
  })
  .passthrough();
export const nativeOrganization = z
  .object({
    id,
    name: z.string().optional(),
    zone: z.string().optional(),
    countryId: id.optional(),
    timezoneId: id.optional()
  })
  .passthrough();
export const nativeTeam = z
  .object({ id, name: z.string().optional(), organizationId: id.optional() })
  .passthrough();
export const nativeUser = z
  .object({
    id,
    name: z.string().nullish(),
    email: z.string().nullish(),
    language: z.string().nullish(),
    avatar: z.string().nullish(),
    lastLogin: z.string().nullish()
  })
  .passthrough();
export const nativeStructure = z
  .object({
    id,
    teamId: id,
    name: z.string(),
    strict: z.boolean(),
    spec: z.array(record).max(1000)
  })
  .passthrough();
export const nativeRecord = z.object({ key: z.string().min(1), data: record }).passthrough();
export const recordPage = z
  .object({
    records: z.array(nativeRecord).max(1000),
    count: count.optional(),
    pg: paging.optional()
  })
  .passthrough();
export const nativeLog = z
  .object({
    id: z.string().optional(),
    imtId: z.string().optional(),
    timestamp: z.string().optional(),
    status: z.number().int().safe().optional(),
    operations: count.optional(),
    duration: count.optional(),
    transfer: count.optional(),
    centicredits: count.optional(),
    eventType: z.string().optional(),
    resumeAt: z.string().optional(),
    interruptReason: z.enum(['sleep', 'hitl']).optional()
  })
  .passthrough();
export const execution = z
  .object({
    status: z.enum(['RUNNING', 'SUCCESS', 'WARNING', 'ERROR', 'PAUSED']),
    resumeAt: z.string().optional(),
    interruptReason: z.enum(['sleep', 'hitl']).optional(),
    outputs: record.optional(),
    error: record.optional()
  })
  .passthrough();
export const key = z
  .string()
  .min(1)
  .max(512)
  .refine(v => [...v].every(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127));
export const executionId = key.describe(
  'Exact execution ID from manage_scenario run or get_scenario_logs.'
);
export const numericSize = (value: string | undefined) =>
  value !== undefined && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : undefined;
export const scenarioOutput = (s: z.output<typeof nativeScenario>) => ({
  scenarioId: s.id,
  name: s.name,
  teamId: s.teamId,
  isActive: s.isActive,
  isPaused: s.isPaused,
  createdAt: s.created ?? undefined,
  updatedAt: s.lastEdit ?? undefined,
  nextExec: s.nextExec ?? undefined,
  description: s.description ?? undefined
});
export const storeOutput = (s: z.output<typeof nativeStore>) => ({
  dataStoreId: s.id,
  name: s.name,
  teamId: s.teamId,
  records: s.records,
  size: numericSize(s.size),
  maxSize: numericSize(s.maxSize),
  exactSize: s.size,
  exactMaxSize: s.maxSize,
  dataStructureId: s.datastructureId
});
