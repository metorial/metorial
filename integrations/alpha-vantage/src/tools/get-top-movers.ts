import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  description: `Retrieve the top gaining, losing, and most actively traded stocks in the US market for the current trading day. Returns up to 20 tickers per category.`,
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
        .describe('Which category of top movers to retrieve')
    })
  )
  .output(
    z.object({
      topGainers: z.array(moverSchema).optional().describe('Top gaining stocks'),
      topLosers: z.array(moverSchema).optional().describe('Top losing stocks'),
      mostActive: z.array(moverSchema).optional().describe('Most actively traded stocks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.topGainersLosers();
    let { category } = ctx.input;

    let mapMovers = (items: any[]) =>
      (items || []).map((item: any) => ({
        ticker: item.ticker || '',
        price: item.price || '',
        changeAmount: item.change_amount || '',
        changePercentage: item.change_percentage || '',
        volume: item.volume || ''
      }));

    let output: any = {};
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
