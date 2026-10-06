import { createApiServiceError } from 'slates';
import { z } from 'zod';

const id = z.number().positive().max(Number.MAX_SAFE_INTEGER).multipleOf(1);
const text = z.string();
export const systemResponse = z.object({
  id,
  name: text,
  hostname: text.nullish(),
  ip_address: text.nullish(),
  last_event_at: text.nullish(),
  auto_delete: z.boolean().optional(),
  syslog: z.object({ hostname: text, port: id }).optional()
});
export const groupResponse = z.object({
  id,
  name: text,
  system_wildcard: text.nullish(),
  systems: z.array(z.object({ id, name: text }))
});
export const savedSearchResponse = z.object({
  id,
  name: text,
  query: text,
  group: z.object({ id, name: text }).nullish()
});
export const userResponse = z.object({ id, email: text });
export const destinationResponse = z.object({
  id,
  description: text.optional(),
  filter: text.nullish(),
  syslog: z.object({ hostname: text, port: id, description: text.optional() }).optional()
});
export const usageResponse = z.object({
  log_data_transfer_used: z.number().nonnegative(),
  log_data_transfer_used_percent: z.number().nonnegative().optional(),
  log_data_transfer_plan_limit: z.number().nonnegative(),
  log_data_transfer_hard_limit: z.number().nonnegative()
});
export const legacyAccountResponse = usageResponse.partial().extend({
  id,
  name: text,
  plan_name: text.optional()
});
// Event IDs are 64-bit decimal strings. Reject unsafe numeric IDs rather than silently rounding them.
const eventId = z.union([
  z.string().regex(/^\d+$/),
  z.number().nonnegative().max(Number.MAX_SAFE_INTEGER).multipleOf(1)
]);
export const searchResponse = z.object({
  events: z.array(
    z.object({
      id: eventId,
      generated_at: text.optional(),
      received_at: text,
      display_received_at: text,
      source_id: id,
      source_name: text,
      source_ip: text,
      facility: text,
      severity: text,
      hostname: text,
      program: text.nullish(),
      message: text
    })
  ),
  min_id: eventId.optional(),
  max_id: eventId.optional(),
  min_time_at: text.optional(),
  max_time_at: text.optional(),
  reached_time_limit: z.boolean().optional(),
  reached_record_limit: z.boolean().optional(),
  reached_beginning: z.boolean().optional(),
  reached_end: z.boolean().optional()
});
export const archiveResponse = z.object({
  start: text,
  end: text,
  filename: text,
  filesize: z.number().nonnegative(),
  _links: z.object({ download: z.object({ href: text }) })
});
export const parseResponse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success)
    throw createApiServiceError(
      'Papertrail returned an invalid response. Retry the request; if it persists, check the provider service.',
      { reason: 'papertrail_invalid_response' }
    );
  return result.data;
};
export const mapSystem = (s: z.infer<typeof systemResponse>) => ({
  systemId: s.id,
  name: s.name,
  hostname: s.hostname ?? null,
  ipAddress: s.ip_address ?? null,
  lastEventAt: s.last_event_at ?? null,
  autoDelete: s.auto_delete,
  syslogHostname: s.syslog?.hostname,
  syslogPort: s.syslog?.port
});
export const mapGroup = (g: z.infer<typeof groupResponse>) => ({
  groupId: g.id,
  name: g.name,
  systemWildcard: g.system_wildcard ?? null,
  systems: g.systems.map(s => ({ systemId: s.id, name: s.name }))
});
export const mapSavedSearch = (s: z.infer<typeof savedSearchResponse>) => ({
  searchId: s.id,
  name: s.name,
  query: s.query,
  groupId: s.group?.id ?? null,
  groupName: s.group?.name ?? null
});
export const mapDestination = (d: z.infer<typeof destinationResponse>) => ({
  destinationId: d.id,
  description: d.syslog?.description ?? d.description,
  syslogHostname: d.syslog?.hostname,
  syslogPort: d.syslog?.port,
  filter: d.filter ?? null
});
export const archiveUrl = (href: string): string => {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw createApiServiceError('Papertrail returned an invalid archive download URL.');
  }
  if (
    url.origin !== 'https://papertrailapp.com' ||
    !/^\/api\/v1\/archives\/\d{4}-\d{2}-\d{2}(?:-\d{2})?\/download$/.test(url.pathname) ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw createApiServiceError(
      'Papertrail returned an unexpected archive download URL. Request the archive list again.'
    );
  return url.toString();
};
