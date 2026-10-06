import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

let creditNoteLineSchema = z.object({
  name: z.string().describe('Line item description'),
  qty: z.number().describe('Quantity'),
  unitCost: z.string().describe('Unit cost amount (e.g. "100.00")'),
  taxName1: z.string().optional().describe('First tax name'),
  taxAmount1: z.string().optional().describe('First tax percentage'),
  taxName2: z.string().optional().describe('Second tax name'),
  taxAmount2: z.string().optional().describe('Second tax percentage')
});

const outputSchema = z
  .object({
    creditNoteId: z.number(),
    creditNumber: z.string().nullable().optional(),
    customerId: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
    amount: z.any().optional(),
    currencyCode: z.string().nullable().optional(),
    createDate: z.string().nullable().optional()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let manageCreditNotes = SlateTool.create(spec, {
  name: 'Manage Credit Notes',
  key: 'manage_credit_notes',
  description: `Create, update, or delete credit notes in FreshBooks. Credit notes are used for client refunds or adjustments and can include line items similar to invoices.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      creditNoteId: z
        .number()
        .optional()
        .describe('Credit note ID (required for update/delete)'),
      customerId: z.number().optional().describe('Client ID (required for create)'),
      createDate: z.string().optional().describe('Credit note date (YYYY-MM-DD)'),
      currencyCode: z.string().optional().describe('Three-letter currency code'),
      notes: z.string().optional().describe('Additional notes'),
      lines: z.array(creditNoteLineSchema).optional().describe('Line items')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_credit_notes', ctx, outputSchema))
  .build();
