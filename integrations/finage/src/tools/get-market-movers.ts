import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

let moverSchema = z.object({
  symbol: z.string().optional().describe('Stock ticker symbol'),
  companyName: z.string().optional().describe('Company name'),
  price: z.number().optional().describe('Current price'),
  change: z.number().optional().describe('Price change'),
  changePercentage: z.number().optional().describe('Percentage change')
});

export let getMarketMovers = SlateTool.create(spec, {
  name: 'Get Market Movers',
  key: 'get_market_movers',
  description: `Retrieve the most active US stocks, top gainers, or top losers. Useful for identifying market trends, momentum plays, and volatile stocks. Returns symbol, price, change, and percentage change for each stock.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      category: z
        .enum(['most_active', 'top_gainers', 'top_losers'])
        .describe('Category of market movers to retrieve')
    })
  )
  .output(
    z.object({
      category: z.string().describe('Category of market movers'),
      movers: z.array(moverSchema).describe('List of market movers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { category } = ctx.input;

    let data: any;
    if (category === 'most_active') {
      data = await client.getMostActive();
    } else if (category === 'top_gainers') {
      data = await client.getTopGainers();
    } else {
      data = await client.getTopLosers();
    }

    let rawMovers = Array.isArray(data) ? data : data?.movers || data?.results || [];
    let movers = rawMovers.map((m: any) => ({
      symbol: m.symbol ?? m.ticker,
      companyName: m.company_name ?? m.companyName ?? m.name,
      price: m.price,
      change: m.change,
      changePercentage: m.change_percentage ?? m.changePercentage ?? m.changesPercentage
    }));

    let label = category.replace('_', ' ');
    return {
      output: {
        category,
        movers
      },
      message: `Retrieved **${movers.length}** ${label} US stocks.`
    };
  })
  .build();
