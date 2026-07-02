import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTopTokens = SlateTool.create(spec, {
  name: 'Get Top Tokens by Market Cap',
  key: 'get_top_tokens',
  description: `Retrieve a ranked list of the top cryptocurrencies by market capitalization. Useful for getting a quick overview of the largest tokens in the market.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      count: z
        .number()
        .optional()
        .describe('Number of top tokens to retrieve (1-1000, default: 100)')
    })
  )
  .output(
    z.object({
      tokens: z
        .array(z.record(z.string(), z.any()))
        .describe('Ranked list of top tokens by market cap')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTopMarketCapTokens(ctx.input.count ?? 100);
    let tokens = result?.data ?? [];

    return {
      output: { tokens },
      message: `Retrieved **${tokens.length}** top token(s) by market cap.`
    };
  })
  .build();
