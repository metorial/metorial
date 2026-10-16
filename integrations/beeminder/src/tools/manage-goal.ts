import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { goalSchema, mapGoal } from '../lib/schemas';
import { spec } from '../spec';

export let manageGoal = SlateTool.create(spec, {
  name: 'Manage Goal',
  key: 'manage_goal',
  description: `Perform management actions on a goal: refresh autodata, ratchet (reduce safety buffer), short-circuit (charge the current pledge and increase its level), step down pledge, cancel a scheduled step-down, or cry uncle (instant derail for beemergency goals). Each action has specific preconditions.`,
  instructions: [
    'Use **refresh** to force a refetch of autodata for goals connected to automatic data sources.',
    'Use **ratchet** to reduce the safety buffer. For Do More goals, specify days of buffer; for Do Less, specify units of buffer below the bright red line.',
    'Use **shortcircuit** to immediately pay the current pledge and increase the pledge level.',
    'Use **stepdown** to schedule a pledge reduction (subject to akrasia horizon).',
    'Use **cancelStepdown** to cancel a previously scheduled pledge reduction.',
    'Use **uncle** to instantly derail a goal that is currently in beemergency status.'
  ],
  constraints: [
    'Uncle (instant derail) only works on goals currently in beemergency.',
    'Stepdown is subject to the one-week akrasia horizon.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      goalSlug: z.string().describe('URL-friendly identifier of the goal'),
      action: z
        .enum(['refresh', 'ratchet', 'shortcircuit', 'stepdown', 'cancelStepdown', 'uncle'])
        .describe('Management action to perform'),
      newSafety: z
        .number()
        .optional()
        .describe(
          'For ratchet: target days of safety buffer (Do More) or units of safety buffer (Do Less)'
        ),
      beemergency: z
        .boolean()
        .optional()
        .describe('For ratchet: explicitly confirm reducing the buffer to zero')
    })
  )
  .output(goalSchema)
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username,
      authType: ctx.auth.authType
    });

    let raw: unknown;
    let refreshQueued: boolean | undefined;

    switch (ctx.input.action) {
      case 'refresh':
        refreshQueued = await client.refreshGoal(ctx.input.goalSlug);
        raw = await client.getGoal(ctx.input.goalSlug);
        break;
      case 'ratchet':
        if (ctx.input.newSafety === undefined) {
          throw createApiServiceError('newSafety is required for the ratchet action');
        }
        raw = await client.ratchet(
          ctx.input.goalSlug,
          ctx.input.newSafety,
          ctx.input.beemergency
        );
        break;
      case 'shortcircuit':
        raw = await client.manageGoal(ctx.input.goalSlug, 'shortcircuit');
        break;
      case 'stepdown':
        raw = await client.manageGoal(ctx.input.goalSlug, 'stepdown');
        break;
      case 'cancelStepdown':
        raw = await client.manageGoal(ctx.input.goalSlug, 'cancel_stepdown');
        break;
      case 'uncle':
        raw = await client.manageGoal(ctx.input.goalSlug, 'uncleme');
        break;
    }

    let goal = { ...mapGoal(raw), refreshQueued };

    let actionMessages: Record<string, string> = {
      refresh: refreshQueued
        ? 'Queued graph and autodata refresh for'
        : 'Did not queue a new graph refresh for',
      ratchet: 'Updated safety buffer for',
      shortcircuit: 'Charged the current pledge and increased its level for',
      stepdown: 'Scheduled pledge step-down for',
      cancelStepdown: 'Cancelled scheduled step-down for',
      uncle: 'Cried uncle (instant derail) on'
    };

    return {
      output: goal,
      message: `${actionMessages[ctx.input.action]} goal **${goal.title}** (${goal.slug}).`
    };
  })
  .build();
