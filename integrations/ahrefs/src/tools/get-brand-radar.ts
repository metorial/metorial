import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBrandRadar = SlateTool.create(spec, {
  name: 'Get Brand Radar',
  key: 'get_brand_radar',
  description: `Monitor how a brand appears in AI-generated responses across different AI platforms. Retrieves brand overview stats, share of voice history, and actual AI prompts with citations.
Use to track and analyze your brand's visibility and mentions in AI assistant responses.`,
  instructions: [
    'Use "reportType" of "overview" for brand stats summary.',
    'Use "sov-history" for share of voice trends over time.',
    'Use "ai-responses" to see actual AI prompts and citations mentioning the brand.'
  ],
  constraints: [
    'Consumes API units (minimum 50 per request).',
    'Rate limited to 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Brand name or domain to monitor'),
      reportType: z
        .enum(['overview', 'sov-history', 'ai-responses'])
        .optional()
        .describe('Type of Brand Radar report. Defaults to "overview".'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format (for sov-history)'),
      dateTo: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format (for sov-history)'),
      where: z.string().optional().describe('Filter expression (for ai-responses)'),
      orderBy: z.string().optional().describe('Sort order (for ai-responses)'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      brandData: z.any().describe('Brand Radar data for the specified report')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let reportType = ctx.input.reportType || 'overview';

    let result: any;
    switch (reportType) {
      case 'sov-history':
        result = await client.getBrandRadarSovHistory({
          target: ctx.input.target,
          select: ctx.input.select,
          date_from: ctx.input.dateFrom,
          date_to: ctx.input.dateTo
        });
        break;
      case 'ai-responses':
        result = await client.getBrandRadarAiResponses({
          target: ctx.input.target,
          select: ctx.input.select,
          where: ctx.input.where,
          order_by: ctx.input.orderBy,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        break;
      default:
        result = await client.getBrandRadarOverview({
          target: ctx.input.target,
          select: ctx.input.select
        });
    }

    return {
      output: {
        brandData: result
      },
      message: `Retrieved Brand Radar ${reportType} for **${ctx.input.target}**.`
    };
  })
  .build();
