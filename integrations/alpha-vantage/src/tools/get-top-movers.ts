import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRows, responseText } from '../lib/response';
import { spec } from '../spec';

let moverSchema = z.object({
  ticker: z.string().describe('Ticker symbol'),
  price: z.string().describe('Current price'),
  changeAmount: z.string().describe('Price change amount'),
  changePercentage: z.string().describe('Price change percentage'),
  volume: z.string().describe('Trading volume')
});

export let getTopMovers = SlateTool.create(spec, {
  name: 'Get Top Movers',
  key: 'get_top_movers',
  description: `Retrieve the top gaining, losing, and most actively traded stocks in the US market for the current trading day. Returns up to 20 tickers per category, updated at the end of the trading day by default. Premium entitlements enable realtime or delayed US data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      category: z
        .enum(['gainers', 'losers', 'active', 'all'])
        .optional()
        .default('all')
        .describe('Which category of top movers to retrieve'),
      entitlement: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('US market data freshness; requires the corresponding premium entitlement')
    })
  )
  .output(
    z.object({
      lastUpdated: z.string().optional().describe('Provider update timestamp'),
      topGainers: z.array(moverSchema).optional().describe('Top gaining stocks'),
      topLosers: z.array(moverSchema).optional().describe('Top losing stocks'),
      mostActive: z.array(moverSchema).optional().describe('Most actively traded stocks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.topGainersLosers({ entitlement: ctx.input.entitlement });
    let { category } = ctx.input;

    let mapMovers = (items: unknown) =>
      responseRows(items, 'market movers').map((item: any) => ({
        ticker: responseText(item.ticker, 'ticker'),
        price: responseText(item.price, 'price'),
        changeAmount: responseText(item.change_amount, 'change_amount'),
        changePercentage: responseText(item.change_percentage, 'change_percentage'),
        volume: responseText(item.volume, 'volume')
      }));

    let output: any = {
      lastUpdated:
        data.last_updated === undefined
          ? undefined
          : responseText(data.last_updated, 'last updated')
    };
    if (category === 'gainers' || category === 'all') {
      output.topGainers = mapMovers(data.top_gainers);
    }
    if (category === 'losers' || category === 'all') {
      output.topLosers = mapMovers(data.top_losers);
    }
    if (category === 'active' || category === 'all') {
      output.mostActive = mapMovers(data.most_actively_traded);
    }

    return {
      output,
      message: `Retrieved top market movers for category: **${category}**.`
    };
  })
  .build();
