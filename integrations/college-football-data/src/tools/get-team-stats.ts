import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamStats = SlateTool.create(spec, {
  name: 'Get Team Stats',
  key: 'get_team_stats',
  description: `Retrieve team-level season statistics, including both basic stats (points, yards, turnovers) and advanced metrics (success rate, explosiveness, EPA, havoc rates). Supports week-range filtering and garbage time exclusion for advanced stats.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().optional().describe('Season year'),
      team: z.string().optional().describe('Team name to filter by'),
      conference: z.string().optional().describe('Conference abbreviation to filter by'),
      startWeek: z.number().optional().describe('Start week for filtering'),
      endWeek: z.number().optional().describe('End week for filtering'),
      includeAdvanced: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include advanced stats (SP+, success rate, EPA, etc.)'),
      excludeGarbageTime: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to exclude garbage time plays from advanced stats')
    })
  )
  .output(
    z.object({
      basicStats: z.array(z.any()).describe('Basic team season statistics'),
      advancedStats: z
        .array(z.any())
        .optional()
        .describe('Advanced team season statistics with EPA and efficiency metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let basicStats = await client.getTeamSeasonStats({
      year: ctx.input.year,
      team: ctx.input.team,
      conference: ctx.input.conference,
      startWeek: ctx.input.startWeek,
      endWeek: ctx.input.endWeek
    });

    let advancedStats: any;
    if (ctx.input.includeAdvanced) {
      advancedStats = await client.getAdvancedSeasonStats({
        year: ctx.input.year,
        team: ctx.input.team,
        excludeGarbageTime: ctx.input.excludeGarbageTime,
        startWeek: ctx.input.startWeek,
        endWeek: ctx.input.endWeek
      });
    }

    return {
      output: { basicStats, advancedStats },
      message: `Retrieved team season stats${ctx.input.team ? ` for **${ctx.input.team}**` : ''}${ctx.input.year ? ` (${ctx.input.year})` : ''}${ctx.input.includeAdvanced ? ' including advanced metrics' : ''}.`
    };
  })
  .build();
