import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: 'List helpdesk teams and discover team IDs for assigning tickets.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .refine(Number.isInteger, 'Use a whole number')
        .optional()
        .describe('Maximum teams to return, from 1 to 100; default 30')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.number().describe('Team ID for ticket assignment'),
          name: z.string().describe('Team name'),
          description: z.string().nullable().describe('Team description'),
          createdDatetime: z.string().nullable().describe('Creation time')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx.config, ctx.auth).listTeams(ctx.input);
    let teams = result.data.map(team => ({
      teamId: team.id,
      name: team.name,
      description: team.description ?? null,
      createdDatetime: team.created_datetime ?? null
    }));
    return {
      output: {
        teams,
        nextCursor: result.meta?.next_cursor ?? null,
        prevCursor: result.meta?.prev_cursor ?? null
      },
      message: `Found ${teams.length} team(s).`
    };
  })
  .build();
