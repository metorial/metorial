import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database',
  key: 'delete_database',
  description: `Delete a Redis Cloud database from a subscription. This is a destructive, irreversible action. Returns a task ID to track the deletion process.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID containing the database'),
      databaseId: z.number().describe('Database ID to delete'),
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
      result = await client.deleteEssentialsDatabase(
        ctx.input.subscriptionId,
        ctx.input.databaseId
      );
    } else {
      result = await client.deleteDatabase(ctx.input.subscriptionId, ctx.input.databaseId);
    }

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `Database **${ctx.input.databaseId}** deletion initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
