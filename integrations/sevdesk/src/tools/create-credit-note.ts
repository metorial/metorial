import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let createCreditNote = SlateTool.create(spec, {
  name: 'Create Credit Note',
  key: 'create_credit_note',
  description: `Create a credit note from an existing invoice. The credit note inherits the invoice's contact, positions, and tax information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to create a credit note from')
    })
  )
  .output(
    z.object({
      creditNoteId: z.string().describe('ID of the created credit note'),
      creditNoteNumber: z.string().optional(),
      invoiceId: z.string().describe('Source invoice ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });
    let result = await client.createCreditNoteFromInvoice(ctx.input.invoiceId);
    let creditNote = result?.creditNote ?? result;

    return {
      output: {
        creditNoteId: String(creditNote.id),
        creditNoteNumber: creditNote.creditNoteNumber ?? undefined,
        invoiceId: ctx.input.invoiceId
      },
      message: `Created credit note **${creditNote.creditNoteNumber ?? creditNote.id}** from invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
