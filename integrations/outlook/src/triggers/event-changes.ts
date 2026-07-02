import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let eventChanges = SlateTrigger.create(spec, {
  name: 'Calendar Event Changes',
  key: 'event_changes',
  description:
    'Triggers when calendar events are created, updated, or deleted. Subscribes to Microsoft Graph webhook notifications for calendar event changes.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change that occurred'),
      resourceUri: z.string().describe('Resource path of the changed event'),
      eventId: z.string().describe('ID of the affected calendar event'),
      subscriptionId: z.string().describe('ID of the subscription'),
      tenantId: z.string().optional()
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      subject: z.string().optional(),
      bodyPreview: z.string().optional(),
      startDateTime: z.string().optional(),
      startTimeZone: z.string().optional(),
      endDateTime: z.string().optional(),
      endTimeZone: z.string().optional(),
      locationDisplayName: z.string().optional(),
      isAllDay: z.boolean().optional(),
      isCancelled: z.boolean().optional(),
      isOnlineMeeting: z.boolean().optional(),
      onlineMeetingJoinUrl: z.string().optional(),
      organizerEmail: z.string().optional(),
      organizerName: z.string().optional(),
      attendeeCount: z.number().optional(),
      showAs: z.string().optional(),
      webLink: z.string().optional(),
      categories: z.array(z.string()).optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let expirationDateTime = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000
      ).toISOString();

      let subscription = await client.createSubscription({
        changeType: 'created,updated,deleted',
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: 'me/events',
        expirationDateTime,
        clientState: 'slates-event-changes'
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          expirationDateTime: subscription.expirationDateTime
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      let url = new URL(ctx.request.url);
      let validationToken = url.searchParams.get('validationToken');
      if (validationToken) {
        return {
          inputs: [],
          response: new Response(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          })
        };
      }

      let body = (await ctx.request.json()) as {
        value: Array<{
          changeType: 'created' | 'updated' | 'deleted';
          resource: string;
          resourceData?: { id: string; '@odata.type'?: string };
          subscriptionId: string;
          clientState?: string;
          tenantId?: string;
        }>;
      };

      if (!body?.value?.length) {
        return { inputs: [] };
      }

      let notifications = body.value.filter(n => n.clientState === 'slates-event-changes');

      let inputs = notifications
        .filter(n => n.resourceData?.id)
        .map(n => ({
          changeType: n.changeType,
          resourceUri: n.resource,
          eventId: n.resourceData!.id,
          subscriptionId: n.subscriptionId,
          tenantId: n.tenantId
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let { changeType, eventId } = ctx.input;

      if (changeType === 'deleted') {
        return {
          type: `event.${changeType}`,
          id: `${eventId}-${changeType}-${Date.now()}`,
          output: {
            eventId
          }
        };
      }

      try {
        let client = new Client({ token: ctx.auth.token });
        let ev = await client.getEvent(eventId);

        return {
          type: `event.${changeType}`,
          id: `${eventId}-${changeType}-${ev.lastModifiedDateTime || Date.now()}`,
          output: {
            eventId: ev.id,
            subject: ev.subject,
            bodyPreview: ev.bodyPreview,
            startDateTime: ev.start?.dateTime,
            startTimeZone: ev.start?.timeZone,
            endDateTime: ev.end?.dateTime,
            endTimeZone: ev.end?.timeZone,
            locationDisplayName: ev.location?.displayName,
            isAllDay: ev.isAllDay,
            isCancelled: ev.isCancelled,
            isOnlineMeeting: ev.isOnlineMeeting,
            onlineMeetingJoinUrl: ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl,
            organizerEmail: ev.organizer?.emailAddress?.address,
            organizerName: ev.organizer?.emailAddress?.name,
            attendeeCount: ev.attendees?.length,
            showAs: ev.showAs,
            webLink: ev.webLink,
            categories: ev.categories
          }
        };
      } catch {
        return {
          type: `event.${changeType}`,
          id: `${eventId}-${changeType}-${Date.now()}`,
          output: {
            eventId
          }
        };
      }
    }
  })
  .build();
