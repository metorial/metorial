import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggers when a payment is made against an invoice. Configure the webhook URL in RepairShopr under Admin > Notification Center.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of payment event'),
      paymentId: z.number().describe('Payment ID'),
      webhookPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      paymentId: z.number().describe('Payment ID'),
      invoiceId: z.number().optional().describe('Associated invoice ID'),
      customerId: z.number().optional().describe('Customer ID'),
      amount: z.number().optional().describe('Payment amount'),
      paymentMethod: z.string().optional().describe('Payment method'),
      appliedAt: z.string().optional().describe('Date payment was applied'),
      notes: z.string().optional().describe('Payment notes'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) return { inputs: [] };

      let payment = body.payment || body;
      let paymentId = payment.id || payment.payment_id;
      if (!paymentId) return { inputs: [] };

      let eventType = body.type || body.event || body.action || 'created';

      return {
        inputs: [
          {
            eventType: String(eventType),
            paymentId: Number(paymentId),
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payment = ctx.input.webhookPayload?.payment || ctx.input.webhookPayload || {};
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');

      if (
        eventType.includes('creat') ||
        eventType.includes('new') ||
        eventType.includes('made') ||
        eventType.includes('receiv')
      ) {
        eventType = 'created';
      } else {
        eventType = 'updated';
      }

      return {
        type: `payment.${eventType}`,
        id: `payment_${ctx.input.paymentId}_${eventType}_${payment.updated_at || payment.created_at || Date.now()}`,
        output: {
          paymentId: ctx.input.paymentId,
          invoiceId: payment.invoice_id,
          customerId: payment.customer_id,
          amount: payment.amount ? Number(payment.amount) : undefined,
          paymentMethod: payment.payment_method,
          appliedAt: payment.applied_at,
          notes: payment.notes,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at
        }
      };
    }
  })
  .build();
