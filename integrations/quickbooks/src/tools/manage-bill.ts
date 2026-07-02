import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let billLineSchema = z.object({
  description: z.string().optional().describe('Description of the line item'),
  amount: z.number().describe('Amount for this line'),
  accountId: z.string().describe('Expense account ID to categorize this line'),
  customerId: z.string().optional().describe('Customer to bill this expense to'),
  billable: z.boolean().optional().describe('Whether this line is billable to a customer')
});

export let createBill = SlateTool.create(spec, {
  name: 'Create Bill',
  key: 'create_bill',
  description: `Creates a new bill (accounts payable) from a vendor. Bills represent money owed to vendors for goods or services received. Supports multiple line items with expense account categorization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      vendorId: z.string().describe('QuickBooks Vendor ID'),
      lineItems: z.array(billLineSchema).min(1).describe('Line items for the bill'),
      txnDate: z.string().optional().describe('Bill date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Payment due date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional().describe('Vendor reference or invoice number'),
      privateNote: z.string().optional().describe('Internal memo')
    })
  )
  .output(
    z.object({
      billId: z.string().describe('Bill ID'),
      vendorId: z.string().optional().describe('Vendor ID'),
      totalAmount: z.number().describe('Total bill amount'),
      balance: z.number().describe('Outstanding balance'),
      dueDate: z.string().optional().describe('Due date'),
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

    let billData: any = {
      VendorRef: { value: ctx.input.vendorId },
      Line: lines
    };

    if (ctx.input.txnDate) billData.TxnDate = ctx.input.txnDate;
    if (ctx.input.dueDate) billData.DueDate = ctx.input.dueDate;
    if (ctx.input.referenceNumber) billData.DocNumber = ctx.input.referenceNumber;
    if (ctx.input.privateNote) billData.PrivateNote = ctx.input.privateNote;

    let bill = await client.createBill(billData);

    return {
      output: {
        billId: bill.Id,
        vendorId: bill.VendorRef?.value,
        totalAmount: bill.TotalAmt,
        balance: bill.Balance,
        dueDate: bill.DueDate,
        syncToken: bill.SyncToken
      },
      message: `Created bill for **$${bill.TotalAmt}** from vendor (ID: ${bill.VendorRef?.value}), due ${bill.DueDate || 'N/A'}.`
    };
  })
  .build();

export let payBill = SlateTool.create(spec, {
  name: 'Pay Bill',
  key: 'pay_bill',
  description: `Records a bill payment to a vendor. Can pay one or more bills in a single payment using either a bank account (check) or credit card.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      vendorId: z.string().describe('QuickBooks Vendor ID'),
      totalAmount: z.number().describe('Total payment amount'),
      billIds: z.array(z.string()).min(1).describe('Bill IDs to pay'),
      paymentType: z.enum(['Check', 'CreditCard']).describe('Payment type'),
      bankAccountId: z.string().describe('Bank account or credit card account ID to pay from'),
      txnDate: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional().describe('Check number or reference')
    })
  )
  .output(
    z.object({
      billPaymentId: z.string().describe('Bill payment ID'),
      totalAmount: z.number().describe('Total payment amount'),
      syncToken: z.string().describe('Sync token')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let lines = ctx.input.billIds.map(billId => ({
      Amount: ctx.input.totalAmount / ctx.input.billIds.length,
      LinkedTxn: [
        {
          TxnId: billId,
          TxnType: 'Bill'
        }
      ]
    }));

    let billPaymentData: any = {
      VendorRef: { value: ctx.input.vendorId },
      TotalAmt: ctx.input.totalAmount,
      PayType: ctx.input.paymentType,
      Line: lines
    };

    if (ctx.input.paymentType === 'Check') {
      billPaymentData.CheckPayment = {
        BankAccountRef: { value: ctx.input.bankAccountId }
      };
    } else {
      billPaymentData.CreditCardPayment = {
        CCAccountRef: { value: ctx.input.bankAccountId }
      };
    }

    if (ctx.input.txnDate) billPaymentData.TxnDate = ctx.input.txnDate;
    if (ctx.input.referenceNumber) billPaymentData.DocNumber = ctx.input.referenceNumber;

    let billPayment = await client.createBillPayment(billPaymentData);

    return {
      output: {
        billPaymentId: billPayment.Id,
        totalAmount: billPayment.TotalAmt,
        syncToken: billPayment.SyncToken
      },
      message: `Paid **$${billPayment.TotalAmt}** to vendor for ${ctx.input.billIds.length} bill(s).`
    };
  })
  .build();
