import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import {
  documentOutputSchema,
  lineItemInputSchema,
  mapDocumentOutput,
  mapLineItemInput
} from '../lib/schemas';
import { spec } from '../spec';

export let listCreditNotes = SlateTool.create(spec, {
  name: 'List Credit Notes',
  key: 'list_credit_notes',
  description: `Retrieve a list of credit notes from Quaderno. Credit notes are used for refunds and corrections since invoices cannot be deleted.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter credit notes'),
      date: z.string().optional().describe('Filter by date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      creditNotes: z.array(documentOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listCreditNotes({
      q: ctx.input.query,
      date: ctx.input.date,
      page: ctx.input.page
    });

    let creditNotes = (Array.isArray(result) ? result : []).map(mapDocumentOutput);

    return {
      output: { creditNotes },
      message: `Found **${creditNotes.length}** credit note(s)`
    };
  })
  .build();

export let getCreditNote = SlateTool.create(spec, {
  name: 'Get Credit Note',
  key: 'get_credit_note',
  description: `Retrieve a single credit note by ID from Quaderno.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      creditNoteId: z.string().describe('ID of the credit note to retrieve')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let doc = await client.getCreditNote(ctx.input.creditNoteId);

    return {
      output: mapDocumentOutput(doc),
      message: `Retrieved credit note **#${doc.number || doc.id}** — Total: ${doc.total} ${doc.currency || ''}`
    };
  })
  .build();

export let createCreditNote = SlateTool.create(spec, {
  name: 'Create Credit Note',
  key: 'create_credit_note',
  description: `Create a new credit note in Quaderno. Used for issuing refunds or corrections against invoices. Supports partial refunds.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to issue the credit note to'),
      currency: z.string().optional().describe('Currency code'),
      issueDate: z.string().optional().describe('Issue date in YYYY-MM-DD format'),
      subject: z.string().optional().describe('Subject line'),
      notes: z.string().optional().describe('Notes'),
      poNumber: z.string().optional().describe('Purchase order number'),
      tag: z.string().optional().describe('Tag for categorization'),
      items: z.array(lineItemInputSchema).min(1).describe('Line items for the credit note')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      contact_id: ctx.input.contactId,
      items_attributes: ctx.input.items.map(mapLineItemInput)
    };

    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.issueDate) data.issue_date = ctx.input.issueDate;
    if (ctx.input.subject) data.subject = ctx.input.subject;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.poNumber) data.po_number = ctx.input.poNumber;
    if (ctx.input.tag) data.tag = ctx.input.tag;

    let doc = await client.createCreditNote(data);

    return {
      output: mapDocumentOutput(doc),
      message: `Created credit note **#${doc.number || doc.id}** for ${doc.total} ${doc.currency || ''}`
    };
  })
  .build();

export let deliverCreditNote = SlateTool.create(spec, {
  name: 'Deliver Credit Note',
  key: 'deliver_credit_note',
  description: `Send a credit note to the customer via email.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      creditNoteId: z.string().describe('ID of the credit note to deliver')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the delivery was initiated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deliverCreditNote(ctx.input.creditNoteId);

    return {
      output: { success: true },
      message: `Delivered credit note **${ctx.input.creditNoteId}** to customer`
    };
  })
  .build();
