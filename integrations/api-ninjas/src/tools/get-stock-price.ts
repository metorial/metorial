import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStockPrice = SlateTool.create(spec, {
  name: 'Get Stock Price',
  key: 'get_stock_price',
  description: `Retrieve the current price of a stock or market index. Provide a ticker symbol (e.g. **AAPL**, **GOOGL**) or index symbol (e.g. **^DJI**, **^GSPC**) to get its latest price and trading volume.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Stock or index ticker symbol (e.g. AAPL, GOOGL, ^DJI)')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('The queried ticker symbol'),
      name: z.string().optional().describe('Company or index name'),
      price: z.number().describe('Current stock price'),
      exchange: z.string().optional().describe('Trading exchange'),
      updated: z.number().describe('Unix timestamp of last update'),
      currency: z.string().optional().describe('Currency code of the price'),
      volume: z.number().optional().describe('Trading volume')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getStockPrice(ctx.input.ticker);

    return {
      output: {
        ticker: result.ticker ?? ctx.input.ticker,
        name: result.name,
        price: result.price,
        exchange: result.exchange,
        updated: result.updated,
        currency: result.currency,
        volume: result.volume
      },
      message: `**${result.ticker ?? ctx.input.ticker}** is currently trading at **${result.price}**${result.currency ? ` ${result.currency}` : ''}.`
    };
  })
  .build();
