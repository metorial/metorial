import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { finageNumber, finageRecords, finageString } from '../lib/response';
import { spec } from '../spec';

let moverSchema = z.object({
  symbol: z.string().optional().describe('Stock ticker symbol'),
  companyName: z.string().optional().describe('Company name'),
  price: z.number().optional().describe('Current price'),
  change: z
    .number()
    .optional()
    .describe(
      'Per-share price change for top gainers and losers; omitted for most-active stocks'
    ),
  changePercentage: z.number().optional().describe('Percentage change')
});

export let getMarketMovers = SlateTool.create(spec, {
  name: 'Get Market Movers',
  key: 'get_market_movers',
  description: `Retrieve the most active US stocks, top gainers, or top losers. Useful for identifying market trends, momentum plays, and volatile stocks. Returns symbol, price, and percentage change, with per-share price changes for top gainers and losers.`,
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
      raw: z.unknown().optional().describe('Original provider response'),
      category: z.string().describe('Category of market movers'),
      movers: z.array(moverSchema).describe('List of market movers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { category } = ctx.input;
    let data =
      category === 'most_active'
        ? await client.getMostActive()
        : category === 'top_gainers'
          ? await client.getTopGainers()
          : await client.getTopLosers();
    let movers = finageRecords(data, ['movers', 'results']).map(m =>
      pickDefined({
        symbol: finageString(m.symbol ?? m.ticker),
        companyName: finageString(m.company_name ?? m.companyName ?? m.name),
        price: finageNumber(m.price),
        change: category === 'most_active' ? undefined : finageNumber(m.change),
        changePercentage: finageNumber(
          m.change_percentage ?? m.changePercentage ?? m.changesPercentage
        )
      })
    );
    return {
      output: { category, movers, raw: data },
      message: `Retrieved **${movers.length}** ${category.replaceAll('_', ' ')} US stocks.`
    };
  })
  .build();
