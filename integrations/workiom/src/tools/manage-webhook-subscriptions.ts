import { createApiServiceError, SlateTool } from 'slates';
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
      subscriptions: z.array(z.any()).describe('Array of webhook subscription objects'),
      raw: z
        .any()
        .optional()
        .describe('Complete subscription response, including provider metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let subscriptions = await client.getWebhookSubscriptions();
    let list = Array.isArray(subscriptions) ? subscriptions : (subscriptions?.items ?? []);

    return {
      output: {
        subscriptions: list,
        raw: subscriptions
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
      message: `Created webhook subscription **${ctx.input.name}** for event type **${ctx.input.eventType}** on list **${ctx.input.listId}**.`
    };
  })
  .build();

export let getWebhookSubscription = SlateTool.create(spec, {
  name: 'Get Webhook Subscription',
  key: 'get_webhook_subscription',
  description:
    'Retrieves one webhook subscription, including its target URL, event type, and active state. Use list_webhook_subscriptions to discover subscription IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      subscriptionId: z.string().describe('Subscription ID from list_webhook_subscriptions')
    })
  )
  .output(
    z.object({
      subscription: z.any().describe('Complete webhook subscription returned by Workiom')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let subscription = await client.getWebhookSubscription(ctx.input.subscriptionId);
    return {
      output: { subscription },
      message: `Retrieved webhook subscription **${ctx.input.subscriptionId}**.`
    };
  })
  .build();

export let updateWebhookSubscription = SlateTool.create(spec, {
  name: 'Update Webhook Subscription',
  key: 'update_webhook_subscription',
  description:
    'Updates an existing webhook subscription, including its target URL and active state. This is a full subscription update: provide every property, using get_webhook_subscription to inspect the current values first.',
  instructions: [
    'Use list_webhook_subscriptions to discover subscription IDs.',
    'Event type 0 means Record Created; event type 1 means Record Updated.'
  ]
})
  .input(
    z.object({
      subscriptionId: z.string().describe('Subscription ID from list_webhook_subscriptions'),
      appId: z.string().describe('App ID; discover apps with list_apps'),
      listId: z.string().describe('ID of the list receiving the subscription'),
      name: z.string().describe('Name for the subscription'),
      targetUrl: z.url().describe('HTTPS or HTTP URL to receive event notifications'),
      eventType: z.number().describe('Event type: 0 = Record Created, 1 = Record Updated'),
      isActive: z.boolean().describe('Whether Workiom should send notifications')
    })
  )
  .output(
    z.object({
      subscription: z.any().describe('Complete update response returned by Workiom')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.eventType !== 0 && ctx.input.eventType !== 1) {
      throw createApiServiceError('Use event type 0 (Record Created) or 1 (Record Updated).', {
        reason: 'workiom_invalid_webhook_event_type'
      });
    }
    let url = new URL(ctx.input.targetUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw createApiServiceError('Use an HTTP or HTTPS webhook target URL.', {
        reason: 'workiom_invalid_webhook_target'
      });
    }
    let client = new Client(ctx.auth.token);
    let subscription = await client.updateWebhookSubscription({
      id: ctx.input.subscriptionId,
      appId: ctx.input.appId,
      listId: ctx.input.listId,
      name: ctx.input.name,
      webHook: ctx.input.targetUrl,
      eventType: ctx.input.eventType,
      isActive: ctx.input.isActive
    });
    return {
      output: { subscription },
      message: `Updated webhook subscription **${ctx.input.subscriptionId}**.`
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
