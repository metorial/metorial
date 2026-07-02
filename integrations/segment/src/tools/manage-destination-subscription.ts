import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { segmentServiceError } from '../lib/errors';
import { spec } from '../spec';

let mapSubscription = (subscription: any) => ({
  subscriptionId: subscription?.id,
  subscriptionName: subscription?.name,
  actionId: subscription?.actionId,
  trigger: subscription?.trigger,
  enabled: subscription?.enabled
});

export let manageDestinationSubscription = SlateTool.create(spec, {
  name: 'Manage Destination Subscription',
  key: 'manage_destination_subscription',
  description: `Create, retrieve, update, list, or remove Segment destination subscriptions. Destination subscriptions configure an Actions destination mapping, including the action to run, trigger condition, enabled state, and mapping settings.`,
  instructions: [
    'Destination subscriptions are available only when the Segment workspace has the Destination Subscriptions feature enabled.',
    'To create, provide destinationId, name, actionId, trigger, and settings.',
    'To update, provide destinationId, subscriptionId, and at least one mutable field.',
    'To get or remove, provide destinationId and subscriptionId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'remove'])
        .describe('Operation to perform'),
      destinationId: z.string().describe('Destination ID that owns the subscription'),
      subscriptionId: z
        .string()
        .optional()
        .describe('Subscription ID. Required for get, update, and remove.'),
      name: z.string().optional().describe('Subscription display name'),
      actionId: z.string().optional().describe('Destination action ID to invoke'),
      trigger: z
        .string()
        .optional()
        .describe('FQL trigger condition that controls when the action runs'),
      enabled: z.boolean().optional().describe('Whether the subscription is enabled'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Action-specific mapping settings'),
      count: z.number().optional().describe('Number of subscriptions per page'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      subscriptionId: z.string().optional().describe('Destination subscription ID'),
      subscriptionName: z.string().optional().describe('Subscription display name'),
      actionId: z.string().optional().describe('Destination action ID'),
      trigger: z.string().optional().describe('FQL trigger condition'),
      enabled: z.boolean().optional().describe('Whether enabled'),
      removed: z.boolean().optional().describe('Whether the subscription was removed'),
      subscriptions: z
        .array(
          z.object({
            subscriptionId: z.string().optional().describe('Destination subscription ID'),
            subscriptionName: z.string().optional().describe('Subscription display name'),
            actionId: z.string().optional().describe('Destination action ID'),
            trigger: z.string().optional().describe('FQL trigger condition'),
            enabled: z.boolean().optional().describe('Whether enabled')
          })
        )
        .optional()
        .describe('Subscriptions returned by list action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'list') {
      let result = await client.listDestinationSubscriptions(ctx.input.destinationId, {
        count: ctx.input.count,
        cursor: ctx.input.cursor
      });
      let subscriptions = (result?.subscriptions ?? []).map(mapSubscription);

      return {
        output: { subscriptions },
        message: `Found **${subscriptions.length}** subscription(s) on destination \`${ctx.input.destinationId}\``
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.subscriptionId) {
        throw segmentServiceError(
          'subscriptionId is required to get a destination subscription'
        );
      }

      let subscription = await client.getDestinationSubscription(
        ctx.input.destinationId,
        ctx.input.subscriptionId
      );

      return {
        output: mapSubscription(subscription),
        message: `Retrieved destination subscription \`${ctx.input.subscriptionId}\``
      };
    }

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.name ||
        !ctx.input.actionId ||
        !ctx.input.trigger ||
        !ctx.input.settings
      ) {
        throw segmentServiceError(
          'name, actionId, trigger, and settings are required to create a destination subscription'
        );
      }

      let subscription = await client.createDestinationSubscription(ctx.input.destinationId, {
        name: ctx.input.name,
        actionId: ctx.input.actionId,
        trigger: ctx.input.trigger,
        enabled: ctx.input.enabled,
        settings: ctx.input.settings
      });

      return {
        output: mapSubscription(subscription),
        message: `Created destination subscription **${subscription?.name ?? ctx.input.name}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.subscriptionId) {
        throw segmentServiceError(
          'subscriptionId is required to update a destination subscription'
        );
      }

      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.trigger !== undefined) updateData.trigger = ctx.input.trigger;
      if (ctx.input.enabled !== undefined) updateData.enabled = ctx.input.enabled;
      if (ctx.input.settings !== undefined) updateData.settings = ctx.input.settings;

      if (Object.keys(updateData).length === 0) {
        throw segmentServiceError(
          'Provide at least one of name, trigger, enabled, or settings to update a destination subscription'
        );
      }

      let subscription = await client.updateDestinationSubscription(
        ctx.input.destinationId,
        ctx.input.subscriptionId,
        updateData
      );

      return {
        output: mapSubscription(subscription),
        message: `Updated destination subscription \`${ctx.input.subscriptionId}\``
      };
    }

    if (!ctx.input.subscriptionId) {
      throw segmentServiceError(
        'subscriptionId is required to remove a destination subscription'
      );
    }

    await client.removeDestinationSubscription(
      ctx.input.destinationId,
      ctx.input.subscriptionId
    );

    return {
      output: {
        subscriptionId: ctx.input.subscriptionId,
        removed: true
      },
      message: `Removed destination subscription \`${ctx.input.subscriptionId}\``
    };
  })
  .build();
