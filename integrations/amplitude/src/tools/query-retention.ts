import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
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
      segment: z
        .string()
        .optional()
        .describe('JSON-encoded segment definition to filter users.'),
      groupBy: z
        .string()
        .optional()
        .describe('JSON-encoded group-by clause for retention breakdown.')
    })
  )
  .output(
    z.object({
      series: z
        .array(z.any())
        .optional()
        .describe('Retention percentages for each cohort/day.'),
      counts: z
        .array(z.any())
        .optional()
        .describe('Absolute user counts for each retention period.'),
      retentionData: z.any().optional().describe('Full retention analysis result data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

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
      segment: ctx.input.segment,
      groupBy: ctx.input.groupBy
    });

    let data = result.data ?? result;

    return {
      output: {
        series: data.series,
        counts: data.counts,
        retentionData: data
      },
      message: `Retention analysis completed from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
