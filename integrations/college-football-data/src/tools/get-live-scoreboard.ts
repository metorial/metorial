import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLiveScoreboard = SlateTool.create(spec, {
  name: 'Get Live Scoreboard',
  key: 'get_live_scoreboard',
  description: `Retrieve the current live scoreboard showing all in-progress and recently completed games. Optionally get detailed live data for a specific game including real-time play-by-play.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      gameId: z.number().optional().describe('Specific game ID for detailed live game data')
    })
  )
  .output(
    z.object({
      scoreboard: z.array(z.any()).optional().describe('Current scoreboard with all games'),
      liveGame: z.any().optional().describe('Detailed live data for a specific game')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: any = {};

    if (ctx.input.gameId) {
      results.liveGame = await client.getLiveGame(ctx.input.gameId);
    } else {
      results.scoreboard = await client.getScoreboard();
    }

    if (results.liveGame) {
      return {
        output: results,
        message: `Retrieved live game data for game **${ctx.input.gameId}**.`
      };
    }

    let count = Array.isArray(results.scoreboard) ? results.scoreboard.length : 0;
    return {
      output: results,
      message: `Retrieved live scoreboard with **${count}** game(s).`
    };
  })
  .build();
