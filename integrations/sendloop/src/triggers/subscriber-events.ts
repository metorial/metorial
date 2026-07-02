import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let subscriberEvents = SlateTrigger.create(spec, {
  name: 'Subscriber Events',
  key: 'subscriber_events',
  description:
    'Triggered when subscriber-related events occur on a list, including new subscriptions, unsubscriptions, hard bounces, and spam complaints. Configure the webhook URL in your Sendloop list settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of subscriber event'),
      emailAddress: z.string().describe('Email address of the affected subscriber'),
      listId: z.string().optional().describe('ID of the subscriber list'),
      subscriberId: z.string().optional().describe('ID of the subscriber'),
      rawPayload: z.record(z.string(), z.any()).describe('Full webhook payload from Sendloop')
    })
  )
  .output(
    z.object({
      emailAddress: z.string().describe('Email address of the affected subscriber'),
      listId: z.string().optional().describe('ID of the subscriber list'),
      subscriberId: z.string().optional().describe('ID of the subscriber')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, any>;

      try {
        let contentType = ctx.request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          body = (await ctx.request.json()) as Record<string, any>;
        } else {
          let text = await ctx.request.text();
          let params = new URLSearchParams(text);
          body = Object.fromEntries(params.entries());
        }
      } catch {
        body = {};
      }

      let eventType =
        body.EventType || body.event_type || body.Event || body.event || 'unknown';
      let emailAddress =
        body.EmailAddress || body.email_address || body.Email || body.email || '';
      let listId = body.ListID || body.list_id || body.SubscriberListID || '';
      let subscriberId = body.SubscriberID || body.subscriber_id || '';

      let normalizedEventType = String(eventType).toLowerCase().replace(/\s+/g, '_');

      return {
        inputs: [
          {
            eventType: normalizedEventType,
            emailAddress: String(emailAddress),
            listId: listId ? String(listId) : undefined,
            subscriberId: subscriberId ? String(subscriberId) : undefined,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, emailAddress, listId, subscriberId } = ctx.input;

      let typeMap: Record<string, string> = {
        subscription: 'subscriber.subscribed',
        subscribed: 'subscriber.subscribed',
        subscribe: 'subscriber.subscribed',
        unsubscription: 'subscriber.unsubscribed',
        unsubscribed: 'subscriber.unsubscribed',
        unsubscribe: 'subscriber.unsubscribed',
        hard_bounce: 'subscriber.hard_bounce',
        hardbounce: 'subscriber.hard_bounce',
        bounce: 'subscriber.hard_bounce',
        spam_complaint: 'subscriber.spam_complaint',
        complaint: 'subscriber.spam_complaint',
        spam: 'subscriber.spam_complaint'
      };

      let type = typeMap[eventType] || `subscriber.${eventType}`;
      let eventId = `${type}_${emailAddress}_${listId || 'unknown'}_${Date.now()}`;

      return {
        type,
        id: eventId,
        output: {
          emailAddress,
          listId: listId || undefined,
          subscriberId: subscriberId || undefined
        }
      };
    }
  })
  .build();
