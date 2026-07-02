import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      subscriberIdOrEmail: z.string().describe('The subscriber ID or email address.'),
      campaignId: z
        .string()
        .optional()
        .describe(
          'If provided, removes the subscriber from this specific campaign only. Otherwise, unsubscribes from all mailings.'
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
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    if (ctx.input.campaignId) {
      await client.removeFromCampaign(ctx.input.subscriberIdOrEmail, ctx.input.campaignId);
      return {
        output: { unsubscribed: true },
        message: `Subscriber **${ctx.input.subscriberIdOrEmail}** removed from campaign **${ctx.input.campaignId}**.`
      };
    } else {
      await client.unsubscribeFromAllMailings(ctx.input.subscriberIdOrEmail);
      return {
        output: { unsubscribed: true },
        message: `Subscriber **${ctx.input.subscriberIdOrEmail}** unsubscribed from all mailings.`
      };
    }
  })
  .build();
