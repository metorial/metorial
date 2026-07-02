import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Retrieve payment statements from Deel. Returns payment details including amounts, statuses, dates, and associated contracts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      payments: z.array(z.record(z.string(), z.any())).describe('List of payment statements')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listPayments(params);
    let payments = result?.data ?? [];

    return {
      output: { payments },
      message: `Found ${payments.length} payment(s).`
    };
  })
  .build();
