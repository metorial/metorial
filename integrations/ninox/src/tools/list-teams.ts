import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams (workspaces) accessible with the current authentication token. Teams are the top-level organizational unit in Ninox that contain databases.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('Unique identifier of the team'),
            name: z.string().describe('Name of the team')
          })
        )
        .describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let teams = await client.listTeams();

    return {
      output: {
        teams: teams.map(t => ({
          teamId: t.id,
          name: t.name
        }))
      },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();
