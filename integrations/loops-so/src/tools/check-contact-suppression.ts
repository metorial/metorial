import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const checkContactSuppression = SlateTool.create(spec, {
  name: 'Check Contact Suppression',
  key: 'check_contact_suppression',
  description:
    'Read whether a contact is suppressed and its suppression-removal quota. This lookup does not remove suppression or resubscribe the contact.',
  instructions: ['Provide exactly one of email or userId.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      email: z.string().optional().describe('Contact email address.'),
      userId: z.string().optional().describe('External contact user ID.')
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      email: z.string(),
      userId: z.string().nullable(),
      isSuppressed: z.boolean(),
      removalQuota: z.object({ limit: z.number(), remaining: z.number() })
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).checkContactSuppression(ctx.input);
    return {
      output: {
        contactId: result.contact.id,
        email: result.contact.email,
        userId: result.contact.userId,
        isSuppressed: result.isSuppressed,
        removalQuota: result.removalQuota
      },
      message: `The contact is ${result.isSuppressed ? 'suppressed' : 'not suppressed'}.`
    };
  })
  .build();
