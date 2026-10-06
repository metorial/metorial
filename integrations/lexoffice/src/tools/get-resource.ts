import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { resourceSchema } from '../lib/schemas';
import { spec } from '../spec';

export const getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Retrieve an exact contact, invoice, quotation, credit note, order confirmation, article or bookkeeping voucher. Use IDs discovered by the contact, article or voucher list tools. Resource details use the current provider field names.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z.enum([
        'contact',
        'invoice',
        'quotation',
        'credit_note',
        'order_confirmation',
        'article',
        'voucher'
      ]),
      resourceId: z.string().describe('Exact resource ID')
    })
  )
  .output(
    z.object({ resourceType: z.string(), resourceId: z.string(), details: resourceSchema })
  )
  .handleInvocation(async ctx => {
    const details = await new Client({ token: ctx.auth.token }).getResource(
      ctx.input.resourceType,
      ctx.input.resourceId
    );
    return {
      output: { ...ctx.input, details },
      message: `Retrieved ${ctx.input.resourceType.replaceAll('_', ' ')} **${details.id}**.`
    };
  })
  .build();
