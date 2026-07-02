import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in the OpsGenie account. Returns team names, descriptions, and member counts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string().describe('Team ID'),
          name: z.string().describe('Team name'),
          description: z.string().optional().describe('Team description')
        })
      ),
      totalCount: z.number().describe('Number of teams returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let data = await client.listTeams();
    let teams = (data ?? []).map((t: any) => ({
      teamId: t.id,
      name: t.name,
      description: t.description
    }));

    return {
      output: {
        teams,
        totalCount: teams.length
      },
      message: `Found **${teams.length}** teams.`
    };
  })
  .build();
