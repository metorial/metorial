import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { recordSchema } from '../lib/validation';
import { spec } from '../spec';

export let listVendors = SlateTool.create(spec, {
  name: 'List Vendors',
  key: 'list_vendors',
  description: `Retrieve a paginated list of vendors from Ramp. Vendors are linked to bills and transactions for categorization and payment processing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .min(2)
        .max(100)
        .optional()
        .describe('Number of results per page (2-100)')
    })
  )
  .output(
    z.object({
      vendors: z.array(recordSchema).describe('List of vendor objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.listVendors({
      start: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        vendors: result.data,
        nextCursor: result.page?.next
      },
      message: `Retrieved **${result.data.length}** vendors${result.page?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
