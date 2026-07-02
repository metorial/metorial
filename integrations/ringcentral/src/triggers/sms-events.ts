import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let smsEvents = SlateTrigger.create(spec, {
  name: 'SMS Events',
  key: 'sms_events',
  description: 'Triggers when SMS messages are received or sent.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier from the notification'),
      messageId: z.string().describe('RingCentral message ID'),
      direction: z.string().describe('Message direction: Inbound or Outbound'),
      fromNumber: z.string().describe('Sender phone number'),
      toNumbers: z.array(z.string()).describe('Recipient phone numbers'),
      subject: z.string().describe('Message text/subject'),
      messageStatus: z.string().describe('Message delivery status'),
      creationTime: z.string().describe('ISO 8601 timestamp when the message was created')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('RingCentral message ID'),
      direction: z.string().describe('Message direction: Inbound or Outbound'),
      fromNumber: z.string().describe('Sender phone number'),
      toNumbers: z.array(z.string()).describe('Recipient phone numbers'),
      subject: z.string().describe('Message text/subject'),
      messageStatus: z.string().describe('Message delivery status'),
      creationTime: z.string().describe('ISO 8601 timestamp when the message was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
      let result = await client.createSubscription(
        ['/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS'],
        ctx.input.webhookBaseUrl
      );

      return {
        registrationDetails: {
          subscriptionId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
      await client.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let validationToken = ctx.request.headers.get('Validation-Token');
      if (validationToken) {
        return {
          inputs: [],
          response: new Response('', {
            status: 200,
            headers: { 'Validation-Token': validationToken }
          })
        };
      }

      let body = (await ctx.request.json()) as any;
      let message = body.body || {};

      return {
        inputs: [
          {
            eventId: body.uuid || '',
            messageId: String(message.id || ''),
            direction: message.direction || '',
            fromNumber: message.from?.phoneNumber || message.from || '',
            toNumbers: (message.to || []).map((t: any) => t.phoneNumber || t),
            subject: message.subject || '',
            messageStatus: message.messageStatus || '',
            creationTime: message.creationTime || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let type = ctx.input.direction === 'Inbound' ? 'sms.received' : 'sms.sent';

      return {
        type,
        id: ctx.input.eventId,
        output: {
          messageId: ctx.input.messageId,
          direction: ctx.input.direction,
          fromNumber: ctx.input.fromNumber,
          toNumbers: ctx.input.toNumbers,
          subject: ctx.input.subject,
          messageStatus: ctx.input.messageStatus,
          creationTime: ctx.input.creationTime
        }
      };
    }
  })
  .build();
