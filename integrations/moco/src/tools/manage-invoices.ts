import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invoiceItemSchema = z.object({
  title: z.string().describe('Line item title'),
  description: z.string().optional().describe('Line item description'),
  quantity: z.number().optional().describe('Quantity'),
  unit: z.string().optional().describe('Unit label (e.g., "hours", "pieces")'),
  unitPrice: z.number().optional().describe('Unit price'),
  netTotal: z.number().optional().describe('Net total for this item')
});

let invoiceOutputSchema = z.object({
  invoiceId: z.number().describe('Invoice ID'),
  title: z.string().optional().describe('Invoice title'),
  identifier: z.string().optional().describe('Invoice number/identifier'),
  status: z.string().optional().describe('Invoice status'),
  date: z.string().optional().describe('Invoice date'),
  dueDate: z.string().optional().describe('Payment due date'),
  currency: z.string().optional().describe('Currency code'),
  netTotal: z.number().optional().describe('Net total amount'),
  tax: z.number().optional().describe('Tax percentage'),
  grossTotal: z.number().optional().describe('Gross total amount'),
  paidTotal: z.number().optional().describe('Amount paid so far'),
  recipientAddress: z.string().optional().describe('Recipient billing address'),
  tags: z.array(z.string()).optional().describe('Invoice tags'),
  customer: z.any().optional().describe('Customer company details'),
  project: z.any().optional().describe('Associated project details'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapInvoice = (i: any) => ({
  invoiceId: i.id,
  title: i.title,
  identifier: i.identifier,
  status: i.status,
  date: i.date,
  dueDate: i.due_date,
  currency: i.currency,
  netTotal: i.net_total,
  tax: i.tax,
  grossTotal: i.gross_total,
  paidTotal: i.paid_total,
  recipientAddress: i.recipient_address,
  tags: i.tags,
  customer: i.customer,
  project: i.project,
  createdAt: i.created_at,
  updatedAt: i.updated_at
});

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve a list of invoices. Filter by status, company, project, date range, tags, or search term.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['draft', 'created', 'sent', 'partially_paid', 'paid', 'overdue', 'ignored'])
        .optional()
        .describe('Filter by invoice status'),
      companyId: z.number().optional().describe('Filter by customer company ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      dateFrom: z.string().optional().describe('Filter invoices from this date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter invoices until this date (YYYY-MM-DD)'),
      tags: z.string().optional().describe('Comma-separated list of tags'),
      identifier: z.string().optional().describe('Filter by invoice number'),
      term: z.string().optional().describe('Full-text search term')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.companyId) params.company_id = ctx.input.companyId;
    if (ctx.input.projectId) params.project_id = ctx.input.projectId;
    if (ctx.input.dateFrom) params.date_from = ctx.input.dateFrom;
    if (ctx.input.dateTo) params.date_to = ctx.input.dateTo;
    if (ctx.input.tags) params.tags = ctx.input.tags;
    if (ctx.input.identifier) params.identifier = ctx.input.identifier;
    if (ctx.input.term) params.term = ctx.input.term;

    let data = await client.listInvoices(params);
    let invoices = (data as any[]).map(mapInvoice);

    return {
      output: { invoices },
      message: `Found **${invoices.length}** invoices.`
    };
  })
  .build();

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve detailed information about a specific invoice, including line items, payments, and reminders.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('The ID of the invoice to retrieve')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let i = await client.getInvoice(ctx.input.invoiceId);

    return {
      output: mapInvoice(i),
      message: `Retrieved invoice **${i.identifier || i.title}** (ID: ${i.id}).`
    };
  })
  .build();

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in MOCO. Requires customer, billing address, dates, title, tax rate, currency, and at least one line item.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().describe('Customer company ID'),
      recipientAddress: z.string().describe('Recipient billing address (multiline)'),
      date: z.string().describe('Invoice date (YYYY-MM-DD)'),
      dueDate: z.string().describe('Payment due date (YYYY-MM-DD)'),
      title: z.string().describe('Invoice title'),
      tax: z.number().describe('Tax percentage (e.g., 19.0)'),
      currency: z.string().describe('Currency code (e.g., "EUR")'),
      items: z.array(invoiceItemSchema).describe('Invoice line items'),
      projectId: z.number().optional().describe('Associated project ID'),
      tags: z.array(z.string()).optional().describe('Invoice tags'),
      servicePeriodFrom: z
        .string()
        .optional()
        .describe('Service period start date (YYYY-MM-DD)'),
      servicePeriodTo: z.string().optional().describe('Service period end date (YYYY-MM-DD)')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      customer_id: ctx.input.customerId,
      recipient_address: ctx.input.recipientAddress,
      date: ctx.input.date,
      due_date: ctx.input.dueDate,
      title: ctx.input.title,
      tax: ctx.input.tax,
      currency: ctx.input.currency,
      items: ctx.input.items.map(item => ({
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        net_total: item.netTotal
      }))
    };

    if (ctx.input.projectId) data.project_id = ctx.input.projectId;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.servicePeriodFrom) data.service_period_from = ctx.input.servicePeriodFrom;
    if (ctx.input.servicePeriodTo) data.service_period_to = ctx.input.servicePeriodTo;

    let i = await client.createInvoice(data);

    return {
      output: mapInvoice(i),
      message: `Created invoice **${i.identifier || i.title}** (ID: ${i.id}).`
    };
  })
  .build();

export let updateInvoiceStatus = SlateTool.create(spec, {
  name: 'Update Invoice Status',
  key: 'update_invoice_status',
  description: `Change the status of an existing invoice. Available statuses: created, sent, overdue, ignored.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('The ID of the invoice'),
      status: z.enum(['created', 'sent', 'overdue', 'ignored']).describe('New invoice status')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let i = await client.updateInvoiceStatus(ctx.input.invoiceId, ctx.input.status);

    return {
      output: mapInvoice(i),
      message: `Updated invoice **${ctx.input.invoiceId}** status to **${ctx.input.status}**.`
    };
  })
  .build();

export let deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Delete an invoice. Non-draft invoices require a reason for deletion.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('The ID of the invoice to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteInvoice(ctx.input.invoiceId);

    return {
      output: { success: true },
      message: `Deleted invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
