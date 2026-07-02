import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGameStats = SlateTool.create(spec, {
  name: 'Get Game Stats',
  key: 'get_game_stats',
  description: `Retrieve detailed statistics for a specific game, including team-level stats, player-level stats, and optionally the advanced box score with EPA and success rate breakdowns. Provide a game ID to get comprehensive stat lines.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      gameId: z.number().describe('The game ID to retrieve stats for'),
      includePlayerStats: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include individual player statistics'),
      includeAdvancedBoxScore: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include the advanced box score with EPA metrics')
    })
  )
  .output(
    z.object({
      teamStats: z.any().describe('Team-level statistics for the game'),
      playerStats: z.any().optional().describe('Player-level statistics for the game'),
      advancedBoxScore: z
        .any()
        .optional()
        .describe('Advanced box score with EPA and efficiency data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let teamStats = await client.getGameTeamStats(ctx.input.gameId);

    let playerStats: any;
    if (ctx.input.includePlayerStats) {
      playerStats = await client.getGamePlayerStats(ctx.input.gameId);
    }

    let advancedBoxScore: any;
    if (ctx.input.includeAdvancedBoxScore) {
      advancedBoxScore = await client.getAdvancedBoxScore(ctx.input.gameId);
    }

    return {
      output: { teamStats, playerStats, advancedBoxScore },
      message: `Retrieved stats for game **${ctx.input.gameId}**. Includes team stats${ctx.input.includePlayerStats ? ', player stats' : ''}${ctx.input.includeAdvancedBoxScore ? ', and advanced box score' : ''}.`
    };
  })
  .build();
