import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let finalizeSaleInvoice = SlateTool.create(spec, {
  name: 'Finalize Sale Invoice',
  key: 'finalize_sale_invoice',
  description: `Finalize a draft sales invoice in Altoviz. Once finalized, the invoice can no longer be edited or deleted. Use this to lock in the invoice before sending.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('Altoviz invoice ID to finalize')
    })
  )
  .output(
    z.object({
      invoiceId: z.number(),
      number: z.string().nullable().optional(),
      status: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.finalizeSaleInvoice(ctx.input.invoiceId);

    return {
      output: {
        invoiceId: result.id ?? ctx.input.invoiceId,
        number: result.number,
        status: result.status
      },
      message: `Finalized invoice **${result.number || ctx.input.invoiceId}**.`
    };
  })
  .build();
