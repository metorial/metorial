import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checkSchema } from '../lib/types';
import { spec } from '../spec';

export let createPulseCheck = SlateTool.create(spec, {
  key: 'create_pulse_check',
  name: 'Create Pulse Check',
  description:
    'Create heartbeat monitoring for a scheduled job or private service without a monitored URL. Returns the provider-generated check and its actual URL.',
  instructions: [
    'Send a heartbeat to the private pulse URL from your job after successful execution. Keep that URL private.',
    'The private pulse endpoint URL is only available in create or update responses; GET responses redact it.',
    'Allow a grace period beyond the normal job interval. Omit period to use the provider default; no heartbeat is sent by this tool.'
  ]
})
  .input(
    z.object({
      alias: z.string().optional().describe('Display name identifying the scheduled job'),
      period: z
        .number()
        .optional()
        .describe('Seconds before a missing heartbeat alerts, from 15 to 2592000'),
      enabled: z.boolean().optional().describe('Whether the pulse check is enabled'),
      published: z.boolean().optional().describe('Whether its status is publicly visible'),
      stringMatch: z
        .string()
        .optional()
        .describe('Case-insensitive text required in each heartbeat body'),
      recipients: z
        .array(z.string())
        .optional()
        .describe('Alert recipient IDs from list_recipients'),
      muteUntil: z
        .string()
        .optional()
        .describe('Mute notifications until a time, recovery, or forever')
    })
  )
  .output(checkSchema)
  .handleInvocation(async ctx => {
    if (
      ctx.input.period !== undefined &&
      (!Number.isInteger(ctx.input.period) ||
        ctx.input.period < 15 ||
        ctx.input.period > 2592000)
    ) {
      throw createApiServiceError(
        'Pulse period must be a whole number of seconds between 15 and 2592000.',
        { reason: 'invalid_pulse_period' }
      );
    }
    let check = await new Client({ token: ctx.auth.token }).createCheck({
      ...ctx.input,
      type: 'pulse'
    });
    return {
      output: check,
      message: `Created pulse check \`${check.token}\`. Configure your job to send heartbeats to the returned private URL.`
    };
  })
  .build();
