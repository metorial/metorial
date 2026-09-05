import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { parseEvents, parseResponse, recordSchema } from '../lib/rest-validation';
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
  .authMethods(['api_key_secret'])
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
        .enum(['ordered', 'unordered', 'sequential'])
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
      userType: z
        .enum(['active', 'new'])
        .optional()
        .describe('Which users to include. Defaults to active.'),
      segment: z
        .string()
        .optional()
        .describe('JSON-encoded segment definition to filter users.'),
      groupBy: z
        .string()
        .optional()
        .describe('User property for funnel breakdown, for example country or gp:plan.')
    })
  )
  .output(
    z.object({
      series: z.array(z.unknown()).optional().describe('Funnel conversion data per step.'),
      events: z
        .array(z.unknown())
        .optional()
        .describe('Event definitions for each funnel step.'),
      funnelData: z
        .unknown()
        .optional()
        .describe('Full funnel analysis data including conversion rates.')
    })
  )
  .handleInvocation(async ctx => {
    let parsedEvents = parseEvents(ctx.input.events);

    let client = createAmplitudeClient(ctx);

    let result = await client.getFunnelAnalysis({
      e: ctx.input.events,
      start: ctx.input.start,
      end: ctx.input.end,
      mode: ctx.input.mode,
      n: ctx.input.userType,
      conversionWindow: ctx.input.conversionWindow,
      segment: ctx.input.segment,
      groupBy: ctx.input.groupBy
    });

    let data = parseResponse(z.array(recordSchema), result.data, 'funnel analysis');

    return {
      output: {
        series: data,
        events: data[0]?.events as unknown[] | undefined,
        funnelData: data
      },
      message: `Funnel analysis completed for **${ctx.input.start}** to **${ctx.input.end}** with ${parsedEvents.length} steps.`
    };
  })
  .build();
