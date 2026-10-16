import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setOfferExpirationTool = SlateTool.create(spec, {
  name: 'Set Offer Expiration',
  key: 'set_offer_expiration',
  description:
    'Set or remove the expiration date of an offer for a member. Discover user IDs with find_user or list_users and offer IDs with list_offers.'
})
  .input(
    z.object({
      userId: z.string().describe('User UID from find_user or list_users'),
      offerId: z.string().describe('Offer ID from list_offers'),
      expiresAt: z
        .string()
        .nullable()
        .optional()
        .describe('ISO 8601 expiration date-time; omit or pass null to remove expiration')
    })
  )
  .output(z.object({ result: z.any().optional().describe('Unmodified provider response') }))
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).setOfferExpiration({
      uid: ctx.input.userId,
      offerId: ctx.input.offerId,
      expiresAt: ctx.input.expiresAt
    });
    return {
      output: { result },
      message: `Updated offer expiration for user **${ctx.input.userId}**.`
    };
  })
  .build();
