import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checkSchema } from '../lib/types';
import { spec } from '../spec';

export let updateCheck = SlateTool.create(spec, {
  name: 'Update Check',
  key: 'update_check',
  description: `Update an existing uptime monitoring check's configuration. Modify the URL, check frequency, alert settings, HTTP configuration, monitoring locations, and more. Only provided fields are updated.`,
  instructions: [
    'Set muteUntil to an ISO 8601 timestamp, "recovery", or "forever" to mute alerts. Set to empty string or null to unmute.'
  ]
})
  .input(
    z.object({
      checkToken: z.string().describe('The unique token identifier of the check to update'),
      url: z.string().optional().describe('New URL to monitor'),
      type: z
        .enum(['https', 'http', 'icmp', 'tcp', 'tcps', 'pulse'])
        .optional()
        .describe('Protocol type'),
      period: z.number().optional().describe('Check interval in seconds'),
      apdexT: z
        .number()
        .optional()
        .describe('APDEX performance threshold in seconds (0.125 to 8.0)'),
      enabled: z.boolean().optional().describe('Whether the check is active'),
      published: z
        .boolean()
        .optional()
        .describe('Whether the check status is publicly visible'),
      alias: z.string().optional().describe('Human-readable display name'),
      stringMatch: z.string().optional().describe('String to verify in response body'),
      httpVerb: z
        .enum(['GET/HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
        .optional()
        .describe('HTTP method to use'),
      httpBody: z.string().optional().describe('HTTP body to send'),
      disabledLocations: z
        .array(z.string())
        .optional()
        .describe('Monitoring location codes to disable'),
      recipients: z.array(z.string()).optional().describe('Alert recipient IDs'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers'),
      muteUntil: z
        .string()
        .optional()
        .nullable()
        .describe('Mute alerts until this timestamp, "recovery", or "forever"')
    })
  )
  .output(checkSchema)
  .handleInvocation(async ctx => {
    let { checkToken, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let check = await client.updateCheck(checkToken, {
      ...updateData,
      customHeaders: updateData.customHeaders as Record<string, string> | undefined,
      muteUntil: updateData.muteUntil ?? undefined
    });

    return {
      output: check,
      message: `Updated check **${check.alias || check.url}** (token: \`${check.token}\`).`
    };
  })
  .build();
