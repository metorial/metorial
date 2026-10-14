import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description:
    'List the Nozbe spaces accessible to this API token. Use the returned team IDs when creating projects or public tags.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by the space name'),
      sortBy: z.string().optional().describe('Comma-separated sort fields, such as name'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum spaces to return'),
      offset: z.number().int().min(0).optional().describe('Number of spaces to skip')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string().describe('Space ID for project and tag operations'),
          name: z.string().describe('Space name'),
          color: z.string().optional().describe('Space color'),
          avatarUrl: z.string().nullable().optional().describe('Space image URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let teams = await client.listTeams({
      name: ctx.input.name,
      sortBy: ctx.input.sortBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let mapped = teams.map(
      (team: { id: string; name: string; color?: string; avatar_url?: string | null }) => ({
        teamId: team.id,
        name: team.name,
        color: team.color,
        avatarUrl: team.avatar_url
      })
    );
    return {
      output: { teams: mapped },
      message: `Found **${mapped.length}** space(s).`
    };
  })
  .build();
