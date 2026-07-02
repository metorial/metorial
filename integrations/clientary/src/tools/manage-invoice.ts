import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invoiceItemSchema = z.object({
  invoiceItemId: z.number().optional().describe('ID of the invoice item'),
  title: z.string().describe('Line item title'),
  quantity: z.number().describe('Quantity'),
  price: z.number().describe('Unit price'),
  taxable: z.boolean().optional().describe('Whether item is taxable'),
  taxable2: z.boolean().optional().describe('Whether item has second tax'),
  taxable3: z.boolean().optional().describe('Whether item has third tax')
});

let invoiceSchema = z.object({
  invoiceId: z.number().describe('Unique ID of the invoice'),
  clientId: z.number().optional().describe('Associated client ID'),
  number: z.string().optional().describe('Invoice number'),
  date: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
  dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
  status: z
    .number()
    .optional()
    .describe('Status: 0=Draft, 1=Sent, 2=Viewed, 3=Cancelled, 4=Paid, 5=Pending'),
  subtotal: z.number().optional().describe('Subtotal before tax'),
  total: z.number().optional().describe('Total amount'),
  balance: z.number().optional().describe('Remaining balance'),
  tax: z.number().optional().describe('First tax rate percentage'),
  tax2: z.number().optional().describe('Second tax rate percentage'),
  tax3: z.number().optional().describe('Third tax rate percentage'),
  taxAmount: z.number().optional().describe('Total tax amount'),
  notes: z.string().optional().describe('Invoice notes'),
  poNumber: z.string().optional().describe('Purchase order number'),
  items: z.array(invoiceItemSchema).optional().describe('Invoice line items')
});

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in Clientary with line items and optional taxes. You can optionally scope it to a specific client.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clientId: z.number().optional().describe('Client ID to associate the invoice with'),
      date: z.string().describe('Invoice date (YYYY-MM-DD)'),
      dueDate: z.string().describe('Due date (YYYY-MM-DD)'),
      currencyCode: z.string().describe('Currency code (e.g. USD, EUR)'),
      poNumber: z.string().optional().describe('Purchase order number'),
      notes: z.string().optional().describe('Notes to appear on the invoice'),
      tax: z.number().optional().describe('First tax rate percentage'),
      tax2: z.number().optional().describe('Second tax rate percentage'),
      tax3: z.number().optional().describe('Third tax rate percentage'),
      items: z
        .array(
          z.object({
            title: z.string().describe('Line item title'),
            quantity: z.number().describe('Quantity'),
            price: z.number().describe('Unit price'),
            taxable: z.boolean().optional().describe('Subject to first tax'),
            taxable2: z.boolean().optional().describe('Subject to second tax'),
            taxable3: z.boolean().optional().describe('Subject to third tax')
          })
        )
        .optional()
        .describe('Invoice line items')
    })
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {
      date: ctx.input.date,
      due_date: ctx.input.dueDate,
      currency_code: ctx.input.currencyCode
    };
    if (ctx.input.poNumber) data.po_number = ctx.input.poNumber;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.tax !== undefined) data.tax = ctx.input.tax;
    if (ctx.input.tax2 !== undefined) data.tax2 = ctx.input.tax2;
    if (ctx.input.tax3 !== undefined) data.tax3 = ctx.input.tax3;
    if (ctx.input.clientId) data.client_id = ctx.input.clientId;

    if (ctx.input.items) {
      data.invoice_items_attributes = ctx.input.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        taxable: item.taxable,
        taxable2: item.taxable2,
        taxable3: item.taxable3
      }));
    }

    let result = await client.createInvoice(data, ctx.input.clientId);
    let inv = result.invoice || result;

    return {
      output: mapInvoice(inv),
      message: `Created invoice **#${inv.number || inv.id}** for ${inv.total ? `${inv.currency_code || ''} ${inv.total}` : 'pending total'}.`
    };
  })
  .build();

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice. Supports partial updates to any invoice fields and line item management. To add new items, include items without an \`invoiceItemId\`. To update existing items, include their \`invoiceItemId\`. To remove items, set \`destroy\` to true on the item.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice to update'),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      currencyCode: z.string().optional().describe('Currency code'),
      poNumber: z.string().optional().describe('Purchase order number'),
      notes: z.string().optional().describe('Invoice notes'),
      tax: z.number().optional().describe('First tax rate percentage'),
      tax2: z.number().optional().describe('Second tax rate percentage'),
      tax3: z.number().optional().describe('Third tax rate percentage'),
      items: z
        .array(
          z.object({
            invoiceItemId: z
              .number()
              .optional()
              .describe('ID of existing item to update. Omit to create new item.'),
            title: z.string().optional().describe('Line item title'),
            quantity: z.number().optional().describe('Quantity'),
            price: z.number().optional().describe('Unit price'),
            destroy: z
              .boolean()
              .optional()
              .describe('Set true to remove this item (requires invoiceItemId)')
          })
        )
        .optional()
        .describe('Line items to add, update, or remove')
    })
  )
  .output(invoiceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.date !== undefined) data.date = ctx.input.date;
    if (ctx.input.dueDate !== undefined) data.due_date = ctx.input.dueDate;
    if (ctx.input.currencyCode !== undefined) data.currency_code = ctx.input.currencyCode;
    if (ctx.input.poNumber !== undefined) data.po_number = ctx.input.poNumber;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.tax !== undefined) data.tax = ctx.input.tax;
    if (ctx.input.tax2 !== undefined) data.tax2 = ctx.input.tax2;
    if (ctx.input.tax3 !== undefined) data.tax3 = ctx.input.tax3;

    if (ctx.input.items) {
      data.invoice_items_attributes = ctx.input.items.map(item => {
        let mapped: Record<string, any> = {};
        if (item.invoiceItemId) mapped.id = item.invoiceItemId;
        if (item.title !== undefined) mapped.title = item.title;
        if (item.quantity !== undefined) mapped.quantity = item.quantity;
        if (item.price !== undefined) mapped.price = item.price;
        if (item.destroy) mapped._destroy = true;
        return mapped;
      });
    }

    let result = await client.updateInvoice(ctx.input.invoiceId, data);
    let inv = result.invoice || result;

    return {
      output: mapInvoice(inv),
      message: `Updated invoice **#${inv.number || inv.id}**.`
    };
  })
  .build();

