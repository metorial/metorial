import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBettingLines = SlateTool.create(spec, {
  name: 'Get Betting Lines',
  key: 'get_betting_lines',
  description: `Retrieve betting lines (spread, over/under, moneyline) for college football games from various sportsbooks. Filter by year, week, team, conference, or specific game ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().optional().describe('Season year'),
      week: z.number().optional().describe('Week number'),
      team: z.string().optional().describe('Team name to filter by'),
      conference: z.string().optional().describe('Conference abbreviation to filter by'),
      seasonType: z.enum(['regular', 'postseason', 'both']).optional().describe('Season type'),
      gameId: z.number().optional().describe('Specific game ID')
    })
  )
  .output(
    z.object({
      bettingGames: z
        .array(z.any())
        .describe('Array of games with betting line data from multiple sportsbooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let bettingGames = await client.getBettingLines(ctx.input);

    let count = Array.isArray(bettingGames) ? bettingGames.length : 0;
    return {
      output: { bettingGames },
      message: `Found betting lines for **${count}** game(s).`
    };
  })
  .build();
