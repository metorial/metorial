import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let queryFunnelTool = SlateTool.create(spec, {
  name: 'Query Funnel',
  key: 'query_funnel',
  description: `Analyze conversion funnels to understand how users progress through a sequence of events. Returns step-by-step conversion rates and drop-off data. Supports "this order" (strict sequence) and "any order" modes, plus segmentation and grouping.`,
  instructions: [
    'The "events" parameter should be a JSON-encoded array of event objects defining the funnel steps.',
    'Example: [{"event_type": "Sign Up"}, {"event_type": "First Purchase"}]'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      events: z
        .string()
        .describe(
          'JSON-encoded array of event objects defining funnel steps in order. Example: [{"event_type":"Step1"},{"event_type":"Step2"}]'
        ),
      start: z.string().describe('Start date in YYYYMMDD format.'),
      end: z.string().describe('End date in YYYYMMDD format.'),
      mode: z
        .enum(['ordered', 'unordered'])
        .optional()
        .describe(
          'Funnel mode: "ordered" (this order) or "unordered" (any order). Default is "ordered".'
        ),
      conversionWindow: z
        .string()
        .optional()
        .describe(
          'Conversion window as a number (in days). Users must complete the funnel within this window.'
        ),
      segment: z
        .string()
        .optional()
        .describe('JSON-encoded segment definition to filter users.'),
      groupBy: z
        .string()
        .optional()
        .describe('JSON-encoded group-by clause for funnel breakdown.')
    })
  )
  .output(
    z.object({
      series: z.array(z.any()).optional().describe('Funnel conversion data per step.'),
      events: z.array(z.any()).optional().describe('Event definitions for each funnel step.'),
      funnelData: z
        .any()
        .optional()
        .describe('Full funnel analysis data including conversion rates.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getFunnelAnalysis({
      e: ctx.input.events,
      start: ctx.input.start,
      end: ctx.input.end,
      mode: ctx.input.mode,
      n: ctx.input.conversionWindow,
      segment: ctx.input.segment,
      groupBy: ctx.input.groupBy
    });

    let data = result.data ?? result;

    return {
      output: {
        series: data.series,
        events: data.events,
        funnelData: data
      },
      message: `Funnel analysis completed for **${ctx.input.start}** to **${ctx.input.end}** with ${JSON.parse(ctx.input.events).length} steps.`
    };
  })
  .build();
