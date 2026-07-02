import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCryptoPrice = SlateTool.create(spec, {
  name: 'Get Crypto Price',
  key: 'get_crypto_price',
  description: `Retrieve the current market price for a cryptocurrency trading pair. Provide a symbol pair like **BTCUSD**, **ETHUSD**, or **LTCBTC** to get the latest price.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z
        .string()
        .describe('Cryptocurrency trading pair symbol (e.g. BTCUSD, ETHUSD, LTCBTC)')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('The cryptocurrency pair identifier'),
      price: z.string().describe('Current market price'),
      timestamp: z.number().describe('Unix timestamp when price was recorded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCryptoPrice(ctx.input.symbol);

    return {
      output: {
        symbol: result.symbol ?? ctx.input.symbol,
        price: String(result.price),
        timestamp: result.timestamp
      },
      message: `**${result.symbol ?? ctx.input.symbol}** current price: **${result.price}**`
    };
  })
  .build();
