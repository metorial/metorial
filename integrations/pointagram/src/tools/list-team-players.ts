import { SlateTool } from 'slates';
import { z } from 'zod';
import { getPointagramList, PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let listTeamPlayers = SlateTool.create(spec, {
  name: 'List Team Players',
  key: 'list_team_players',
  description:
    'Lists the players belonging to a Pointagram team, including their profile IDs and names. Use this to inspect or verify team membership. Call list_teams to discover team IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID returned by list_teams')
    })
  )
  .output(
    z.object({
      teamId: z.string().describe('Pointagram team ID'),
      players: z.array(z.any()).describe('Players belonging to the team')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient(ctx.auth);
    let result = await client.listTeamPlayers(ctx.input.teamId);
    let players = getPointagramList(result, 'players');
    return {
      output: { teamId: ctx.input.teamId, players },
      message: `Found **${players.length}** player(s) in team \`${ctx.input.teamId}\`.`
    };
  })
  .build();
