import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let customerIdentificationEvents = SlateTrigger.create(spec, {
  name: 'Customer Identification Events',
  key: 'customer_identification_events',
  description: 'Triggers when customer identity verification succeeds or fails.'
})
  .input(
    z.object({
      eventType: z.string().describe('Paystack event type'),
      eventId: z.string().describe('Unique event identifier'),
      customerCode: z.string().describe('Customer code'),
      customerEmail: z.string().describe('Customer email'),
      identificationType: z.string().nullable().describe('Type of identification used'),
      identificationStatus: z.string().describe('Identification status')
    })
  )
  .output(
    z.object({
      customerCode: z.string().describe('Customer code'),
      customerEmail: z.string().describe('Customer email'),
      identificationType: z.string().nullable().describe('Type of identification'),
      identificationStatus: z.string().describe('Identification result status')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let event = body.event as string;

      if (!event.startsWith('customeridentification.')) {
        return { inputs: [] };
      }

      let data = body.data;
      let customer = data.customer ?? {};

      return {
        inputs: [
          {
            eventType: event,
            eventId: `${event}_${customer.customer_code ?? customer.id}_${Date.now()}`,
            customerCode: customer.customer_code ?? '',
            customerEmail: customer.email ?? '',
            identificationType: data.identification?.type ?? null,
            identificationStatus:
              event === 'customeridentification.success' ? 'success' : 'failed'
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type:
          ctx.input.identificationStatus === 'success'
            ? 'customer_identification.successful'
            : 'customer_identification.failed',
        id: ctx.input.eventId,
        output: {
          customerCode: ctx.input.customerCode,
          customerEmail: ctx.input.customerEmail,
          identificationType: ctx.input.identificationType,
          identificationStatus: ctx.input.identificationStatus
        }
      };
    }
  })
  .build();
