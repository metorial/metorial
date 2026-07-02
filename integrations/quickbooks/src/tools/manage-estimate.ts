import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let estimateLineSchema = z.object({
  description: z.string().optional().describe('Description of the line item'),
  amount: z.number().describe('Total amount for this line'),
  quantity: z.number().optional().describe('Quantity'),
  unitPrice: z.number().optional().describe('Price per unit'),
  itemId: z.string().optional().describe('Item ID to reference')
});

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Creates a new estimate (quote/proposal) for a customer. Estimates can later be converted to invoices. Supports multiple line items with item references.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('QuickBooks Customer ID'),
      lineItems: z.array(estimateLineSchema).min(1).describe('Line items for the estimate'),
      txnDate: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
      expirationDate: z.string().optional().describe('Expiration date (YYYY-MM-DD)'),
      customerMemo: z.string().optional().describe('Memo displayed to the customer'),
      privateNote: z.string().optional().describe('Private note not visible to the customer')
    })
  )
  .output(
    z.object({
      estimateId: z.string().describe('Estimate ID'),
      estimateNumber: z.string().optional().describe('Estimate document number'),
      totalAmount: z.number().describe('Total estimate amount'),
      txnStatus: z.string().optional().describe('Estimate status'),
      syncToken: z.string().describe('Sync token for updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let lines = ctx.input.lineItems.map(item => {
      let line: any = {
        DetailType: 'SalesItemLineDetail',
        Amount: item.amount,
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.unitPrice
        }
      };

      if (item.itemId) {
        line.SalesItemLineDetail.ItemRef = { value: item.itemId };
      }

      return line;
    });

    let estimateData: any = {
      CustomerRef: { value: ctx.input.customerId },
      Line: lines
    };

    if (ctx.input.txnDate) estimateData.TxnDate = ctx.input.txnDate;
    if (ctx.input.expirationDate) estimateData.ExpirationDate = ctx.input.expirationDate;
    if (ctx.input.customerMemo) estimateData.CustomerMemo = { value: ctx.input.customerMemo };
    if (ctx.input.privateNote) estimateData.PrivateNote = ctx.input.privateNote;

    let estimate = await client.createEstimate(estimateData);

    return {
      output: {
        estimateId: estimate.Id,
        estimateNumber: estimate.DocNumber,
        totalAmount: estimate.TotalAmt,
        txnStatus: estimate.TxnStatus,
        syncToken: estimate.SyncToken
      },
      message: `Created estimate **#${estimate.DocNumber || estimate.Id}** for **$${estimate.TotalAmt}**.`
    };
  })
  .build();
