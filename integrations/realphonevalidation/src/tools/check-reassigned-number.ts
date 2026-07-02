import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeResponseMsg = (msg: string | Record<string, never>): string => {
  if (typeof msg === 'string') return msg;
  return '';
};

export let checkReassignedNumber = SlateTool.create(spec, {
  name: 'Check Reassigned Number',
  key: 'check_reassigned_number',
  description: `Determines if a phone number has been reassigned (changed ownership) since a given date of consent. Critical for TCPA compliance — helps avoid calling someone who now owns a number previously consented by a different person.`,
  constraints: [
    'Phone number must be exactly 10 numeric digits (US only).',
    'Contact date must be in YYYY-MM-DD format.',
    'API rate limit of 10 requests per second.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phone: z.string().describe('10-digit US phone number (digits only, no formatting)'),
      consentDate: z
        .string()
        .describe('Date when consent was originally obtained, in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      reassigned: z.string().describe('Reassignment status: yes, no, or no_data'),
      lookupId: z.string().describe('Unique transaction identifier for this lookup'),
      responseMessage: z.string().optional().describe('Additional response message if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.reassignedNumberLookup(ctx.input.phone, ctx.input.consentDate);
    let responseMsg = normalizeResponseMsg(result.RESPONSEMSG);

    let statusDescription =
      result.reassigned === 'yes'
        ? 'has been reassigned'
        : result.reassigned === 'no'
          ? 'has not been reassigned'
          : 'has no reassignment data available';

    return {
      output: {
        reassigned: result.reassigned,
        lookupId: result.id,
        responseMessage: responseMsg || undefined
      },
      message: `Phone **${ctx.input.phone}** ${statusDescription} since ${ctx.input.consentDate}.`
    };
  })
  .build();
