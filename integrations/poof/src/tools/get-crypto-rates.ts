import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let getCryptoRates = SlateTool.create(spec, {
  name: 'Get Crypto Rates',
  key: 'get_crypto_rates',
  description: `Fetch cryptocurrency exchange rates, prices, and gas prices. Retrieve exchange rates for 6000+ currency pairs relative to a base currency, get the current price of a specific cryptocurrency, or fetch the current gas price for ERC-20 token transactions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['rates', 'price', 'gas_price'])
        .describe(
          '"rates" for exchange rates, "price" for crypto price, "gas_price" for ERC-20 gas price'
        ),
      base: z
        .string()
        .optional()
        .describe(
          'Base currency for exchange rates (e.g., "USD"). Required for "rates" action.'
        ),
      crypto: z
        .string()
        .optional()
        .describe(
          'Crypto ticker for price/gas_price (e.g., "bnb", "usdc"). Required for "price" and "gas_price" actions.'
        )
    })
  )
  .output(
    z.object({
      rates: z.any().optional().describe('Exchange rates keyed by crypto ticker'),
      price: z.any().optional().describe('Current price of the cryptocurrency'),
      gasPrice: z.any().optional().describe('Current gas price for ERC-20 transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    if (ctx.input.action === 'rates') {
      let base = ctx.input.base || 'USD';
      let result = await client.getCryptoRates({ base });
      return {
        output: { rates: result },
        message: `Fetched exchange rates with base currency **${base}**.`
      };
    }

    if (ctx.input.action === 'price') {
      if (!ctx.input.crypto) throw new Error('crypto is required for price action');
      let result = await client.getPrice({ crypto: ctx.input.crypto });
      return {
        output: { price: result },
        message: `Fetched price for **${ctx.input.crypto}**.`
      };
    }

    if (ctx.input.action === 'gas_price') {
      if (!ctx.input.crypto) throw new Error('crypto is required for gas_price action');
      let result = await client.getGasPrice({ crypto: ctx.input.crypto });
      return {
        output: { gasPrice: result },
        message: `Fetched gas price for **${ctx.input.crypto}** ERC-20 transactions.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
