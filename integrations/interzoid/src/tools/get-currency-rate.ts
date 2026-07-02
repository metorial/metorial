import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrencyRate = SlateTool.create(spec, {
  name: 'Get Currency Rate',
  key: 'get_currency_rate',
  description: `Retrieve the latest live currency exchange rate for a given currency, provided in US Dollars. Supports 150+ global currencies using three-letter ISO currency codes. Rates are compiled from many global sources and updated several times per day.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      currencyCode: z
        .string()
        .describe('Three-letter ISO currency code (e.g., "EUR", "GBP", "JPY")')
    })
  )
  .output(
    z.object({
      exchangeData: z
        .record(z.string(), z.any())
        .describe(
          'Currency exchange rate data including symbol, currency name, country, and rate in USD'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getCurrencyRate(ctx.input.currencyCode);

    return {
      output: {
        exchangeData: result
      },
      message: `Retrieved exchange rate for ${ctx.input.currencyCode}`
    };
  })
  .build();
