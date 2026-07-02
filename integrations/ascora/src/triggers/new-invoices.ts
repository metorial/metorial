import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
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

export let newInvoices = SlateTrigger.create(spec, {
  name: 'New Invoices',
  key: 'new_invoices',
  description:
    'Triggers when new invoices are available in Ascora that have not yet been marked as sent to an accounting system. Uses the Accounting API pull-based model.'
})
  .input(
    z.object({
      invoiceId: z.string().describe('Unique invoice identifier'),
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
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Unique invoice identifier'),
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
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      if (!ctx.auth.username || !ctx.auth.password) {
        return { inputs: [] };
      }

      let client = new AscoraAccountingClient({
        username: ctx.auth.username,
        password: ctx.auth.password
      });

      let rawInvoices = await client.getInvoices();

      let inputs = rawInvoices.map((inv: any) => {
        let invoiceId = String(inv.Id ?? inv.id ?? '');
        return {
          invoiceId,
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
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTimestamp: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'invoice.created',
        id: ctx.input.invoiceId,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceDate: ctx.input.invoiceDate,
          invoiceDueDate: ctx.input.invoiceDueDate,
          invoiceNumber: ctx.input.invoiceNumber,
          amountExTax: ctx.input.amountExTax,
          adjustedAmountExTax: ctx.input.adjustedAmountExTax,
          tax: ctx.input.tax,
          billingCustomerId: ctx.input.billingCustomerId,
          companyName: ctx.input.companyName,
          contactFirstName: ctx.input.contactFirstName,
          contactLastName: ctx.input.contactLastName,
          emailAddress: ctx.input.emailAddress,
          phone: ctx.input.phone,
          mobile: ctx.input.mobile,
          description: ctx.input.description,
          jobNumber: ctx.input.jobNumber,
          leadSource: ctx.input.leadSource,
          purchaseOrderNumber: ctx.input.purchaseOrderNumber,
          invoiceLines: ctx.input.invoiceLines
        }
      };
    }
  })
  .build();
