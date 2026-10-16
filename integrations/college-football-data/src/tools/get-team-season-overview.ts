import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamSeasonOverview = SlateTool.create(spec, {
  name: 'Get Team Season Overview',
  key: 'get_team_season_overview',
  description:
    'Retrieve a team’s stored full-season overview, including postseason and garbage time, with records, ratings, advanced statistics, passing, rushing, and key players.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      year: z.number().describe('Season year'),
      team: z.string().describe('Team name; use get_team_info to discover teams')
    })
  )
  .output(z.object({ overview: z.any().describe('Complete provider team season overview') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let overview = await client.getTeamOverview(ctx.input);
    return { output: { overview }, message: 'Retrieved the team season overview.' };
  })
  .build();
