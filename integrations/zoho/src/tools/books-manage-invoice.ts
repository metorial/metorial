import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoBooksClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

let lineItemSchema = z.object({
  itemId: z.string().optional().describe('Item ID from Zoho Books inventory'),
  name: z.string().optional().describe('Item name'),
  description: z.string().optional().describe('Item description'),
  rate: z.number().optional().describe('Unit price'),
  quantity: z.number().optional().describe('Quantity'),
  discount: z.string().optional().describe('Discount percentage or flat amount'),
  taxId: z.string().optional().describe('Tax ID to apply')
});

export let booksManageInvoice = SlateTool.create(spec, {
  name: 'Books Manage Invoice',
  key: 'books_manage_invoice',
  description: `Create, update, delete, or change the status of invoices in Zoho Books. Supports setting customer, line items, payment terms, notes, and more. Can also mark invoices as sent, void, or draft.`,
  instructions: [
    'The organizationId is required for all Zoho Books operations.',
    'For create, provide customerId and at least one line item.',
    'For status changes (sent, void, draft), use the statusAction parameter.',
    'Use the "list" action with a Books contact ID in customerId to list invoices for a specific customer.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Zoho Books organization ID'),
      action: z
        .enum(['create', 'update', 'delete', 'status'])
        .describe('Operation to perform'),
      invoiceId: z
        .string()
        .optional()
        .describe('Invoice ID (required for update, delete, status)'),
      customerId: z.string().optional().describe('Customer/contact ID (required for create)'),
      invoiceNumber: z.string().optional().describe('Custom invoice number'),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      lineItems: z.array(lineItemSchema).optional().describe('Invoice line items'),
      notes: z.string().optional().describe('Notes to appear on the invoice'),
      terms: z.string().optional().describe('Terms and conditions'),
      discount: z
        .string()
        .optional()
        .describe('Discount at the invoice level (e.g., "10%" or "50.00")'),
      statusAction: z
        .enum(['sent', 'void', 'draft'])
        .optional()
        .describe('Status action to apply (for action="status")'),
      customFields: z
        .array(
          z.object({
            label: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional(),
      invoiceNumber: z.string().optional(),
      status: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      message: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoBooksClient({
      token: ctx.auth.token,
      datacenter: dc,
      organizationId: ctx.input.organizationId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.customerId) throw zohoServiceError('customerId is required for create');
      if (!ctx.input.lineItems?.length)
        throw zohoServiceError('lineItems is required for create');
      let data: Record<string, any> = {};
      if (ctx.input.customerId) data.customer_id = ctx.input.customerId;
      if (ctx.input.invoiceNumber) data.invoice_number = ctx.input.invoiceNumber;
      if (ctx.input.date) data.date = ctx.input.date;
      if (ctx.input.dueDate) data.due_date = ctx.input.dueDate;
      if (ctx.input.notes) data.notes = ctx.input.notes;
      if (ctx.input.terms) data.terms = ctx.input.terms;
      if (ctx.input.discount) data.discount = ctx.input.discount;
      if (ctx.input.lineItems) {
        data.line_items = ctx.input.lineItems.map(item => ({
          item_id: item.itemId,
          name: item.name,
          description: item.description,
          rate: item.rate,
          quantity: item.quantity,
          discount: item.discount,
          tax_id: item.taxId
        }));
      }
      if (ctx.input.customFields) data.custom_fields = ctx.input.customFields;

      let result = await client.createInvoice(data);
      let inv = result?.invoice;
      return {
        output: {
          invoiceId: inv?.invoice_id,
          invoiceNumber: inv?.invoice_number,
          status: inv?.status,
          total: inv?.total,
          balance: inv?.balance,
          message: result?.message
        },
        message: `Created invoice **${inv?.invoice_number}** for **${inv?.total}** (${inv?.status}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.invoiceId) throw zohoServiceError('invoiceId is required for update');
      let data: Record<string, any> = {};
      if (ctx.input.customerId) data.customer_id = ctx.input.customerId;
      if (ctx.input.date) data.date = ctx.input.date;
      if (ctx.input.dueDate) data.due_date = ctx.input.dueDate;
      if (ctx.input.notes) data.notes = ctx.input.notes;
      if (ctx.input.terms) data.terms = ctx.input.terms;
      if (ctx.input.discount) data.discount = ctx.input.discount;
      if (ctx.input.lineItems) {
        data.line_items = ctx.input.lineItems.map(item => ({
          item_id: item.itemId,
          name: item.name,
          description: item.description,
          rate: item.rate,
          quantity: item.quantity,
          discount: item.discount,
          tax_id: item.taxId
        }));
      }

      let result = await client.updateInvoice(ctx.input.invoiceId, data);
      let inv = result?.invoice;
      return {
        output: {
          invoiceId: inv?.invoice_id,
          invoiceNumber: inv?.invoice_number,
          status: inv?.status,
          total: inv?.total,
          balance: inv?.balance,
          message: result?.message
        },
        message: `Updated invoice **${inv?.invoice_number || ctx.input.invoiceId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.invoiceId) throw zohoServiceError('invoiceId is required for delete');
      let result = await client.deleteInvoice(ctx.input.invoiceId);
      return {
        output: { invoiceId: ctx.input.invoiceId, deleted: true, message: result?.message },
        message: `Deleted invoice **${ctx.input.invoiceId}**.`
      };
    }

    if (ctx.input.action === 'status') {
      if (!ctx.input.invoiceId)
        throw zohoServiceError('invoiceId is required for status change');
      if (!ctx.input.statusAction)
        throw zohoServiceError('statusAction is required for status change');
      let result = await client.markInvoiceStatus(ctx.input.invoiceId, ctx.input.statusAction);
      return {
        output: {
          invoiceId: ctx.input.invoiceId,
          status: ctx.input.statusAction,
          message: result?.message
        },
        message: `Marked invoice **${ctx.input.invoiceId}** as **${ctx.input.statusAction}**.`
      };
    }

    throw zohoServiceError('Invalid Books invoice action.');
  })
  .build();
