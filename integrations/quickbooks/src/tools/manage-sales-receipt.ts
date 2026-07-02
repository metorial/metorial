import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { quickBooksServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let salesReceiptLineSchema = z.object({
  description: z.string().optional().describe('Description of the line item'),
  amount: z
    .number()
    .optional()
    .describe('Total amount for this line. If omitted, quantity and unitPrice are used.'),
  quantity: z.number().optional().describe('Quantity of items'),
  unitPrice: z.number().optional().describe('Price per unit'),
  itemId: z.string().optional().describe('QuickBooks Item ID to reference'),
  serviceDate: z.string().optional().describe('Date the service was performed (YYYY-MM-DD)')
});

let salesReceiptOutputSchema = z.object({
  salesReceiptId: z.string().describe('Sales receipt ID'),
  salesReceiptNumber: z.string().optional().describe('Sales receipt document number'),
  customerId: z.string().optional().describe('Customer ID'),
  customerName: z.string().optional().describe('Customer display name'),
  totalAmount: z.number().describe('Total amount'),
  txnDate: z.string().optional().describe('Transaction date'),
  syncToken: z.string().describe('Sync token for updates or deletion')
});

type SalesReceiptLineInput = z.infer<typeof salesReceiptLineSchema>;

let resolveLineAmount = (line: SalesReceiptLineInput) => {
  if (line.amount !== undefined) {
    return line.amount;
  }

  if (line.quantity !== undefined && line.unitPrice !== undefined) {
    return Number((line.quantity * line.unitPrice).toFixed(2));
  }

  throw quickBooksServiceError(
    'Each sales receipt line item requires amount or both quantity and unitPrice.'
  );
};

let buildSalesReceiptLines = (lineItems: SalesReceiptLineInput[]) =>
  lineItems.map(item => {
    let line: any = {
      DetailType: 'SalesItemLineDetail',
      Amount: resolveLineAmount(item),
      Description: item.description,
      SalesItemLineDetail: {
        Qty: item.quantity,
        UnitPrice: item.unitPrice,
        ServiceDate: item.serviceDate
      }
    };

    if (item.itemId) {
      line.SalesItemLineDetail.ItemRef = { value: item.itemId };
    }

    return line;
  });

let mapSalesReceiptOutput = (salesReceipt: any) => ({
  salesReceiptId: salesReceipt.Id,
  salesReceiptNumber: salesReceipt.DocNumber,
  customerId: salesReceipt.CustomerRef?.value,
  customerName: salesReceipt.CustomerRef?.name,
  totalAmount: salesReceipt.TotalAmt,
  txnDate: salesReceipt.TxnDate,
  syncToken: salesReceipt.SyncToken
});

export let createSalesReceipt = SlateTool.create(spec, {
  name: 'Create Sales Receipt',
  key: 'create_sales_receipt',
  description:
    'Creates a sales receipt in QuickBooks for an immediate customer sale where payment is received at the time of purchase.',
  instructions: [
    'Use invoices plus payments when the customer will pay later.',
    'Set depositAccountId when the payment should go directly to a specific bank or undeposited funds account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('QuickBooks Customer ID'),
      lineItems: z.array(salesReceiptLineSchema).min(1).describe('Line items sold'),
      txnDate: z
        .string()
        .optional()
        .describe('Transaction date (YYYY-MM-DD), defaults to today'),
      paymentMethodId: z.string().optional().describe('Payment method reference ID'),
      depositAccountId: z
        .string()
        .optional()
        .describe('Account ID where the received funds should be deposited'),
      referenceNumber: z.string().optional().describe('Receipt or payment reference number'),
      emailAddress: z.string().optional().describe('Customer email address for the receipt'),
      customerMemo: z.string().optional().describe('Memo displayed to the customer'),
      privateNote: z.string().optional().describe('Private note not visible to the customer')
    })
  )
  .output(salesReceiptOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let salesReceiptData: any = {
      CustomerRef: { value: ctx.input.customerId },
      Line: buildSalesReceiptLines(ctx.input.lineItems)
    };

    if (ctx.input.txnDate) salesReceiptData.TxnDate = ctx.input.txnDate;
    if (ctx.input.paymentMethodId)
      salesReceiptData.PaymentMethodRef = { value: ctx.input.paymentMethodId };
    if (ctx.input.depositAccountId)
      salesReceiptData.DepositToAccountRef = { value: ctx.input.depositAccountId };
    if (ctx.input.referenceNumber) salesReceiptData.DocNumber = ctx.input.referenceNumber;
    if (ctx.input.emailAddress)
      salesReceiptData.BillEmail = { Address: ctx.input.emailAddress };
    if (ctx.input.customerMemo)
      salesReceiptData.CustomerMemo = { value: ctx.input.customerMemo };
    if (ctx.input.privateNote) salesReceiptData.PrivateNote = ctx.input.privateNote;

    let salesReceipt = await client.createSalesReceipt(salesReceiptData);

    return {
      output: mapSalesReceiptOutput(salesReceipt),
      message: `Created sales receipt **#${salesReceipt.DocNumber || salesReceipt.Id}** for **$${salesReceipt.TotalAmt}**.`
    };
  })
  .build();

