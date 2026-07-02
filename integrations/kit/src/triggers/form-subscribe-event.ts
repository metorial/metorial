import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formSubscribeEvent = SlateTrigger.create(spec, {
  name: 'Form Subscribe Event',
  key: 'form_subscribe_event',
  description:
    'Triggers when a subscriber is added to a form. Useful for tracking sign-up form activity and triggering downstream automations.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Kit event name'),
      subscriberId: z.number().describe('Subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      state: z.string().describe('Subscriber state'),
      formId: z.number().describe('Form ID'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      state: z.string().describe('Subscriber state'),
      formId: z.number().describe('Form ID the subscriber was added to')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let subscriber = data.subscriber || {};

      return {
        inputs: [
          {
            eventName: data.event_name || data.name || 'subscriber.form_subscribe',
            subscriberId: subscriber.id ?? 0,
            emailAddress: subscriber.email_address ?? '',
            firstName: subscriber.first_name ?? null,
            state: subscriber.state ?? 'unknown',
            formId: data.form?.id ?? data.form_id ?? 0,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'subscriber.form_subscribe',
        id: `form-subscribe-${ctx.input.subscriberId}-${ctx.input.formId}-${Date.now()}`,
        output: {
          subscriberId: ctx.input.subscriberId,
          emailAddress: ctx.input.emailAddress,
          firstName: ctx.input.firstName,
          state: ctx.input.state,
          formId: ctx.input.formId
        }
      };
    }
  })
  .build();
