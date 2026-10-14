import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let invoiceOutputSchema = z.object({
  invoiceId: z.string(),
  number: z.string().optional(),
  clientId: z.string().optional(),
  status: z.string().optional(),
  subtotal: z.number().optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
  issuedDate: z.string().optional(),
  dueDate: z.string().optional()
});

export let getInvoices = SlateTool.create(spec, {
  name: 'Get Invoices',
  key: 'get_invoices',
  description: `List invoices in the Clockify workspace. Filter by status. Returns invoice summaries with amounts and dates. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      status: z
        .enum(['UNSENT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'VOID', 'OVERDUE'])
        .optional()
        .describe('Filter by invoice status'),
      page: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .optional()
        .describe('Page number'),
      pageSize: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .optional()
        .describe('Entries per page')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceOutputSchema),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let invoices = await client.getInvoices({
      statuses: ctx.input.status,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (invoices.invoices ?? []).map((inv: any) => ({
      invoiceId: inv.id,
      number: inv.number || undefined,
      clientId: inv.clientId || undefined,
      status: inv.status || undefined,
      subtotal: inv.subtotal,
      total: inv.amount ?? inv.total,
      currency: inv.currency || undefined,
      issuedDate: inv.issuedDate || undefined,
      dueDate: inv.dueDate || undefined
    }));

    return {
      output: { invoices: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** invoices.`
    };
  })
  .build();

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in Clockify. Set client, dates, line items, and billing details. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      clientId: z.string().describe('Client ID to bill'),
      number: z.string().optional().describe('Invoice number, required by Clockify'),
      issuedDate: z
        .string()
        .optional()
        .describe('Issue date in ISO 8601 format, required by Clockify'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date in ISO 8601 format, required by Clockify'),
      currency: z
        .string()
        .optional()
        .describe('Currency code (e.g., "USD"), required by Clockify'),
      note: z.string().optional().describe('Invoice notes'),
      items: z
        .array(
          z.object({
            description: z.string().optional(),
            quantity: z.number().optional(),
            unitPrice: z.number().optional()
          })
        )
        .optional()
        .describe(
          'Line items. Each item requires description, integer quantity, and integer unitPrice in Clockify API units'
        )
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let invoice = await client.createInvoice({
      clientId: ctx.input.clientId,
      number: ctx.input.number,
      issuedDate: ctx.input.issuedDate,
      dueDate: ctx.input.dueDate,
      currency: ctx.input.currency,
      note: ctx.input.note,
      items: ctx.input.items
    });

    return {
      output: {
        invoiceId: invoice.id,
        number: invoice.number || undefined,
        clientId: invoice.clientId || undefined,
        status: invoice.status || undefined,
        subtotal: invoice.subtotal,
        total: invoice.amount ?? invoice.total,
        currency: invoice.currency || undefined,
        issuedDate: invoice.issuedDate || undefined,
        dueDate: invoice.dueDate || undefined
      },
      message: `Created invoice${invoice.number ? ` **#${invoice.number}**` : ''}.`
    };
  })
  .build();

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice in Clockify. Modify status, dates, or notes, and optionally replace all line items. Use this to send, mark as paid, or void invoices. Line-item replacement uses multiple requests and may be partially applied if a request fails. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      invoiceId: z.string().describe('ID of the invoice to update'),
      status: z
        .enum(['UNSENT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'VOID', 'OVERDUE'])
        .optional()
        .describe('Updated invoice status'),
      dueDate: z.string().optional().describe('Updated due date'),
      note: z.string().optional().describe('Updated notes'),
      items: z
        .array(
          z.object({
            description: z.string().optional(),
            quantity: z.number().optional(),
            unitPrice: z.number().optional()
          })
        )
        .optional()
        .describe(
          'Replace all invoice line items. Each item requires description, integer quantity, and integer unitPrice in Clockify API units'
        )
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let data: Record<string, any> = {};
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.dueDate) data.dueDate = ctx.input.dueDate;
    if (ctx.input.note !== undefined) data.note = ctx.input.note;
    if (ctx.input.items) data.items = ctx.input.items;

    let invoice = await client.updateInvoice(ctx.input.invoiceId, data);

    return {
      output: {
        invoiceId: invoice.id,
        number: invoice.number || undefined,
        clientId: invoice.clientId || undefined,
        status: invoice.status || undefined,
        subtotal: invoice.subtotal,
        total: invoice.amount ?? invoice.total,
        currency: invoice.currency || undefined,
        issuedDate: invoice.issuedDate || undefined,
        dueDate: invoice.dueDate || undefined
      },
      message: `Updated invoice **${invoice.id}**.`
    };
  })
  .build();

export let deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Delete an invoice from Clockify. Call get_workspaces to discover the workspace ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      invoiceId: z.string().describe('ID of the invoice to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    await client.deleteInvoice(ctx.input.invoiceId);

    return {
      output: { deleted: true },
      message: `Deleted invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
