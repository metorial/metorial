import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraAccountingClient } from '../lib/client';
import { spec } from '../spec';

let invoiceLineSchema = z.object({
  partNumber: z.string().optional().describe('Part or item number'),
  description: z.string().optional().describe('Line item description'),
  quantity: z.number().optional().describe('Quantity of items'),
  unitPriceExTax: z.number().optional().describe('Unit price excluding tax'),
  amountExTax: z.number().optional().describe('Line total excluding tax'),
  tax: z.number().optional().describe('Tax amount for this line')
});

let invoiceSchema = z.object({
  invoiceId: z.string().optional().describe('Unique invoice identifier'),
  invoiceDate: z.string().optional().describe('Date the invoice was created'),
  invoiceDueDate: z.string().optional().describe('Invoice payment due date'),
  invoiceNumber: z.string().optional().describe('Invoice number'),
  amountExTax: z.number().optional().describe('Total amount excluding tax'),
  adjustedAmountExTax: z.number().optional().describe('Adjusted total excluding tax'),
  tax: z.number().optional().describe('Total tax amount'),
  billingCustomerId: z.string().optional().describe('Customer ID for billing'),
  companyName: z.string().optional().describe('Customer company name'),
  contactFirstName: z.string().optional().describe('Customer first name'),
  contactLastName: z.string().optional().describe('Customer last name'),
  emailAddress: z.string().optional().describe('Customer email address'),
  phone: z.string().optional().describe('Customer phone number'),
  mobile: z.string().optional().describe('Customer mobile number'),
  description: z.string().optional().describe('Invoice description'),
  jobNumber: z.string().optional().describe('Associated job number'),
  leadSource: z.string().optional().describe('Lead source'),
  purchaseOrderNumber: z.string().optional().describe('Purchase order reference'),
  invoiceLines: z.array(invoiceLineSchema).optional().describe('Invoice line items')
});

export let getInvoices = SlateTool.create(spec, {
  name: 'Get Invoices',
  key: 'get_invoices',
  description: `Retrieves invoices from the Ascora Accounting API that have not yet been marked as sent to an accounting system. Optionally filter by date and company.

Returns full invoice details including header information, customer data, and line items. Use **Mark Invoices** after processing to prevent re-retrieval.`,
  instructions: [
    'Requires Basic Authentication (Accounting API credentials).',
    'After successfully processing invoices, use the Mark Invoices tool to mark them as sent.',
    'Unmarked invoices will continue to be returned in subsequent requests.'
  ],
  constraints: ['Only returns invoices not yet marked as sent to accounts.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoicesPriorToDate: z
        .string()
        .optional()
        .describe(
          'Retrieve invoices created before this date (ISO 8601 format, e.g. "2024-12-31")'
        ),
      companyId: z.string().optional().describe('Filter invoices by a specific company ID')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema).describe('List of invoice records'),
      count: z.number().describe('Number of invoices returned')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.username || !ctx.auth.password) {
      throw new Error(
        'Basic Authentication credentials (username and password) are required for the Accounting API. Please use the Basic Authentication method.'
      );
    }

    let client = new AscoraAccountingClient({
      username: ctx.auth.username,
      password: ctx.auth.password
    });

    let rawInvoices = await client.getInvoices(
      ctx.input.invoicesPriorToDate,
      ctx.input.companyId
    );

    let invoices = rawInvoices.map((inv: any) => ({
      invoiceId: inv.Id ?? inv.id,
      invoiceDate: inv.InvoiceDate ?? inv.invoiceDate,
      invoiceDueDate: inv.InvoiceDueDate ?? inv.invoiceDueDate,
      invoiceNumber: inv.InvoiceNumber ?? inv.invoiceNumber,
      amountExTax: inv.AmountExTax ?? inv.amountExTax,
      adjustedAmountExTax: inv.AdjustedAmountExTax ?? inv.adjustedAmountExTax,
      tax: inv.Tax ?? inv.tax,
      billingCustomerId: inv.BillingCustomerId ?? inv.billingCustomerId,
      companyName: inv.CompanyName ?? inv.companyName,
      contactFirstName: inv.ContactFirstName ?? inv.contactFirstName,
      contactLastName: inv.ContactLastName ?? inv.contactLastName,
      emailAddress: inv.EmailAddress ?? inv.emailAddress,
      phone: inv.Phone ?? inv.phone,
      mobile: inv.Mobile ?? inv.mobile,
      description: inv.Description ?? inv.description,
      jobNumber: inv.JobNumber ?? inv.jobNumber,
      leadSource: inv.LeadSource ?? inv.leadSource,
      purchaseOrderNumber: inv.PurchaseOrderNumber ?? inv.purchaseOrderNumber,
      invoiceLines: (inv.InvoiceLines ?? inv.invoiceLines ?? []).map((line: any) => ({
        partNumber: line.PartNumber ?? line.partNumber,
        description: line.Description ?? line.description,
        quantity: line.Quantity ?? line.quantity,
        unitPriceExTax: line.UnitPriceExTax ?? line.unitPriceExTax,
        amountExTax: line.AmountExTax ?? line.amountExTax,
        tax: line.Tax ?? line.tax
      }))
    }));

    return {
      output: {
        invoices,
        count: invoices.length
      },
      message: `Retrieved **${invoices.length}** unsent invoice(s)${ctx.input.invoicesPriorToDate ? ` prior to ${ctx.input.invoicesPriorToDate}` : ''}.`
    };
  })
  .build();
