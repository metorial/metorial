import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { goalSchema, mapGoal } from '../lib/schemas';
import { spec } from '../spec';

export let createGoal = SlateTool.create(spec, {
  name: 'Create Goal',
  key: 'create_goal',
  description: `Create a new Beeminder goal. Requires a slug, title, goal type, and units. Exactly two of goaldate, goalval, and rate must be specified to define the bright red line trajectory.`,
  instructions: [
    'Goal types: hustler (Do More), biker (Odometer), fatloser (Weight Loss), gainer (Gain Weight), inboxer (Inbox Fewer), drinker (Do Less), custom.',
    'Exactly two of goaldate, goalval, and rate must be provided. The third is computed automatically.'
  ],
  constraints: [
    'The slug must be URL-friendly (lowercase letters, numbers, hyphens).',
    'Minimum pledge is $0; max depends on the user plan.'
  ]
})
  .input(
    z.object({
      slug: z
        .string()
        .describe('URL-friendly name for the goal (lowercase, hyphens, no spaces)'),
      title: z.string().describe('Human-readable title for the goal'),
      goalType: z
        .enum(['hustler', 'biker', 'fatloser', 'gainer', 'inboxer', 'drinker', 'custom'])
        .describe('Type of goal'),
      gunits: z.string().describe('Units for the goal value (e.g., "hours", "pages", "kg")'),
      goaldate: z
        .number()
        .optional()
        .describe(
          'Unix timestamp of target end date (provide exactly 2 of goaldate/goalval/rate)'
        ),
      goalval: z
        .number()
        .optional()
        .describe(
          'Target value at the goal date (provide exactly 2 of goaldate/goalval/rate)'
        ),
      rate: z
        .number()
        .optional()
        .describe(
          'Required rate of change per day (provide exactly 2 of goaldate/goalval/rate)'
        ),
      initval: z.number().optional().describe('Initial value for the goal (default 0)'),
      secret: z
        .boolean()
        .optional()
        .describe('Whether the goal is secret (not publicly visible)'),
      datapublic: z.boolean().optional().describe('Whether the data is publicly visible'),
      tags: z.array(z.string()).optional().describe('Tags to categorize the goal'),
      pledge: z.number().optional().describe('Initial pledge amount in USD')
    })
  )
  .output(goalSchema)
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let raw = await client.createGoal(ctx.input);
    let goal = mapGoal(raw);

    return {
      output: goal,
      message: `Created goal **${goal.title}** (${goal.slug}) of type ${goal.goalType} with units "${goal.gunits}".`
    };
  })
  .build();
