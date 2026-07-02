import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listCreditNotesTool = SlateTool.create(spec, {
  name: 'List Credit Notes',
  key: 'list_credit_notes',
  description: `List credit notes issued to customers with filtering by status and customer.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().optional(),
      status: z.enum(['open', 'closed', 'void', 'draft']).optional(),
      searchText: z.string().optional(),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      creditNotes: z.array(
        z.object({
          creditNoteId: z.string(),
          creditNoteNumber: z.string().optional(),
          customerName: z.string().optional(),
          customerId: z.string().optional(),
          status: z.string().optional(),
          date: z.string().optional(),
          total: z.number().optional(),
          balance: z.number().optional(),
          currencyCode: z.string().optional(),
          createdTime: z.string().optional()
        })
      ),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = { page: ctx.input.page, per_page: ctx.input.perPage };
    if (ctx.input.customerId) query.customer_id = ctx.input.customerId;
    if (ctx.input.status) query.status = ctx.input.status;
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;

    let resp = await client.listCreditNotes(query);
    let creditNotes = (resp.creditnotes || []).map((cn: any) => ({
      creditNoteId: cn.creditnote_id,
      creditNoteNumber: cn.creditnote_number,
      customerName: cn.customer_name,
      customerId: cn.customer_id,
      status: cn.status,
      date: cn.date,
      total: cn.total,
      balance: cn.balance,
      currencyCode: cn.currency_code,
      createdTime: cn.created_time
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { creditNotes, pageContext },
      message: `Found **${creditNotes.length}** credit note(s).`
    };
  })
  .build();

export let createCreditNoteTool = SlateTool.create(spec, {
  name: 'Create Credit Note',
  key: 'create_credit_note',
  description: `Issue a credit note to a customer. Credit notes can be applied to outstanding invoices or refunded.`,
  instructions: [
    'Provide a customerId and at least one line item.',
    'Use applyToInvoices to immediately apply the credit to specific invoices.'
  ]
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer'),
      creditnoteNumber: z.string().optional(),
      date: z.string().optional().describe('Credit note date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional(),
      lineItems: z
        .array(
          z.object({
            itemId: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().optional().default(1),
            rate: z.number().optional(),
            taxId: z.string().optional()
          })
        )
        .min(1),
      notes: z.string().optional(),
      applyToInvoices: z
        .array(
          z.object({
            invoiceId: z.string(),
            amountApplied: z.number()
          })
        )
        .optional()
        .describe('Apply credit to specific invoices')
    })
  )
  .output(
    z.object({
      creditNoteId: z.string(),
      creditNoteNumber: z.string().optional(),
      status: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      currencyCode: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      customer_id: input.customerId,
      line_items: input.lineItems.map(li => ({
        item_id: li.itemId,
        name: li.name,
        description: li.description,
        quantity: li.quantity,
        rate: li.rate,
        tax_id: li.taxId
      }))
    };

    if (input.creditnoteNumber) payload.creditnote_number = input.creditnoteNumber;
    if (input.date) payload.date = input.date;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.notes) payload.notes = input.notes;

    let resp = await client.createCreditNote(payload);
    let cn = resp.creditnote;

    if (input.applyToInvoices && input.applyToInvoices.length > 0 && cn.creditnote_id) {
      let invoices = input.applyToInvoices.map(inv => ({
        invoice_id: inv.invoiceId,
        amount_applied: inv.amountApplied
      }));
      await client.applyCreditNoteToInvoices(cn.creditnote_id, invoices);
    }

    return {
      output: {
        creditNoteId: cn.creditnote_id,
        creditNoteNumber: cn.creditnote_number,
        status: cn.status,
        total: cn.total,
        balance: cn.balance,
        currencyCode: cn.currency_code
      },
      message: `Created credit note **${cn.creditnote_number}** for ${cn.currency_code} ${cn.total}.${input.applyToInvoices ? ' Applied to invoices.' : ''}`
    };
  })
  .build();
