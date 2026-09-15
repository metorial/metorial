import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';
import { invoiceEventSchema, referenceId } from './event-schemas';
import { matchesStripeEvent } from './event-types';
import { stripeEvents } from './events-trigger-group';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggered when invoice lifecycle events occur, including creation, finalization, payment success/failure, voiding, and overdue status.'
})
  .triggerGroup(stripeEvents)
  .input(invoiceEventSchema)
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      customerId: z.string().nullable().describe('Customer ID'),
      subscriptionId: z.string().optional().nullable().describe('Associated subscription ID'),
      status: z
        .string()
        .nullable()
        .describe('Invoice status (draft, open, paid, uncollectible, void)'),
      total: z.number().describe('Total amount'),
      amountDue: z.number().optional().describe('Amount due'),
      amountPaid: z.number().optional().describe('Amount paid'),
      currency: z.string().describe('Currency code'),
      hostedInvoiceUrl: z
        .string()
        .optional()
        .nullable()
        .describe('URL for the hosted invoice payment page'),
      invoicePdf: z.string().optional().nullable().describe('URL for the invoice PDF'),
      created: z.number().optional().describe('Invoice creation timestamp')
    })
  )
  .matches(payload => matchesStripeEvent('invoice', payload))
  .map(async ctx => {
    let resource = ctx.input.data.object;
    return {
      type: ctx.input.type,
      id: ctx.input.id,
      output: {
        invoiceId: resource.id,
        customerId: referenceId(resource.customer) ?? null,
        subscriptionId:
          referenceId(resource.parent?.subscription_details?.subscription) ?? null,
        status: resource.status,
        total: resource.total,
        amountDue: resource.amount_due,
        amountPaid: resource.amount_paid,
        currency: resource.currency,
        hostedInvoiceUrl: resource.hosted_invoice_url || null,
        invoicePdf: resource.invoice_pdf || null,
        created: resource.created
      }
    };
  })
  .build();
