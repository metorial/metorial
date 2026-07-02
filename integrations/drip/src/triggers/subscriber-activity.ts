import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let SUBSCRIBER_LIFECYCLE_EVENTS = [
  'subscriber.created',
  'subscriber.deleted',
  'subscriber.reactivated',
  'subscriber.marked_as_deliverable',
  'subscriber.marked_as_undeliverable'
] as const;

let SUBSCRIPTION_EVENTS = [
  'subscriber.subscribed_to_email_marketing',
  'subscriber.subscribed_to_campaign',
  'subscriber.removed_from_campaign',
  'subscriber.unsubscribed_from_campaign',
  'subscriber.unsubscribed_all',
  'subscriber.completed_campaign'
] as const;

let PROPERTY_EVENTS = [
  'subscriber.applied_tag',
  'subscriber.removed_tag',
  'subscriber.updated_custom_field',
  'subscriber.updated_email_address',
  'subscriber.updated_lifetime_value',
  'subscriber.updated_time_zone',
  'subscriber.updated_alias'
] as const;

let EMAIL_ENGAGEMENT_EVENTS = [
  'subscriber.received_email',
  'subscriber.opened_email',
  'subscriber.clicked_email',
  'subscriber.bounced',
  'subscriber.complained'
] as const;

let BEHAVIORAL_EVENTS = [
  'subscriber.clicked_trigger_link',
  'subscriber.visited_page',
  'subscriber.performed_custom_event',
  'subscriber.became_lead',
  'subscriber.became_non_prospect',
  'subscriber.updated_lead_score'
] as const;

let ALL_EVENTS = [
  ...SUBSCRIBER_LIFECYCLE_EVENTS,
  ...SUBSCRIPTION_EVENTS,
  ...PROPERTY_EVENTS,
  ...EMAIL_ENGAGEMENT_EVENTS,
  ...BEHAVIORAL_EVENTS
];

export let subscriberActivity = SlateTrigger.create(spec, {
  name: 'Subscriber Activity',
  key: 'subscriber_activity',
  description:
    'Triggers when subscriber events occur in Drip, including lifecycle changes (created, deleted), email marketing subscriptions, property updates (tags, custom fields), email engagement (opens, clicks, bounces), and behavioral events (page visits, custom events, lead scoring).'
})
  .input(
    z.object({
      eventType: z.string().describe('The Drip event type, e.g. subscriber.created.'),
      subscriberEmail: z.string().optional().describe('The subscriber email address.'),
      subscriberId: z.string().optional().describe('The Drip subscriber ID.'),
      eventId: z.string().describe('Unique event identifier for deduplication.'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional event-specific properties.'),
      subscriberData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full subscriber data from the webhook payload.'),
      occurredAt: z.string().optional().describe('Timestamp of the event.'),
      accountId: z.string().optional().describe('Drip account ID.')
    })
  )
  .output(
    z.object({
      subscriberEmail: z.string().optional().describe('The subscriber email address.'),
      subscriberId: z.string().optional().describe('The Drip subscriber ID.'),
      firstName: z.string().optional().describe('Subscriber first name.'),
      lastName: z.string().optional().describe('Subscriber last name.'),
      status: z.string().optional().describe('Subscriber status.'),
      tags: z.array(z.string()).optional().describe('Subscriber tags.'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Subscriber custom fields.'),
      lifetimeValue: z.number().optional().describe('Subscriber lifetime value.'),
      leadScore: z.number().optional().describe('Subscriber lead score.'),
      campaignId: z.string().optional().describe('Related campaign ID (for campaign events).'),
      campaignName: z
        .string()
        .optional()
        .describe('Related campaign name (for campaign events).'),
      tagName: z.string().optional().describe('Tag that was applied or removed.'),
      fieldIdentifier: z
        .string()
        .optional()
        .describe('Custom field identifier (for field update events).'),
      fieldValue: z.string().optional().describe('New custom field value.'),
      previousFieldValue: z.string().optional().describe('Previous custom field value.'),
      clickedUrl: z.string().optional().describe('Clicked URL (for email click events).'),
      eventAction: z
        .string()
        .optional()
        .describe('Custom event action name (for performed_custom_event).'),
      eventProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom event properties.'),
      previousLeadScore: z
        .number()
        .optional()
        .describe('Previous lead score (for score update events).'),
      occurredAt: z.string().optional().describe('Event timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId,
        tokenType: ctx.auth.tokenType
      });

      // Register webhook for all events (except subscriber.received_email which is opt-in due to high volume)
      let eventsToRegister = ALL_EVENTS.filter(e => e !== 'subscriber.received_email');

      let result = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        eventsToRegister,
        false
      );
      let webhook = result.webhooks?.[0];

      return {
        registrationDetails: {
          webhookId: webhook?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId,
        tokenType: ctx.auth.tokenType
      });

      let details = ctx.input.registrationDetails as { webhookId?: string };
      if (details?.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Drip webhook payloads may contain multiple events
      // The payload has an "event" field and a "data" field
      // or it may be an array of events
      let events: any[] = [];

      if (Array.isArray(body)) {
        events = body;
      } else if (body.event && body.data) {
        events = [body];
      } else if (body.events) {
        events = body.events;
      } else {
        events = [body];
      }

      let inputs = events.map((evt: any, index: number) => {
        let eventType = evt.event ?? evt.type ?? 'unknown';
        let subscriber = evt.data?.subscriber ?? evt.subscriber ?? evt.data ?? {};
        let properties = evt.data?.properties ?? evt.properties ?? {};

        let eventId = `${eventType}-${subscriber.id ?? subscriber.email ?? ''}-${evt.occurred_at ?? Date.now()}-${index}`;

        return {
          eventType,
          subscriberEmail: subscriber.email,
          subscriberId: subscriber.id,
          eventId,
          properties,
          subscriberData: subscriber,
          occurredAt: evt.occurred_at,
          accountId: evt.account_id
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let sub = ctx.input.subscriberData ?? {};
      let props = ctx.input.properties ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          subscriberEmail: ctx.input.subscriberEmail ?? sub.email,
          subscriberId: ctx.input.subscriberId ?? sub.id,
          firstName: sub.first_name,
          lastName: sub.last_name,
          status: sub.status,
          tags: sub.tags,
          customFields: sub.custom_fields,
          lifetimeValue: sub.lifetime_value,
          leadScore: sub.lead_score,
          campaignId: props.campaign_id,
          campaignName: props.campaign_name,
          tagName: props.tag,
          fieldIdentifier: props.identifier ?? props.custom_field_identifier,
          fieldValue: props.value,
          previousFieldValue: props.previous_value,
          clickedUrl: props.url,
          eventAction: props.action,
          eventProperties: props.properties,
          previousLeadScore: props.previous_lead_score,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
