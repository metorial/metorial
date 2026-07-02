import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  description: z.string().optional().describe('Description of the line item'),
  quantity: z.number().optional().describe('Quantity'),
  unitAmount: z.number().optional().describe('Unit price'),
  accountCode: z.string().optional().describe('Account code'),
  taxType: z.string().optional().describe('Tax type code'),
  itemCode: z.string().optional().describe('Item code')
});

let creditNoteOutputSchema = z.object({
  creditNoteId: z.string().optional().describe('Unique Xero credit note ID'),
  creditNoteNumber: z.string().optional().describe('Credit note number'),
  type: z.string().optional().describe('ACCPAYCREDIT (supplier) or ACCRECCREDIT (customer)'),
  status: z.string().optional().describe('Status: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED'),
  contactName: z.string().optional().describe('Contact name'),
  contactId: z.string().optional().describe('Contact ID'),
  date: z.string().optional().describe('Credit note date'),
  subTotal: z.number().optional().describe('Subtotal before tax'),
  totalTax: z.number().optional().describe('Total tax amount'),
  total: z.number().optional().describe('Total amount'),
  remainingCredit: z.number().optional().describe('Remaining credit available'),
  currencyCode: z.string().optional().describe('Currency code'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

let mapCreditNote = (cn: any) => ({
  creditNoteId: cn.CreditNoteID,
  creditNoteNumber: cn.CreditNoteNumber,
  type: cn.Type,
  status: cn.Status,
  contactName: cn.Contact?.Name,
  contactId: cn.Contact?.ContactID,
  date: cn.DateString || cn.Date,
  subTotal: cn.SubTotal,
  totalTax: cn.TotalTax,
  total: cn.Total,
  remainingCredit: cn.RemainingCredit,
  currencyCode: cn.CurrencyCode,
  updatedDate: cn.UpdatedDateUTC
});

export let createCreditNote = SlateTool.create(spec, {
  name: 'Create Credit Note',
  key: 'create_credit_note',
  description: `Creates a new credit note in Xero. Use ACCRECCREDIT for customer credit notes (reducing what they owe) or ACCPAYCREDIT for supplier credit notes (reducing what you owe).`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      type: z
        .enum(['ACCRECCREDIT', 'ACCPAYCREDIT'])
        .describe('ACCRECCREDIT for customer credits, ACCPAYCREDIT for supplier credits'),
      contactId: z.string().describe('Contact ID for the credit note'),
      lineItems: z.array(lineItemSchema).min(1).describe('Line items for the credit note'),
      date: z.string().optional().describe('Credit note date (YYYY-MM-DD)'),
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'AUTHORISED'])
        .optional()
        .describe('Initial status. Defaults to DRAFT'),
      lineAmountTypes: z
        .enum(['Exclusive', 'Inclusive', 'NoTax'])
        .optional()
        .describe('How amounts are calculated'),
      reference: z.string().optional().describe('Credit note reference'),
      currencyCode: z.string().optional().describe('Currency code')
    })
  )
  .output(creditNoteOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let creditNote = await client.createCreditNote({
      Type: ctx.input.type,
      Contact: { ContactID: ctx.input.contactId },
      LineItems: ctx.input.lineItems.map(li => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        AccountCode: li.accountCode,
        TaxType: li.taxType,
        ItemCode: li.itemCode
      })),
      Date: ctx.input.date,
      Status: ctx.input.status || 'DRAFT',
      LineAmountTypes: ctx.input.lineAmountTypes,
      CurrencyCode: ctx.input.currencyCode
    });

    let output = mapCreditNote(creditNote);

    return {
      output,
      message: `Created credit note **${output.creditNoteNumber || output.creditNoteId}** for **${output.total?.toFixed(2)} ${output.currencyCode || ''}** with status **${output.status}**.`
    };
  })
  .build();

export let listCreditNotes = SlateTool.create(spec, {
  name: 'List Credit Notes',
  key: 'list_credit_notes',
  description: `Lists credit notes from Xero with optional filtering. Filter by modification date, status, or use the where parameter for advanced queries.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starting from 1)'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return credit notes modified after this date (ISO 8601)'),
      where: z.string().optional().describe('Xero API where filter expression'),
      order: z.string().optional().describe('Order results, e.g. "Date DESC"')
    })
  )
  .output(
    z.object({
      creditNotes: z.array(creditNoteOutputSchema).describe('List of credit notes'),
      count: z.number().describe('Number of credit notes returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getCreditNotes({
      page: ctx.input.page,
      modifiedAfter: ctx.input.modifiedAfter,
      where: ctx.input.where,
      order: ctx.input.order
    });

    let creditNotes = (result.CreditNotes || []).map(mapCreditNote);

    return {
      output: { creditNotes, count: creditNotes.length },
      message: `Found **${creditNotes.length}** credit note(s).`
    };
  })
  .build();

export let updateCreditNote = SlateTool.create(spec, {
  name: 'Update Credit Note',
  key: 'update_credit_note',
  description: `Updates a credit note in Xero. Can change the status to authorise or void the credit note, or modify line items on draft credit notes.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      creditNoteId: z.string().describe('The Xero credit note ID to update'),
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'VOIDED'])
        .optional()
        .describe('New status'),
      lineItems: z
        .array(lineItemSchema)
        .optional()
        .describe('Replacement line items (only for draft credit notes)'),
      date: z.string().optional().describe('New date'),
      reference: z.string().optional().describe('New reference')
    })
  )
  .output(creditNoteOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.status) updateData.Status = ctx.input.status;
    if (ctx.input.date) updateData.Date = ctx.input.date;
    if (ctx.input.reference) updateData.Reference = ctx.input.reference;

    if (ctx.input.lineItems) {
      updateData.LineItems = ctx.input.lineItems.map(li => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        AccountCode: li.accountCode,
        TaxType: li.taxType,
        ItemCode: li.itemCode
      }));
    }

    let creditNote = await client.updateCreditNote(ctx.input.creditNoteId, updateData);
    let output = mapCreditNote(creditNote);

    return {
      output,
      message: `Updated credit note **${output.creditNoteNumber || output.creditNoteId}** — Status: **${output.status}**.`
    };
  })
  .build();
