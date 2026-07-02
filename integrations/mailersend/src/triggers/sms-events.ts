import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _smsEventTypes = ['sms.sent', 'sms.delivered', 'sms.failed'] as const;

export let smsEvents = SlateTrigger.create(spec, {
  name: 'SMS Events',
  key: 'sms_events',
  description:
    'Receive real-time notifications for SMS lifecycle events including sent, delivered, and failed status updates.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of SMS event.'),
      eventTimestamp: z.string().describe('ISO 8601 timestamp of the event.'),
      webhookPayload: z
        .record(z.string(), z.unknown())
        .describe('Full webhook payload from MailerSend.')
    })
  )
  .output(
    z.object({
      smsMessageId: z.string().nullable().describe('SMS message ID.'),
      from: z.string().nullable().describe('Sender phone number.'),
      to: z.string().nullable().describe('Recipient phone number.'),
      text: z.string().nullable().describe('SMS message content.'),
      eventTimestamp: z.string().describe('When the event occurred.'),
      eventData: z.record(z.string(), z.unknown()).describe('Full event data from MailerSend.')
    })
  )
  .webhook({
    autoRegisterWebhook: async _ctx => {
      // SMS webhooks require a specific sms_number_id, which the user needs to configure.
      // We cannot automatically discover SMS numbers without additional context.
      // This will be set up when the user provides the SMS number ID via configuration.
      // For now, we return an empty registration - users may need to set up manually.
      return {
        registrationDetails: {
          smsWebhooks: [] as Array<{ smsWebhookId: string; smsNumberId: string }>
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        smsWebhooks: Array<{ smsWebhookId: string; smsNumberId: string }>;
      };

      for (let webhook of details.smsWebhooks || []) {
        try {
          await client.deleteSmsWebhook(webhook.smsWebhookId);
        } catch (_err) {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      return {
        inputs: [
          {
            eventType: String(data.type || ''),
            eventTimestamp: String(data.created_at || new Date().toISOString()),
            webhookPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let eventData = (payload.data || {}) as Record<string, unknown>;
      let smsData = (eventData.sms || eventData) as Record<string, unknown>;

      let smsMessageId = String(smsData.id || eventData.sms_message_id || '') || null;
      let from = String(smsData.from || eventData.from || '') || null;
      let to = String(smsData.to || eventData.to || '') || null;
      let text = String(smsData.text || eventData.text || '') || null;

      let eventId = `${ctx.input.eventType}-${smsMessageId || ''}-${ctx.input.eventTimestamp}`;

      return {
        type: ctx.input.eventType,
        id: eventId,
        output: {
          smsMessageId,
          from,
          to,
          text,
          eventTimestamp: ctx.input.eventTimestamp,
          eventData
        }
      };
    }
  })
  .build();
