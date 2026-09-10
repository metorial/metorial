import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { amplitudeServiceError } from '../lib/errors';
import { dashboardDataSchema, parseResponse } from '../lib/rest-validation';
import { spec } from '../spec';

export let querySessionsTool = SlateTool.create(spec, {
  name: 'Query Sessions',
  key: 'query_sessions',
  description: `Retrieve session metrics including session length distribution, average duration in seconds, and average sessions per user over a date range. Useful for understanding user engagement depth and session patterns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      metric: z
        .enum(['length_distribution', 'average_per_user', 'average_length'])
        .describe(
          '"length_distribution" returns session length histogram, "average_per_user" returns average number of sessions per user; "average_length" returns average session duration in seconds.'
        ),
      start: z.string().describe('Start date in YYYYMMDD format.'),
      end: z.string().describe('End date in YYYYMMDD format.'),
      histogram: z
        .object({
          unit: z.enum(['hours', 'minutes', 'seconds']),
          min: z.number().nonnegative(),
          max: z.number().positive(),
          size: z.number().positive().optional()
        })
        .optional()
        .describe(
          'Custom buckets for length_distribution only. max must exceed min. Omitting size lets Amplitude choose the bucket width.'
        )
    })
  )
  .output(
    z.object({
      sessionData: z.unknown().describe('Session metric data from Amplitude.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createAmplitudeClient(ctx);

    if (
      ctx.input.histogram &&
      (ctx.input.metric !== 'length_distribution' ||
        ctx.input.histogram.max <= ctx.input.histogram.min)
    )
      throw amplitudeServiceError(
        'histogram is supported only for length_distribution, with max greater than min.'
      );
    let result: { data: unknown };
    if (ctx.input.metric === 'length_distribution') {
      result = await client.getSessionLengthDistribution({
        start: ctx.input.start,
        end: ctx.input.end,
        histogram: ctx.input.histogram
      });
    } else if (ctx.input.metric === 'average_length') {
      result = await client.getAverageSessionLength({
        start: ctx.input.start,
        end: ctx.input.end
      });
    } else {
      result = await client.getAverageSessionsPerUser({
        start: ctx.input.start,
        end: ctx.input.end
      });
    }

    return {
      output: {
        sessionData: parseResponse(dashboardDataSchema, result.data, 'analytics query')
      },
      message: `Retrieved ${ctx.input.metric === 'length_distribution' ? 'session length distribution' : ctx.input.metric === 'average_length' ? 'average session length in seconds' : 'average sessions per user'} from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
