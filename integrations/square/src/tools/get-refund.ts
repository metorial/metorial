import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { mapRefund, refundOutputSchema } from './shared';

export let getRefund = SlateTool.create(spec, {
  name: 'Get Refund',
  key: 'get_refund',
  description: 'Retrieve full details for a Square payment refund by refund ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      refundId: z.string().describe('The ID of the refund to retrieve')
    })
  )
  .output(refundOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let refund = await client.getRefund(ctx.input.refundId);
    let output = mapRefund(refund);

    return {
      output,
      message: `Refund **${output.refundId}** — Status: **${output.status}**`
    };
  })
  .build();
