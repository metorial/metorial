import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExchangeRate = SlateTool.create(spec, {
  name: 'Get Exchange Rate',
  key: 'get_exchange_rate',
  description: `Look up the current exchange rate between two currencies. Provide a currency pair (e.g. **USD_EUR**, **GBP_AUD**) to get the live conversion rate.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromCurrency: z.string().describe('Source currency code (e.g. USD, EUR, GBP)'),
      toCurrency: z.string().describe('Target currency code (e.g. EUR, JPY, AUD)')
    })
  )
  .output(
    z.object({
      currencyPair: z.string().describe('The queried currency pair (e.g. USD_EUR)'),
      rate: z.number().describe('Exchange rate value'),
      timestamp: z.number().describe('Unix timestamp when rate was captured')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let pair = `${ctx.input.fromCurrency}_${ctx.input.toCurrency}`;
    let result = await client.getExchangeRate(pair);

    return {
      output: {
        currencyPair: pair,
        rate: result.rate,
        timestamp: result.timestamp
      },
      message: `**1 ${ctx.input.fromCurrency}** = **${result.rate} ${ctx.input.toCurrency}**`
    };
  })
  .build();
