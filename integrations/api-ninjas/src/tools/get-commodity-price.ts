import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCommodityPrice = SlateTool.create(spec, {
  name: 'Get Commodity Price',
  key: 'get_commodity_price',
  description: `Retrieve the current price for a commodity such as gold, silver, platinum, natural gas, or other traded commodities. Returns the provider quote with its currency and unit, which may be US dollars or US cents. Free plans return the last completed daily settlement; premium plans provide live prices.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      currency: z
        .string()
        .optional()
        .describe('Optional ISO 4217 quote currency, such as EUR'),
      unit: z
        .string()
        .optional()
        .describe('Optional compatible quote unit, such as kg or troy_ounce'),
      commodityName: z
        .string()
        .describe(
          'Name of commodity (e.g. gold, silver, platinum, natural_gas, palladium, oat, rough_rice, orange_juice)'
        )
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      currencyUnit: z.string().optional().describe('Quote currency; USX denotes US cents'),
      unit: z.string().optional().describe('Unit the price applies to'),
      exchange: z.string().describe('Exchange symbol where commodity trades'),
      name: z.string().describe('Commodity name'),
      price: z.number().describe('Current price in the reported currency and unit'),
      updated: z.number().describe('Unix timestamp of last update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCommodityPrice(ctx.input.commodityName, {
      currency: ctx.input.currency,
      unit: ctx.input.unit
    });

    return {
      output: {
        raw: result,
        exchange: result.exchange,
        currencyUnit: result.currency_unit ?? undefined,
        unit: result.unit ?? undefined,
        name: result.name,
        price: result.price,
        updated: result.updated
      },
      message: `**${result.name}** is currently priced at **${result.price}${result.currency_unit ? ` ${result.currency_unit}` : ''}**${result.unit ? ` per ${result.unit}` : ''} on ${result.exchange}.`
    };
  })
  .build();
