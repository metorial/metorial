import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let getBroadcast = SlateTool.create(spec, {
  name: 'Get Broadcast',
  key: 'get_broadcast',
  description:
    'Retrieve a Customer.io broadcast and optionally include its actions, metrics, trigger history, trigger status, and trigger errors.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      broadcastId: z.number().describe('The ID of the broadcast to retrieve'),
      includeActions: z.boolean().optional().describe('Also fetch broadcast actions'),
      includeMetrics: z.boolean().optional().describe('Also fetch broadcast metrics'),
      includeTriggers: z.boolean().optional().describe('Also fetch broadcast trigger history'),
      triggerId: z.number().optional().describe('Specific trigger ID to fetch status for'),
      includeTriggerErrors: z.boolean().optional().describe('Also fetch errors for triggerId'),
      triggerErrorsCursor: z
        .string()
        .optional()
        .describe('Pagination cursor for trigger errors')
    })
  )
  .output(
    z.object({
      broadcast: z.record(z.string(), z.unknown()).describe('The broadcast object'),
      actions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Broadcast actions'),
      metrics: z.record(z.string(), z.unknown()).optional().describe('Broadcast metrics'),
      triggers: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Broadcast trigger history'),
      trigger: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Specific trigger status'),
      triggerErrors: z.array(z.string()).optional().describe('Trigger errors'),
      nextTriggerErrors: z.string().optional().describe('Next trigger-error cursor')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let broadcastResult = await appClient.getBroadcast(ctx.input.broadcastId);
    let broadcast = broadcastResult?.broadcast ?? broadcastResult;
    let actions: Record<string, unknown>[] | undefined;
    let metrics: Record<string, unknown> | undefined;
    let triggers: Record<string, unknown>[] | undefined;
    let trigger: Record<string, unknown> | undefined;
    let triggerErrors: string[] | undefined;
    let nextTriggerErrors: string | undefined;

    if (ctx.input.includeActions) {
      let actionsResult = await appClient.getBroadcastActions(ctx.input.broadcastId);
      actions = actionsResult?.actions ?? [];
    }
    if (ctx.input.includeMetrics) {
      metrics = await appClient.getBroadcastMetrics(ctx.input.broadcastId);
    }
    if (ctx.input.includeTriggers) {
      let triggersResult = await appClient.getBroadcastTriggers(ctx.input.broadcastId);
      triggers = triggersResult?.triggers ?? [];
    }
    if (ctx.input.triggerId) {
      trigger = await appClient.getBroadcastTrigger(
        ctx.input.broadcastId,
        ctx.input.triggerId
      );
      if (ctx.input.includeTriggerErrors) {
        let errorsResult = await appClient.getBroadcastTriggerErrors(
          ctx.input.broadcastId,
          ctx.input.triggerId,
          ctx.input.triggerErrorsCursor
        );
        triggerErrors = errorsResult?.errors ?? [];
        nextTriggerErrors = errorsResult?.next;
      }
    }

    return {
      output: {
        broadcast,
        actions,
        metrics,
        triggers,
        trigger,
        triggerErrors,
        nextTriggerErrors
      },
      message: `Retrieved broadcast **${broadcast?.name ?? ctx.input.broadcastId}**.`
    };
  })
  .build();
