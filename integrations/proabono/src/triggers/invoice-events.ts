import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let invoiceEventTypes = [
  'InvoiceDebitIssuedPaymentAuto',
  'InvoiceDebitIssuedPaymentOffline',
  'InvoiceDebitPaid',
  'InvoiceDebitRefunded',
  'InvoiceDebitCancelled',
  'InvoiceDebitPaymentAutoFailed',
  'InvoiceDebitPaymentAutoRequestedAuth',
  'InvoiceDebitOverdue',
  'InvoiceDebitDisputed',
  'InvoiceDebitUncollectible',
  'InvoiceCreditIssued'
] as const;

let paymentMethodEventTypes = [
  'GatewayPermissionSoonExpired',
  'GatewayPermissionExpired',
  'GatewayPermissionDefective',
  'GatewayPermissionInsufficientFunds',
  'GatewayPermissionPaymentIssues'
] as const;

export let invoiceAndPaymentEvents = SlateTrigger.create(spec, {
  name: 'Invoice & Payment Events',
  key: 'invoice_payment_events',
  description:
    'Triggers on invoice lifecycle events (issued, paid, refunded, overdue, disputed) and payment method events (expiring, expired, defective, insufficient funds). Configure the webhook in ProAbono BackOffice under Integration > My Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('ProAbono event type (e.g., InvoiceDebitPaid)'),
      eventId: z.string().describe('Unique event identifier'),
      invoiceId: z.number().optional().describe('Invoice ID'),
      referenceCustomer: z.string().optional().describe('Customer reference'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().optional().describe('ProAbono invoice ID'),
      referenceCustomer: z.string().optional().describe('Customer reference'),
      status: z.string().optional().describe('Invoice status'),
      stateInvoice: z.string().optional().describe('Technical invoice state'),
      amountTotal: z.number().optional().describe('Total amount in cents'),
      currency: z.string().optional().describe('Currency code'),
      dateGenerated: z.string().optional().describe('Invoice generation date'),
      typePayment: z.string().optional().describe('Payment type'),
      eventType: z.string().describe('The specific event that occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventType = data?.Trigger || data?.TypeEvent || data?.EventType || '';
      let isInvoiceEvent =
        invoiceEventTypes.some(t => eventType === t) ||
        eventType.startsWith('InvoiceDebit') ||
        eventType.startsWith('InvoiceCredit');
      let isPaymentMethodEvent =
        paymentMethodEventTypes.some(t => eventType === t) ||
        eventType.startsWith('GatewayPermission');

      if (!isInvoiceEvent && !isPaymentMethodEvent && eventType) {
        return { inputs: [] };
      }

      let eventId =
        data?.Id?.toString() ||
        data?.IdNotification?.toString() ||
        `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            invoiceId: data?.IdInvoice ?? data?.Id,
            referenceCustomer: data?.ReferenceCustomer,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, invoiceId, referenceCustomer, rawPayload } = ctx.input;

      let status = rawPayload?.Status;
      let stateInvoice = rawPayload?.StateInvoice;
      let amountTotal = rawPayload?.AmountTotal;
      let currency = rawPayload?.Currency;
      let dateGenerated = rawPayload?.DateGenerated;
      let typePayment = rawPayload?.TypePayment;

      if (invoiceId && !status) {
        try {
          let client = new ProAbonoClient({
            token: ctx.auth.token,
            apiEndpoint: ctx.config.apiEndpoint
          });
          let invoice = await client.getInvoice(invoiceId);
          status = status || invoice?.Status;
          stateInvoice = stateInvoice || invoice?.StateInvoice;
          amountTotal = amountTotal ?? invoice?.AmountTotal;
          currency = currency || invoice?.Currency;
          dateGenerated = dateGenerated || invoice?.DateGenerated;
          typePayment = typePayment || invoice?.TypePayment;
          referenceCustomer = referenceCustomer || invoice?.ReferenceCustomer;
        } catch {
          // Invoice details fetch is best-effort
        }
      }

      let typeMap: Record<string, string> = {
        InvoiceDebitIssuedPaymentAuto: 'invoice.issued_payment_auto',
        InvoiceDebitIssuedPaymentOffline: 'invoice.issued_payment_offline',
        InvoiceDebitPaid: 'invoice.paid',
        InvoiceDebitRefunded: 'invoice.refunded',
        InvoiceDebitCancelled: 'invoice.cancelled',
        InvoiceDebitPaymentAutoFailed: 'invoice.payment_auto_failed',
        InvoiceDebitPaymentAutoRequestedAuth: 'invoice.payment_auth_required',
        InvoiceDebitOverdue: 'invoice.overdue',
        InvoiceDebitDisputed: 'invoice.disputed',
        InvoiceDebitUncollectible: 'invoice.uncollectible',
        InvoiceCreditIssued: 'invoice.credit_issued',
        GatewayPermissionSoonExpired: 'payment_method.expiring_soon',
        GatewayPermissionExpired: 'payment_method.expired',
        GatewayPermissionDefective: 'payment_method.defective',
        GatewayPermissionInsufficientFunds: 'payment_method.insufficient_funds',
        GatewayPermissionPaymentIssues: 'payment_method.payment_issues'
      };

      return {
        type: typeMap[eventType] || `invoice.${eventType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          invoiceId,
          referenceCustomer,
          status,
          stateInvoice,
          amountTotal,
          currency,
          dateGenerated,
          typePayment,
          eventType
        }
      };
    }
  })
  .build();
