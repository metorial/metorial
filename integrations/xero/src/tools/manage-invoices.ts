import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z
  .object({
    description: z.string().optional().describe('Description of the line item'),
    quantity: z.number().optional().describe('Quantity of the item'),
    unitAmount: z.number().optional().describe('Unit price of the item'),
    itemCode: z.string().optional().describe('Item code from Xero inventory'),
    accountCode: z.string().optional().describe('Account code for the line item'),
    taxType: z.string().optional().describe('Tax type code (e.g. OUTPUT, INPUT, NONE)'),
    discountRate: z.number().optional().describe('Discount percentage (0-100)'),
    tracking: z
      .array(
        z.object({
          name: z.string().describe('Tracking category name'),
          option: z.string().describe('Tracking option name')
        })
      )
      .optional()
      .describe('Tracking categories for this line item')
  })
  .describe('Invoice line item');

let invoiceOutputSchema = z.object({
  invoiceId: z.string().optional().describe('Unique Xero invoice ID'),
  invoiceNumber: z.string().optional().describe('Human-readable invoice number'),
  reference: z.string().optional().describe('Invoice reference'),
  type: z.string().optional().describe('ACCREC (sales) or ACCPAY (bills)'),
  status: z
    .string()
    .optional()
    .describe('Invoice status: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED, DELETED'),
  contactName: z.string().optional().describe('Contact name on the invoice'),
  contactId: z.string().optional().describe('Contact ID on the invoice'),
  date: z.string().optional().describe('Invoice date'),
  dueDate: z.string().optional().describe('Invoice due date'),
  subTotal: z.number().optional().describe('Subtotal before tax'),
  totalTax: z.number().optional().describe('Total tax amount'),
  total: z.number().optional().describe('Total including tax'),
  amountDue: z.number().optional().describe('Amount still owed'),
  amountPaid: z.number().optional().describe('Amount already paid'),
  currencyCode: z.string().optional().describe('Currency code'),
  updatedDate: z.string().optional().describe('Last updated timestamp'),
  lineAmountTypes: z
    .string()
    .optional()
    .describe('How line amounts are calculated: Exclusive, Inclusive, or NoTax'),
  sentToContact: z.boolean().optional().describe('Whether the invoice has been emailed'),
  url: z.string().optional().describe('URL link to the invoice')
});

