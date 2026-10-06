import { z } from 'zod';

export const channelSchema = z
  .object({
    integration: z
      .enum(['email', 'webhook', 'pagerduty', 'slack'])
      .describe('Alert channel type'),
    emails: z.array(z.string()).optional().describe('Email addresses for email alerts'),
    url: z.string().optional().describe('Webhook URL'),
    key: z.string().optional().describe('PagerDuty or Slack key'),
    method: z.string().optional().describe('HTTP method for webhook (POST, PUT, etc.)'),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe('Custom headers for webhook'),
    bodyTemplate: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Custom body template for webhook'),
    triggerlimit: z
      .number()
      .optional()
      .describe('Number of lines that must match to trigger alert'),
    triggerinterval: z
      .string()
      .optional()
      .describe('Time interval for the trigger (e.g., "30", "1m", "15m")'),
    operator: z.string().optional().describe('Alert condition operator (presence, absence)'),
    immediate: z
      .string()
      .optional()
      .describe('Whether to send alert immediately ("true" or "false")'),
    terminal: z
      .string()
      .optional()
      .describe('Whether to include terminal output ("true" or "false")'),
    timezone: z.string().optional().describe('Timezone for alert schedule'),
    autoresolve: z
      .boolean()
      .optional()
      .describe('Enable PagerDuty automatic incident resolution'),
    autoresolveinterval: z
      .string()
      .optional()
      .describe('PagerDuty automatic resolution aggregation interval'),
    autoresolvelimit: z
      .number()
      .nonnegative()
      .optional()
      .describe('Matching line threshold for PagerDuty automatic resolution')
  })
  .describe('Alert channel configuration');

export const logFilterSchema = z.object({
  from: z
    .number()
    .multipleOf(1)
    .nonnegative()
    .describe(
      'Start Unix timestamp in seconds or milliseconds; 0 uses the retention boundary'
    ),
  to: z
    .number()
    .multipleOf(1)
    .nonnegative()
    .describe('End Unix timestamp in seconds or milliseconds; 0 uses the current time'),
  query: z.string().optional().describe('Search query string to filter logs'),
  levels: z.string().optional().describe('Comma-separated log levels'),
  apps: z.string().optional().describe('Comma-separated application names'),
  hosts: z.string().optional().describe('Comma-separated hostnames'),
  prefer: z
    .enum(['head', 'tail'])
    .optional()
    .describe('Return oldest (head) or newest (tail) results first'),
  size: z
    .number()
    .multipleOf(1)
    .min(1)
    .max(10000)
    .optional()
    .describe('Maximum number of log lines, from 1 to 10000')
});
