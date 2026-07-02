import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { goalSchema, mapGoal } from '../lib/schemas';
import { spec } from '../spec';

export let updateGoal = SlateTool.create(spec, {
  name: 'Update Goal',
  key: 'update_goal',
  description: `Update an existing goal's settings. Allows modifying title, y-axis label, visibility, road (bright red line), tags, and webhook callback URL. Road changes are subject to the one-week akrasia horizon.`,
  instructions: [
    'Road (roadall) changes cannot make the goal easier within one week (akrasia horizon).',
    'The roadall parameter is a matrix of [date, value, rate] triples defining the bright red line.'
  ]
})
  .input(
    z.object({
      goalSlug: z.string().describe('URL-friendly identifier of the goal to update'),
      title: z.string().optional().describe('New title for the goal'),
      yaxis: z.string().optional().describe('New y-axis label for the graph'),
      secret: z.boolean().optional().describe('Whether the goal is secret'),
      datapublic: z.boolean().optional().describe('Whether the data is publicly visible'),
      roadall: z
        .array(z.any())
        .optional()
        .describe('Full road matrix as array of [date, value, rate] triples'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to set on the goal (replaces existing)'),
      callbackUrl: z.string().optional().describe('Webhook URL for derail notifications')
    })
  )
  .output(goalSchema)
  .handleInvocation(async ctx => {
    let { goalSlug, ...params } = ctx.input;
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let raw = await client.updateGoal(goalSlug, params);
    let goal = mapGoal(raw);

    return {
      output: goal,
      message: `Updated goal **${goal.title}** (${goal.slug}).`
    };
  })
  .build();
