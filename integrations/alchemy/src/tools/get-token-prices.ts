import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getTokenPrices = SlateTool.create(spec, {
  name: 'Get Token Prices',
  key: 'get_token_prices',
  description: `Retrieve current prices for tokens by their contract addresses and networks. Returns prices in USD and other currencies.
Use this to look up real-time token prices, compare token values, or build price feeds.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tokens: z
        .array(
          z.object({
            network: z
              .string()
              .describe(
                'Network identifier (e.g., eth-mainnet, polygon-mainnet, arb-mainnet)'
              ),
            address: z.string().describe('Token contract address')
          })
        )
        .min(1)
        .describe('List of tokens to get prices for')
    })
  )
  .output(
    z.object({
      prices: z
        .array(
          z.object({
            network: z.string().describe('Network of the token'),
            address: z.string().describe('Token contract address'),
            currency: z.string().optional().describe('Price currency (e.g., usd)'),
            price: z.string().optional().describe('Current token price'),
            lastUpdated: z.string().optional().describe('Last update timestamp'),
            error: z.string().optional().describe('Error message if price lookup failed')
          })
        )
        .describe('List of token prices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let result = await client.getTokenPrices({
      addresses: ctx.input.tokens.map(t => ({
        network: t.network,
        address: t.address
      }))
    });

    let prices = (result.data || []).map((item: any) => ({
      network: item.network,
      address: item.address,
      currency: item.prices?.[0]?.currency,
      price: item.prices?.[0]?.value,
      lastUpdated: item.prices?.[0]?.lastUpdatedAt,
      error: item.error || undefined
    }));

    return {
      output: { prices },
      message: `Retrieved prices for **${prices.length}** token(s).${prices
        .filter((p: any) => p.price)
        .map((p: any) => ` ${p.address.slice(0, 8)}...: $${p.price}`)
        .join(',')}`
    };
  })
  .build();
