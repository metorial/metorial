import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listQuotes = SlateTool.create(spec, {
  name: 'List Quotes',
  key: 'list_quotes',
  description: `Retrieves all quotes from the account. Supports pagination for accounts with many quotes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      quotes: z.array(z.any()).describe('List of quotes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listQuotes(ctx.input.page);
    let quotes = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];

    return {
      output: {
        status: result.status ?? 'success',
        quotes
      },
      message: `Retrieved ${quotes.length} quote(s).`
    };
  })
  .build();
