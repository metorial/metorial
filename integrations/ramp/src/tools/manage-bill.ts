import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  amount: z.number().describe('Line item amount in cents'),
  currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
  description: z.string().optional().describe('Line item description'),
  accountingFieldSelections: z
    .array(
      z.object({
        fieldId: z.string().describe('Accounting field ID'),
        fieldOptionId: z.string().describe('Selected option ID')
      })
    )
    .optional()
    .describe('Accounting field selections for the line item')
});

export let manageBill = SlateTool.create(spec, {
  name: 'Manage Bill',
  key: 'manage_bill',
  description: `Create, update, retrieve, or archive a Ramp bill (accounts payable).
- **get**: Retrieve a specific bill by ID.
- **create**: Create a new bill with vendor, amount, due date, and optional line items. Bills created via API are automatically approved.
- **update**: Modify an approved bill's fields.
- **archive**: Archive/delete a bill.`,
  instructions: [
    'Amounts are in cents (e.g. 100000 = $1,000.00)',
    'Bills created via API are automatically approved and skip the draft phase'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'archive']).describe('Action to perform'),
      billId: z.string().optional().describe('Bill ID (required for get, update, archive)'),
      vendorId: z.string().optional().describe('Vendor ID (required for create)'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      invoiceCurrency: z.string().optional().describe('Invoice currency code (e.g. USD)'),
      amount: z.number().optional().describe('Total bill amount in cents'),
      dueDate: z.string().optional().describe('Due date (ISO 8601 format)'),
      issueDate: z.string().optional().describe('Issue date (ISO 8601 format)'),
      memo: z.string().optional().describe('Memo or notes'),
      lineItems: z.array(lineItemSchema).optional().describe('Bill line items'),
      paymentMethod: z.string().optional().describe('Payment method')
    })
  )
  .output(
    z.object({
      bill: z.any().describe('Bill object from the API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.billId) throw new Error('billId is required for get action');
      let bill = await client.getBill(ctx.input.billId);
      return {
        output: { bill },
        message: `Retrieved bill **${ctx.input.billId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.vendorId) throw new Error('vendorId is required for create action');

      let body: Record<string, any> = {
        vendor_id: ctx.input.vendorId
      };
      if (ctx.input.invoiceNumber) body.invoice_number = ctx.input.invoiceNumber;
      if (ctx.input.invoiceCurrency) body.invoice_currency = ctx.input.invoiceCurrency;
      if (ctx.input.amount !== undefined) body.amount = ctx.input.amount;
      if (ctx.input.dueDate) body.due_date = ctx.input.dueDate;
      if (ctx.input.issueDate) body.issue_date = ctx.input.issueDate;
      if (ctx.input.memo) body.memo = ctx.input.memo;
      if (ctx.input.paymentMethod) body.payment_method = ctx.input.paymentMethod;
      if (ctx.input.lineItems) {
        body.line_items = ctx.input.lineItems.map(item => {
          let li: Record<string, any> = { amount: item.amount };
          if (item.currencyCode) li.currency_code = item.currencyCode;
          if (item.description) li.description = item.description;
          if (item.accountingFieldSelections) {
            li.accounting_field_selections = item.accountingFieldSelections.map(s => ({
              field_id: s.fieldId,
              field_option_id: s.fieldOptionId
            }));
          }
          return li;
        });
      }

      let bill = await client.createBill(body);
      return {
        output: { bill },
        message: `Created bill for vendor **${ctx.input.vendorId}**${ctx.input.invoiceNumber ? ` (invoice #${ctx.input.invoiceNumber})` : ''}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.billId) throw new Error('billId is required for update action');

      let body: Record<string, any> = {};
      if (ctx.input.invoiceNumber) body.invoice_number = ctx.input.invoiceNumber;
      if (ctx.input.amount !== undefined) body.amount = ctx.input.amount;
      if (ctx.input.dueDate) body.due_date = ctx.input.dueDate;
      if (ctx.input.memo) body.memo = ctx.input.memo;

      let bill = await client.updateBill(ctx.input.billId, body);
      return {
        output: { bill },
        message: `Updated bill **${ctx.input.billId}**.`
      };
    }

    if (action === 'archive') {
      if (!ctx.input.billId) throw new Error('billId is required for archive action');
      let bill = await client.archiveBill(ctx.input.billId);
      return {
        output: { bill },
        message: `Archived bill **${ctx.input.billId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
