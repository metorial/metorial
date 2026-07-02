import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWinProbability = SlateTool.create(spec, {
  name: 'Get Win Probability',
  key: 'get_win_probability',
  description: `Retrieve win probability data for college football games. Get play-by-play win probability for a specific game, or pregame win probabilities for a set of games. Also supports PPA (Predicted Points Added) data at team and player level.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      gameId: z
        .number()
        .optional()
        .describe('Specific game ID for play-level win probability'),
      year: z.number().optional().describe('Season year for pregame probabilities or PPA'),
      week: z.number().optional().describe('Week number for pregame probabilities or PPA'),
      team: z.string().optional().describe('Team name to filter by'),
      seasonType: z.enum(['regular', 'postseason', 'both']).optional().describe('Season type'),
      includePregame: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include pregame win probabilities'),
      includeTeamPPA: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include team PPA (Predicted Points Added) for the season')
    })
  )
  .output(
    z.object({
      playWinProbability: z
        .array(z.any())
        .optional()
        .describe('Play-by-play win probability for a specific game'),
      pregameWinProbability: z.array(z.any()).optional().describe('Pregame win probabilities'),
      teamSeasonPPA: z.array(z.any()).optional().describe('Team season PPA data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: any = {};

    if (ctx.input.gameId) {
      results.playWinProbability = await client.getWinProbability({
        gameId: ctx.input.gameId
      });
    }

    if (ctx.input.includePregame) {
      results.pregameWinProbability = await client.getPregameWinProbability({
        year: ctx.input.year,
        week: ctx.input.week,
        seasonType: ctx.input.seasonType,
        team: ctx.input.team
      });
    }

    if (ctx.input.includeTeamPPA) {
      results.teamSeasonPPA = await client.getTeamSeasonPPA({
        year: ctx.input.year,
        team: ctx.input.team
      });
    }

    let parts: string[] = [];
    if (results.playWinProbability) parts.push(`play-level WP for game ${ctx.input.gameId}`);
    if (results.pregameWinProbability)
      parts.push(
        `${Array.isArray(results.pregameWinProbability) ? results.pregameWinProbability.length : 0} pregame WP record(s)`
      );
    if (results.teamSeasonPPA) parts.push('team PPA data');

    return {
      output: results,
      message: `Retrieved: ${parts.join(', ')}.`
    };
  })
  .build();
