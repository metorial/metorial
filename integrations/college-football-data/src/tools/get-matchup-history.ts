import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMatchupHistory = SlateTool.create(spec, {
  name: 'Get Matchup History',
  key: 'get_matchup_history',
  description: `Retrieve the historical head-to-head record between two college football teams. Returns all-time series record and individual game results. Optionally filter by year range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      team1: z.string().describe('First team name (e.g. "Michigan")'),
      team2: z.string().describe('Second team name (e.g. "Ohio State")'),
      minYear: z.number().optional().describe('Earliest year to include'),
      maxYear: z.number().optional().describe('Latest year to include')
    })
  )
  .output(
    z.object({
      matchup: z
        .any()
        .describe('Historical matchup data including series record and game-by-game results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let matchup = await client.getMatchup(ctx.input);

    return {
      output: { matchup },
      message: `Retrieved matchup history between **${ctx.input.team1}** and **${ctx.input.team2}**.`
    };
  })
  .build();
