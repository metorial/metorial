import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let subscriptionSchema = z.object({
  subscriptionId: z.number().describe('Unique subscription identifier'),
  name: z.string().describe('Subscription name'),
  status: z.string().describe('Current status of the subscription'),
  planType: z.string().optional().describe('Subscription plan type (pro or essentials)'),
  cloudProvider: z.string().optional().describe('Cloud provider (AWS, GCP, Azure)'),
  region: z.string().optional().describe('Deployment region'),
  paymentMethodId: z.number().optional().describe('Associated payment method ID')
});

export let listSubscriptions = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description: `List all Redis Cloud subscriptions in the account. Returns both **Pro** and **Essentials** subscriptions with their status, plan type, cloud provider, and region.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['all', 'pro', 'essentials'])
        .default('all')
        .describe('Filter by subscription type')
    })
  )
  .output(
    z.object({
      subscriptions: z.array(subscriptionSchema).describe('List of subscriptions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let subscriptions: any[] = [];

    if (ctx.input.type === 'all' || ctx.input.type === 'pro') {
      let proData = await client.listSubscriptions();
      let proSubs = proData?.subscriptions || [];
      for (let sub of proSubs) {
        subscriptions.push({
          subscriptionId: sub.id,
          name: sub.name,
          status: sub.status,
          planType: 'pro',
          cloudProvider: sub.cloudDetails?.[0]?.provider || sub.cloudProvider,
          region: sub.cloudDetails?.[0]?.regions?.[0]?.region || sub.region,
          paymentMethodId: sub.paymentMethodId
        });
      }
    }

    if (ctx.input.type === 'all' || ctx.input.type === 'essentials') {
      let essData = await client.listEssentialsSubscriptions();
      let essSubs = essData?.subscriptions || [];
      for (let sub of essSubs) {
        subscriptions.push({
          subscriptionId: sub.id,
          name: sub.name,
          status: sub.status,
          planType: 'essentials',
          cloudProvider: sub.cloudProvider,
          region: sub.region,
          paymentMethodId: sub.paymentMethodId
        });
      }
    }

    return {
      output: { subscriptions },
      message: `Found **${subscriptions.length}** subscription(s).`
    };
  })
  .build();
