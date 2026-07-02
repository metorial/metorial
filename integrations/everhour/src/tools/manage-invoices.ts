import { SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let invoiceSchema = z.object({
  invoiceId: z.number().describe('Invoice ID'),
  publicId: z.string().optional().describe('Public invoice number'),
  status: z.string().optional().describe('Invoice status: draft, sent, or paid'),
  clientId: z.number().optional().describe('Client ID'),
  clientName: z.string().optional().describe('Client name'),
  dateFrom: z.string().optional().describe('Period start date'),
  dateTill: z.string().optional().describe('Period end date'),
  issueDate: z.string().optional().describe('Invoice issue date'),
  dueDate: z.string().optional().describe('Invoice due date'),
  listAmountCents: z.number().optional().describe('List amount in cents'),
  totalAmountCents: z.number().optional().describe('Total amount in cents'),
  totalTimeSeconds: z.number().optional().describe('Total billed time in seconds'),
  invoiceItems: z.array(z.any()).optional().describe('Invoice line items'),
  createdAt: z.string().optional().describe('When the invoice was created')
});

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `List all invoices or retrieve a specific invoice by ID. Returns invoice details including line items, amounts, and status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      invoiceId: z.number().optional().describe('If provided, retrieve this specific invoice')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema).describe('List of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);

    if (ctx.input.invoiceId) {
      let inv = await client.getInvoice(ctx.input.invoiceId);
      return {
        output: {
          invoices: [
            {
              invoiceId: inv.id,
              publicId: inv.publicId,
              status: inv.status,
              clientId: inv.client?.id,
              clientName: inv.client?.name,
              dateFrom: inv.dateFrom,
              dateTill: inv.dateTill,
              issueDate: inv.issueDate,
              dueDate: inv.dueDate,
              listAmountCents: inv.listAmount,
              totalAmountCents: inv.totalAmount,
              totalTimeSeconds: inv.totalTime,
              invoiceItems: inv.invoiceItems,
              createdAt: inv.createdAt
            }
          ]
        },
        message: `Retrieved invoice **#${inv.publicId || inv.id}** (${inv.status}).`
      };
    }

    let invoices = await client.listInvoices();
    let mapped = invoices.map((inv: any) => ({
      invoiceId: inv.id,
      publicId: inv.publicId,
      status: inv.status,
      clientId: inv.client?.id,
      clientName: inv.client?.name,
      dateFrom: inv.dateFrom,
      dateTill: inv.dateTill,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      listAmountCents: inv.listAmount,
      totalAmountCents: inv.totalAmount,
      totalTimeSeconds: inv.totalTime,
      invoiceItems: inv.invoiceItems,
      createdAt: inv.createdAt
    }));

    return {
      output: { invoices: mapped },
      message: `Found **${mapped.length}** invoice(s).`
    };
  });

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice for a client from tracked time and expenses. Optionally filter by date range and projects, and configure tax/discount.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      clientId: z.number().describe('Client ID to create the invoice for'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date for time/expense inclusion (YYYY-MM-DD)'),
      dateTill: z
        .string()
        .optional()
        .describe('End date for time/expense inclusion (YYYY-MM-DD)'),
      includeTime: z.boolean().optional().describe('Include tracked time in the invoice'),
      includeExpenses: z.boolean().optional().describe('Include expenses in the invoice'),
      projectIds: z.array(z.string()).optional().describe('Limit to specific project IDs'),
      taxRate: z.number().optional().describe('Tax rate percentage'),
      discountRate: z.number().optional().describe('Discount rate percentage')
    })
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let data: any = {};
    if (ctx.input.dateFrom) data.limitDateFrom = ctx.input.dateFrom;
    if (ctx.input.dateTill) data.limitDateTill = ctx.input.dateTill;
    if (ctx.input.includeTime !== undefined) data.includeTime = ctx.input.includeTime;
    if (ctx.input.includeExpenses !== undefined)
      data.includeExpenses = ctx.input.includeExpenses;
    if (ctx.input.projectIds) data.projects = ctx.input.projectIds;
    if (ctx.input.taxRate !== undefined) data.tax = { rate: ctx.input.taxRate };
    if (ctx.input.discountRate !== undefined) data.discount = { rate: ctx.input.discountRate };

    let inv = await client.createInvoice(ctx.input.clientId, data);
    return {
      output: {
        invoiceId: inv.id,
        publicId: inv.publicId,
        status: inv.status,
        clientId: inv.client?.id,
        clientName: inv.client?.name,
        dateFrom: inv.dateFrom,
        dateTill: inv.dateTill,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        listAmountCents: inv.listAmount,
        totalAmountCents: inv.totalAmount,
        totalTimeSeconds: inv.totalTime,
        invoiceItems: inv.invoiceItems,
        createdAt: inv.createdAt
      },
      message: `Created invoice **#${inv.publicId || inv.id}** for $${((inv.totalAmount || 0) / 100).toFixed(2)}.`
    };
  });

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an invoice's details, status, line items, or tax/discount configuration. Use the status field to mark an invoice as "draft", "sent", or "paid".`,
  tags: { destructive: false }
})
  .input(
    z.object({
      invoiceId: z.number().describe('Invoice ID to update'),
      status: z.enum(['draft', 'sent', 'paid']).optional().describe('Set the invoice status'),
      publicId: z.string().optional().describe('Public invoice number'),
      issueDate: z.string().optional().describe('Issue date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      reference: z.string().optional().describe('Invoice reference'),
      publicNotes: z.string().optional().describe('Public notes on the invoice'),
      taxRate: z.number().optional().describe('Tax rate percentage'),
      discountRate: z.number().optional().describe('Discount rate percentage'),
      invoiceItems: z
        .array(
          z.object({
            itemId: z.number().optional().describe('Existing line item ID (for updates)'),
            name: z.string().describe('Line item name'),
            billedTimeSeconds: z.number().optional().describe('Billed time in seconds'),
            listAmountCents: z.number().optional().describe('Line item amount in cents'),
            taxable: z.boolean().optional().describe('Whether the item is taxable'),
            position: z.number().optional().describe('Item position')
          })
        )
        .optional()
        .describe('Invoice line items')
    })
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { invoiceId, status, taxRate, discountRate, invoiceItems, ...rest } = ctx.input;

    let updateData: any = { ...rest };
    if (taxRate !== undefined) updateData.tax = { rate: taxRate };
    if (discountRate !== undefined) updateData.discount = { rate: discountRate };
    if (invoiceItems) {
      updateData.invoiceItems = invoiceItems.map(item => ({
        id: item.itemId,
        name: item.name,
        billedTime: item.billedTimeSeconds,
        listAmount: item.listAmountCents,
        taxable: item.taxable,
        position: item.position
      }));
    }

    if (Object.keys(updateData).length > 0) {
      await client.updateInvoice(invoiceId, updateData);
    }

    if (status) {
      await client.setInvoiceStatus(invoiceId, status);
    }

    let inv = await client.getInvoice(invoiceId);
    return {
      output: {
        invoiceId: inv.id,
        publicId: inv.publicId,
        status: inv.status,
        clientId: inv.client?.id,
        clientName: inv.client?.name,
        dateFrom: inv.dateFrom,
        dateTill: inv.dateTill,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        listAmountCents: inv.listAmount,
        totalAmountCents: inv.totalAmount,
        totalTimeSeconds: inv.totalTime,
        invoiceItems: inv.invoiceItems,
        createdAt: inv.createdAt
      },
      message: `Updated invoice **#${inv.publicId || inv.id}** (${inv.status}).`
    };
  });

export let deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Permanently delete an invoice.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    await client.deleteInvoice(ctx.input.invoiceId);
    return {
      output: { success: true },
      message: `Deleted invoice ${ctx.input.invoiceId}.`
    };
  });
