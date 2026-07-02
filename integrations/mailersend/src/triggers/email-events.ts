import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailEventTypes = [
  'activity.sent',
  'activity.delivered',
  'activity.soft_bounced',
  'activity.hard_bounced',
  'activity.deferred',
  'activity.opened',
  'activity.opened_unique',
  'activity.clicked',
  'activity.clicked_unique',
  'activity.unsubscribed',
  'activity.spam_complaint',
  'activity.survey_opened',
  'activity.survey_submitted',
  'sender_identity.verified',
  'inbound_forward.failed',
  'bulk_email.completed',
  'email_single.verified',
  'email_list.verified',
  'maintenance.start',
  'maintenance.end'
] as const;

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Receive real-time notifications for email lifecycle events including delivery, opens, clicks, bounces, spam complaints, and operational events like sender verification and maintenance.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of email event.'),
      eventTimestamp: z.string().describe('ISO 8601 timestamp of the event.'),
      webhookPayload: z
        .record(z.string(), z.unknown())
        .describe('Full webhook payload from MailerSend.')
    })
  )
  .output(
    z.object({
      messageId: z.string().nullable().describe('Message ID associated with the event.'),
      recipientEmail: z.string().nullable().describe('Recipient email address.'),
      senderEmail: z.string().nullable().describe('Sender email address.'),
      subject: z.string().nullable().describe('Email subject line.'),
      domainId: z.string().nullable().describe('Domain ID.'),
      eventTimestamp: z.string().describe('When the event occurred.'),
      eventData: z.record(z.string(), z.unknown()).describe('Full event data from MailerSend.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // We need a domain_id to register. List domains and register for the first verified one,
      // or allow the user to have set it up. We'll try to get all domains.
      let domainsResult = await client.listDomains({ limit: 100 });
      let domains = domainsResult.data || [];

      let registeredWebhooks: Array<{ webhookId: string; domainId: string }> = [];

      for (let domain of domains) {
        let domainId = String(domain.id || '');
        if (!domainId) continue;

        try {
          let result = await client.createWebhook({
            url: ctx.input.webhookBaseUrl,
            name: `Slates Email Events - ${domain.name}`,
            events: [...emailEventTypes],
            domainId,
            enabled: true
          });

          registeredWebhooks.push({
            webhookId: String(result.data.id || ''),
            domainId
          });
        } catch (_err) {
          // Continue with other domains if one fails
        }
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: string; domainId: string }>;
      };

      for (let webhook of details.webhooks || []) {
        try {
          await client.deleteWebhook(webhook.webhookId);
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
      let email = eventData.email as Record<string, unknown> | undefined;
      let message = (eventData.message || email) as Record<string, unknown> | undefined;

      let messageId = String(eventData.message_id || message?.id || eventData.id || '');
      let recipientEmail =
        String(
          eventData.recipient?.toString() ||
            (eventData.email as Record<string, unknown>)?.recipient?.toString() ||
            ''
        ) || null;
      let senderEmail =
        String((message?.from as string) || (eventData.from as string) || '') || null;
      let subject =
        String((message?.subject as string) || (eventData.subject as string) || '') || null;
      let domainId = String(eventData.domain_id || '') || null;

      // Build a unique event ID from available data
      let eventId = `${ctx.input.eventType}-${messageId || ''}-${ctx.input.eventTimestamp}`;

      return {
        type: ctx.input.eventType,
        id: eventId,
        output: {
          messageId: messageId || null,
          recipientEmail,
          senderEmail,
          subject,
          domainId,
          eventTimestamp: ctx.input.eventTimestamp,
          eventData
        }
      };
    }
  })
  .build();
