import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let marketStatusSchema = z.object({
  marketType: z.string().describe('Type of market (e.g. Equity, Forex, Crypto)'),
  region: z.string().describe('Market region'),
  primaryExchanges: z.string().describe('Primary exchanges in this market'),
  localOpen: z.string().describe('Local market opening time'),
  localClose: z.string().describe('Local market closing time'),
  currentStatus: z.string().describe('Current open/closed status'),
  notes: z.string().describe('Additional notes about the market')
});

export let getMarketStatus = SlateTool.create(spec, {
  name: 'Get Market Status',
  key: 'get_market_status',
  description: `Check the current open/closed status of major stock markets globally. Returns trading hours, region, and primary exchanges for each market.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      markets: z.array(marketStatusSchema).describe('Status of global markets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.marketStatus();
    let rawMarkets: any[] = data.markets || [];

    let markets = rawMarkets.map((m: any) => ({
      marketType: m.market_type || '',
      region: m.region || '',
      primaryExchanges: m.primary_exchanges || '',
      localOpen: m.local_open || '',
      localClose: m.local_close || '',
      currentStatus: m.current_status || '',
      notes: m.notes || ''
    }));

    return {
      output: { markets },
      message: `Retrieved status for ${markets.length} global market(s).`
    };
  })
  .build();
