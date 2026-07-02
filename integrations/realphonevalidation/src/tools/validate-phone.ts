import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeErrorText = (errorText: string | Record<string, never>): string => {
  if (typeof errorText === 'string') return errorText;
  return '';
};

export let validatePhone = SlateTool.create(spec, {
  name: 'Validate Phone Number',
  key: 'validate_phone',
  description: `Performs real-time phone number validation using live telco data, returning connection status, phone type, carrier, and subscriber information. Supports two validation modes: **full** (Turbo V3) returns caller name and subscriber type, while **standard** returns connection status and phone type at a lower cost. US phone numbers only.`,
  constraints: [
    'Phone number must be exactly 10 numeric digits (US only).',
    'API rate limit of 10 requests per second.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phone: z.string().describe('10-digit US phone number (digits only, no formatting)'),
      mode: z
        .enum(['full', 'standard'])
        .default('full')
        .describe(
          'Validation mode: "full" returns caller name and subscriber type; "standard" returns connection status and phone type only'
        )
    })
  )
  .output(
    z.object({
      connectionStatus: z
        .string()
        .describe('Phone connection status: connected, disconnected, or unknown'),
      phoneType: z.string().describe('Phone line type: Mobile, Landline, VoIP, or Toll-Free'),
      carrier: z.string().describe('Phone carrier/service provider name'),
      callerName: z
        .string()
        .optional()
        .describe('Subscriber name associated with the phone number (full mode only)'),
      callerType: z
        .string()
        .optional()
        .describe('Subscriber type: Consumer or Business (full mode only)'),
      errorText: z
        .string()
        .optional()
        .describe('Error message if validation encountered an issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'full') {
      let result = await client.turboV3(ctx.input.phone);
      let errorText = normalizeErrorText(result.error_text);

      return {
        output: {
          connectionStatus: result.status,
          phoneType: result.phone_type,
          carrier: result.carrier,
          callerName: result.caller_name || undefined,
          callerType: result.caller_type || undefined,
          errorText: errorText || undefined
        },
        message: `Phone **${ctx.input.phone}** is **${result.status}** — ${result.phone_type || 'unknown type'}, carrier: ${result.carrier || 'unknown'}${result.caller_name ? `, name: ${result.caller_name}` : ''}${result.caller_type ? ` (${result.caller_type})` : ''}.`
      };
    } else {
      let result = await client.turboStandard(ctx.input.phone);
      let errorText = normalizeErrorText(result.error_text);
      let phoneType =
        result.iscell === 'Y'
          ? 'Mobile'
          : result.iscell === 'V'
            ? 'VoIP'
            : result.iscell === 'N'
              ? 'Landline'
              : result.iscell;

      return {
        output: {
          connectionStatus: result.status,
          phoneType,
          carrier: result.carrier,
          errorText: errorText || undefined
        },
        message: `Phone **${ctx.input.phone}** is **${result.status}** — ${phoneType}, carrier: ${result.carrier || 'unknown'}.`
      };
    }
  })
  .build();
