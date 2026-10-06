import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, text } from '../lib/client';
import { spec } from '../spec';

export let listCurrencies = SlateTool.create(spec, {
  name: 'List Currencies',
  key: 'list_currencies',
  description: `List all supported currencies in Salesflare. Returns currency IDs, ISO codes, and HTML symbols. Useful for finding currency IDs when creating opportunities.`,
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
            currencyId: z.number().describe('Currency ID'),
            iso: z.string().describe('ISO 4217 currency code (e.g., USD, EUR)'),
            html: z.string().describe('HTML symbol for the currency')
          })
        )
        .describe('List of supported currencies'),
      count: z.number().describe('Number of currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let currencies = await client.listCurrencies();
    let list = currencies;

    let mapped = list.map(c => ({
      currencyId: c.id,
      iso: text(c.iso, 'currency code'),
      html: text(c.html, 'currency symbol')
    }));

    return {
      output: {
        currencies: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** supported currencies.`
    };
  })
  .build();
