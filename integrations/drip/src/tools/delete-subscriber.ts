import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubscriber = SlateTool.create(spec, {
  name: 'Delete Subscriber',
  key: 'delete_subscriber',
  description: `Permanently delete a subscriber from Drip by their ID or email address. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subscriberIdOrEmail: z.string().describe('The subscriber ID or email address to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the subscriber was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    await client.deleteSubscriber(ctx.input.subscriberIdOrEmail);

    return {
      output: { deleted: true },
      message: `Subscriber **${ctx.input.subscriberIdOrEmail}** has been deleted.`
    };
  })
  .build();
