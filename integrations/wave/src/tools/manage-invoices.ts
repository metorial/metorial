import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

let moneySchema = z
  .object({
    value: z.string().optional().describe('Monetary amount as a string'),
    currency: z
      .object({
        code: z.string().optional(),
        symbol: z.string().optional()
      })
      .optional()
  })
  .optional();

let invoiceLineItemSchema = z.object({
  description: z.string().optional().describe('Line item description'),
  quantity: z.number().optional().describe('Quantity'),
  unitPrice: z.number().optional().describe('Unit price'),
  amount: moneySchema.describe('Line item total amount'),
  product: z
    .object({
      productId: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Associated product'),
  taxes: z
    .array(
      z.object({
        amount: z.object({ value: z.string().optional() }).optional(),
        salesTax: z
          .object({
            salesTaxId: z.string().optional(),
            name: z.string().optional()
          })
          .optional()
      })
    )
    .optional()
    .describe('Applied taxes')
});

let invoiceOutputSchema = z.object({
  invoiceId: z.string().describe('Unique identifier of the invoice'),
  status: z
    .string()
    .describe('Invoice status (DRAFT, SAVED, SENT, VIEWED, PAID, OVERDUE, etc.)'),
  invoiceNumber: z.string().optional().describe('Invoice number'),
  invoiceDate: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
  dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  title: z.string().optional().describe('Invoice title'),
  subhead: z.string().optional().describe('Invoice subheading'),
  poNumber: z.string().optional().describe('Purchase order number'),
  customer: z
    .object({
      customerId: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional()
    })
    .optional()
    .describe('Customer associated with the invoice'),
  currency: z
    .object({
      code: z.string().optional(),
      symbol: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Invoice currency'),
  amountDue: moneySchema.describe('Amount due'),
  amountPaid: moneySchema.describe('Amount paid'),
  taxTotal: moneySchema.describe('Total tax amount'),
  total: moneySchema.describe('Invoice total'),
  exchangeRate: z.string().optional().describe('Exchange rate'),
  memo: z.string().optional().describe('Memo/notes'),
  footer: z.string().optional().describe('Footer text'),
  pdfUrl: z.string().optional().describe('URL to download invoice PDF'),
  viewUrl: z.string().optional().describe('URL to view invoice online'),
  items: z.array(invoiceLineItemSchema).optional().describe('Invoice line items'),
  disableCreditCardPayments: z
    .boolean()
    .optional()
    .describe('Whether credit card payments are disabled'),
  disableBankPayments: z.boolean().optional().describe('Whether bank payments are disabled'),
  lastSentAt: z.string().optional().describe('Last sent timestamp'),
  lastSentVia: z.string().optional().describe('Last sent method'),
  lastViewedAt: z.string().optional().describe('Last viewed timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

let mapInvoice = (inv: any) => ({
  invoiceId: inv.id,
  status: inv.status,
  invoiceNumber: inv.invoiceNumber,
  invoiceDate: inv.invoiceDate,
  dueDate: inv.dueDate,
  title: inv.title,
  subhead: inv.subhead,
  poNumber: inv.poNumber,
  customer: inv.customer
    ? {
        customerId: inv.customer.id,
        name: inv.customer.name,
        email: inv.customer.email
      }
    : undefined,
  currency: inv.currency,
  amountDue: inv.amountDue,
  amountPaid: inv.amountPaid,
  taxTotal: inv.taxTotal,
  total: inv.total,
  exchangeRate: inv.exchangeRate?.toString(),
  memo: inv.memo,
  footer: inv.footer,
  pdfUrl: inv.pdfUrl,
  viewUrl: inv.viewUrl,
  items: inv.items?.map((item: any) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
    product: item.product
      ? { productId: item.product.id, name: item.product.name }
      : undefined,
    taxes: item.taxes?.map((t: any) => ({
      amount: t.amount,
      salesTax: t.salesTax ? { salesTaxId: t.salesTax.id, name: t.salesTax.name } : undefined
    }))
  })),
  disableCreditCardPayments: inv.disableCreditCardPayments,
  disableBankPayments: inv.disableBankPayments,
  lastSentAt: inv.lastSentAt,
  lastSentVia: inv.lastSentVia,
  lastViewedAt: inv.lastViewedAt,
  createdAt: inv.createdAt,
  modifiedAt: inv.modifiedAt
});

let lineItemInputSchema = z.object({
  productId: z.string().optional().describe('ID of an existing product to associate'),
  description: z.string().optional().describe('Line item description'),
  quantity: z.number().optional().describe('Quantity'),
  unitPrice: z.number().optional().describe('Unit price'),
  taxes: z
    .array(
      z.object({
        salesTaxId: z.string().describe('ID of sales tax to apply')
      })
    )
    .optional()
    .describe('Taxes to apply to this line item')
});

// --- List Invoices ---

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `List invoices for a Wave business with pagination. Optionally filter by a specific customer. Returns invoice details including status, amounts, customer, and line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z.string().describe('ID of the business to list invoices for'),
      customerId: z.string().optional().describe('Optional customer ID to filter invoices by'),
      page: z.number().optional().describe('Page number (starts at 1, default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceOutputSchema).describe('List of invoices'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.listInvoices(
      ctx.input.businessId,
      ctx.input.page || 1,
      ctx.input.pageSize || 20,
      ctx.input.customerId
    );

    return {
      output: {
        invoices: result.items.map(mapInvoice),
        currentPage: result.pageInfo.currentPage,
        totalPages: result.pageInfo.totalPages,
        totalCount: result.pageInfo.totalCount
      },
      message: `Found **${result.pageInfo.totalCount}** invoices (page ${result.pageInfo.currentPage} of ${result.pageInfo.totalPages}).`
    };
  })
  .build();

// --- Create Invoice ---

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice for a customer in a Wave business. The invoice is created in DRAFT status by default. Add line items with products, quantities, prices, and taxes. Configure payment options and display settings.`,
  instructions: [
    'The invoice is created as a DRAFT by default. Use the "Send Invoice" or "Approve Invoice" tool to finalize it.',
    'Line items require at least a productId or a description with unitPrice and quantity.'
  ]
})
  .input(
    z.object({
      businessId: z.string().describe('ID of the business to create the invoice for'),
      customerId: z.string().describe('ID of the customer the invoice is for'),
      status: z
        .enum(['DRAFT', 'SAVED'])
        .optional()
        .describe('Invoice status (default: DRAFT)'),
      invoiceNumber: z.string().optional().describe('Custom invoice number'),
      invoiceDate: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      poNumber: z.string().optional().describe('Purchase order number'),
      currency: z.string().optional().describe('ISO 4217 currency code'),
      exchangeRate: z.number().optional().describe('Exchange rate'),
      title: z.string().optional().describe('Invoice title'),
      subhead: z.string().optional().describe('Invoice subheading'),
      footer: z.string().optional().describe('Footer text'),
      memo: z.string().optional().describe('Memo/notes'),
      items: z.array(lineItemInputSchema).optional().describe('Invoice line items'),
      disableCreditCardPayments: z
        .boolean()
        .optional()
        .describe('Disable credit card payments for this invoice'),
      disableBankPayments: z
        .boolean()
        .optional()
        .describe('Disable bank payments for this invoice')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.createInvoice(ctx.input);

    if (!result.didSucceed) {
      throw new Error(
        `Failed to create invoice: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: mapInvoice(result.data),
      message: `Created invoice **#${result.data.invoiceNumber || result.data.id}** (status: ${result.data.status}).`
    };
  })
  .build();

// --- Update Invoice ---

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice's details. Only the fields you provide will be updated; omitted fields remain unchanged. You can modify the customer, dates, line items, payment options, and display settings.`,
  instructions: [
    'When updating items, the entire items array is replaced. Include all line items you want on the invoice.'
  ]
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to update'),
      customerId: z.string().optional().describe('Updated customer ID'),
      status: z.enum(['DRAFT', 'SAVED']).optional().describe('Updated status'),
      invoiceNumber: z.string().optional().describe('Updated invoice number'),
      invoiceDate: z.string().optional().describe('Updated invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Updated due date (YYYY-MM-DD)'),
      poNumber: z.string().optional().describe('Updated purchase order number'),
      currency: z.string().optional().describe('Updated ISO 4217 currency code'),
      exchangeRate: z.number().optional().describe('Updated exchange rate'),
      title: z.string().optional().describe('Updated invoice title'),
      subhead: z.string().optional().describe('Updated subheading'),
      footer: z.string().optional().describe('Updated footer text'),
      memo: z.string().optional().describe('Updated memo/notes'),
      items: z
        .array(lineItemInputSchema)
        .optional()
        .describe('Updated line items (replaces all existing items)'),
      disableCreditCardPayments: z
        .boolean()
        .optional()
        .describe('Disable credit card payments'),
      disableBankPayments: z.boolean().optional().describe('Disable bank payments')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.patchInvoice(ctx.input);

    if (!result.didSucceed) {
      throw new Error(
        `Failed to update invoice: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: mapInvoice(result.data),
      message: `Updated invoice **#${result.data.invoiceNumber || result.data.id}**.`
    };
  })
  .build();

// --- Delete Invoice ---

export let deleteInvoice = SlateTool.create(spec, {
  name: 'Delete Invoice',
  key: 'delete_invoice',
  description: `Permanently delete an invoice from a Wave business. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.deleteInvoice(ctx.input.invoiceId);

    if (!result.didSucceed) {
      throw new Error(
        `Failed to delete invoice: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: { success: true },
      message: `Deleted invoice \`${ctx.input.invoiceId}\`.`
    };
  })
  .build();

// --- Send Invoice ---

export let sendInvoice = SlateTool.create(spec, {
  name: 'Send Invoice',
  key: 'send_invoice',
  description: `Send an invoice to a customer via email. Optionally customize the recipients, subject, message, and whether to attach a PDF. The invoice must be approved (not in DRAFT status) before sending.`,
  instructions: [
    "If no recipients are specified, the invoice will be sent to the customer's email address on file.",
    'If the invoice is still in DRAFT, approve it first using the "Approve Invoice" tool.'
  ]
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to send'),
      to: z.array(z.string()).optional().describe('Email addresses to send the invoice to'),
      subject: z.string().optional().describe('Custom email subject line'),
      message: z.string().optional().describe('Custom email message body'),
      attachPdf: z.boolean().optional().describe('Whether to attach the invoice as a PDF')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the invoice was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.sendInvoice(
      ctx.input.invoiceId,
      ctx.input.to,
      ctx.input.subject,
      ctx.input.message,
      ctx.input.attachPdf
    );

    if (!result.didSucceed) {
      throw new Error(
        `Failed to send invoice: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: { success: true },
      message: `Invoice \`${ctx.input.invoiceId}\` has been sent.`
    };
  })
  .build();

// --- Approve Invoice ---

export let approveInvoice = SlateTool.create(spec, {
  name: 'Approve Invoice',
  key: 'approve_invoice',
  description: `Approve a draft invoice, moving it from DRAFT to an approvable state. This is required before sending an invoice.`
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to approve')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.approveInvoice(ctx.input.invoiceId);

    if (!result.didSucceed) {
      throw new Error(
        `Failed to approve invoice: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: mapInvoice(result.data),
      message: `Approved invoice **#${result.data.invoiceNumber || result.data.id}** (status: ${result.data.status}).`
    };
  })
  .build();

// --- Clone Invoice ---

export let cloneInvoice = SlateTool.create(spec, {
  name: 'Clone Invoice',
  key: 'clone_invoice',
  description: `Create a copy of an existing invoice. The cloned invoice will be created as a new DRAFT with the same details as the original.`
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to clone')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.cloneInvoice(ctx.input.invoiceId);

    if (!result.didSucceed) {
      throw new Error(
        `Failed to clone invoice: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: mapInvoice(result.data),
      message: `Cloned invoice to new invoice **#${result.data.invoiceNumber || result.data.id}**.`
    };
  })
  .build();

// --- Mark Invoice Sent ---

export let markInvoiceSent = SlateTool.create(spec, {
  name: 'Mark Invoice Sent',
  key: 'mark_invoice_sent',
  description: `Mark an invoice as sent without actually emailing it. Use this when the invoice was delivered through a channel outside of Wave (e.g., printed and mailed, sent via another system).`
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to mark as sent'),
      sentAt: z
        .string()
        .optional()
        .describe('Timestamp when the invoice was sent (ISO 8601 format)')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.markInvoiceSent(ctx.input.invoiceId, ctx.input.sentAt);

    if (!result.didSucceed) {
      throw new Error(
        `Failed to mark invoice as sent: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: mapInvoice(result.data),
      message: `Marked invoice **#${result.data.invoiceNumber || result.data.id}** as sent.`
    };
  })
  .build();
