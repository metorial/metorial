import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredTicker, responseRows } from '../lib/response';
import { spec } from '../spec';

export let getGroupedDailyBars = SlateTool.create(spec, {
  name: 'Get Grouped Daily Bars',
  key: 'get_grouped_daily_bars',
  description:
    'Retrieve daily OHLCV bars for all US stock tickers on one trading date, including each ticker symbol. Useful for market-wide analysis and screening.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      date: z.string().describe('Trading date in YYYY-MM-DD format'),
      adjusted: z.boolean().optional().describe('Whether prices are adjusted for splits'),
      includeOtc: z.boolean().optional().describe('Include OTC securities')
    })
  )
  .output(
    z.object({
      bars: z
        .array(z.unknown())
        .optional()
        .describe(
          'Original grouped bars; T identifies the ticker and o/h/l/c/v contain prices and volume'
        ),
      count: z.number().optional().describe('Number of returned bars'),
      adjusted: z.boolean().optional().describe('Whether the provider adjusted the bars')
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).getGroupedDailyBars(ctx.input);
    let bars = responseRows(data.results, 'grouped bars');
    for (let bar of bars ?? []) {
      requiredTicker(bar.T);
      if (['o', 'h', 'l', 'c', 'v', 't'].some(key => typeof bar[key] !== 'number'))
        throw createApiServiceError(
          'Polygon.io returned a grouped bar without required price, volume, or timestamp values.'
        );
    }
    return {
      output: { bars, count: bars?.length, adjusted: data.adjusted ?? undefined },
      message: `Retrieved ${bars?.length ?? 0} stock bar(s) for ${ctx.input.date}.`
    };
  })
  .build();
