import { z } from 'zod';

export let sslSchema = z
  .object({
    testedAt: z.string().optional(),
    expiresAt: z.string().optional(),
    valid: z.boolean().optional(),
    error: z.string().optional().nullable()
  })
  .optional()
  .nullable();

export let checkSchema = z.object({
  token: z.string().describe('Unique identifier for the check'),
  url: z.string().describe('URL being monitored'),
  alias: z.string().optional().nullable().describe('Human-readable display name'),
  lastStatus: z.number().optional().nullable().describe('Last HTTP status code'),
  uptime: z.number().describe('Uptime percentage (0-100)'),
  down: z.boolean().describe('Whether the check is currently down'),
  downSince: z
    .string()
    .optional()
    .nullable()
    .describe('ISO 8601 timestamp when the site went down'),
  upSince: z
    .string()
    .optional()
    .nullable()
    .describe('ISO 8601 timestamp when the site came back up'),
  error: z.string().optional().nullable().describe('Error message if down'),
  period: z.number().describe('Check interval in seconds'),
  apdexT: z.number().describe('APDEX threshold in seconds'),
  stringMatch: z.string().optional().nullable().describe('String to match in response body'),
  enabled: z.boolean().describe('Whether the check is active'),
  published: z.boolean().describe('Whether the check status is publicly visible'),
  disabledLocations: z.array(z.string()).describe('Disabled monitoring location codes'),
  recipients: z.array(z.string()).describe('Alert recipient IDs'),
  lastCheckAt: z.string().optional().nullable().describe('ISO 8601 timestamp of last check'),
  nextCheckAt: z
    .string()
    .optional()
    .nullable()
    .describe('ISO 8601 timestamp of next scheduled check'),
  createdAt: z.string().optional().nullable().describe('ISO 8601 timestamp of creation'),
  muteUntil: z
    .string()
    .optional()
    .nullable()
    .describe('ISO 8601 timestamp until which alerts are muted'),
  faviconUrl: z.string().optional().nullable().describe('URL of the monitored site favicon'),
  customHeaders: z
    .record(z.string(), z.string())
    .optional()
    .nullable()
    .describe('Custom HTTP headers sent with checks'),
  httpVerb: z.string().optional().nullable().describe('HTTP method used for checks'),
  httpBody: z.string().optional().nullable().describe('HTTP body sent with checks'),
  ssl: sslSchema.describe('SSL certificate information')
});

export let downtimeSchema = z.object({
  downtimeId: z.string().describe('Unique identifier for the downtime event'),
  error: z.string().describe('Error description'),
  startedAt: z.string().describe('ISO 8601 timestamp when downtime started'),
  endedAt: z
    .string()
    .optional()
    .nullable()
    .describe('ISO 8601 timestamp when downtime ended (null if ongoing)'),
  duration: z.number().optional().nullable().describe('Duration of downtime in seconds'),
  partial: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether downtime was partial (e.g. IPv6-only)')
});

export let metricsRequestsSchema = z.object({
  samples: z.number().describe('Number of request samples'),
  failures: z.number().describe('Number of failed requests'),
  satisfied: z.number().describe('Requests within APDEX threshold'),
  tolerated: z.number().describe('Requests between 1x and 4x APDEX threshold'),
  byResponseTime: z
    .record(z.string(), z.number())
    .optional()
    .nullable()
    .describe('Request count distribution by response time bucket')
});

export let metricsTimingsSchema = z.object({
  redirect: z.number().optional().nullable().describe('Redirect time in ms'),
  namelookup: z.number().optional().nullable().describe('DNS lookup time in ms'),
  connection: z.number().optional().nullable().describe('TCP connection time in ms'),
  handshake: z.number().optional().nullable().describe('TLS handshake time in ms'),
  response: z.number().optional().nullable().describe('Response time in ms'),
  total: z.number().optional().nullable().describe('Total request time in ms')
});

export let metricsEntrySchema = z.object({
  apdex: z.number().describe('APDEX score (0.0 to 1.0)'),
  requests: metricsRequestsSchema,
  timings: metricsTimingsSchema
});

export let recipientSchema = z.object({
  recipientId: z.string().describe('Unique identifier for the recipient'),
  type: z
    .string()
    .describe('Recipient type (email, sms, webhook, slack_compatible, msteams, etc.)'),
  name: z.string().optional().nullable().describe('Display name for the recipient'),
  value: z.string().describe('Recipient address (email, phone, URL, etc.)'),
  selected: z
    .boolean()
    .optional()
    .describe('Whether recipient is selected by default for new checks')
});

export let statusPageSchema = z.object({
  statusPageToken: z.string().describe('Unique identifier for the status page'),
  url: z.string().optional().nullable().describe('Public URL of the status page'),
  name: z.string().optional().nullable().describe('Name of the status page'),
  description: z
    .string()
    .optional()
    .nullable()
    .describe('Description displayed on the status page'),
  visibility: z
    .string()
    .optional()
    .nullable()
    .describe('Visibility setting: public, protected, or private'),
  checks: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('Ordered list of check tokens displayed on the page')
});

export let nodeSchema = z.object({
  nodeCode: z.string().describe('Location code (e.g. lan, mia, fra)'),
  ip: z.string().describe('IPv4 address'),
  ip6: z.string().describe('IPv6 address'),
  city: z.string().describe('City name'),
  country: z.string().describe('Country name'),
  countryCode: z.string().describe('ISO country code'),
  lat: z.number().describe('Latitude coordinate'),
  lng: z.number().describe('Longitude coordinate')
});

export type Check = z.infer<typeof checkSchema>;
export type Downtime = z.infer<typeof downtimeSchema>;
export type MetricsEntry = z.infer<typeof metricsEntrySchema>;
export type Recipient = z.infer<typeof recipientSchema>;
export type StatusPage = z.infer<typeof statusPageSchema>;
export type Node = z.infer<typeof nodeSchema>;
