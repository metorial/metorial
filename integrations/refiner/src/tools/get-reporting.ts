import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let getReporting = SlateTool.create(spec, {
  name: 'Get Reporting',
  key: 'get_reporting',
  description: `Retrieve aggregated survey reporting data. Supports NPS scores, CSAT scores, ratings averages, response distributions, and response counts. Filter by survey, segment, question, tag, or date range.`,
  instructions: [
    'The default date range is the last 7 days if no range is specified.',
    'Use "nps" for Net Promoter Score, "csat" for Customer Satisfaction, "ratings" for average ratings, "distribution" for response value distribution, and "count" for view/response counts.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['nps', 'csat', 'ratings', 'distribution', 'count'])
        .describe('Type of report to generate'),
      questionIdentifiers: z
        .string()
        .optional()
        .describe('Comma-separated question identifiers to filter by'),
      tagUuids: z.string().optional().describe('Comma-separated tag UUIDs to filter by'),
      surveyUuids: z.string().optional().describe('Comma-separated survey UUIDs to filter by'),
      segmentUuids: z
        .string()
        .optional()
        .describe('Comma-separated segment UUIDs to filter by'),
      dateRangeStart: z.string().optional().describe('Start of date range (ISO 8601 format)'),
      dateRangeEnd: z.string().optional().describe('End of date range (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      reportData: z
        .record(z.string(), z.unknown())
        .describe('Aggregated report data (varies by report type)'),
      count: z.number().optional().describe('Total response count (for NPS, CSAT, ratings)'),
      score: z
        .number()
        .optional()
        .describe('Calculated score (NPS score, CSAT percentage, or ratings average)'),
      views: z.number().optional().describe('Total survey views (for count report type)'),
      responses: z
        .number()
        .optional()
        .describe('Total responses (for count and distribution report types)'),
      dateRangeStart: z.string().optional().describe('Start of the reporting date range'),
      dateRangeEnd: z.string().optional().describe('End of the reporting date range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let result = (await client.getReporting({
      type: ctx.input.reportType,
      questionIdentifiers: ctx.input.questionIdentifiers,
      tagUuids: ctx.input.tagUuids,
      formUuids: ctx.input.surveyUuids,
      segmentUuids: ctx.input.segmentUuids,
      dateRangeStart: ctx.input.dateRangeStart,
      dateRangeEnd: ctx.input.dateRangeEnd
    })) as any;

    let score: number | undefined;
    if (ctx.input.reportType === 'nps') score = result.nps;
    else if (ctx.input.reportType === 'csat') score = result.csat;
    else if (ctx.input.reportType === 'ratings') score = result.average;

    let message = '';
    switch (ctx.input.reportType) {
      case 'nps':
        message = `NPS score: **${result.nps}** (${result.count} responses — ${result.data?.promoters ?? 0} promoters, ${result.data?.passives ?? 0} passives, ${result.data?.detractors ?? 0} detractors).`;
        break;
      case 'csat':
        message = `CSAT score: **${result.csat}%** (${result.count} responses).`;
        break;
      case 'ratings':
        message = `Average rating: **${result.average}** (${result.count} responses).`;
        break;
      case 'distribution':
        message = `Response distribution across **${result.datapoints ?? 0}** data points from **${result.responses ?? 0}** responses.`;
        break;
      case 'count':
        message = `**${result.views ?? 0}** views and **${result.responses ?? 0}** responses.`;
        break;
    }

    return {
      output: {
        reportData: result.data ?? {},
        count: result.count,
        score,
        views: result.views,
        responses: result.responses,
        dateRangeStart: result.date_range_start,
        dateRangeEnd: result.date_range_end
      },
      message
    };
  })
  .build();