export let getInvoices = SlateTool.create(spec, {
  name: 'Get Invoices',
  key: 'get_invoices',
  description: `Retrieve a specific invoice by ID or list invoices with optional filtering by client or update date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z
        .number()
        .optional()
        .describe('ID of a specific invoice to retrieve. If omitted, lists invoices.'),
      clientId: z.number().optional().describe('Filter invoices by client ID'),
      page: z.number().optional().describe('Page number for pagination (30 results per page)'),
      updatedSince: z
        .string()
        .optional()
        .describe('Filter invoices updated since this date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema).describe('List of invoices'),
      totalCount: z.number().optional().describe('Total number of matching invoices'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.invoiceId) {
      let result = await client.getInvoice(ctx.input.invoiceId);
      let inv = result.invoice || result;
      return {
        output: { invoices: [mapInvoice(inv)] },
        message: `Retrieved invoice **#${inv.number || inv.id}**.`
      };
    }

    let result = await client.listInvoices({
      page: ctx.input.page,
      updatedSince: ctx.input.updatedSince,
      clientId: ctx.input.clientId
    });

    let invoices = (result.invoices || []).map(mapInvoice);

    return {
      output: {
        invoices,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${invoices.length} invoice(s)${result.total_count ? ` (${result.total_count} total)` : ''}.`
    };
  })
  .build();

export let deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Permanently delete an invoice from Clientary.`,
  tags: {
    destructive: true,
    readOnly: false
  }
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
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteInvoice(ctx.input.invoiceId);

    return {
      output: { success: true },
      message: `Deleted invoice ID ${ctx.input.invoiceId}.`
    };
  })
  .build();

export let sendInvoice = SlateTool.create(spec, {
  name: 'Send Invoice',
  key: 'send_invoice',
  description: `Send an invoice via email to one or more recipients. Optionally attach a PDF copy and send a copy to yourself.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice to send'),
      recipients: z.string().describe('Comma-separated email addresses of recipients'),
      subject: z.string().optional().describe('Email subject line'),
      message: z.string().optional().describe('Email body message'),
      sendCopy: z.boolean().optional().describe('Send a copy to the authenticated user'),
      attachPdf: z.boolean().optional().describe('Attach a PDF of the invoice')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the invoice was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    await client.sendInvoice(ctx.input.invoiceId, {
      recipients: ctx.input.recipients,
      subject: ctx.input.subject,
      message: ctx.input.message,
      sendCopy: ctx.input.sendCopy,
      attachPdf: ctx.input.attachPdf
    });

    return {
      output: { success: true },
      message: `Sent invoice ID ${ctx.input.invoiceId} to ${ctx.input.recipients}.`
    };
  })
  .build();

let mapInvoice = (inv: any) => ({
  invoiceId: inv.id,
  clientId: inv.client_id,
  number: inv.number,
  date: inv.date,
  dueDate: inv.due_date,
  currencyCode: inv.currency_code,
  status: inv.status,
  subtotal: inv.subtotal,
  total: inv.total,
  balance: inv.balance,
  tax: inv.tax,
  tax2: inv.tax2,
  tax3: inv.tax3,
  taxAmount: inv.tax_amount,
  notes: inv.notes,
  poNumber: inv.po_number,
  items: inv.invoice_items
    ? inv.invoice_items.map((item: any) => ({
        invoiceItemId: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        taxable: item.taxable,
        taxable2: item.taxable2,
        taxable3: item.taxable3
      }))
    : undefined
});
