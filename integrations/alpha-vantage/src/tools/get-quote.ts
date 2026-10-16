import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRecord, responseText } from '../lib/response';
import { spec } from '../spec';

export let getQuote = SlateTool.create(spec, {
  name: 'Get Quote',
  key: 'get_quote',
  description: `Retrieve the latest price and key trading information for a stock symbol. By default quotes update at the end of the trading day. Optional premium entitlements return realtime or 15-minute delayed US quotes. Returns price, open, high, low, volume, previous close, and change metrics. Ideal for quick price checks without full historical data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol, e.g. "AAPL", "MSFT"'),
      entitlement: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('US market data freshness; requires the corresponding premium entitlement')
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
    let data = await client.globalQuote({
      symbol: ctx.input.symbol,
      entitlement: ctx.input.entitlement
    });
    let quote = responseRecord(data['Global Quote'], 'quote');

    let output = {
      symbol: responseText(quote['01. symbol'], 'symbol'),
      open: responseText(quote['02. open'], ' open'),
      high: responseText(quote['03. high'], ' high'),
      low: responseText(quote['04. low'], ' low'),
      price: responseText(quote['05. price'], ' price'),
      volume: responseText(quote['06. volume'], ' volume'),
      latestTradingDay: responseText(quote['07. latest trading day'], ' latest trading day'),
      previousClose: responseText(quote['08. previous close'], ' previous close'),
      change: responseText(quote['09. change'], ' change'),
      changePercent: responseText(quote['10. change percent'], ' change percent')
    };

    return {
      output,
      message: `**${output.symbol}** is at **${output.price}** (${output.changePercent} change).`
    };
  })
  .build();
