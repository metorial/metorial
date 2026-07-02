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

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve a list of invoices from Quaderno. Supports filtering by search query, date, and state.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter invoices'),
      date: z.string().optional().describe('Filter by date (YYYY-MM-DD format)'),
      state: z
        .string()
        .optional()
        .describe('Filter by state (e.g., "outstanding", "late", "paid")'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      invoices: z.array(documentOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listInvoices({
      q: ctx.input.query,
      date: ctx.input.date,
      state: ctx.input.state,
      page: ctx.input.page
    });

    let invoices = (Array.isArray(result) ? result : []).map(mapDocumentOutput);

    return {
      output: { invoices },
      message: `Found **${invoices.length}** invoice(s)`
    };
  })
  .build();

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve a single invoice by ID from Quaderno, including all line items, amounts, and contact details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to retrieve')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let doc = await client.getInvoice(ctx.input.invoiceId);

    return {
      output: mapDocumentOutput(doc),
      message: `Retrieved invoice **#${doc.number || doc.id}** — Total: ${doc.total} ${doc.currency || ''}`
    };
  })
  .build();

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in Quaderno. Requires a contact and at least one line item. Invoices cannot be deleted; use credit notes for refunds.`,
  constraints: [
    'Invoices cannot be deleted for tax compliance. Use credit notes for corrections or refunds.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact (customer) to invoice'),
      currency: z.string().optional().describe('Currency code (e.g., "USD", "EUR")'),
      issueDate: z.string().optional().describe('Issue date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      subject: z.string().optional().describe('Subject line for the invoice'),
      notes: z.string().optional().describe('Notes to include on the invoice'),
      poNumber: z.string().optional().describe('Purchase order number'),
      tag: z.string().optional().describe('Tag for categorization'),
      items: z.array(lineItemInputSchema).min(1).describe('Line items for the invoice')
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
    if (ctx.input.dueDate) data.due_date = ctx.input.dueDate;
    if (ctx.input.subject) data.subject = ctx.input.subject;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.poNumber) data.po_number = ctx.input.poNumber;
    if (ctx.input.tag) data.tag = ctx.input.tag;

    let doc = await client.createInvoice(data);

    return {
      output: mapDocumentOutput(doc),
      message: `Created invoice **#${doc.number || doc.id}** for ${doc.total} ${doc.currency || ''}`
    };
  })
  .build();

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice in Quaderno. Only the provided fields will be updated.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to update'),
      contactId: z.string().optional().describe('New contact ID'),
      currency: z.string().optional().describe('Currency code'),
      issueDate: z.string().optional().describe('Issue date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      subject: z.string().optional().describe('Subject line'),
      notes: z.string().optional().describe('Notes'),
      poNumber: z.string().optional().describe('Purchase order number'),
      tag: z.string().optional().describe('Tag for categorization')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {};
    if (ctx.input.contactId !== undefined) data.contact_id = ctx.input.contactId;
    if (ctx.input.currency !== undefined) data.currency = ctx.input.currency;
    if (ctx.input.issueDate !== undefined) data.issue_date = ctx.input.issueDate;
    if (ctx.input.dueDate !== undefined) data.due_date = ctx.input.dueDate;
    if (ctx.input.subject !== undefined) data.subject = ctx.input.subject;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.poNumber !== undefined) data.po_number = ctx.input.poNumber;
    if (ctx.input.tag !== undefined) data.tag = ctx.input.tag;

    let doc = await client.updateInvoice(ctx.input.invoiceId, data);

    return {
      output: mapDocumentOutput(doc),
      message: `Updated invoice **#${doc.number || doc.id}**`
    };
  })
  .build();

export let deliverInvoice = SlateTool.create(spec, {
  name: 'Deliver Invoice',
  key: 'deliver_invoice',
  description: `Send an invoice to the customer via email. The invoice will be delivered in the customer's preferred language and format.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to deliver')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the delivery was initiated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deliverInvoice(ctx.input.invoiceId);

    return {
      output: { success: true },
      message: `Delivered invoice **${ctx.input.invoiceId}** to customer`
    };
  })
  .build();
