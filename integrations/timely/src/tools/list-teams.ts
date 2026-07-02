import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let teamMemberSchema = z.object({
  userId: z.number().describe('User ID'),
  lead: z.boolean().describe('Whether the user is a team lead')
});

let teamSchema = z.object({
  teamId: z.number().describe('Team ID'),
  name: z.string().describe('Team name'),
  color: z.string().nullable().describe('Color hex code'),
  users: z.array(teamMemberSchema).describe('Team members'),
  updatedAt: z.string().nullable().describe('Last updated timestamp')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve teams from Timely, including their members and lead assignments.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max teams to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema),
      count: z.number().describe('Number of teams returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let teams = await client.listTeams({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      order: ctx.input.order
    });

    let mapped = teams.map((t: any) => ({
      teamId: t.id,
      name: t.name,
      color: t.color ?? null,
      users: (t.users ?? []).map((u: any) => ({
        userId: u.user_id,
        lead: u.lead ?? false
      })),
      updatedAt: t.updated_at ?? null
    }));

    return {
      output: { teams: mapped, count: mapped.length },
      message: `Found **${mapped.length}** teams.`
    };
  })
  .build();
