import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCoins = SlateTool.create(spec, {
  name: 'List Coins',
  key: 'list_coins',
  description: `Retrieve the complete list of cryptocurrencies tracked by CoinMarketCal. Useful for discovering which coins have events and for getting correct coin names to use when searching events.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      coins: z
        .array(
          z.object({
            coinId: z.string().describe('Unique identifier of the coin'),
            name: z.string().describe('Name of the cryptocurrency'),
            symbol: z.string().describe('Ticker symbol of the cryptocurrency'),
            rank: z.number().optional().describe('Market cap rank of the cryptocurrency')
          })
        )
        .describe('List of all tracked cryptocurrencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let coins = await client.getCoins();

    let mapped = coins.map(c => ({
      coinId: c.id,
      name: c.name,
      symbol: c.symbol,
      rank: c.rank
    }));

    return {
      output: { coins: mapped },
      message: `Retrieved **${mapped.length}** tracked cryptocurrencies from CoinMarketCal.`
    };
  })
  .build();
