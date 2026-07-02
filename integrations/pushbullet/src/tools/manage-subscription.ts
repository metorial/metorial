import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscription = SlateTool.create(spec, {
  name: 'Manage Subscription',
  key: 'manage_subscription',
  description: `Subscribe to a channel, mute/unmute a subscription, or unsubscribe. Subscribing to a channel means you'll receive pushes sent to that channel.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['subscribe', 'mute', 'unmute', 'unsubscribe'])
        .describe('Action to perform'),
      subscriptionIden: z
        .string()
        .optional()
        .describe('Subscription identifier (required for mute, unmute, and unsubscribe)'),
      channelTag: z
        .string()
        .optional()
        .describe('Channel tag to subscribe to (required for subscribe)')
    })
  )
  .output(
    z.object({
      subscriptionIden: z.string().describe('Unique identifier of the subscription'),
      action: z.string().describe('Action that was performed'),
      channelTag: z.string().optional().describe('Channel tag'),
      channelName: z.string().optional().describe('Channel name'),
      muted: z.boolean().optional().describe('Current mute status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'subscribe') {
      if (!ctx.input.channelTag) {
        throw new Error('channelTag is required for subscribing');
      }
      let sub = await client.createSubscription(ctx.input.channelTag);
      return {
        output: {
          subscriptionIden: sub.iden,
          action: 'subscribe',
          channelTag: sub.channel.tag,
          channelName: sub.channel.name,
          muted: sub.muted
        },
        message: `Subscribed to channel **${sub.channel.name}** (#${sub.channel.tag}).`
      };
    }

    if (!ctx.input.subscriptionIden) {
      throw new Error(
        'subscriptionIden is required for mute, unmute, and unsubscribe actions'
      );
    }

    if (ctx.input.action === 'mute' || ctx.input.action === 'unmute') {
      let muted = ctx.input.action === 'mute';
      let sub = await client.updateSubscription(ctx.input.subscriptionIden, { muted });
      return {
        output: {
          subscriptionIden: sub.iden,
          action: ctx.input.action,
          channelTag: sub.channel.tag,
          channelName: sub.channel.name,
          muted: sub.muted
        },
        message: `Subscription to **${sub.channel.name}** has been **${ctx.input.action}d**.`
      };
    }

    // unsubscribe
    await client.deleteSubscription(ctx.input.subscriptionIden);
    return {
      output: {
        subscriptionIden: ctx.input.subscriptionIden,
        action: 'unsubscribe'
      },
      message: `Unsubscribed from subscription \`${ctx.input.subscriptionIden}\`.`
    };
  })
  .build();
