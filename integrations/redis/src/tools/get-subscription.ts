import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let getSubscription = SlateTool.create(spec, {
  name: 'Get Subscription',
  key: 'get_subscription',
  description: `Retrieve detailed information about a specific Redis Cloud subscription by ID. Supports both **Pro** and **Essentials** subscription types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('The subscription ID to retrieve'),
      type: z.enum(['pro', 'essentials']).default('pro').describe('Subscription type')
    })
  )
  .output(
    z.object({
      subscriptionId: z.number().describe('Unique subscription identifier'),
      name: z.string().describe('Subscription name'),
      status: z.string().describe('Current status of the subscription'),
      paymentMethodId: z.number().optional().describe('Associated payment method ID'),
      memoryStorage: z.string().optional().describe('Memory storage type'),
      numberOfDatabases: z
        .number()
        .optional()
        .describe('Number of databases in the subscription'),
      raw: z.any().describe('Full subscription details from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let sub: any;

    if (ctx.input.type === 'essentials') {
      sub = await client.getEssentialsSubscription(ctx.input.subscriptionId);
    } else {
      sub = await client.getSubscription(ctx.input.subscriptionId);
    }

    return {
      output: {
        subscriptionId: sub.id,
        name: sub.name,
        status: sub.status,
        paymentMethodId: sub.paymentMethodId,
        memoryStorage: sub.memoryStorage,
        numberOfDatabases: sub.numberOfDatabases,
        raw: sub
      },
      message: `Subscription **${sub.name}** (ID: ${sub.id}) — status: **${sub.status}**.`
    };
  })
  .build();
