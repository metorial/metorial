import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClarityClient } from '../lib/client';
import { spec } from '../spec';

export let queryAnalyticsDashboard = SlateTool.create(spec, {
  name: 'Query Analytics Dashboard',
  key: 'query_analytics_dashboard',
  description:
    'Ask a focused natural-language question about Microsoft Clarity traffic, user behavior, or performance metrics. Returns the complete analytics response for the connected project.',
  instructions: [
    'Include an explicit time range in query, for example: "Top browsers in the last 3 days".',
    'Keep each query focused on one data retrieval or aggregation task.',
    'Interpret the returned data and any provider diagnostics before drawing conclusions.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('A focused analytics question with an explicit time range.'),
      timezone: z
        .string()
        .optional()
        .describe(
          'IANA time zone for interpreting the query, such as UTC or America/New_York. Defaults to UTC.'
        )
    })
  )
  .output(
    z.object({
      result: z
        .unknown()
        .describe('Complete analytics JSON response, including any provider diagnostics.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClarityClient(ctx.auth.token);
    ctx.progress('Querying analytics dashboard...');
    let result = await client.queryAnalyticsDashboard(ctx.input.query, ctx.input.timezone);
    return {
      output: { result },
      message: 'Retrieved the Microsoft Clarity analytics query response.'
    };
  })
  .build();
