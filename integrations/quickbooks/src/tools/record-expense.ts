import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let expenseLineSchema = z.object({
  description: z.string().optional().describe('Description of the expense'),
  amount: z.number().describe('Expense amount'),
  accountId: z.string().describe('Expense account ID for categorization'),
  customerId: z.string().optional().describe('Customer ID if this expense is billable'),
  billable: z.boolean().optional().describe('Whether the expense is billable to a customer')
});

export let recordExpense = SlateTool.create(spec, {
  name: 'Record Expense',
  key: 'record_expense',
  description: `Records a purchase or expense transaction in QuickBooks. Supports cash, check, and credit card payment types. Each line item can be categorized against a chart of accounts entry and optionally marked as billable to a customer.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      paymentType: z
        .enum(['Cash', 'Check', 'CreditCard'])
        .describe('How the expense was paid'),
      accountId: z
        .string()
        .describe('Bank account or credit card account ID the expense was paid from'),
      lineItems: z.array(expenseLineSchema).min(1).describe('Expense line items'),
      vendorId: z
        .string()
        .optional()
        .describe('Vendor ID if purchasing from a specific vendor'),
      txnDate: z.string().optional().describe('Transaction date (YYYY-MM-DD)'),
      referenceNumber: z
        .string()
        .optional()
        .describe('Reference number (check number, receipt number)'),
      privateNote: z.string().optional().describe('Internal memo')
    })
  )
  .output(
    z.object({
      purchaseId: z.string().describe('Purchase/expense transaction ID'),
      totalAmount: z.number().describe('Total expense amount'),
      txnDate: z.string().optional().describe('Transaction date'),
      syncToken: z.string().describe('Sync token')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let lines = ctx.input.lineItems.map(item => {
      let line: any = {
        DetailType: 'AccountBasedExpenseLineDetail',
        Amount: item.amount,
        Description: item.description,
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: item.accountId }
        }
      };

      if (item.customerId) {
        line.AccountBasedExpenseLineDetail.CustomerRef = { value: item.customerId };
      }
      if (item.billable !== undefined) {
        line.AccountBasedExpenseLineDetail.BillableStatus = item.billable
          ? 'Billable'
          : 'NotBillable';
      }

      return line;
    });

    let purchaseData: any = {
      PaymentType: ctx.input.paymentType,
      AccountRef: { value: ctx.input.accountId },
      Line: lines
    };

    if (ctx.input.vendorId)
      purchaseData.EntityRef = { value: ctx.input.vendorId, type: 'Vendor' };
    if (ctx.input.txnDate) purchaseData.TxnDate = ctx.input.txnDate;
    if (ctx.input.referenceNumber) purchaseData.DocNumber = ctx.input.referenceNumber;
    if (ctx.input.privateNote) purchaseData.PrivateNote = ctx.input.privateNote;

    let purchase = await client.createPurchase(purchaseData);

    return {
      output: {
        purchaseId: purchase.Id,
        totalAmount: purchase.TotalAmt,
        txnDate: purchase.TxnDate,
        syncToken: purchase.SyncToken
      },
      message: `Recorded ${ctx.input.paymentType} expense of **$${purchase.TotalAmt}** (ID: ${purchase.Id}).`
    };
  })
  .build();
