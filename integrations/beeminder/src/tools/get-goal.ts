import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { goalSchema, mapGoal } from '../lib/schemas';
import { spec } from '../spec';

export let getGoal = SlateTool.create(spec, {
  name: 'Get Goal',
  key: 'get_goal',
  description: `Retrieve detailed information about a specific goal by its slug. Includes current value, pledge, safety buffer, road definition, and all goal configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      goalSlug: z.string().describe('URL-friendly identifier of the goal'),
      datapoints: z
        .boolean()
        .optional()
        .describe('Include the goal datapoints in the response'),
      emaciated: z.boolean().optional().describe('Omit the road matrices from the response')
    })
  )
  .output(goalSchema)
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username,
      authType: ctx.auth.authType
    });

    let raw = await client.getGoal(ctx.input.goalSlug, {
      datapoints: ctx.input.datapoints,
      emaciated: ctx.input.emaciated
    });
    let goal = mapGoal(raw);

    return {
      output: goal,
      message: `Retrieved goal **${goal.title}** (${goal.slug}): ${goal.limsum || 'No limit summary available'}.`
    };
  })
  .build();
