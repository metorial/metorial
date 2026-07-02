import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let deleteSubscription = SlateTool.create(spec, {
  name: 'Delete Subscription',
  key: 'delete_subscription',
  description: `Delete a Redis Cloud subscription. Supports both **Pro** and **Essentials** subscription types. This is a destructive, irreversible action. Returns a task ID to track the deletion.`,
  constraints: [
    'All databases in the subscription must be deleted before deleting the subscription.',
    'Cannot change more than 3 subscriptions concurrently.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('The subscription ID to delete'),
      type: z.enum(['pro', 'essentials']).default('pro').describe('Subscription type')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the asynchronous deletion'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result: any;

    if (ctx.input.type === 'essentials') {
      result = await client.deleteEssentialsSubscription(ctx.input.subscriptionId);
    } else {
      result = await client.deleteSubscription(ctx.input.subscriptionId);
    }

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `Subscription **${ctx.input.subscriptionId}** deletion initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
