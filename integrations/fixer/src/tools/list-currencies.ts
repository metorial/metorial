import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCurrencies = SlateTool.create(spec, {
  name: 'List Currencies',
  key: 'list_currencies',
  description: `Retrieve all currencies supported by Fixer. Returns a map of currency codes to their full names, covering 170+ world currencies including Bitcoin, Gold, and Silver.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      currencies: z
        .record(z.string(), z.string())
        .describe('Map of currency codes to currency names'),
      count: z.number().describe('Total number of supported currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSymbols();

    let count = Object.keys(result.symbols).length;

    return {
      output: {
        currencies: result.symbols,
        count
      },
      message: `Retrieved **${count}** supported currencies.`
    };
  })
  .build();
