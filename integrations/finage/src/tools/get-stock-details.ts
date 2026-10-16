import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { finageRecords, finageSymbol } from '../lib/response';
import { spec } from '../spec';

export let getStockDetails = SlateTool.create(spec, {
  name: 'Get Stock Company Details',
  key: 'get_stock_details',
  description:
    'Look up a company profile by stock symbol, including its name, exchange, industry, sector, management, website, employee count, and market capitalization when available. Use list_symbols to discover supported stock symbols.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      symbol: z
        .string()
        .describe('Stock symbol. Use list_symbols to discover available symbols.')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Queried stock symbol'),
      details: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Company profiles with provider fields and values preserved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let symbol = finageSymbol(ctx.input.symbol);
    let data = await client.getStockDetails(symbol);
    let details = finageRecords(data, ['results']);
    return {
      output: { symbol, details },
      message: `Retrieved **${details.length}** company profiles for **${symbol}**.`
    };
  })
  .build();
