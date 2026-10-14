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
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Limit must be a safe integer.')
        .min(1)
        .max(100)
        .optional()
        .describe('Number of teams to return (1-100, default 10)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Pass this ID as cursor to fetch the next page'),
      count: z.number().describe('Number of teams returned in this page'),
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
        hasMore: result.has_more,
        nextCursor: result.has_more ? (result.data.at(-1)?.id ?? null) : null,
        teams
      },
      message: `Returned **${teams.length}** team(s) in this page.`
    };
  })
  .build();
