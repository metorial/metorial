import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  lineItemId: z.number().optional().describe('Line item ID'),
  name: z.string().optional().describe('Item name'),
  description: z.string().optional().describe('Item description'),
  quantity: z.number().optional().describe('Quantity'),
  price: z.number().optional().describe('Unit price'),
  taxable: z.boolean().optional().describe('Whether the item is taxable'),
  productId: z.number().optional().describe('Associated product ID')
});

let invoiceSchema = z.object({
  invoiceId: z.number().describe('Invoice ID'),
  number: z.string().optional().describe('Invoice number'),
  customerId: z.number().optional().describe('Customer ID'),
  customerName: z.string().optional().describe('Customer name'),
  ticketId: z.number().optional().describe('Associated ticket ID'),
  date: z.string().optional().describe('Invoice date'),
  dueDate: z.string().optional().describe('Due date'),
  subtotal: z.number().optional().describe('Subtotal amount'),
  total: z.number().optional().describe('Total amount'),
  tax: z.number().optional().describe('Tax amount'),
  balance: z.number().optional().describe('Remaining balance'),
  status: z.string().optional().describe('Invoice status'),
  notes: z.string().optional().describe('Invoice notes'),
  lineItems: z.array(lineItemSchema).optional().describe('Line items on the invoice'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapInvoice = (inv: any) => ({
  invoiceId: inv.id,
  number: inv.number?.toString(),
  customerId: inv.customer_id,
  customerName: inv.customer_business_then_name || inv.customer?.fullname,
  ticketId: inv.ticket_id,
  date: inv.date,
  dueDate: inv.due_date,
  subtotal: inv.subtotal ? Number(inv.subtotal) : undefined,
  total: inv.total ? Number(inv.total) : undefined,
  tax: inv.tax ? Number(inv.tax) : undefined,
  balance: inv.balance ? Number(inv.balance) : undefined,
  status: inv.status,
  notes: inv.notes,
  lineItems: (inv.line_items || []).map((li: any) => ({
    lineItemId: li.id,
    name: li.name,
    description: li.description,
    quantity: li.quantity,
    price: li.price ? Number(li.price) : undefined,
    taxable: li.taxable,
    productId: li.product_id
  })),
  createdAt: inv.created_at,
  updatedAt: inv.updated_at
});

export let searchInvoices = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description: `Search and list invoices. Filter by customer, status, or date range. Returns paginated results with line item details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Filter by customer ID'),
      status: z.string().optional().describe('Filter by status'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter invoices created before this date (YYYY-MM-DD)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter invoices created after this date (YYYY-MM-DD)'),
      sort: z.string().optional().describe('Sort order'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listInvoices(ctx.input);
    let invoices = (result.invoices || []).map(mapInvoice);

    return {
      output: {
        invoices,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${invoices.length}** invoice(s).`
    };
  })
  .build();

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve detailed information about a specific invoice including line items, totals, and payment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('The invoice ID to retrieve')
    })
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getInvoice(ctx.input.invoiceId);
    let inv = result.invoice || result;

    return {
      output: mapInvoice(inv),
      message: `Retrieved invoice **#${inv.number || inv.id}** — Total: $${inv.total || 0}, Balance: $${inv.balance || 0}.`
    };
  })
  .build();

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice for a customer, optionally linked to a ticket. Include line items with name, quantity, and price.`
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID for the invoice'),
      ticketId: z.number().optional().describe('Ticket ID to link the invoice to'),
      number: z.string().optional().describe('Custom invoice number'),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Notes to include on the invoice'),
      lineItems: z
        .array(
          z.object({
            name: z.string().optional().describe('Item name'),
            description: z.string().optional().describe('Item description'),
            quantity: z.number().optional().describe('Quantity'),
            price: z.number().optional().describe('Unit price'),
            taxable: z.boolean().optional().describe('Whether item is taxable'),
            productId: z.number().optional().describe('Product ID from inventory')
          })
        )
        .optional()
        .describe('Line items for the invoice')
    })
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createInvoice(ctx.input);
    let inv = result.invoice || result;

    return {
      output: mapInvoice(inv),
      message: `Created invoice **#${inv.number || inv.id}** for customer ${inv.customer_id}.`
    };
  })
  .build();

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice's notes, dates, or status. Only provided fields are modified.`
})
  .input(
    z.object({
      invoiceId: z.number().describe('The invoice ID to update'),
      notes: z.string().optional().describe('Updated notes'),
      date: z.string().optional().describe('Updated invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Updated due date (YYYY-MM-DD)'),
      status: z.string().optional().describe('Updated status')
    })
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { invoiceId, ...updateData } = ctx.input;
    let result = await client.updateInvoice(invoiceId, updateData);
    let inv = result.invoice || result;

    return {
      output: mapInvoice(inv),
      message: `Updated invoice **#${inv.number || inv.id}**.`
    };
  })
  .build();

export let deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Permanently delete an invoice. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('The invoice ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteInvoice(ctx.input.invoiceId);

    return {
      output: { success: true },
      message: `Deleted invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
