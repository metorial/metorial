import { SlateTool } from 'slates';
import { z } from 'zod';
import { getPointagramList, PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieves all teams in your Pointagram account, including their names, icons, and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(z.any()).describe('List of teams in Pointagram')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient({
      token: ctx.auth.token,
      apiUser: ctx.auth.apiUser
    });

    let result = await client.listTeams();
    let teams = getPointagramList(result, 'teams');

    return {
      output: { teams },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();
