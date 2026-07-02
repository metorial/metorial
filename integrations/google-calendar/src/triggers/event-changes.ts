import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let eventChanges = SlateTrigger.create(spec, {
  name: 'Event Changes',
  key: 'event_changes',
  description:
    'Triggers when events on a specified calendar are created, updated, or deleted. Uses Google Calendar push notifications (webhooks) with automatic sync token-based change detection.'
})
  .scopes(googleCalendarActionScopes.eventChanges)
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('The type of change detected'),
      eventId: z.string().describe('The event ID that changed'),
      calendarId: z.string().describe('The calendar ID where the change occurred'),
      summary: z.string().optional().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      location: z.string().optional().describe('Event location'),
      start: z.any().optional().describe('Event start time'),
      end: z.any().optional().describe('Event end time'),
      status: z.string().optional().describe('Event status'),
      htmlLink: z.string().optional().describe('URL to view the event'),
      hangoutLink: z.string().optional().describe('Google Meet link'),
      creator: z.any().optional().describe('Event creator'),
      organizer: z.any().optional().describe('Event organizer'),
      attendees: z.array(z.any()).optional().describe('Event attendees'),
      updated: z.string().optional().describe('Last modification timestamp'),
      eventType: z.string().optional().describe('Event type')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('The event ID that changed'),
      calendarId: z.string().describe('The calendar ID'),
      summary: z.string().optional().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      location: z.string().optional().describe('Event location'),
      start: z.any().optional().describe('Event start time'),
      end: z.any().optional().describe('Event end time'),
      status: z.string().optional().describe('Event status'),
      htmlLink: z.string().optional().describe('URL to view the event'),
      hangoutLink: z.string().optional().describe('Google Meet link'),
      creator: z.any().optional().describe('Event creator'),
      organizer: z.any().optional().describe('Event organizer'),
      attendees: z.array(z.any()).optional().describe('Event attendees'),
      updated: z.string().optional().describe('Last modification timestamp'),
      eventType: z.string().optional().describe('Event type')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GoogleCalendarClient(ctx.auth.token);

      let channelId = `slates-events-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Initial sync to get a sync token - we need to do a full list first
      let syncResult = await client.listEvents({
        calendarId: 'primary',
        maxResults: 1,
        showDeleted: true
      });

      let watchResponse = await client.watchEvents('primary', {
        id: channelId,
        type: 'web_hook',
        address: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          channelId: watchResponse.id || channelId,
          resourceId: watchResponse.resourceId,
          calendarId: 'primary',
          expiration: watchResponse.expiration,
          syncToken: syncResult.nextSyncToken
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GoogleCalendarClient(ctx.auth.token);
      let details = ctx.input.registrationDetails;

      if (details?.channelId && details?.resourceId) {
        await client.stopChannel(details.channelId, details.resourceId);
      }
    },

    handleRequest: async ctx => {
      let channelId = ctx.request.headers.get('x-goog-channel-id');
      let resourceState = ctx.request.headers.get('x-goog-resource-state');

      // Google sends a "sync" message on channel creation - ignore it
      if (resourceState === 'sync') {
        return { inputs: [] };
      }

      // The webhook only tells us something changed - we need to fetch the changes
      let client = new GoogleCalendarClient(ctx.auth.token);
      let calendarId = ctx.state?.calendarId || 'primary';
      let syncToken = ctx.state?.syncToken;

      let inputs: Array<{
        changeType: 'created' | 'updated' | 'deleted';
        eventId: string;
        calendarId: string;
        summary?: string;
        description?: string;
        location?: string;
        start?: any;
        end?: any;
        status?: string;
        htmlLink?: string;
        hangoutLink?: string;
        creator?: any;
        organizer?: any;
        attendees?: any[];
        updated?: string;
        eventType?: string;
      }> = [];

      try {
        let listParams: any = {
          calendarId,
          showDeleted: true,
          singleEvents: false
        };

        if (syncToken) {
          listParams.syncToken = syncToken;
        } else {
          // If no sync token, just get recent events
          listParams.updatedMin = new Date(Date.now() - 60000).toISOString();
          listParams.maxResults = 50;
        }

        let result = await client.listEvents(listParams);
        let newSyncToken = result.nextSyncToken;

        for (let event of result.items || []) {
          if (!event.id) continue;

          let changeType: 'created' | 'updated' | 'deleted' = 'updated';
          if (event.status === 'cancelled') {
            changeType = 'deleted';
          } else if (event.created && event.updated && event.created === event.updated) {
            changeType = 'created';
          }

          inputs.push({
            changeType,
            eventId: event.id,
            calendarId,
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: event.start,
            end: event.end,
            status: event.status,
            htmlLink: event.htmlLink,
            hangoutLink: event.hangoutLink,
            creator: event.creator,
            organizer: event.organizer,
            attendees: event.attendees,
            updated: event.updated,
            eventType: event.eventType
          });
        }

        return {
          inputs,
          updatedState: {
            syncToken: newSyncToken || syncToken,
            calendarId,
            channelId
          }
        };
      } catch (err: any) {
        // If sync token is invalid (410 Gone), perform a full sync
        if (err?.response?.status === 410) {
          let result = await client.listEvents({
            calendarId,
            maxResults: 1,
            showDeleted: true
          });
          return {
            inputs: [],
            updatedState: {
              syncToken: result.nextSyncToken,
              calendarId,
              channelId
            }
          };
        }
        throw err;
      }
    },

    handleEvent: async ctx => {
      return {
        type: `event.${ctx.input.changeType}`,
        id: `${ctx.input.eventId}-${ctx.input.updated || Date.now()}`,
        output: {
          eventId: ctx.input.eventId,
          calendarId: ctx.input.calendarId,
          summary: ctx.input.summary,
          description: ctx.input.description,
          location: ctx.input.location,
          start: ctx.input.start,
          end: ctx.input.end,
          status: ctx.input.status,
          htmlLink: ctx.input.htmlLink,
          hangoutLink: ctx.input.hangoutLink,
          creator: ctx.input.creator,
          organizer: ctx.input.organizer,
          attendees: ctx.input.attendees,
          updated: ctx.input.updated,
          eventType: ctx.input.eventType
        }
      };
    }
  })
  .build();
