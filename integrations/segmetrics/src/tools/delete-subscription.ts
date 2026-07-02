import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { spec } from '../spec';

export let deleteSubscription = SlateTool.create(spec, {
  name: 'Delete Subscription',
  key: 'delete_subscription',
  description: `Permanently deletes a subscription from a SegMetrics integration. This action **cannot be undone**.`,
  constraints: ['This is a permanent, irreversible action.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionId: z
        .string()
        .describe('The unique identifier of the subscription to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      integrationId: ctx.config.integrationId!
    });

    let response = await client.deleteSubscription(ctx.input.subscriptionId);

    return {
      output: {
        success: true,
        response
      },
      message: `Subscription **${ctx.input.subscriptionId}** has been permanently deleted.`
    };
  })
  .build();
