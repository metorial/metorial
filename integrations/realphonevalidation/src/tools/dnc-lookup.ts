import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeErrorText = (text: string | Record<string, never>): string => {
  if (typeof text === 'string') return text;
  return '';
};

export let dncLookup = SlateTool.create(spec, {
  name: 'DNC Lookup',
  key: 'dnc_lookup',
  description: `Checks if a phone number is on the National, State, or Direct Marketing Association (DMA) Do Not Call lists. Also identifies TCPA litigators/serial plaintiffs and phone type. Two modes available: **standard** returns DNC status and phone type; **plus** additionally includes connection status (connected/disconnected).`,
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
        .enum(['standard', 'plus'])
        .default('standard')
        .describe(
          'Lookup mode: "standard" returns DNC status and phone type; "plus" also includes connection status'
        )
    })
  )
  .output(
    z.object({
      nationalDnc: z
        .boolean()
        .describe('Whether the number is on the National Do Not Call Registry'),
      stateDnc: z.boolean().describe('Whether the number is on a State Do Not Call list'),
      dmaDnc: z.boolean().describe('Whether the number is on the DMA Do Not Call list'),
      isLitigator: z
        .boolean()
        .describe(
          'Whether the number is associated with a known TCPA litigator or serial plaintiff'
        ),
      isMobile: z.boolean().describe('Whether the number is a mobile/cell phone'),
      connectionStatus: z
        .string()
        .optional()
        .describe('Connection status: connected or disconnected (plus mode only)'),
      errorText: z.string().optional().describe('Error or response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'plus') {
      let result = await client.dncPlus(ctx.input.phone);
      let errorText = normalizeErrorText(result.error_text);

      let nationalDnc = result.national_dnc === 'Y';
      let stateDnc = result.state_dnc === 'Y';
      let dmaDnc = result.dma === 'Y';
      let isLitigator = result.litigator === 'Y';
      let isMobile = result.iscell === 'Y';

      let dncLists = [
        nationalDnc ? 'National' : null,
        stateDnc ? 'State' : null,
        dmaDnc ? 'DMA' : null
      ].filter(Boolean);

      return {
        output: {
          nationalDnc,
          stateDnc,
          dmaDnc,
          isLitigator,
          isMobile,
          connectionStatus: result.status,
          errorText: errorText || undefined
        },
        message: `Phone **${ctx.input.phone}** is **${result.status}**. DNC: ${dncLists.length > 0 ? dncLists.join(', ') : 'not on any DNC list'}. ${isLitigator ? '⚠️ Known TCPA litigator.' : ''} Type: ${isMobile ? 'Mobile' : 'Landline'}.`
      };
    } else {
      let result = await client.dncLookup(ctx.input.phone);
      let responseMsg = normalizeErrorText(result.RESPONSEMSG);

      let nationalDnc = result.national_dnc === 'Y';
      let stateDnc = result.state_dnc === 'Y';
      let dmaDnc = result.dma === 'Y';
      let isLitigator = result.litigator === 'Y';
      let isMobile = result.iscell === 'Y';

      let dncLists = [
        nationalDnc ? 'National' : null,
        stateDnc ? 'State' : null,
        dmaDnc ? 'DMA' : null
      ].filter(Boolean);

      return {
        output: {
          nationalDnc,
          stateDnc,
          dmaDnc,
          isLitigator,
          isMobile,
          errorText: responseMsg || undefined
        },
        message: `Phone **${ctx.input.phone}**: DNC: ${dncLists.length > 0 ? dncLists.join(', ') : 'not on any DNC list'}. ${isLitigator ? '⚠️ Known TCPA litigator.' : ''} Type: ${isMobile ? 'Mobile' : 'Landline'}.`
      };
    }
  })
  .build();
