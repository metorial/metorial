import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let updateSubscription = SlateTool.create(spec, {
  name: 'Update Subscription',
  key: 'update_subscription',
  description: `Update an existing Redis Cloud subscription. Supports renaming, changing payment methods, and updating plan (Essentials only). Returns a task ID to track the asynchronous update.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('The subscription ID to update'),
      type: z.enum(['pro', 'essentials']).default('pro').describe('Subscription type'),
      name: z.string().optional().describe('New subscription name'),
      paymentMethodId: z.number().optional().describe('New payment method ID'),
      planId: z.number().optional().describe('New plan ID (Essentials only)')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the asynchronous update'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let body: Record<string, any> = {};

    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.paymentMethodId !== undefined)
      body.paymentMethodId = ctx.input.paymentMethodId;
    if (ctx.input.planId !== undefined) body.planId = ctx.input.planId;

    let result: any;
    if (ctx.input.type === 'essentials') {
      result = await client.updateEssentialsSubscription(ctx.input.subscriptionId, body);
    } else {
      result = await client.updateSubscription(ctx.input.subscriptionId, body);
    }

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `Subscription **${ctx.input.subscriptionId}** update initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
