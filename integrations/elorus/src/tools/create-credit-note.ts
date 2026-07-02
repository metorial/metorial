import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  title: z.string().describe('Title/name of the line item.'),
  description: z.string().optional().describe('Line item description.'),
  quantity: z.string().optional().describe('Quantity (as string). Defaults to "1".'),
  unitTotal: z
    .string()
    .optional()
    .describe('Unit price including tax (when calculatorMode is "total").'),
  unitValue: z
    .string()
    .optional()
    .describe('Unit price excluding tax (when calculatorMode is "initial").'),
  unit: z.string().optional().describe('Unit of measurement.'),
  productId: z.string().optional().describe('Optional product/service ID.'),
  taxes: z.array(z.string()).optional().describe('Array of tax IDs to apply.')
});

export let createCreditNote = SlateTool.create(spec, {
  name: 'Create Credit Note',
  key: 'create_credit_note',
  description: `Create a new credit note in Elorus. Credit notes reduce the balance owed by a client. They can be associated with specific invoices or created independently.`
})
  .input(
    z.object({
      clientId: z.string().describe('Contact ID of the client.'),
      documentTypeId: z.string().describe('Document type ID for the credit note.'),
      date: z
        .string()
        .optional()
        .describe('Credit note date (YYYY-MM-DD). Defaults to today.'),
      draft: z
        .boolean()
        .optional()
        .describe('Create as draft (true) or issue immediately (false). Defaults to true.'),
      calculatorMode: z
        .enum(['total', 'initial'])
        .optional()
        .describe('"total" or "initial" pricing mode. Defaults to "total".'),
      currencyCode: z.string().optional().describe('Currency code (e.g. "EUR").'),
      items: z.array(lineItemSchema).describe('Line items for the credit note.'),
      relatedInvoiceIds: z
        .array(z.string())
        .optional()
        .describe('IDs of invoices being credited.'),
      customId: z.string().optional().describe('Custom external identifier (API-only).')
    })
  )
  .output(
    z.object({
      creditNote: z.any().describe('The newly created credit note object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {
      client: ctx.input.clientId,
      documenttype: ctx.input.documentTypeId,
      calculator_mode: ctx.input.calculatorMode || 'total',
      items: ctx.input.items.map(item => {
        let lineItem: any = { title: item.title };
        if (item.description) lineItem.description = item.description;
        if (item.quantity) lineItem.quantity = item.quantity;
        if (item.unitTotal) lineItem.unit_total = item.unitTotal;
        if (item.unitValue) lineItem.unit_value = item.unitValue;
        if (item.unit) lineItem.unit = item.unit;
        if (item.productId) lineItem.product = item.productId;
        if (item.taxes) lineItem.taxes = item.taxes;
        return lineItem;
      })
    };

    if (ctx.input.date) body.date = ctx.input.date;
    if (ctx.input.draft !== undefined) body.draft = ctx.input.draft;
    if (ctx.input.currencyCode) body.currency_code = ctx.input.currencyCode;
    if (ctx.input.relatedInvoiceIds) body.related_documents = ctx.input.relatedInvoiceIds;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let creditNote = await client.createCreditNote(body);

    return {
      output: { creditNote },
      message: `Created credit note **${creditNote.sequence_flat || creditNote.id}** — Total: ${creditNote.total} ${creditNote.currency_code || ''}`
    };
  })
  .build();
