import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

let WEBHOOK_EVENT_TYPES = [
  'accepted',
  'delivered',
  'opened',
  'clicked',
  'unsubscribed',
  'complained',
  'permanent_fail',
  'temporary_fail',
  'stored'
] as const;

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Triggers when email events occur such as delivery, opens, clicks, bounces, complaints, and unsubscribes. Receives real-time webhook notifications from Mailgun.'
})
  .input(
    z.object({
      eventType: z.string().describe('Mailgun event type'),
      eventId: z.string().describe('Unique event identifier'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      recipient: z.string().optional().describe('Recipient email address'),
      sender: z.string().optional().describe('Sender email address'),
      subject: z.string().optional().describe('Email subject'),
      messageId: z.string().optional().describe('Mailgun message ID'),
      severity: z.string().optional().describe('Severity for failed events'),
      reason: z.string().optional().describe('Failure or rejection reason'),
      deliveryStatusCode: z.number().optional().describe('SMTP status code'),
      deliveryStatusMessage: z.string().optional().describe('SMTP status message'),
      tags: z.array(z.string()).optional().describe('Tags attached to the message'),
      url: z.string().optional().describe('Clicked URL (for click events)'),
      ip: z
        .string()
        .optional()
        .describe('IP address of the recipient (for open/click events)'),
      country: z
        .string()
        .optional()
        .describe('Country of the recipient (for open/click events)'),
      city: z.string().optional().describe('City of the recipient (for open/click events)'),
      domain: z.string().optional().describe('Sending domain')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Mailgun message ID'),
      recipient: z.string().optional().describe('Recipient email address'),
      sender: z.string().optional().describe('Sender email address'),
      subject: z.string().optional().describe('Email subject'),
      domain: z.string().optional().describe('Sending domain'),
      severity: z
        .string()
        .optional()
        .describe('Severity for failed events (permanent or temporary)'),
      reason: z.string().optional().describe('Failure or rejection reason'),
      deliveryStatusCode: z.number().optional().describe('SMTP delivery status code'),
      deliveryStatusMessage: z.string().optional().describe('SMTP delivery status message'),
      tags: z.array(z.string()).optional().describe('Tags attached to the message'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      url: z.string().optional().describe('Clicked URL (for click events)'),
      ip: z.string().optional().describe('IP address of the recipient'),
      country: z.string().optional().describe('Country of the recipient'),
      city: z.string().optional().describe('City of the recipient')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });

      // List domains to register webhooks on all of them
      let domainsResult = await client.listDomains({ limit: 1000 });
      let domains = domainsResult.items || [];
      let registeredDomains: string[] = [];

      for (let domain of domains) {
        for (let eventType of WEBHOOK_EVENT_TYPES) {
          try {
            await client.createWebhook(domain.name, {
              id: eventType,
              url: ctx.input.webhookBaseUrl
            });
          } catch (_e: unknown) {
            // Webhook may already exist; attempt update instead
            try {
              await client.updateWebhook(domain.name, eventType, ctx.input.webhookBaseUrl);
            } catch {
              // Skip if we can't create or update
            }
          }
        }
        registeredDomains.push(domain.name);
      }

      return {
        registrationDetails: {
          domains: registeredDomains,
          webhookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
      let details = ctx.input.registrationDetails as { domains: string[] };

      for (let domain of details.domains || []) {
        for (let eventType of WEBHOOK_EVENT_TYPES) {
          try {
            await client.deleteWebhook(domain, eventType);
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    },

    handleRequest: async ctx => {
      let body: Record<string, unknown>;
      try {
        body = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      // Mailgun webhook payload structure has event-data at the top level or nested
      let eventData = (body['event-data'] || body) as Record<string, unknown>;
      let event = (eventData.event as string) || '';
      let timestamp = (eventData.timestamp as number) || 0;
      let id =
        (eventData.id as string) ||
        `${event}-${timestamp}-${Math.random().toString(36).slice(2)}`;

      let message = (eventData.message || {}) as Record<string, unknown>;
      let headers = (message.headers || {}) as Record<string, string>;
      let deliveryStatus = (eventData['delivery-status'] || {}) as Record<string, unknown>;
      let geolocation = (eventData.geolocation || {}) as Record<string, string>;
      let tags = (eventData.tags || []) as string[];
      let envelope = (eventData.envelope || {}) as Record<string, string>;

      // Map Mailgun's event names to our types
      let eventType = event;
      if (event === 'failed') {
        let severity = eventData.severity as string;
        eventType = severity === 'permanent' ? 'permanent_fail' : 'temporary_fail';
      }

      return {
        inputs: [
          {
            eventType,
            eventId: id,
            timestamp,
            recipient: eventData.recipient as string | undefined,
            sender: headers.from || envelope.sender,
            subject: headers.subject,
            messageId:
              headers['message-id'] || (eventData['message-id'] as string | undefined),
            severity: eventData.severity as string | undefined,
            reason: eventData.reason as string | undefined,
            deliveryStatusCode: deliveryStatus.code as number | undefined,
            deliveryStatusMessage: (deliveryStatus.message || deliveryStatus.description) as
              | string
              | undefined,
            tags,
            url: eventData.url as string | undefined,
            ip: (eventData.ip as string | undefined) || geolocation.ip,
            country: geolocation.country,
            city: geolocation.city,
            domain:
              (eventData['sending-domain'] as string | undefined) || envelope['sending-domain']
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, eventId } = ctx.input;

      // Map event type to the output type format
      let type: string;
      switch (eventType) {
        case 'permanent_fail':
        case 'temporary_fail':
          type = `message.${eventType}`;
          break;
        default:
          type = `message.${eventType}`;
      }

      return {
        type,
        id: eventId,
        output: {
          messageId: ctx.input.messageId,
          recipient: ctx.input.recipient,
          sender: ctx.input.sender,
          subject: ctx.input.subject,
          domain: ctx.input.domain,
          severity: ctx.input.severity,
          reason: ctx.input.reason,
          deliveryStatusCode: ctx.input.deliveryStatusCode,
          deliveryStatusMessage: ctx.input.deliveryStatusMessage,
          tags: ctx.input.tags,
          timestamp: ctx.input.timestamp,
          url: ctx.input.url,
          ip: ctx.input.ip,
          country: ctx.input.country,
          city: ctx.input.city
        }
      };
    }
  })
  .build();
