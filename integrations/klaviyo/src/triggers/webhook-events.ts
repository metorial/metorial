import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let generateSecretKey = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let length = 32;
  let result = '';
  let randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
};

export let webhookEvents = SlateTrigger.create(spec, {
  name: 'Webhook Events',
  key: 'webhook_events',
  description:
    'Receives real-time webhook notifications from Klaviyo for email, SMS, push notification, review, and consent events. Automatically registers and manages the webhook subscription.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic identifier (e.g., klaviyo.received_email)'),
      eventId: z.string().describe('Unique event identifier'),
      timestamp: z.string().describe('Event timestamp'),
      eventProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Event-specific properties'),
      profileId: z.string().optional().describe('Associated profile ID'),
      metricId: z.string().optional().describe('Associated metric ID'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      topic: z.string().describe('Webhook topic'),
      profileId: z.string().optional().describe('Associated profile ID'),
      email: z.string().optional().describe('Profile email address'),
      phoneNumber: z.string().optional().describe('Profile phone number'),
      metricId: z.string().optional().describe('Metric ID'),
      campaignId: z.string().optional().describe('Campaign ID if applicable'),
      flowId: z.string().optional().describe('Flow ID if applicable'),
      messageId: z.string().optional().describe('Message ID if applicable'),
      listId: z.string().optional().describe('List ID if applicable'),
      subject: z.string().optional().describe('Email subject if applicable'),
      url: z.string().optional().describe('Clicked URL if applicable'),
      eventTimestamp: z.string().optional().describe('When the event occurred'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional event properties')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let secretKey = generateSecretKey();

      // Register webhook with all available email, SMS, push, review, and consent topics
      let topics = [
        'klaviyo/received_email',
        'klaviyo/opened_email',
        'klaviyo/clicked_email',
        'klaviyo/bounced_email',
        'klaviyo/marked_email_as_spam',
        'klaviyo/unsubscribed',
        'klaviyo/received_sms',
        'klaviyo/clicked_sms',
        'klaviyo/sent_sms',
        'klaviyo/received_push',
        'klaviyo/opened_push',
        'klaviyo/bounced_push',
        'klaviyo/subscribed_to_email_marketing',
        'klaviyo/subscribed_to_sms_marketing',
        'klaviyo/unsubscribed_from_email_marketing',
        'klaviyo/unsubscribed_from_sms_marketing',
        'klaviyo/review_submitted'
      ];

      let result = await client.createWebhook({
        name: 'Slates Integration Webhook',
        endpoint_url: ctx.input.webhookBaseUrl,
        secret_key: secretKey,
        topics,
        description: 'Auto-registered by Slates integration',
        enabled: true
      });

      let webhook = Array.isArray(result.data) ? result.data[0] : result.data;

      return {
        registrationDetails: {
          webhookId: webhook?.id,
          secretKey
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);

      let details = ctx.input.registrationDetails as { webhookId?: string };
      if (details?.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Klaviyo webhook payloads contain event data
      // The payload structure: { type, id, attributes: { topic, timestamp, ... }, relationships: { ... } }
      if (!body) return { inputs: [] };

      // Handle single event or array of events
      let events: any[] = [];
      if (Array.isArray(body.data)) {
        events = body.data;
      } else if (body.data) {
        events = [body.data];
      } else if (body.type) {
        events = [body];
      } else {
        // Might be the raw event structure
        events = [body];
      }

      let inputs = events.map((event: any) => {
        let attributes = event.attributes ?? event;
        let relationships = event.relationships ?? {};

        return {
          topic: attributes.topic ?? attributes.event_name ?? event.type ?? 'unknown',
          eventId:
            event.id ??
            `${attributes.topic ?? 'event'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          timestamp: attributes.timestamp ?? attributes.datetime ?? new Date().toISOString(),
          eventProperties: attributes.event_properties ?? attributes.properties ?? {},
          profileId: relationships.profile?.data?.id ?? attributes.profile_id ?? undefined,
          metricId: relationships.metric?.data?.id ?? attributes.metric_id ?? undefined,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.rawPayload;
      let attributes = raw?.attributes ?? raw ?? {};
      let eventProps = ctx.input.eventProperties ?? {};

      // Normalize the topic to a dot-separated format
      let topic = ctx.input.topic.replace(/\//g, '.');

      return {
        type: topic,
        id: ctx.input.eventId,
        output: {
          topic: ctx.input.topic,
          profileId: ctx.input.profileId,
          email: eventProps.email ?? attributes.email ?? undefined,
          phoneNumber: eventProps.phone_number ?? attributes.phone_number ?? undefined,
          metricId: ctx.input.metricId,
          campaignId: eventProps.campaign_id ?? eventProps.$campaign ?? undefined,
          flowId: eventProps.flow_id ?? eventProps.$flow ?? undefined,
          messageId: eventProps.message_id ?? eventProps.$message ?? undefined,
          listId: eventProps.list_id ?? eventProps.$list ?? undefined,
          subject: eventProps.subject ?? eventProps.$subject ?? undefined,
          url: eventProps.url ?? eventProps.$url ?? undefined,
          eventTimestamp: ctx.input.timestamp,
          properties: eventProps
        }
      };
    }
  })
  .build();
