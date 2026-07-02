import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { creditNoteInputSchema, creditNoteOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

let mapCreditNoteOutput = (data: any) => ({
  creditNoteInternalId: data.id || '',
  creditNoteId: data.creditNoteId || '',
  creditNoteNumber: data.creditNoteNumber || '',
  remainingCredit: data.remainingCredit ?? 0,
  date: data.date || '',
  status: data.status || '',
  total: data.total ?? 0,
  currencyCode: data.currencyCode || '',
  customerExternalId: data.customerExternalId || '',
  customerName: data.customerName ?? null
});

export let upsertCreditNote = SlateTool.create(spec, {
  name: 'Create or Update Credit Note',
  key: 'upsert_credit_note',
  description: `Create a new credit note or update an existing one in Chaser. Credit notes with remaining credit are included in monthly statements and reduce the customer's overall balance.`,
  instructions: [
    'To update an existing credit note, provide the creditNoteInternalId (Chaser internal ID) or "ext_{creditNoteId}".',
    'When creating, all fields in the creditNote object are required.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      creditNoteInternalId: z
        .string()
        .optional()
        .describe(
          'Internal Chaser credit note ID or "ext_{creditNoteId}" for updates. Omit to create.'
        ),
      creditNote: creditNoteInputSchema.describe('Credit note data')
    })
  )
  .output(creditNoteOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.creditNoteInternalId) {
      result = await client.updateCreditNote(
        ctx.input.creditNoteInternalId,
        ctx.input.creditNote
      );
    } else {
      result = await client.createCreditNote(ctx.input.creditNote);
    }

    let output = mapCreditNoteOutput(result);
    let action = ctx.input.creditNoteInternalId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} credit note **${output.creditNoteNumber}** (${output.creditNoteId}) with remaining credit ${output.remainingCredit} ${output.currencyCode}.`
    };
  })
  .build();
