import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
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
      markets: z
        .record(z.string(), z.string())
        .describe('Map of market name to status (e.g. "open", "closed", "extended-hours")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });

    let data = await client.getMarketStatus();

    let markets: Record<string, string> = {};
    if (typeof data === 'object' && data !== null) {
      for (let [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          markets[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          markets[key] = (value as any).status ?? JSON.stringify(value);
        }
      }
    }

    let openMarkets = Object.entries(markets)
      .filter(([, v]) => v === 'open')
      .map(([k]) => k);
    let statusSummary =
      openMarkets.length > 0 ? `Open: ${openMarkets.join(', ')}` : 'All markets closed';

    return {
      output: { markets },
      message: `${statusSummary}`
    };
  })
  .build();
