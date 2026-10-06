import { createApiServiceError } from 'slates';
import { z } from 'zod';

export function invalidInput(message: string): never {
  throw createApiServiceError(message, { reason: 'invalid_input' });
}
export let readResponse = <T>(schema: z.ZodType<T>, data: unknown, operation: string): T => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw createApiServiceError(
      `UptimeRobot returned an unexpected response for ${operation}.`,
      {
        reason: 'invalid_response'
      }
    );
  }
  return result.data;
};
export let idSchema = z.preprocess(
  value => (typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value),
  z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
);
export let paginationSchema = z.object({
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive()
});
export let legacyMonitorSchema = z.object({
  id: idSchema,
  friendly_name: z.string(),
  url: z.string(),
  type: z.number(),
  status: z.number(),
  interval: z.number(),
  custom_uptime_ratios: z.string().optional(),
  custom_uptime_ratio: z.string().optional(),
  ssl: z
    .object({
      brand: z.string().optional(),
      product: z.string().nullable().optional(),
      expires: z.number().optional()
    })
    .optional()
});
export let legacyContactSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  friendly_name: z.string(),
  type: z.number(),
  status: z.number(),
  value: z.string()
});
export let legacyPageSchema = z.object({
  id: idSchema,
  friendly_name: z.string(),
  monitors: z
    .union([z.string(), z.number(), z.array(z.union([z.number(), z.string()]))])
    .transform(value => (Array.isArray(value) ? value.join('-') : String(value))),
  sort: z.number(),
  status: z.number(),
  standard_url: z.string().optional(),
  custom_url: z.string().optional()
});
export let legacyWindowSchema = z.object({
  id: idSchema,
  friendly_name: z.string(),
  type: z.number(),
  start_time: z.union([z.string(), z.number()]),
  duration: z.number(),
  value: z.string().optional(),
  status: z.number()
});
export let accountSchema = z
  .object({
    email: z.string(),
    monitor_limit: z.number(),
    monitor_interval: z.number(),
    up_monitors: z.number(),
    down_monitors: z.number(),
    pause_monitors: z.number().optional(),
    paused_monitors: z.number().optional()
  })
  .transform(account => {
    let paused = account.pause_monitors ?? account.paused_monitors;
    if (paused === undefined)
      return invalidInput('UptimeRobot account response omitted the paused monitor count.');
    return { ...account, paused_monitors: paused };
  });

// Select only public monitoring information; provider responses also contain API keys,
// heartbeat capabilities, request headers, passwords and request bodies.
export let currentMonitorSchema = z.object({
  id: z.number().int().positive(),
  friendlyName: z.string(),
  type: z.union([z.string(), z.number()]),
  status: z.union([z.string(), z.number()]),
  interval: z.number(),
  url: z.string().nullable(),
  timeout: z.number().nullable().optional(),
  port: z.number().nullable().optional(),
  gracePeriod: z.number().nullable().optional(),
  keywordValue: z.string().nullable().optional(),
  keywordType: z.union([z.string(), z.number()]).nullable().optional(),
  keywordCaseType: z.union([z.string(), z.number()]).nullable().optional(),
  currentStateDuration: z.number().optional(),
  groupId: z.number().nullable().optional()
});
export type CurrentMonitor = z.infer<typeof currentMonitorSchema>;
export let currentUserSchema = z.object({
  email: z.string(),
  fullName: z.string(),
  monitorsCount: z.number(),
  monitorLimit: z.number(),
  dependencyMonitorsCount: z.number(),
  dependencyMonitorLimit: z.number(),
  smsCredits: z.number()
});
export let incidentSchema = z.object({
  id: z.string(),
  status: z.union([z.string(), z.number()]),
  type: z.union([z.string(), z.number()]),
  cause: z.number().nullable(),
  reason: z.string(),
  monitor: z.object({ id: z.number().int().positive(), friendlyName: z.string().nullable() }),
  commentsCount: z.number(),
  startedAt: z.union([z.string(), z.number()]),
  resolvedAt: z.union([z.string(), z.number()]).nullable(),
  duration: z.number().nullable(),
  includeInReports: z.boolean()
});
export let safeMonitorUrl = (url: string | null): string | null => {
  if (!url) return url;
  try {
    let parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '[redacted]';
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    let host = url.split(/[?#]/)[0]!;
    return host.includes('@') || host.includes('://') ? '[redacted]' : host;
  }
};
export let contactValue = (type: number, value: string) => (type === 2 ? value : '[redacted]');
export let positiveId = (value: number, field = 'ID') => {
  if (!Number.isSafeInteger(value) || value <= 0)
    invalidInput(`${field} must be a positive integer.`);
};
export let validatePage = (offset?: number, limit?: number) => {
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0))
    invalidInput('offset must be a nonnegative integer.');
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50))
    invalidInput('limit must be an integer between 1 and 50.');
};
