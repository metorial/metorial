import { createApiServiceError, SlateTool } from 'slates';
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
      reassigned: z
        .string()
        .describe('Provider reassignment status: yes, no, no_data, no data, or undetermined'),
      lookupId: z.string().describe('Unique transaction identifier for this lookup'),
      responseMessage: z.string().optional().describe('Additional response message if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.reassignedNumberLookup(ctx.input.phone, ctx.input.consentDate);
    let responseMsg = normalizeResponseMsg(result.RESPONSEMSG);

    let message: string;
    switch (result.reassigned) {
      case 'yes':
        message = `Phone **${ctx.input.phone}** has been reassigned since ${ctx.input.consentDate}.`;
        break;
      case 'no':
        message = `Phone **${ctx.input.phone}** has not been reassigned since ${ctx.input.consentDate}.`;
        break;
      case 'no_data':
      case 'no data':
        message = `Phone **${ctx.input.phone}** has no reassignment data available since ${ctx.input.consentDate}.`;
        break;
      case 'undetermined':
        message = `Reassignment of phone **${ctx.input.phone}** since ${ctx.input.consentDate} is **undetermined**. Check that the phone contains exactly 10 US digits and the consent date uses YYYY-MM-DD format, then contact RealPhoneValidation support.`;
        break;
      default:
        throw createApiServiceError(
          `RealPhoneValidation returned an unsupported reassignment status: ${result.reassigned}. Check the phone and consent-date formatting, then contact RealPhoneValidation support.`,
          { reason: 'unknown_reassignment_status', upstreamCode: result.reassigned }
        );
    }

    return {
      output: {
        reassigned: result.reassigned,
        lookupId: result.id,
        responseMessage: responseMsg || undefined
      },
      message
    };
  })
  .build();
