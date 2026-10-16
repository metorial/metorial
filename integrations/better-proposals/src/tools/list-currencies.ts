import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCurrencies = SlateTool.create(spec, {
  name: 'List Currencies',
  key: 'list_currencies',
  description: `Retrieves all supported currencies. Use this to find the correct currency code when creating proposals.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      currencies: z.array(z.any()).describe('List of supported currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCurrencies(ctx.input.page, ctx.input.perPage);
    let currencies = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    return {
      output: {
        status: result.status,
        currencies
      },
      message: `Retrieved ${currencies.length} supported currency(ies).`
    };
  })
  .build();
