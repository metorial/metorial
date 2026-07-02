import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggers when a payment succeeds. Includes payment amount, customer, and plan data.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier'),
      paymentId: z.number().describe('Payment ID'),
      amount: z.number().describe('Payment amount'),
      status: z.string().describe('Payment status'),
      currency: z.string().describe('Currency code'),
      customerName: z.string().nullable().describe('Customer name'),
      customerEmail: z.string().nullable().describe('Customer email'),
      planName: z.string().nullable().describe('Plan name'),
      planId: z.number().nullable().describe('Plan ID'),
      customFields: z.any().nullable().describe('Custom fields from the payment')
    })
  )
  .output(
    z.object({
      paymentId: z.number().describe('Payment identifier'),
      amount: z.number().describe('Payment amount'),
      status: z.string().describe('Payment status'),
      currency: z.string().describe('Currency code'),
      customerName: z.string().nullable().describe('Customer name'),
      customerEmail: z.string().nullable().describe('Customer email'),
      customerId: z.number().nullable().describe('Customer ID'),
      planName: z.string().nullable().describe('Associated plan name'),
      planId: z.number().nullable().describe('Associated plan ID'),
      customFields: z.any().nullable().describe('Custom fields from the payment')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PayhereClient({ token: ctx.auth.token });

      let hook = await client.createHook({
        resource: 'payment_received',
        postUrl: ctx.input.webhookBaseUrl,
        integration: 'slates'
      });

      return {
        registrationDetails: {
          hookId: hook.hookId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PayhereClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { hookId: number };
      await client.deleteHook(details.hookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let payment = body.data?.payment || body.data || {};
      let customer = body.data?.customer || payment.customer || {};
      let plan = body.data?.plan || body.data?.item || payment.item || {};

      return {
        inputs: [
          {
            eventType: body.trigger || 'payment_received',
            eventId: `payment-${payment.id || Date.now()}`,
            paymentId: payment.id,
            amount: payment.amount,
            status: payment.status || 'success',
            currency: payment.currency || plan.currency,
            customerName: customer.name || null,
            customerEmail: customer.email || null,
            planName: plan.name || null,
            planId: plan.id || null,
            customFields: payment.custom_fields || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let _customer = ctx.input.customerEmail
        ? { name: ctx.input.customerName, email: ctx.input.customerEmail }
        : null;

      return {
        type: 'payment.received',
        id: ctx.input.eventId,
        output: {
          paymentId: ctx.input.paymentId,
          amount: ctx.input.amount,
          status: ctx.input.status,
          currency: ctx.input.currency,
          customerName: ctx.input.customerName,
          customerEmail: ctx.input.customerEmail,
          customerId: null,
          planName: ctx.input.planName,
          planId: ctx.input.planId,
          customFields: ctx.input.customFields
        }
      };
    }
  })
  .build();
