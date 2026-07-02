import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieves a single invoice by its ID, returning full details including line items, amounts, customer info, and payment status. Can also send or void an invoice.`,
  instructions: [
    'To void an invoice, provide the invoiceId and set action to "void". The syncToken is required for voiding.',
    'To send an invoice via email, provide the invoiceId and set action to "send".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('QuickBooks Invoice ID'),
      action: z
        .enum(['get', 'send', 'void'])
        .default('get')
        .describe('Action to perform on the invoice'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address for sending (overrides default)'),
      syncToken: z.string().optional().describe('Required sync token when voiding an invoice')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      invoiceNumber: z.string().optional().describe('Invoice document number'),
      customerId: z.string().optional().describe('Customer ID'),
      customerName: z.string().optional().describe('Customer display name'),
      txnDate: z.string().optional().describe('Transaction date'),
      dueDate: z.string().optional().describe('Due date'),
      totalAmount: z.number().describe('Total amount'),
      balance: z.number().describe('Outstanding balance'),
      emailStatus: z.string().optional().describe('Email delivery status'),
      syncToken: z.string().describe('Sync token for updates'),
      lineItems: z
        .array(
          z.object({
            lineId: z.string().optional(),
            description: z.string().optional(),
            amount: z.number().optional(),
            quantity: z.number().optional(),
            unitPrice: z.number().optional()
          })
        )
        .optional()
        .describe('Invoice line items')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let invoice: any;

    if (ctx.input.action === 'send') {
      invoice = await client.sendInvoice(ctx.input.invoiceId, ctx.input.emailAddress);
    } else if (ctx.input.action === 'void') {
      if (!ctx.input.syncToken) {
        let existing = await client.getInvoice(ctx.input.invoiceId);
        invoice = await client.voidInvoice(ctx.input.invoiceId, existing.SyncToken);
      } else {
        invoice = await client.voidInvoice(ctx.input.invoiceId, ctx.input.syncToken);
      }
    } else {
      invoice = await client.getInvoice(ctx.input.invoiceId);
    }

    let lineItems = (invoice.Line || [])
      .filter((l: any) => l.DetailType === 'SalesItemLineDetail')
      .map((l: any) => ({
        lineId: l.Id,
        description: l.Description,
        amount: l.Amount,
        quantity: l.SalesItemLineDetail?.Qty,
        unitPrice: l.SalesItemLineDetail?.UnitPrice
      }));

    let actionLabel =
      ctx.input.action === 'send'
        ? 'Sent'
        : ctx.input.action === 'void'
          ? 'Voided'
          : 'Retrieved';

    return {
      output: {
        invoiceId: invoice.Id,
        invoiceNumber: invoice.DocNumber,
        customerId: invoice.CustomerRef?.value,
        customerName: invoice.CustomerRef?.name,
        txnDate: invoice.TxnDate,
        dueDate: invoice.DueDate,
        totalAmount: invoice.TotalAmt,
        balance: invoice.Balance,
        emailStatus: invoice.EmailStatus,
        syncToken: invoice.SyncToken,
        lineItems
      },
      message: `${actionLabel} invoice **#${invoice.DocNumber || invoice.Id}** for **$${invoice.TotalAmt}** (balance: $${invoice.Balance}).`
    };
  })
  .build();
