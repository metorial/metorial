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
      invoiceId: z.number().describe('Altoviz invoice ID to finalize'),
      finalizationDate: z
        .string()
        .optional()
        .describe('Finalization date (YYYY-MM-DD); defaults to the invoice date'),
      dateAdjustment: z
        .enum(['None', 'MinimumDate', 'Today'])
        .optional()
        .describe('How to adjust a date that prevents finalization')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including fields not shown in the summary'),
      invoiceId: z.number(),
      number: z.string().nullable().optional(),
      status: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.finalizeSaleInvoice(ctx.input.invoiceId, {
      finalizationDate: ctx.input.finalizationDate,
      dateAdjustment: ctx.input.dateAdjustment
    });

    return {
      output: {
        raw: result,
        invoiceId: result.id,
        number: result.number,
        status: result.status
      },
      message: `Finalized invoice **${result.number || ctx.input.invoiceId}**.`
    };
  })
  .build();
