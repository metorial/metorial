import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let listCurrencies = SlateTool.create(spec, {
  name: 'List Currencies',
  key: 'list_currencies',
  description: `Retrieve all currencies supported by Finmei. Returns currency codes, names, and symbols. Useful for validating currency codes before creating invoices or expenses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      currencies: z
        .array(
          z.object({
            code: z.string().describe('Three-letter currency code (e.g., "USD")'),
            name: z.string().optional().describe('Currency name (e.g., "US Dollar")'),
            symbol: z.string().optional().describe('Currency symbol (e.g., "$")')
          })
        )
        .describe('List of supported currencies'),
      count: z.number().describe('Total number of supported currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listCurrencies();

    let rawCurrencies = result?.data ?? result?.currencies ?? result ?? [];
    let currenciesArray = Array.isArray(rawCurrencies) ? rawCurrencies : [];

    let currencies = currenciesArray.map((c: any) => ({
      code: c.code ?? c.iso ?? c.id ?? String(c),
      name: c.name,
      symbol: c.symbol
    }));

    return {
      output: {
        currencies,
        count: currencies.length
      },
      message: `Found **${currencies.length}** supported currencies.`
    };
  })
  .build();
