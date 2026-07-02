import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.string().describe('Unique team identifier'),
  name: z.string().describe('Team name')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve all teams in your ScheduleOnce account.
Teams are groups of users used as scheduling resources for team-based booking scenarios.`,
  constraints: ['Maximum 100 teams per request (default 10).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of teams to return (1-100, default 10)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of teams'),
      teams: z.array(teamSchema).describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTeams({
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let teams = (result.data || []).map(t => ({
      teamId: t.id,
      name: t.name
    }));

    return {
      output: {
        count: result.count,
        teams
      },
      message: `Found **${result.count}** team(s). Returned **${teams.length}** in this page.`
    };
  })
  .build();
