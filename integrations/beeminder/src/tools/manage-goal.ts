import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { goalSchema, mapGoal } from '../lib/schemas';
import { spec } from '../spec';

export let manageGoal = SlateTool.create(spec, {
  name: 'Manage Goal',
  key: 'manage_goal',
  description: `Perform management actions on a goal: refresh autodata, ratchet (reduce safety buffer), short-circuit (instantly derail and charge), step down pledge, cancel a scheduled step-down, or cry uncle (instant derail for beemergency goals). Each action has specific preconditions.`,
  instructions: [
    'Use **refresh** to force a refetch of autodata for goals connected to automatic data sources.',
    'Use **ratchet** to reduce the safety buffer. For Do More goals, specify days of buffer; for Do Less, specify a hard cap value.',
    'Use **shortcircuit** to instantly derail, pay the pledge, and increase the pledge level.',
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
          'For ratchet: target days of safety buffer (Do More) or hard cap value (Do Less)'
        )
    })
  )
  .output(goalSchema)
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let raw: any;

    switch (ctx.input.action) {
      case 'refresh':
        raw = await client.refreshGoal(ctx.input.goalSlug);
        break;
      case 'ratchet':
        if (ctx.input.newSafety === undefined) {
          throw new Error('newSafety is required for the ratchet action');
        }
        raw = await client.ratchet(ctx.input.goalSlug, ctx.input.newSafety);
        break;
      case 'shortcircuit':
        raw = await client.shortcircuit(ctx.input.goalSlug);
        break;
      case 'stepdown':
        raw = await client.stepdown(ctx.input.goalSlug);
        break;
      case 'cancelStepdown':
        raw = await client.cancelStepdown(ctx.input.goalSlug);
        break;
      case 'uncle':
        raw = await client.uncle(ctx.input.goalSlug);
        break;
    }

    let goal = mapGoal(raw);

    let actionMessages: Record<string, string> = {
      refresh: 'Refreshed autodata for',
      ratchet: `Ratcheted safety buffer to ${ctx.input.newSafety} for`,
      shortcircuit: 'Short-circuited (instant derail) on',
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
