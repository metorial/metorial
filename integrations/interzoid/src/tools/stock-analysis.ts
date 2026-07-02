import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stockAnalysis = SlateTool.create(spec, {
  name: 'Stock Analysis',
  key: 'stock_analysis',
  description: `Retrieve comprehensive stock and market data by ticker symbol or company name. Returns real-time stock information and analysis.

This is a **premium API** that consumes multiple credits per call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lookup: z
        .string()
        .describe('Stock ticker symbol or company name (e.g., "AAPL", "Microsoft")')
    })
  )
  .output(
    z.object({
      stockData: z
        .record(z.string(), z.any())
        .describe('Stock analysis data including price, market data, and company information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getStockInfo(ctx.input.lookup);

    return {
      output: {
        stockData: result
      },
      message: `Retrieved stock analysis for "${ctx.input.lookup}"`
    };
  })
  .build();
