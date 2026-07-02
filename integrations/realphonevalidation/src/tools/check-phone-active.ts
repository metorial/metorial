import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeErrorText = (errorText: string | Record<string, never>): string => {
  if (typeof errorText === 'string') return errorText;
  return '';
};

export let checkPhoneActive = SlateTool.create(spec, {
  name: 'Check Phone Active Status',
  key: 'check_phone_active',
  description: `Determines the basic usability of a phone number — whether it is active on a carrier's network. An "active" number is assigned to a carrier but not necessarily connected to an individual subscriber. This is a lower-cost alternative to full validation when only basic carrier assignment status is needed.`,
  instructions: [
    '"Active" means the number is assigned to a carrier. It does not confirm a subscriber is connected. For connected/disconnected status, use the Validate Phone Number or Scrub Phone Number tools instead.'
  ],
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
      activeStatus: z.string().describe('Phone active status: active or inactive'),
      errorText: z
        .string()
        .optional()
        .describe('Error message if the check encountered an issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.activeCheck(ctx.input.phone);
    let errorText = normalizeErrorText(result.error_text);

    return {
      output: {
        activeStatus: result.status,
        errorText: errorText || undefined
      },
      message: `Phone **${ctx.input.phone}** is **${result.status}**.`
    };
  })
  .build();
