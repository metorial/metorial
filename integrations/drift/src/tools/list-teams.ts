import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in the Drift organization, or list teams for a specific user. Teams organize agents for routing and assignment purposes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('User ID to list teams for (omit to list all org teams)')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.any().optional().describe('Team identifier'),
          name: z.string().optional().describe('Team name'),
          members: z.array(z.number()).optional().describe('Team member user IDs')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let teams: any[];

    if (ctx.input.userId) {
      teams = await client.listUserTeams(ctx.input.userId);
    } else {
      teams = await client.listTeams();
    }

    return {
      output: {
        teams: teams.map((t: any) => ({
          teamId: t.id,
          name: t.name,
          members: t.members
        }))
      },
      message: ctx.input.userId
        ? `Retrieved **${teams.length}** team(s) for user \`${ctx.input.userId}\`.`
        : `Retrieved **${teams.length}** team(s).`
    };
  })
  .build();
