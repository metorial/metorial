import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeErrorText = (errorText: string | Record<string, never>): string => {
  if (typeof errorText === 'string') return errorText;
  return '';
};

export let scrubPhone = SlateTool.create(spec, {
  name: 'Scrub Phone Number',
  key: 'scrub_phone',
  description: `Validates a phone number's connection status, optimized for high-volume list scrubbing at lower cost. Two modes available: **plus** returns connection status and phone type; **basic** returns connection status only. May return "unknown" for up to 5% of US numbers.`,
  constraints: [
    'Phone number must be exactly 10 numeric digits (US only).',
    'API rate limit of 10 requests per second.',
    'May disposition up to 5% of US numbers as unknown.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phone: z.string().describe('10-digit US phone number (digits only, no formatting)'),
      mode: z
        .enum(['plus', 'basic'])
        .default('plus')
        .describe(
          'Scrub mode: "plus" returns connection status and phone type; "basic" returns connection status only'
        )
    })
  )
  .output(
    z.object({
      connectionStatus: z
        .string()
        .describe('Phone connection status: connected, disconnected, or unknown'),
      phoneType: z
        .string()
        .optional()
        .describe('Phone line type: Mobile, Landline, or VoIP (plus mode only)'),
      carrier: z.string().optional().describe('Phone carrier name (basic mode, if available)'),
      errorText: z.string().optional().describe('Error message if scrub encountered an issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'plus') {
      let result = await client.scrubPlus(ctx.input.phone);
      let errorText = normalizeErrorText(result.error_text);

      return {
        output: {
          connectionStatus: result.status,
          phoneType: result.phone_type || undefined,
          errorText: errorText || undefined
        },
        message: `Phone **${ctx.input.phone}** is **${result.status}**${result.phone_type ? ` — ${result.phone_type}` : ''}.`
      };
    } else {
      let result = await client.scrub(ctx.input.phone);
      let errorText = normalizeErrorText(result.error_text);
      let phoneType =
        result.iscell === 'Y'
          ? 'Mobile'
          : result.iscell === 'N'
            ? 'Landline'
            : result.iscell || undefined;

      return {
        output: {
          connectionStatus: result.status,
          phoneType,
          carrier: result.carrier || undefined,
          errorText: errorText || undefined
        },
        message: `Phone **${ctx.input.phone}** is **${result.status}**${phoneType ? ` — ${phoneType}` : ''}.`
      };
    }
  })
  .build();
