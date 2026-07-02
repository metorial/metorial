import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let querySessionsTool = SlateTool.create(spec, {
  name: 'Query Sessions',
  key: 'query_sessions',
  description: `Retrieve session metrics including session length distribution and average sessions per user over a date range. Useful for understanding user engagement depth and session patterns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      metric: z
        .enum(['length_distribution', 'average_per_user'])
        .describe(
          '"length_distribution" returns session length histogram, "average_per_user" returns average number of sessions per user.'
        ),
      start: z.string().describe('Start date in YYYYMMDD format.'),
      end: z.string().describe('End date in YYYYMMDD format.')
    })
  )
  .output(
    z.object({
      sessionData: z.any().describe('Session metric data from Amplitude.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result: any;
    if (ctx.input.metric === 'length_distribution') {
      result = await client.getSessionLengthDistribution({
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
      output: { sessionData: result.data ?? result },
      message: `Retrieved ${ctx.input.metric === 'length_distribution' ? 'session length distribution' : 'average sessions per user'} from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
