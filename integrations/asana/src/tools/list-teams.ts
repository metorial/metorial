import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in an organization workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Organization workspace GID'),
      limit: z.number().optional().describe('Maximum number of teams to return')
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
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTeamsInWorkspace(ctx.input.workspaceId, {
      limit: ctx.input.limit
    });
    let teams = (result.data || []).map((t: any) => ({
      teamId: t.gid,
      name: t.name,
      description: t.description
    }));

    return {
      output: { teams },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();
