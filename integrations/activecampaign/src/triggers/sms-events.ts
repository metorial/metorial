import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let smsEventTypes = ['sms_sent', 'sms_reply', 'sms_unsub'] as const;

export let smsEvents = SlateTrigger.create(spec, {
  name: 'SMS Events',
  key: 'sms_events',
  description:
    'Triggers when an SMS message is sent, a contact replies to an SMS, or a contact unsubscribes from SMS.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of SMS event'),
      payload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the contact'),
      contactEmail: z.string().optional().describe('Email of the contact'),
      contactPhone: z.string().optional().describe('Phone number of the contact'),
      messageContent: z.string().optional().describe('Content of the SMS (for reply events)'),
      initiatedBy: z.string().optional().describe('Who initiated the action'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiUrl: ctx.config.apiUrl
      });

      let result = await client.createWebhook({
        name: 'Slates SMS Events',
        url: ctx.input.webhookBaseUrl,
        events: [...smsEventTypes],
        sources: ['public', 'admin', 'api', 'system']
      });

      return {
        registrationDetails: {
          webhookId: result.webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiUrl: ctx.config.apiUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any;
      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let eventType = data.type || data.type || 'unknown';

      return {
        inputs: [
          {
            eventType,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload as Record<string, any>;

      let contactId = String(p['contact[id]'] || p.contactId || '');
      let contactEmail = String(p['contact[email]'] || p.email || '');
      let contactPhone = String(p['contact[phone]'] || p.phone || '');
      let messageContent = String(p['sms[text]'] || p.message || p.smsText || '');
      let initiatedBy = String(p.initiated_by || p.source || '');
      let occurredAt = String(p.date_time || p.dateTime || '');

      let uniqueId = `${ctx.input.eventType}-${contactId || contactPhone}-${occurredAt || Date.now()}`;

      return {
        type: `sms.${ctx.input.eventType.replace('sms_', '')}`,
        id: uniqueId,
        output: {
          contactId: contactId || undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          messageContent: messageContent || undefined,
          initiatedBy: initiatedBy || undefined,
          occurredAt: occurredAt || undefined
        }
      };
    }
  })
  .build();
