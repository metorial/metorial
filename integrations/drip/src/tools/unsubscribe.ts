import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let unsubscribe = SlateTool.create(spec, {
  name: 'Unsubscribe',
  key: 'unsubscribe',
  description: `Unsubscribe a subscriber from all mailings or remove them from a specific email series campaign. Use this to manage email opt-outs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      subscriberIdOrEmail: z.string().describe('The subscriber ID or email address.'),
      campaignId: z
        .string()
        .optional()
        .describe(
          'If provided, must be a nonempty campaign ID and removes the subscriber from that campaign only. Omit to unsubscribe from all mailings.'
        )
    })
  )
  .output(
    z.object({
      unsubscribed: z.boolean().describe('Whether the operation succeeded.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.input.accountId ?? ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    if (ctx.input.campaignId !== undefined) {
      await client.removeFromCampaign(ctx.input.subscriberIdOrEmail, ctx.input.campaignId);
      return {
        output: { unsubscribed: true },
        message: 'The selected subscriber has been removed from the selected campaign.'
      };
    } else {
      await client.unsubscribeFromAllMailings(ctx.input.subscriberIdOrEmail);
      return {
        output: { unsubscribed: true },
        message: 'The selected subscriber has been unsubscribed from all mailings.'
      };
    }
  })
  .build();
