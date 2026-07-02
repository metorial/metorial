import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhookSubscriptions = SlateTool.create(spec, {
  name: 'List Webhook Subscriptions',
  key: 'list_webhook_subscriptions',
  description: `Retrieves all webhook subscriptions configured in your Workiom workspace. Shows subscription details including target URL, event type, and active status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      subscriptions: z.array(z.any()).describe('Array of webhook subscription objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let subscriptions = await client.getWebhookSubscriptions();
    let list = Array.isArray(subscriptions) ? subscriptions : [];

    return {
      output: {
        subscriptions: list
      },
      message: `Found **${list.length}** webhook subscription(s).`
    };
  })
  .build();

export let createWebhookSubscription = SlateTool.create(spec, {
  name: 'Create Webhook Subscription',
  key: 'create_webhook_subscription',
  description: `Creates a new webhook subscription for a specific list within an app. When the specified event occurs (record created or updated), Workiom will send a POST request to the target URL.

**Event types:**
- **0** = Record Created
- **1** = Record Updated`
})
  .input(
    z.object({
      appId: z.string().describe('ID of the app containing the list'),
      listId: z.string().describe('ID of the list to subscribe to'),
      name: z.string().describe('Name for the webhook subscription'),
      targetUrl: z.string().describe('URL to receive webhook POST requests'),
      eventType: z.number().describe('Event type: 0 = Record Created, 1 = Record Updated'),
      isActive: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether the subscription is active. Defaults to true.')
    })
  )
  .output(
    z.object({
      subscription: z.any().describe('The created webhook subscription object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let subscription = await client.createWebhookSubscription({
      appId: ctx.input.appId,
      listId: ctx.input.listId,
      name: ctx.input.name,
      webHook: ctx.input.targetUrl,
      eventType: ctx.input.eventType,
      isActive: ctx.input.isActive
    });

    return {
      output: {
        subscription
      },
      message: `Created webhook subscription **${ctx.input.name}** for event type **${ctx.input.eventType === 0 ? 'Record Created' : 'Record Updated'}** on list **${ctx.input.listId}**.`
    };
  })
  .build();

export let deleteWebhookSubscription = SlateTool.create(spec, {
  name: 'Delete Webhook Subscription',
  key: 'delete_webhook_subscription',
  description: `Deletes an existing webhook subscription by its ID. The subscription will no longer send events to the target URL.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('ID of the webhook subscription to delete')
    })
  )
  .output(
    z.object({
      subscriptionId: z.string().describe('ID of the deleted subscription')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteWebhookSubscription(ctx.input.subscriptionId);

    return {
      output: {
        subscriptionId: ctx.input.subscriptionId
      },
      message: `Deleted webhook subscription **${ctx.input.subscriptionId}**.`
    };
  })
  .build();
