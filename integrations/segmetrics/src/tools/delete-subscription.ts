import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { importScopeFields, resolveImportConfig } from '../lib/context';
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
      ...importScopeFields,
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
    let client = new ImportClient(resolveImportConfig(ctx));

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
