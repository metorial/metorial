import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve all teams in the GoDial organization. Teams are used to organize agents and sub-managers. Use this to discover available team IDs before adding members.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(z.any()).describe('Array of team records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let teams = await client.getTeams();

    return {
      output: { teams },
      message: `Retrieved **${Array.isArray(teams) ? teams.length : 0}** team(s).`
    };
  })
  .build();
