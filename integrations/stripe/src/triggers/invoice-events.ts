import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggered when invoice lifecycle events occur, including creation, finalization, payment success/failure, voiding, and overdue status.'
})
  .input(
    z.object({
      eventId: z.string().describe('Stripe event ID'),
      eventType: z.string().describe('Event type (e.g., invoice.paid)'),
      resourceId: z.string().describe('Invoice ID'),
      resource: z.any().describe('Full invoice object from the event'),
      created: z.number().describe('Event creation timestamp')
    })
  )
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
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StripeClient({
        token: ctx.auth.token,
        stripeAccountId: ctx.config.stripeAccountId
      });

      let result = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        enabled_events: [
          'invoice.created',
          'invoice.finalized',
          'invoice.paid',
          'invoice.payment_failed',
          'invoice.payment_succeeded',
          'invoice.sent',
          'invoice.updated',
          'invoice.voided',
          'invoice.marked_uncollectible',
          'invoice.overdue',
          'invoice.payment_action_required'
        ]
      });

      return {
        registrationDetails: {
          webhookEndpointId: result.id,
          secret: result.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StripeClient({
        token: ctx.auth.token,
        stripeAccountId: ctx.config.stripeAccountId
      });

      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body: any = await ctx.request.json();

      if (!body?.type || !body.data?.object) {
        return { inputs: [] };
      }

      let obj = body.data.object;

      return {
        inputs: [
          {
            eventId: body.id,
            eventType: body.type,
            resourceId: obj.id,
            resource: obj,
            created: body.created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { resource } = ctx.input;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          invoiceId: ctx.input.resourceId,
          customerId: resource.customer,
          subscriptionId: resource.subscription || null,
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
    }
  })
  .build();
