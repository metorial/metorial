import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrencies = SlateTool.create(spec, {
  name: 'Get Currencies',
  key: 'get_currencies',
  description: `Retrieve the list of all currencies supported by Splitwise. These are mostly ISO 4217 codes but may include unofficial codes (e.g., BTC for Bitcoin).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      currencies: z
        .array(
          z.object({
            currencyCode: z.string().describe('Currency code (e.g., "USD", "EUR")'),
            unit: z.string().optional().describe('Currency unit/symbol')
          })
        )
        .describe('Supported currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let currencies = await client.getCurrencies();

    let mapped = (currencies || []).map((c: any) => ({
      currencyCode: c.currency_code,
      unit: c.unit
    }));

    return {
      output: { currencies: mapped },
      message: `Found **${mapped.length}** supported currencies`
    };
  })
  .build();
