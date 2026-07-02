import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQuote = SlateTool.create(spec, {
  name: 'Get Quote',
  key: 'get_quote',
  description: `Retrieve the latest price and key trading information for a stock symbol. Returns current price, open, high, low, volume, previous close, and change metrics. Ideal for quick price checks without full historical data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol, e.g. "AAPL", "MSFT"')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      open: z.string().describe('Opening price for the current trading day'),
      high: z.string().describe('Highest price for the current trading day'),
      low: z.string().describe('Lowest price for the current trading day'),
      price: z.string().describe('Current/latest price'),
      volume: z.string().describe('Trading volume'),
      latestTradingDay: z.string().describe('Date of the latest trading day'),
      previousClose: z.string().describe('Previous trading day close price'),
      change: z.string().describe('Price change from previous close'),
      changePercent: z.string().describe('Percentage change from previous close')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.globalQuote({ symbol: ctx.input.symbol });
    let quote = data['Global Quote'] || {};

    let output = {
      symbol: quote['01. symbol'] || ctx.input.symbol,
      open: quote['02. open'] || '',
      high: quote['03. high'] || '',
      low: quote['04. low'] || '',
      price: quote['05. price'] || '',
      volume: quote['06. volume'] || '',
      latestTradingDay: quote['07. latest trading day'] || '',
      previousClose: quote['08. previous close'] || '',
      change: quote['09. change'] || '',
      changePercent: quote['10. change percent'] || ''
    };

    return {
      output,
      message: `**${output.symbol}** is at **$${output.price}** (${output.changePercent} change).`
    };
  })
  .build();
