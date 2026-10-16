import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { finageRecord } from '../lib/response';
import { spec } from '../spec';

export let getMarketStatus = SlateTool.create(spec, {
  name: 'Get Market Status',
  key: 'get_market_status',
  description: `Check the current status of major financial markets including NYSE, NASDAQ, OTC, Forex, and Crypto. Shows whether each market is open, closed, or in extended hours.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      markets: z
        .record(z.string(), z.string())
        .describe('Map of market name to status (e.g. "open", "closed", "extended-hours")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let data = await client.getMarketStatus();
    let response = finageRecord(data);
    let markets: Record<string, string> = {};
    if (typeof response.market === 'string') markets.market = response.market;
    for (let key of ['exchanges', 'currencies']) {
      if (response[key] === undefined || response[key] === null) continue;
      for (let [name, status] of Object.entries(finageRecord(response[key], key))) {
        if (typeof status !== 'string')
          throw createApiServiceError('Finage returned an invalid market status.');
        markets[name] = status;
      }
    }
    if (Object.keys(markets).length === 0)
      throw createApiServiceError('Finage returned no market statuses.');
    return {
      output: { markets, raw: data },
      message: `Retrieved status for **${Object.keys(markets).length}** markets.`
    };
  })
  .build();
