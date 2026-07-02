import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPlayerStats = SlateTool.create(spec, {
  name: 'Get Player Stats',
  key: 'get_player_stats',
  description: `Retrieve player season statistics for a given year. Filter by team, conference, or stat category. Also supports player usage metrics and returning production data for roster continuity analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().describe('Season year (required)'),
      team: z.string().optional().describe('Team name to filter by'),
      conference: z.string().optional().describe('Conference abbreviation to filter by'),
      category: z
        .string()
        .optional()
        .describe(
          'Stat category to filter by (e.g. "passing", "rushing", "receiving", "tackles", "interceptions")'
        ),
      startWeek: z.number().optional().describe('Start week for filtering'),
      endWeek: z.number().optional().describe('End week for filtering'),
      seasonType: z
        .enum(['regular', 'postseason', 'both'])
        .optional()
        .describe('Season type filter'),
      includeUsage: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include player usage metrics'),
      includeReturningProduction: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include returning production percentages')
    })
  )
  .output(
    z.object({
      seasonStats: z.array(z.any()).describe('Player season statistics'),
      usage: z.array(z.any()).optional().describe('Player usage metrics by down, play type'),
      returningProduction: z
        .array(z.any())
        .optional()
        .describe('Returning production data for roster continuity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let seasonStats = await client.getPlayerSeasonStats({
      year: ctx.input.year,
      team: ctx.input.team,
      conference: ctx.input.conference,
      category: ctx.input.category,
      startWeek: ctx.input.startWeek,
      endWeek: ctx.input.endWeek,
      seasonType: ctx.input.seasonType
    });

    let usage: any;
    if (ctx.input.includeUsage) {
      usage = await client.getPlayerUsage({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    let returningProduction: any;
    if (ctx.input.includeReturningProduction) {
      returningProduction = await client.getReturningProduction({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    let count = Array.isArray(seasonStats) ? seasonStats.length : 0;
    return {
      output: { seasonStats, usage, returningProduction },
      message: `Retrieved **${count}** player stat record(s) for ${ctx.input.year}${ctx.input.team ? ` (${ctx.input.team})` : ''}${ctx.input.category ? ` in category "${ctx.input.category}"` : ''}.`
    };
  })
  .build();
