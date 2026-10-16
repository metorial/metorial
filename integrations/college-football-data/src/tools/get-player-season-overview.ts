import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPlayerSeasonOverview = SlateTool.create(spec, {
  name: 'Get Player Season Overview',
  key: 'get_player_season_overview',
  description:
    'Retrieve a player’s season overview with box score statistics, usage, and Predicted Points Added data when available. Use search_players to find the player ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      year: z.number().describe('Season year'),
      playerId: z.number().describe('Player ID; call search_players to discover player IDs')
    })
  )
  .output(
    z.object({
      overview: z
        .any()
        .describe('Complete player season overview, including available usage and PPA')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let overview = await client.getPlayerOverview(ctx.input);
    return { output: { overview }, message: 'Retrieved the player season overview.' };
  })
  .build();
