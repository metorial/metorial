import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeResponseMsg = (msg: string | Record<string, never>): string => {
  if (typeof msg === 'string') return msg;
  return '';
};

export let identifyPhoneType = SlateTool.create(spec, {
  name: 'Identify Phone Type',
  key: 'identify_phone_type',
  description: `Identifies whether a US phone number is a wireless (mobile) or landline number. Useful for TCPA compliance — determining if a number is a cell phone before making automated calls or sending texts.`,
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
      phone: z.string().describe('10-digit US phone number (digits only, no formatting)')
    })
  )
  .output(
    z.object({
      phoneType: z.string().describe('Phone line type: Wireless or Landline'),
      responseMessage: z.string().optional().describe('Additional response message if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.wirelessId(ctx.input.phone);
    let responseMessage = normalizeResponseMsg(result.RESPONSEMSG);

    return {
      output: {
        phoneType: result.RESPONSECODE,
        responseMessage: responseMessage || undefined
      },
      message: `Phone **${ctx.input.phone}** is a **${result.RESPONSECODE}** number.`
    };
  })
  .build();
