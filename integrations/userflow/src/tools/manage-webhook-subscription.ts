import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhookSubscription = SlateTool.create(spec, {
  name: 'Manage Webhook Subscription',
  key: 'manage_webhook_subscription',
  description: `Creates, retrieves, lists, or deletes webhook subscriptions. Webhooks notify your application when events occur in Userflow (user created/updated, group changes, events tracked). Use topic **\`*\`** to subscribe to all events.`,
  instructions: [
    'Available topics: "user" (user.created, user.updated), "group" (group.created, group.updated), "event" (event.tracked.*), or "*" for all topics.',
    'To create a subscription, provide url and topics. To get or delete, provide subscriptionId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Operation to perform'),
      subscriptionId: z
        .string()
        .optional()
        .describe('ID of the subscription (required for get/delete)'),
      url: z
        .string()
        .optional()
        .describe('URL to receive webhook notifications (required for create)'),
      topics: z
        .array(z.string())
        .optional()
        .describe('List of topics to subscribe to (required for create)')
    })
  )
  .output(
    z.object({
      subscription: z
        .object({
          subscriptionId: z.string().describe('ID of the webhook subscription'),
          url: z.string().describe('Webhook URL'),
          topics: z.array(z.string()).describe('Subscribed topics'),
          secret: z.string().describe('Secret for verifying webhook signatures'),
          createdAt: z.string().describe('Timestamp when the subscription was created')
        })
        .optional()
        .describe('Webhook subscription (for create/get)'),
      subscriptions: z
        .array(
          z.object({
            subscriptionId: z.string().describe('ID of the webhook subscription'),
            url: z.string().describe('Webhook URL'),
            topics: z.array(z.string()).describe('Subscribed topics'),
            createdAt: z.string().describe('Timestamp when the subscription was created')
          })
        )
        .optional()
        .describe('List of webhook subscriptions (for list)'),
      deleted: z.boolean().optional().describe('Whether deletion was successful (for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.url || !ctx.input.topics) {
        throw new Error('url and topics are required for creating a webhook subscription');
      }
      let sub = await client.createWebhookSubscription({
        url: ctx.input.url,
        topics: ctx.input.topics,
        apiVersion: ctx.config.apiVersion
      });
      return {
        output: {
          subscription: {
            subscriptionId: sub.id,
            url: sub.url,
            topics: sub.topics,
            secret: sub.secret,
            createdAt: sub.created_at
          }
        },
        message: `Created webhook subscription **${sub.id}** for topics: ${sub.topics.join(', ')}.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.subscriptionId) {
        throw new Error('subscriptionId is required for getting a webhook subscription');
      }
      let sub = await client.getWebhookSubscription(ctx.input.subscriptionId);
      return {
        output: {
          subscription: {
            subscriptionId: sub.id,
            url: sub.url,
            topics: sub.topics,
            secret: sub.secret,
            createdAt: sub.created_at
          }
        },
        message: `Retrieved webhook subscription **${sub.id}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listWebhookSubscriptions();
      let subscriptions = result.data.map(s => ({
        subscriptionId: s.id,
        url: s.url,
        topics: s.topics,
        createdAt: s.created_at
      }));
      return {
        output: {
          subscriptions
        },
        message: `Retrieved **${subscriptions.length}** webhook subscription(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.subscriptionId) {
        throw new Error('subscriptionId is required for deleting a webhook subscription');
      }
      let result = await client.deleteWebhookSubscription(ctx.input.subscriptionId);
      return {
        output: {
          deleted: result.deleted
        },
        message: `Deleted webhook subscription **${ctx.input.subscriptionId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
