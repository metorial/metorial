import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCommodityPrice = SlateTool.create(spec, {
  name: 'Get Commodity Price',
  key: 'get_commodity_price',
  description: `Retrieve the current price for a commodity such as gold, silver, platinum, natural gas, or other traded commodities. Returns the latest price in USD.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      commodityName: z
        .string()
        .describe(
          'Name of commodity (e.g. gold, silver, platinum, natural_gas, palladium, oat, rough_rice, orange_juice)'
        )
    })
  )
  .output(
    z.object({
      exchange: z.string().describe('Exchange symbol where commodity trades'),
      name: z.string().describe('Commodity name'),
      price: z.number().describe('Current price in USD'),
      updated: z.number().describe('Unix timestamp of last update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCommodityPrice(ctx.input.commodityName);

    return {
      output: {
        exchange: result.exchange,
        name: result.name,
        price: result.price,
        updated: result.updated
      },
      message: `**${result.name}** is currently priced at **$${result.price} USD** on ${result.exchange}.`
    };
  })
  .build();
