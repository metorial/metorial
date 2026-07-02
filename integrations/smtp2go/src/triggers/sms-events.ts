import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let smsEventsTrigger = SlateTrigger.create(spec, {
  name: 'SMS Events',
  key: 'sms_events',
  description:
    'Triggers when SMS delivery events occur, including delivery status updates for sent messages.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of SMS event'),
      eventId: z.string().describe('Unique event identifier'),
      destination: z.string().describe('Destination phone number'),
      sendingNumber: z.string().describe('Sending phone number'),
      status: z.string().describe('Delivery status'),
      timestamp: z.string().describe('Event timestamp'),
      rawEvent: z.any().describe('Full event payload from SMTP2GO')
    })
  )
  .output(
    z.object({
      destination: z.string().describe('Destination phone number'),
      sendingNumber: z.string().describe('Sending phone number'),
      status: z.string().describe('Delivery status'),
      timestamp: z.string().describe('When the event occurred'),
      messageId: z.string().optional().describe('SMS message identifier')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let result = await client.addWebhook({
        url: ctx.input.webhookBaseUrl,
        smsEvents: true,
        outputType: 'json'
      });

      let data = result.data || result;

      return {
        registrationDetails: {
          webhookId: data.webhook_id || data.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      await client.removeWebhook({
        webhookId: ctx.input.registrationDetails.webhookId
      });
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        eventType: event.event || event.type || 'sms_status',
        eventId:
          event.event_id ||
          event.id ||
          event.message_id ||
          `sms-${event.destination || ''}-${event.date || Date.now()}`,
        destination: event.destination || event.to || '',
        sendingNumber: event.sending_number || event.from || '',
        status: event.status || event.delivery_status || '',
        timestamp: event.date || event.timestamp || event.submission_timestamp || '',
        rawEvent: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.rawEvent || {};

      return {
        type: `sms.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          destination: ctx.input.destination,
          sendingNumber: ctx.input.sendingNumber,
          status: ctx.input.status,
          timestamp: ctx.input.timestamp,
          messageId: raw.message_id
        }
      };
    }
  })
  .build();
