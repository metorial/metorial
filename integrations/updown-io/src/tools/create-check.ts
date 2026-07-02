import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checkSchema } from '../lib/types';
import { spec } from '../spec';

export let createCheck = SlateTool.create(spec, {
  name: 'Create Check',
  key: 'create_check',
  description: `Create a new uptime monitoring check. Monitors a URL by periodically sending HTTP requests and alerting when the site is unresponsive or returns errors. Supports HTTPS, HTTP, ICMP, TCP, and pulse (heartbeat) check types.`,
  instructions: [
    'For pulse checks, set type to "pulse" — no URL is required for heartbeat monitoring.',
    'The period must be between 15 and 3600 seconds for regular checks, or up to 2592000 (1 month) for pulse checks.',
    'Use disabledLocations to exclude specific monitoring nodes (e.g. "lan", "mia", "fra", "tok", "syd").',
    'Set muteUntil to an ISO 8601 timestamp, "recovery", or "forever" to mute alerts.'
  ]
})
  .input(
    z.object({
      url: z.string().describe('The URL to monitor (e.g. https://example.com)'),
      type: z
        .enum(['https', 'http', 'icmp', 'tcp', 'tcps', 'pulse'])
        .optional()
        .describe('Protocol type. Defaults to https.'),
      period: z
        .number()
        .optional()
        .describe('Check interval in seconds (15-3600 for regular, up to 2592000 for pulse)'),
      apdexT: z
        .number()
        .optional()
        .describe('APDEX performance threshold in seconds (0.125 to 8.0)'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the check is active. Defaults to true.'),
      published: z
        .boolean()
        .optional()
        .describe('Whether the check status is publicly visible'),
      alias: z.string().optional().describe('Human-readable display name for the check'),
      stringMatch: z.string().optional().describe('String to verify in the response body'),
      httpVerb: z
        .enum(['GET/HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
        .optional()
        .describe('HTTP method to use'),
      httpBody: z.string().optional().describe('HTTP body to send with the request'),
      disabledLocations: z
        .array(z.string())
        .optional()
        .describe('Monitoring location codes to disable'),
      recipients: z.array(z.string()).optional().describe('Alert recipient IDs to assign'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers to send with each check request'),
      muteUntil: z
        .string()
        .optional()
        .describe('Mute alerts until this ISO 8601 timestamp, "recovery", or "forever"')
    })
  )
  .output(checkSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let check = await client.createCheck({
      ...ctx.input,
      customHeaders: ctx.input.customHeaders as Record<string, string> | undefined
    });

    return {
      output: check,
      message: `Created monitoring check for **${check.alias || check.url}** (token: \`${check.token}\`). Checking every ${check.period}s.`
    };
  })
  .build();
