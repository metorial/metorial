import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let calendarListChanges = SlateTrigger.create(spec, {
  name: 'Calendar List Changes',
  key: 'calendar_list_changes',
  description:
    "Triggers when the user's calendar list changes — calendars are added, removed, or their properties are modified. Uses Google Calendar push notifications (webhooks) with sync token-based change detection."
})
  .scopes(googleCalendarActionScopes.calendarListChanges)
  .input(
    z.object({
      changeType: z
        .enum(['added', 'updated', 'removed'])
        .describe('The type of change detected'),
      calendarId: z.string().describe('The calendar ID that changed'),
      summary: z.string().optional().describe('Calendar title'),
      description: z.string().optional().describe('Calendar description'),
      timeZone: z.string().optional().describe('Calendar time zone'),
      accessRole: z.string().optional().describe('Access role'),
      primary: z.boolean().optional().describe('Whether this is the primary calendar'),
      hidden: z.boolean().optional().describe('Whether the calendar is hidden'),
      selected: z.boolean().optional().describe('Whether the calendar is selected'),
      backgroundColor: z.string().optional().describe('Background color'),
      foregroundColor: z.string().optional().describe('Foreground color'),
      deleted: z.boolean().optional().describe('Whether the calendar entry was deleted')
    })
  )
  .output(
    z.object({
      calendarId: z.string().describe('The calendar ID that changed'),
      summary: z.string().optional().describe('Calendar title'),
      description: z.string().optional().describe('Calendar description'),
      timeZone: z.string().optional().describe('Calendar time zone'),
      accessRole: z.string().optional().describe('Access role'),
      primary: z.boolean().optional().describe('Whether this is the primary calendar'),
      hidden: z.boolean().optional().describe('Whether the calendar is hidden'),
      selected: z.boolean().optional().describe('Whether the calendar is selected'),
      backgroundColor: z.string().optional().describe('Background color'),
      foregroundColor: z.string().optional().describe('Foreground color')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GoogleCalendarClient(ctx.auth.token);

      let channelId = `slates-callist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Initial sync to get a sync token
      let syncResult = await client.listCalendarList({ maxResults: 1 });

      let watchResponse = await client.watchCalendarList({
        id: channelId,
        type: 'web_hook',
        address: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          channelId: watchResponse.id || channelId,
          resourceId: watchResponse.resourceId,
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
      let resourceState = ctx.request.headers.get('x-goog-resource-state');

      // Google sends a "sync" message on channel creation - ignore it
      if (resourceState === 'sync') {
        return { inputs: [] };
      }

      let client = new GoogleCalendarClient(ctx.auth.token);
      let syncToken = ctx.state?.syncToken;

      let inputs: Array<{
        changeType: 'added' | 'updated' | 'removed';
        calendarId: string;
        summary?: string;
        description?: string;
        timeZone?: string;
        accessRole?: string;
        primary?: boolean;
        hidden?: boolean;
        selected?: boolean;
        backgroundColor?: string;
        foregroundColor?: string;
        deleted?: boolean;
      }> = [];

      try {
        let listParams: any = {};

        if (syncToken) {
          listParams.syncToken = syncToken;
          listParams.showDeleted = true;
          listParams.showHidden = true;
        } else {
          listParams.maxResults = 50;
          listParams.showHidden = true;
        }

        let result = await client.listCalendarList(listParams);
        let newSyncToken = result.nextSyncToken;

        for (let entry of result.items || []) {
          if (!entry.id) continue;

          let isDeleted = (entry as any).deleted === true;
          let changeType: 'added' | 'updated' | 'removed' = 'updated';
          if (isDeleted) {
            changeType = 'removed';
          }

          inputs.push({
            changeType,
            calendarId: entry.id,
            summary: entry.summary,
            description: entry.description,
            timeZone: entry.timeZone,
            accessRole: entry.accessRole,
            primary: entry.primary,
            hidden: entry.hidden,
            selected: entry.selected,
            backgroundColor: entry.backgroundColor,
            foregroundColor: entry.foregroundColor,
            deleted: isDeleted
          });
        }

        return {
          inputs,
          updatedState: {
            syncToken: newSyncToken || syncToken
          }
        };
      } catch (err: any) {
        // If sync token is invalid (410 Gone), perform a full sync
        if (err?.response?.status === 410) {
          let result = await client.listCalendarList({ maxResults: 1 });
          return {
            inputs: [],
            updatedState: {
              syncToken: result.nextSyncToken
            }
          };
        }
        throw err;
      }
    },

    handleEvent: async ctx => {
      return {
        type: `calendar_list.${ctx.input.changeType}`,
        id: `${ctx.input.calendarId}-${Date.now()}`,
        output: {
          calendarId: ctx.input.calendarId,
          summary: ctx.input.summary,
          description: ctx.input.description,
          timeZone: ctx.input.timeZone,
          accessRole: ctx.input.accessRole,
          primary: ctx.input.primary,
          hidden: ctx.input.hidden,
          selected: ctx.input.selected,
          backgroundColor: ctx.input.backgroundColor,
          foregroundColor: ctx.input.foregroundColor
        }
      };
    }
  })
  .build();
