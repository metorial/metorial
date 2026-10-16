import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { polygonRawOutput, polygonRecords, polygonResponseFields } from '../lib/response';
import { spec } from '../spec';

export let getGroupedDailyBars = SlateTool.create(spec, {
  name: 'Get Daily Stock Market Bars',
  key: 'get_grouped_daily_bars',
  description:
    'Retrieve daily OHLCV aggregate bars across the US stock market for one date. Each result includes its stock ticker, enabling market-wide comparisons without requesting each symbol separately.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Trading date, YYYY-MM-DD.'),
      adjusted: z
        .boolean()
        .optional()
        .describe('Adjust for splits; provider default is true.'),
      includeOtc: z
        .boolean()
        .optional()
        .describe('Include OTC stocks; provider default is false.')
    })
  )
  .output(
    z.object({
      ...polygonResponseFields,
      bars: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Complete daily bars. T is the ticker; o/h/l/c/v are open/high/low/close/volume; t is the millisecond timestamp.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);
    let response = await client.getGroupedDailyBars(ctx.input);
    let bars = polygonRecords(response.results);
    return {
      output: polygonRawOutput({ bars }, response),
      message: `Retrieved ${bars.length} stock market bars for ${ctx.input.date}.`
    };
  })
  .build();