export let getSalesReceipt = SlateTool.create(spec, {
  name: 'Get Sales Receipt',
  key: 'get_sales_receipt',
  description:
    'Retrieves a sales receipt by ID, including customer, amount, transaction date, and line item details.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      salesReceiptId: z.string().describe('QuickBooks SalesReceipt ID')
    })
  )
  .output(
    salesReceiptOutputSchema.extend({
      lineItems: z
        .array(
          z.object({
            lineId: z.string().optional(),
            description: z.string().optional(),
            amount: z.number().optional(),
            quantity: z.number().optional(),
            unitPrice: z.number().optional(),
            itemId: z.string().optional()
          })
        )
        .optional()
        .describe('Sales receipt line items')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let salesReceipt = await client.getSalesReceipt(ctx.input.salesReceiptId);

    let lineItems = (salesReceipt.Line || [])
      .filter((line: any) => line.DetailType === 'SalesItemLineDetail')
      .map((line: any) => ({
        lineId: line.Id,
        description: line.Description,
        amount: line.Amount,
        quantity: line.SalesItemLineDetail?.Qty,
        unitPrice: line.SalesItemLineDetail?.UnitPrice,
        itemId: line.SalesItemLineDetail?.ItemRef?.value
      }));

    return {
      output: {
        ...mapSalesReceiptOutput(salesReceipt),
        lineItems
      },
      message: `Retrieved sales receipt **#${salesReceipt.DocNumber || salesReceipt.Id}** for **$${salesReceipt.TotalAmt}**.`
    };
  })
  .build();

export let deleteSalesReceipt = SlateTool.create(spec, {
  name: 'Delete Sales Receipt',
  key: 'delete_sales_receipt',
  description:
    'Deletes a sales receipt transaction from QuickBooks. If syncToken is omitted, the current receipt is fetched first.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      salesReceiptId: z.string().describe('QuickBooks SalesReceipt ID to delete'),
      syncToken: z
        .string()
        .optional()
        .describe('Current sync token. If omitted, the tool fetches it before deleting.')
    })
  )
  .output(
    z.object({
      salesReceiptId: z.string().describe('Deleted sales receipt ID'),
      deleted: z.boolean().describe('Whether the delete request succeeded'),
      status: z.string().optional().describe('QuickBooks transaction status after deletion'),
      syncToken: z.string().optional().describe('Returned sync token')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let syncToken = ctx.input.syncToken;

    if (!syncToken) {
      let existing = await client.getSalesReceipt(ctx.input.salesReceiptId);
      syncToken = existing.SyncToken;
    }

    if (!syncToken) {
      throw quickBooksServiceError('A syncToken is required to delete a sales receipt.');
    }

    let salesReceipt = await client.deleteSalesReceipt(ctx.input.salesReceiptId, syncToken);

    return {
      output: {
        salesReceiptId: salesReceipt.Id ?? ctx.input.salesReceiptId,
        deleted: true,
        status: salesReceipt.status,
        syncToken: salesReceipt.SyncToken
      },
      message: `Deleted sales receipt **${salesReceipt.Id ?? ctx.input.salesReceiptId}**.`
    };
  })
  .build();
