import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let sentimentDataSchema = z.object({
  date: z.string().describe('Date of sentiment aggregation (YYYY-MM-DD)'),
  count: z.number().describe('Number of articles analyzed that day'),
  normalized: z
    .number()
    .describe('Sentiment score between -1 (very negative) and +1 (very positive)')
});

export let getSentiment = SlateTool.create(spec, {
  name: 'Get Sentiment',
  key: 'get_sentiment',
  description: `Retrieve daily aggregated sentiment scores for stocks, ETFs, forex, and cryptocurrencies. The AI analyzes financial news every minute and produces normalized sentiment scores ranging from -1 (very negative) to +1 (very positive).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z
        .string()
        .describe('Comma-separated ticker symbols, e.g., "AAPL.US,TSLA.US,BTC-USD.CC"'),
      from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      sentiments: z
        .record(z.string(), z.array(sentimentDataSchema))
        .describe('Sentiment data keyed by ticker symbol')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let data = await client.getSentiment(ctx.input.symbols, {
      from: ctx.input.from,
      to: ctx.input.to
    });

    return {
      output: {
        sentiments: data ?? {}
      },
      message: `Retrieved sentiment data for **${ctx.input.symbols}**.`
    };
  })
  .build();
