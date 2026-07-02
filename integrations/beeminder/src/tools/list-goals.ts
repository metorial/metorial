import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { goalSchema, mapGoal } from '../lib/schemas';
import { spec } from '../spec';

export let listGoals = SlateTool.create(spec, {
  name: 'List Goals',
  key: 'list_goals',
  description: `Retrieve all goals for the authenticated user. Can list active or archived goals. Returns goal details including current status, pledge, safety buffer, and deadline information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeArchived: z
        .boolean()
        .optional()
        .describe('If true, returns archived goals instead of active goals')
    })
  )
  .output(
    z.object({
      goals: z.array(goalSchema).describe('List of goals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let raw = ctx.input.includeArchived
      ? await client.getArchivedGoals()
      : await client.getGoals();

    let goals = (raw as any[]).map(mapGoal);

    return {
      output: { goals },
      message: `Found **${goals.length}** ${ctx.input.includeArchived ? 'archived' : 'active'} goal(s).`
    };
  })
  .build();
