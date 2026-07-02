import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSaleQuote = SlateTool.create(spec, {
  name: 'Delete Sale Quote',
  key: 'delete_sale_quote',
  description: `Delete a sales quote from Altoviz.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      quoteId: z.number().describe('Altoviz quote ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSaleQuote(ctx.input.quoteId);
    return {
      output: { deleted: true },
      message: `Deleted quote with ID **${ctx.input.quoteId}**.`
    };
  })
  .build();
