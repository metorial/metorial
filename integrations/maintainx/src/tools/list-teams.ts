import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Lists teams in the MaintainX organization. Teams consist of users with similar roles or functions and can be assigned to work orders, locations, and assets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results per page (1-200, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.number().describe('Team ID'),
            name: z.string().optional().describe('Team name'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of teams'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listTeams({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let teams = (result.teams ?? []).map((t: any) => ({
      teamId: t.id,
      name: t.name,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: {
        teams,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${teams.length}** team(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
