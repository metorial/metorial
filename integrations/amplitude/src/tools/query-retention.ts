import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { dashboardDataSchema, parseResponse } from '../lib/rest-validation';
import { spec } from '../spec';

export let queryRetentionTool = SlateTool.create(spec, {
  name: 'Query Retention',
  key: 'query_retention',
  description: `Analyze user retention to understand how well users are retained over time after performing a starting event. Measures how many users come back to perform a return event on subsequent days/weeks/months.`,
  instructions: [
    'Both startEvent and returnEvent use Amplitude JSON event format: {"event_type": "EventName"}.',
    'Retention mode can be "n-day" (came back on exactly day N), "unbounded" (came back on day N or later), or "bracket" (came back within time bracket).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      startEvent: z
        .string()
        .describe('JSON-encoded starting event definition. Example: {"event_type":"Sign Up"}'),
      returnEvent: z
        .string()
        .describe(
          'JSON-encoded return event definition. Example: {"event_type":"Any Active Event"}'
        ),
      start: z.string().describe('Start date in YYYYMMDD format.'),
      end: z.string().describe('End date in YYYYMMDD format.'),
      retentionMode: z
        .enum(['n-day', 'unbounded', 'bracket'])
        .optional()
        .describe('Retention calculation mode. Default is "n-day".'),
      brackets: z
        .string()
        .optional()
        .describe(
          'Required for bracket mode. JSON array of [start day, exclusive end day] pairs, for example [[0,5],[5,10]].'
        ),
      interval: z
        .number()
        .optional()
        .describe('Retention interval: 1 (daily), 7 (weekly), or 30 (monthly).'),
      segment: z
        .string()
        .optional()
        .describe('JSON-encoded segment definition to filter users.'),
      groupBy: z
        .string()
        .optional()
        .describe('User property for retention breakdown, for example country or gp:plan.')
    })
  )
  .output(
    z.object({
      series: z
        .array(z.unknown())
        .optional()
        .describe('Retention percentages for each cohort/day.'),
      counts: z
        .array(z.unknown())
        .optional()
        .describe('Absolute user counts for each retention period.'),
      retentionData: z.unknown().optional().describe('Full retention analysis result data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createAmplitudeClient(ctx);

    let rmMap: Record<string, string> = {
      'n-day': 'n-day',
      unbounded: 'unbounded',
      bracket: 'bracket'
    };

    let result = await client.getRetention({
      se: ctx.input.startEvent,
      re: ctx.input.returnEvent,
      start: ctx.input.start,
      end: ctx.input.end,
      rm: ctx.input.retentionMode ? rmMap[ctx.input.retentionMode] : undefined,
      rb: ctx.input.brackets,
      interval: ctx.input.interval,
      segment: ctx.input.segment,
      groupBy: ctx.input.groupBy
    });

    let data = parseResponse(dashboardDataSchema, result.data, 'analytics query');

    return {
      output: {
        series: data.series,
        retentionData: data
      },
      message: `Retention analysis completed from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
