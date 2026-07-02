import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAdjustedMetrics = SlateTool.create(spec, {
  name: 'Get Adjusted Metrics',
  key: 'get_adjusted_metrics',
  description: `Retrieve adjusted performance metrics including team WEPA (Weighted EPA), adjusted player passing and rushing stats, and kicker PAAR (Points Above Average Replacement) ratings. These are opponent-adjusted efficiency metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().optional().describe('Season year'),
      team: z.string().optional().describe('Team name to filter by'),
      conference: z.string().optional().describe('Conference abbreviation to filter by'),
      includeTeamMetrics: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include adjusted team season metrics'),
      includePassingMetrics: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include adjusted player passing stats'),
      includeRushingMetrics: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include adjusted player rushing stats'),
      includeKickingMetrics: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include kicker PAAR ratings')
    })
  )
  .output(
    z.object({
      teamMetrics: z.array(z.any()).optional().describe('Adjusted team season metrics'),
      passingMetrics: z.array(z.any()).optional().describe('Adjusted player passing stats'),
      rushingMetrics: z.array(z.any()).optional().describe('Adjusted player rushing stats'),
      kickingMetrics: z.array(z.any()).optional().describe('Kicker PAAR ratings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: any = {};

    if (ctx.input.includeTeamMetrics) {
      results.teamMetrics = await client.getAdjustedTeamSeasonMetrics({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    if (ctx.input.includePassingMetrics) {
      results.passingMetrics = await client.getAdjustedPlayerPassing({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    if (ctx.input.includeRushingMetrics) {
      results.rushingMetrics = await client.getAdjustedPlayerRushing({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    if (ctx.input.includeKickingMetrics) {
      results.kickingMetrics = await client.getKickerPAARRatings({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    let parts: string[] = [];
    if (results.teamMetrics) parts.push('team WEPA');
    if (results.passingMetrics) parts.push('passing');
    if (results.rushingMetrics) parts.push('rushing');
    if (results.kickingMetrics) parts.push('kicking PAAR');

    return {
      output: results,
      message: `Retrieved adjusted metrics: ${parts.join(', ')}${ctx.input.year ? ` for ${ctx.input.year}` : ''}${ctx.input.team ? ` (${ctx.input.team})` : ''}.`
    };
  })
  .build();
