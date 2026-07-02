import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let notificationEvents = SlateTrigger.create(spec, {
  name: 'Notification Events',
  key: 'notification_events',
  description:
    'Receives webhook events for notification interactions including displayed, clicked, and dismissed events. Configure the webhook URL in your OneSignal dashboard under Settings → Webhook.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type, e.g. "notification.displayed", "notification.clicked", "notification.dismissed"'
        ),
      eventId: z.string().describe('Unique event identifier'),
      notificationId: z.string().optional().describe('OneSignal notification ID'),
      subscriptionId: z
        .string()
        .optional()
        .describe('Subscription ID that received the notification'),
      onesignalId: z.string().optional().describe('OneSignal user ID'),
      externalId: z.string().optional().describe('External user ID'),
      appId: z.string().optional().describe('App ID'),
      heading: z.string().optional().describe('Notification heading'),
      content: z.string().optional().describe('Notification body'),
      url: z.string().optional().describe('Notification launch URL'),
      actionId: z.string().optional().describe('Action button ID if clicked'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      notificationId: z.string().optional().describe('OneSignal notification ID'),
      subscriptionId: z.string().optional().describe('Subscription that interacted'),
      onesignalId: z.string().optional().describe('OneSignal user ID'),
      externalId: z.string().optional().describe('External user ID'),
      heading: z.string().optional().describe('Notification heading text'),
      content: z.string().optional().describe('Notification body text'),
      url: z.string().optional().describe('Launch URL'),
      actionId: z.string().optional().describe('Clicked action button ID'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.input.request.json();
      } catch {
        return { inputs: [] };
      }

      // OneSignal webhook payloads may come as a single event or array
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let eventType = event.event || event.type || 'notification.unknown';
        let notificationId = event.id || event.notification_id || event.notificationId;
        let subscriptionId = event.subscription_id || event.subscriptionId || event.userId;
        let onesignalId = event.onesignal_id || event.onesignalId;
        let externalId = event.external_id || event.externalId;

        // Generate a unique event ID for deduplication
        let eventId = `${eventType}-${notificationId || ''}-${subscriptionId || ''}-${event.timestamp || Date.now()}`;

        return {
          eventType,
          eventId,
          notificationId,
          subscriptionId,
          onesignalId,
          externalId,
          appId: event.app_id || event.appId,
          heading: event.heading || event.headings?.en,
          content: event.content || event.contents?.en,
          url: event.url || event.launch_url,
          actionId: event.action_id || event.actionId,
          timestamp: event.timestamp ? String(event.timestamp) : undefined,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          notificationId: ctx.input.notificationId,
          subscriptionId: ctx.input.subscriptionId,
          onesignalId: ctx.input.onesignalId,
          externalId: ctx.input.externalId,
          heading: ctx.input.heading,
          content: ctx.input.content,
          url: ctx.input.url,
          actionId: ctx.input.actionId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
