import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { paypalServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageInvoice = SlateTool.create(spec, {
  name: 'Manage Invoice',
  key: 'manage_invoice',
  description: `Manage existing PayPal invoices. Send, cancel, delete drafts, record or remove external payments and refunds, and retrieve invoice details.`,
  instructions: [
    'Use action **send** to send a draft invoice to the recipient.',
    'Use action **cancel** to cancel a sent invoice.',
    'Use action **recordPayment** / **recordRefund** to record external payments or refunds against an invoice.',
    'Use action **deletePayment** / **deleteRefund** to remove externally recorded payment or refund records.',
    'Use action **delete** to delete a draft or scheduled invoice.',
    'Use action **get** to retrieve full invoice details.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'send',
          'cancel',
          'recordPayment',
          'deletePayment',
          'recordRefund',
          'deleteRefund',
          'delete',
          'get'
        ])
        .describe('Action to perform on the invoice'),
      invoiceId: z.string().describe('PayPal invoice ID'),
      transactionId: z
        .string()
        .optional()
        .describe('External payment or refund transaction ID for deletePayment/deleteRefund'),
      subject: z.string().optional().describe('Email subject for send/cancel actions'),
      note: z.string().optional().describe('Note to include with the action'),
      paymentMethod: z
        .enum([
          'BANK_TRANSFER',
          'CASH',
          'CHECK',
          'CREDIT_CARD',
          'DEBIT_CARD',
          'PAYPAL',
          'WIRE_TRANSFER',
          'OTHER'
        ])
        .optional()
        .describe('Payment or refund method for recordPayment/recordRefund actions'),
      paymentDate: z
        .string()
        .optional()
        .describe('Payment date in YYYY-MM-DD format for recordPayment'),
      paymentId: z
        .string()
        .optional()
        .describe('External payment ID to store with recordPayment'),
      paymentAmount: z
        .string()
        .optional()
        .describe('Payment or refund amount as a string for recordPayment/recordRefund'),
      paymentCurrencyCode: z
        .string()
        .optional()
        .describe('Currency code for recordPayment/recordRefund'),
      refundDate: z
        .string()
        .optional()
        .describe('Refund date in YYYY-MM-DD format for recordRefund'),
      refundId: z.string().optional().describe('External refund ID to store with recordRefund')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('PayPal invoice ID'),
      status: z.string().optional().describe('Invoice status'),
      transactionId: z
        .string()
        .optional()
        .describe('External payment or refund transaction ID'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      recipientEmail: z.string().optional().describe('Recipient email'),
      totalAmount: z.string().optional().describe('Total invoice amount'),
      currencyCode: z.string().optional().describe('Currency code'),
      invoice: z.any().optional().describe('Full invoice details (for get action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    switch (ctx.input.action) {
      case 'send': {
        await client.sendInvoice(ctx.input.invoiceId, {
          subject: ctx.input.subject,
          note: ctx.input.note,
          sendToRecipient: true
        });
        let invoice = await client.getInvoice(ctx.input.invoiceId);
        return {
          output: {
            invoiceId: ctx.input.invoiceId,
            status: invoice.status,
            invoiceNumber: invoice.detail?.invoice_number,
            recipientEmail: invoice.primary_recipients?.[0]?.billing_info?.email_address,
            totalAmount: invoice.amount?.value,
            currencyCode: invoice.amount?.currency_code
          },
          message: `Invoice \`${ctx.input.invoiceId}\` sent. Status: **${invoice.status}**.`
        };
      }
      case 'cancel': {
        await client.cancelInvoice(ctx.input.invoiceId, {
          subject: ctx.input.subject,
          note: ctx.input.note,
          sendToRecipient: true
        });
        return {
          output: {
            invoiceId: ctx.input.invoiceId,
            status: 'CANCELLED'
          },
          message: `Invoice \`${ctx.input.invoiceId}\` cancelled.`
        };
      }
      case 'recordPayment': {
        if (!ctx.input.paymentMethod) {
          throw paypalServiceError('paymentMethod is required for recordPayment action');
        }
        let paymentParams: Record<string, any> = {
          method: ctx.input.paymentMethod
        };
        if (ctx.input.paymentDate) paymentParams.date = ctx.input.paymentDate;
        if (ctx.input.paymentId) paymentParams.paymentId = ctx.input.paymentId;
        if (ctx.input.paymentAmount && ctx.input.paymentCurrencyCode) {
          paymentParams.amount = {
            currency_code: ctx.input.paymentCurrencyCode,
            value: ctx.input.paymentAmount
          };
        }
        if (ctx.input.note) paymentParams.note = ctx.input.note;

        let payment = await client.recordInvoicePayment(
          ctx.input.invoiceId,
          paymentParams as any
        );
        let invoice = await client.getInvoice(ctx.input.invoiceId);
        let transactionId =
          payment.payment_id ||
          payment.transaction_id ||
          invoice.payments?.transactions?.at?.(-1)?.payment_id;
        return {
          output: {
            invoiceId: ctx.input.invoiceId,
            status: invoice.status,
            transactionId,
            invoiceNumber: invoice.detail?.invoice_number,
            totalAmount: invoice.amount?.value,
            currencyCode: invoice.amount?.currency_code
          },
          message: `Payment recorded for invoice \`${ctx.input.invoiceId}\`. Status: **${invoice.status}**.`
        };
      }
      case 'deletePayment': {
        if (!ctx.input.transactionId) {
          throw paypalServiceError('transactionId is required for deletePayment action');
        }
        await client.deleteInvoicePayment(ctx.input.invoiceId, ctx.input.transactionId);
        return {
          output: {
            invoiceId: ctx.input.invoiceId,
            transactionId: ctx.input.transactionId
          },
          message: `Payment record \`${ctx.input.transactionId}\` deleted from invoice \`${ctx.input.invoiceId}\`.`
        };
      }
      case 'recordRefund': {
        if (!ctx.input.paymentMethod) {
          throw paypalServiceError('paymentMethod is required for recordRefund action');
        }
        let refundParams: Record<string, any> = {
          method: ctx.input.paymentMethod
        };
        if (ctx.input.refundDate) refundParams.refundDate = ctx.input.refundDate;
        if (ctx.input.refundId) refundParams.refundId = ctx.input.refundId;
        if (ctx.input.paymentAmount && ctx.input.paymentCurrencyCode) {
          refundParams.amount = {
            currency_code: ctx.input.paymentCurrencyCode,
            value: ctx.input.paymentAmount
          };
        }
        if (ctx.input.note) refundParams.note = ctx.input.note;

        let refund = await client.recordInvoiceRefund(
          ctx.input.invoiceId,
          refundParams as any
        );
        let invoice = await client.getInvoice(ctx.input.invoiceId);
        let transactionId =
          refund.refund_id ||
          refund.transaction_id ||
          invoice.refunds?.transactions?.at?.(-1)?.refund_id;
        return {
          output: {
            invoiceId: ctx.input.invoiceId,
            status: invoice.status,
            transactionId,
            invoiceNumber: invoice.detail?.invoice_number,
            totalAmount: invoice.amount?.value,
            currencyCode: invoice.amount?.currency_code
          },
          message: `Refund recorded for invoice \`${ctx.input.invoiceId}\`. Status: **${invoice.status}**.`
        };
      }
      case 'deleteRefund': {
        if (!ctx.input.transactionId) {
          throw paypalServiceError('transactionId is required for deleteRefund action');
        }
        await client.deleteInvoiceRefund(ctx.input.invoiceId, ctx.input.transactionId);
        return {
          output: {
            invoiceId: ctx.input.invoiceId,
            transactionId: ctx.input.transactionId
          },
          message: `Refund record \`${ctx.input.transactionId}\` deleted from invoice \`${ctx.input.invoiceId}\`.`
        };
      }
      case 'delete': {
        await client.deleteInvoice(ctx.input.invoiceId);
        return {
          output: {
            invoiceId: ctx.input.invoiceId,
            status: 'DELETED'
          },
          message: `Invoice \`${ctx.input.invoiceId}\` deleted.`
        };
      }
      case 'get': {
        let invoice = await client.getInvoice(ctx.input.invoiceId);
        return {
          output: {
            invoiceId: ctx.input.invoiceId,
            status: invoice.status,
            invoiceNumber: invoice.detail?.invoice_number,
            recipientEmail: invoice.primary_recipients?.[0]?.billing_info?.email_address,
            totalAmount: invoice.amount?.value,
            currencyCode: invoice.amount?.currency_code,
            invoice
          },
          message: `Invoice \`${ctx.input.invoiceId}\` (#${invoice.detail?.invoice_number}) is **${invoice.status}**. Amount: ${invoice.amount?.currency_code} ${invoice.amount?.value}.`
        };
      }
    }
  })
  .build();
