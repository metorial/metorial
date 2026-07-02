import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCreditNote = SlateTool.create(spec, {
  name: 'Manage Credit Note',
  key: 'manage_credit_note',
  description: `Creates or updates a credit note in Zoho Invoice.
If **creditNoteId** is provided, updates the existing credit note. Otherwise, creates a new credit note.
The **customerId** field is required when creating a new credit note. Provide **lineItems** to specify the items on the credit note.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      creditNoteId: z
        .string()
        .optional()
        .describe(
          'ID of the credit note to update. If omitted, a new credit note is created.'
        ),
      customerId: z
        .string()
        .optional()
        .describe('ID of the customer (required when creating a new credit note)'),
      creditNoteNumber: z.string().optional().describe('Custom credit note number'),
      date: z.string().optional().describe('Credit note date in YYYY-MM-DD format'),
      lineItems: z
        .array(
          z.object({
            itemId: z.string().optional().describe('ID of an existing item from the catalog'),
            name: z.string().optional().describe('Name of the line item'),
            description: z.string().optional().describe('Description of the line item'),
            rate: z.number().optional().describe('Rate per unit of the line item'),
            quantity: z.number().optional().describe('Quantity of the line item'),
            unit: z.string().optional().describe('Unit of measurement for the line item'),
            taxId: z.string().optional().describe('ID of the tax to apply to this line item')
          })
        )
        .optional()
        .describe('Array of line items for the credit note'),
      notes: z.string().optional().describe('Notes to display on the credit note'),
      terms: z.string().optional().describe('Terms and conditions for the credit note')
    })
  )
  .output(
    z.object({
      creditNoteId: z.string().describe('Unique ID of the credit note'),
      creditNoteNumber: z.string().describe('Credit note number'),
      status: z.string().describe('Status of the credit note (e.g. open, closed, void)'),
      customerId: z.string().describe('ID of the associated customer'),
      customerName: z.string().describe('Name of the associated customer'),
      date: z.string().describe('Credit note date'),
      total: z.number().describe('Total amount of the credit note'),
      balance: z.number().describe('Remaining balance on the credit note'),
      createdTime: z.string().describe('Timestamp when the credit note was created'),
      lastModifiedTime: z.string().describe('Timestamp when the credit note was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let data: Record<string, any> = {};

    if (ctx.input.customerId !== undefined) data.customer_id = ctx.input.customerId;
    if (ctx.input.creditNoteNumber !== undefined)
      data.creditnote_number = ctx.input.creditNoteNumber;
    if (ctx.input.date !== undefined) data.date = ctx.input.date;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.terms !== undefined) data.terms = ctx.input.terms;
    if (ctx.input.lineItems !== undefined) {
      data.line_items = ctx.input.lineItems.map(item => {
        let mapped: Record<string, any> = {};
        if (item.itemId !== undefined) mapped.item_id = item.itemId;
        if (item.name !== undefined) mapped.name = item.name;
        if (item.description !== undefined) mapped.description = item.description;
        if (item.rate !== undefined) mapped.rate = item.rate;
        if (item.quantity !== undefined) mapped.quantity = item.quantity;
        if (item.unit !== undefined) mapped.unit = item.unit;
        if (item.taxId !== undefined) mapped.tax_id = item.taxId;
        return mapped;
      });
    }

    let creditNote: any;
    let action: string;

    if (ctx.input.creditNoteId) {
      creditNote = await client.updateCreditNote(ctx.input.creditNoteId, data);
      action = 'updated';
    } else {
      creditNote = await client.createCreditNote(data);
      action = 'created';
    }

    return {
      output: {
        creditNoteId: creditNote.creditnote_id ?? '',
        creditNoteNumber: creditNote.creditnote_number ?? '',
        status: creditNote.status ?? '',
        customerId: creditNote.customer_id ?? '',
        customerName: creditNote.customer_name ?? '',
        date: creditNote.date ?? '',
        total: creditNote.total ?? 0,
        balance: creditNote.balance ?? 0,
        createdTime: creditNote.created_time ?? '',
        lastModifiedTime: creditNote.last_modified_time ?? ''
      },
      message: `Successfully ${action} credit note **${creditNote.creditnote_number ?? creditNote.creditnote_id}**.`
    };
  })
  .build();
