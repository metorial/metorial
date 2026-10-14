import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description:
    'List teams authorized for the current organization-scoped token, with IDs and names. Pass a returned teamId to resource tools. For a team-scoped token, use get_auth_info instead.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().int().min(1).optional(),
      perPage: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional()
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string(),
          name: z.string(),
          description: z.string().optional()
        })
      ),
      hasNextPage: z.boolean(),
      cursor: z.string().optional(),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listTeams(ctx.input);
    let teams = result.data.teams.map(team => ({
      teamId: team.id,
      name: team.name,
      description: team.description
    }));
    return {
      output: { teams, ...result.pagination },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();
