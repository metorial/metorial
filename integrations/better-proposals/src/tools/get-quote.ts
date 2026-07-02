import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQuote = SlateTool.create(spec, {
  name: 'Get Quote',
  key: 'get_quote',
  description: `Retrieves detailed information about a specific quote by its ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      quoteId: z.string().describe('The unique ID of the quote to retrieve')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      quote: z.any().describe('Full quote details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getQuote(ctx.input.quoteId);

    return {
      output: {
        status: result.status ?? 'success',
        quote: result.data
      },
      message: `Retrieved quote **${ctx.input.quoteId}**.`
    };
  })
  .build();
