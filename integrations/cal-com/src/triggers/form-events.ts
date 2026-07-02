import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let FORM_TRIGGERS = ['FORM_SUBMITTED', 'FORM_SUBMITTED_NO_EVENT'] as const;

export let formEvents = SlateTrigger.create(spec, {
  name: 'Form Events',
  key: 'form_events',
  description:
    'Triggers when a routing form is submitted. Includes submissions that route to an event type and submissions that do not result in a booking.'
})
  .input(
    z.object({
      triggerEvent: z.string().describe('The trigger event type from Cal.com'),
      formId: z.string().describe('Identifier for the form submission'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Form or submission identifier'),
      routedToEvent: z
        .boolean()
        .describe('Whether the form submission routed to an event type'),
      responses: z.any().optional().describe('Form field responses submitted by the user'),
      eventTypeId: z
        .number()
        .optional()
        .describe('Event type ID the form routed to (if applicable)'),
      bookingUid: z.string().optional().describe('UID of the created booking (if applicable)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        subscriberUrl: ctx.input.webhookBaseUrl,
        triggers: [...FORM_TRIGGERS],
        active: true
      });

      return {
        registrationDetails: {
          webhookId: webhook?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let triggerEvent = data.triggerEvent || '';
      let formId =
        data.payload?.formId ||
        data.payload?.uid ||
        data.uid ||
        `${triggerEvent}-${Date.now()}`;

      return {
        inputs: [
          {
            triggerEvent,
            formId,
            payload: data.payload || data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;
      let routedToEvent = ctx.input.triggerEvent === 'FORM_SUBMITTED';

      return {
        type: routedToEvent ? 'form.submitted' : 'form.submitted_no_event',
        id: `${ctx.input.triggerEvent}-${ctx.input.formId}`,
        output: {
          formId: ctx.input.formId,
          routedToEvent,
          responses: p?.responses,
          eventTypeId: p?.eventTypeId,
          bookingUid: p?.uid || p?.bookingUid
        }
      };
    }
  })
  .build();
