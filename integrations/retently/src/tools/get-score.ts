import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getScore = SlateTool.create(spec, {
  name: 'Get Score',
  key: 'get_score',
  description: `Retrieve the latest overall score for a specific survey metric (NPS, CSAT, CES, or 5-Star) across your account.
Includes the score value, rating distribution, and respondent category breakdowns (e.g., promoters/passives/detractors for NPS).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metric: z
        .enum(['nps', 'csat', 'ces', 'star'])
        .describe('Survey metric to retrieve the score for')
    })
  )
  .output(
    z.object({
      score: z.number().optional().describe('The computed score value'),
      totalResponses: z.number().optional().describe('Total number of responses'),
      ratingDistribution: z
        .record(z.string(), z.number())
        .optional()
        .describe('Distribution of ratings by score value'),
      promoters: z.number().optional().describe('Percentage of promoters (NPS)'),
      passives: z.number().optional().describe('Percentage of passives (NPS)'),
      detractors: z.number().optional().describe('Percentage of detractors (NPS)'),
      promotersCount: z.number().optional().describe('Count of promoters (NPS)'),
      passivesCount: z.number().optional().describe('Count of passives (NPS)'),
      detractorsCount: z.number().optional().describe('Count of detractors (NPS)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.getScore(ctx.input.metric);

    let metricLabel = ctx.input.metric.toUpperCase();
    let scoreValue = data[ctx.input.metric] ?? data.score;

    return {
      output: {
        score: scoreValue,
        totalResponses: data.totalResponses,
        ratingDistribution: data.ratingDistribution,
        promoters: data.promoters,
        passives: data.passives,
        detractors: data.detractors,
        promotersCount: data.promotersCount,
        passivesCount: data.passivesCount,
        detractorsCount: data.detractorsCount
      },
      message: `**${metricLabel}** score: **${scoreValue}** (${data.totalResponses ?? 0} total responses).`
    };
  })
  .build();