let mapInvoice = (inv: any) => ({
  invoiceId: inv.InvoiceID,
  invoiceNumber: inv.InvoiceNumber,
  reference: inv.Reference,
  type: inv.Type,
  status: inv.Status,
  contactName: inv.Contact?.Name,
  contactId: inv.Contact?.ContactID,
  date: inv.DateString || inv.Date,
  dueDate: inv.DueDateString || inv.DueDate,
  subTotal: inv.SubTotal,
  totalTax: inv.TotalTax,
  total: inv.Total,
  amountDue: inv.AmountDue,
  amountPaid: inv.AmountPaid,
  currencyCode: inv.CurrencyCode,
  updatedDate: inv.UpdatedDateUTC,
  lineAmountTypes: inv.LineAmountTypes,
  sentToContact: inv.SentToContact,
  url: inv.Url
});

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Creates a new sales invoice (ACCREC) or purchase bill (ACCPAY) in Xero. Specify the contact, line items, dates, and other details. The invoice is created in DRAFT status by default unless a different status is provided.`,
  instructions: [
    'Use type "ACCREC" for sales invoices and "ACCPAY" for purchase bills',
    'At least one line item is required with either a description or item code',
    'Use status "AUTHORISED" to approve the invoice immediately, or leave as "DRAFT" to review first'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      type: z
        .enum(['ACCREC', 'ACCPAY'])
        .describe('ACCREC for sales invoice, ACCPAY for purchase bill'),
      contactId: z.string().describe('Contact ID for the invoice recipient/supplier'),
      lineItems: z.array(lineItemSchema).min(1).describe('Line items for the invoice'),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD). Defaults to today'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      reference: z.string().optional().describe('Reference or PO number'),
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'AUTHORISED'])
        .optional()
        .describe('Initial status. Defaults to DRAFT'),
      lineAmountTypes: z
        .enum(['Exclusive', 'Inclusive', 'NoTax'])
        .optional()
        .describe('How amounts are calculated. Defaults to Exclusive'),
      currencyCode: z.string().optional().describe('Currency code (e.g. USD, GBP, AUD)'),
      brandingThemeId: z.string().optional().describe('Branding theme ID for the invoice'),
      invoiceNumber: z
        .string()
        .optional()
        .describe('Custom invoice number. Auto-generated if not provided')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let lineItems = ctx.input.lineItems.map(li => ({
      Description: li.description,
      Quantity: li.quantity,
      UnitAmount: li.unitAmount,
      ItemCode: li.itemCode,
      AccountCode: li.accountCode,
      TaxType: li.taxType,
      DiscountRate: li.discountRate,
      Tracking: li.tracking?.map(t => ({ Name: t.name, Option: t.option }))
    }));

    let invoice = await client.createInvoice({
      Type: ctx.input.type,
      Contact: { ContactID: ctx.input.contactId },
      LineItems: lineItems,
      Date: ctx.input.date,
      DueDate: ctx.input.dueDate,
      Reference: ctx.input.reference,
      Status: ctx.input.status || 'DRAFT',
      LineAmountTypes: ctx.input.lineAmountTypes,
      CurrencyCode: ctx.input.currencyCode,
      BrandingThemeID: ctx.input.brandingThemeId,
      InvoiceNumber: ctx.input.invoiceNumber
    });

    let output = mapInvoice(invoice);

    return {
      output,
      message: `Created ${ctx.input.type === 'ACCREC' ? 'sales invoice' : 'purchase bill'} **${output.invoiceNumber || output.invoiceId}** for **${output.total?.toFixed(2)} ${output.currencyCode || ''}** with status **${output.status}**.`
    };
  })
  .build();

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieves a single invoice or bill by its ID, returning full details including line items, payment status, and contact information.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The Xero invoice ID or invoice number')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let invoice = await client.getInvoice(ctx.input.invoiceId);
    let output = mapInvoice(invoice);

    return {
      output,
      message: `Retrieved invoice **${output.invoiceNumber}** — Status: **${output.status}**, Total: **${output.total?.toFixed(2)} ${output.currencyCode || ''}**, Amount Due: **${output.amountDue?.toFixed(2)}**.`
    };
  })
  .build();

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Lists invoices and bills from Xero with filtering options. Supports filtering by status, contact, date range, and modification time. Results are paginated with up to 100 records per page.`,
  instructions: [
    'Use the "where" parameter for advanced Xero API filters, e.g. `Status=="AUTHORISED"` or `Type=="ACCREC"`',
    'Page numbers start at 1'
  ],
  constraints: ['Returns up to 100 invoices per page'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starting from 1)'),
      statuses: z
        .array(z.string())
        .optional()
        .describe('Filter by statuses: DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED, DELETED'),
      contactIds: z.array(z.string()).optional().describe('Filter by specific contact IDs'),
      invoiceNumbers: z
        .array(z.string())
        .optional()
        .describe('Filter by specific invoice numbers'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return invoices modified after this date (ISO 8601)'),
      where: z.string().optional().describe('Xero API where filter expression'),
      order: z
        .string()
        .optional()
        .describe('Order results, e.g. "Date DESC" or "InvoiceNumber ASC"'),
      summaryOnly: z
        .boolean()
        .optional()
        .describe('Return summary data only (faster, no line items)')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceOutputSchema).describe('List of invoices'),
      count: z.number().describe('Number of invoices returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getInvoices({
      page: ctx.input.page,
      statuses: ctx.input.statuses,
      contactIds: ctx.input.contactIds,
      invoiceNumbers: ctx.input.invoiceNumbers,
      modifiedAfter: ctx.input.modifiedAfter,
      where: ctx.input.where,
      order: ctx.input.order,
      summaryOnly: ctx.input.summaryOnly
    });

    let invoices = (result.Invoices || []).map(mapInvoice);

    return {
      output: { invoices, count: invoices.length },
      message: `Found **${invoices.length}** invoice(s)${ctx.input.page ? ` on page ${ctx.input.page}` : ''}.`
    };
  })
  .build();

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Updates an existing invoice or bill in Xero. Can modify status (e.g. approve, void), update line items, dates, reference, and other fields. Can also email an invoice to the contact.`,
  instructions: [
    'To approve an invoice, set status to "AUTHORISED"',
    'To void an invoice, set status to "VOIDED" — the invoice must be authorised or paid first',
    'To email the invoice, set sendEmail to true',
    'Line items replace existing line items when provided'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The Xero invoice ID to update'),
      status: z
        .enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'VOIDED'])
        .optional()
        .describe('New status for the invoice'),
      contactId: z.string().optional().describe('New contact ID'),
      lineItems: z.array(lineItemSchema).optional().describe('Replacement line items'),
      date: z.string().optional().describe('New invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('New due date (YYYY-MM-DD)'),
      reference: z.string().optional().describe('New reference or PO number'),
      lineAmountTypes: z
        .enum(['Exclusive', 'Inclusive', 'NoTax'])
        .optional()
        .describe('How amounts are calculated'),
      currencyCode: z.string().optional().describe('Currency code'),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Email the invoice to the contact after updating')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    if (ctx.input.status === 'VOIDED') {
      let invoice = await client.voidInvoice(ctx.input.invoiceId);
      let output = mapInvoice(invoice);
      return {
        output,
        message: `Invoice **${output.invoiceNumber || output.invoiceId}** has been **voided**.`
      };
    }

    let updateData: Record<string, any> = {};
    if (ctx.input.status) updateData.Status = ctx.input.status;
    if (ctx.input.contactId) updateData.Contact = { ContactID: ctx.input.contactId };
    if (ctx.input.date) updateData.Date = ctx.input.date;
    if (ctx.input.dueDate) updateData.DueDate = ctx.input.dueDate;
    if (ctx.input.reference) updateData.Reference = ctx.input.reference;
    if (ctx.input.lineAmountTypes) updateData.LineAmountTypes = ctx.input.lineAmountTypes;
    if (ctx.input.currencyCode) updateData.CurrencyCode = ctx.input.currencyCode;

    if (ctx.input.lineItems) {
      updateData.LineItems = ctx.input.lineItems.map(li => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        ItemCode: li.itemCode,
        AccountCode: li.accountCode,
        TaxType: li.taxType,
        DiscountRate: li.discountRate,
        Tracking: li.tracking?.map(t => ({ Name: t.name, Option: t.option }))
      }));
    }

    let invoice = await client.updateInvoice(ctx.input.invoiceId, updateData);
    let output = mapInvoice(invoice);

    if (ctx.input.sendEmail) {
      await client.emailInvoice(ctx.input.invoiceId);
    }

    let message = `Updated invoice **${output.invoiceNumber || output.invoiceId}** — Status: **${output.status}**`;
    if (ctx.input.sendEmail) {
      message += `. Email sent to **${output.contactName}**.`;
    }

    return { output, message };
  })
  .build();
