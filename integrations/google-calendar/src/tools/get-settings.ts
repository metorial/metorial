import { buildApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

let settingSchema = z.object({
  settingId: z.string().describe('Calendar setting ID'),
  value: z.string().describe('Setting value')
});

export let getSettings = SlateTool.create(spec, {
  name: 'Get Settings',
  key: 'get_settings',
  description:
    'Retrieve one Google Calendar user setting or list the settings explicitly stored for the authenticated user.',
  instructions: [
    'Omit settingId to list settings. Google may omit settings that currently use their default value.',
    'Provide settingId to retrieve one supported setting, such as timezone, weekStart, or defaultEventLength.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleCalendarActionScopes.getSettings)
  .input(
    z.object({
      settingId: z
        .string()
        .optional()
        .describe('Specific setting ID to retrieve. Omit to list user settings.'),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe(
          'Maximum settings to return when listing, from 1 to 250. Ignored when settingId is provided.'
        ),
      pageToken: z
        .string()
        .optional()
        .describe(
          'Page token returned by a previous settings list request. Ignored when settingId is provided.'
        ),
      syncToken: z
        .string()
        .optional()
        .describe(
          'Sync token returned by a completed settings list request. Returns only settings changed since that request. Ignored when settingId is provided.'
        )
    })
  )
  .output(
    z.object({
      settings: z.array(settingSchema).describe('Calendar settings returned by Google'),
      nextPageToken: z.string().optional().describe('Token for the next page of settings'),
      nextSyncToken: z.string().optional().describe('Token for incremental settings sync'),
      totalResults: z.number().describe('Number of settings returned')
    })
  )
  .handleInvocation(async ctx => {
    try {
      let client = new GoogleCalendarClient(ctx.auth.token);
      let result = ctx.input.settingId
        ? { items: [await client.getSetting(ctx.input.settingId)] }
        : await client.listSettings({
            maxResults: ctx.input.maxResults,
            pageToken: ctx.input.pageToken,
            syncToken: ctx.input.syncToken
          });
      let settings = (result.items ?? [])
        .filter(setting => setting.id !== undefined && setting.value !== undefined)
        .map(setting => ({ settingId: setting.id!, value: setting.value! }));

      return {
        output: {
          settings,
          nextPageToken: 'nextPageToken' in result ? result.nextPageToken : undefined,
          nextSyncToken: 'nextSyncToken' in result ? result.nextSyncToken : undefined,
          totalResults: settings.length
        },
        message: ctx.input.settingId
          ? `Retrieved Calendar setting **${ctx.input.settingId}**.`
          : `Retrieved **${settings.length}** Calendar setting(s).`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Calendar',
        operation: 'get settings',
        reason: 'google_calendar_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
