import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { DriveClient } from '../lib/drive-client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let spreadsheetChanged = SlateTrigger.create(spec, {
  name: 'Spreadsheet Changed',
  key: 'spreadsheet_changed',
  description:
    'Triggers when a watched spreadsheet file is modified. Uses Google Drive push notifications to detect changes, then fetches updated spreadsheet metadata. Requires Drive scope.'
})
  .scopes(googleSheetsActionScopes.spreadsheetChanged)
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet that changed'),
      resourceState: z
        .string()
        .describe(
          'State of the resource change (sync, update, add, remove, trash, untrash, change)'
        ),
      changedFields: z.string().optional().describe('Comma-separated list of changed fields'),
      channelId: z.string().optional().describe('Channel ID of the notification')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the changed spreadsheet'),
      spreadsheetUrl: z.string().describe('URL of the spreadsheet'),
      title: z.string().describe('Current title of the spreadsheet'),
      modifiedTime: z.string().optional().describe('Last modified time of the file'),
      lastModifyingUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who last modified the file'),
      lastModifyingUserName: z
        .string()
        .optional()
        .describe('Display name of the user who last modified the file'),
      sheetTitles: z.array(z.string()).describe('List of sheet tab titles in the spreadsheet')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let driveClient = new DriveClient(ctx.auth.token);

      // We need a spreadsheet ID from the user to watch - this will be stored in registration details
      // The webhook URL is the provided base URL
      let channelId = crypto.randomUUID();

      // Set expiration to ~23 hours (slightly under the 24h max for files)
      let expiration = Date.now() + 82800000;

      // Note: The actual spreadsheet ID to watch needs to come from somewhere.
      // This is stored during setup. For now, we return the channel info.
      // The actual registration will be handled based on the setup flow.

      let watchResult = await driveClient
        .watchFile(
          '', // Will be set by the platform
          ctx.input.webhookBaseUrl,
          channelId,
          expiration
        )
        .catch(() => null);

      return {
        registrationDetails: {
          channelId,
          resourceId: watchResult?.resourceId,
          expiration
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      if (
        ctx.input.registrationDetails?.channelId &&
        ctx.input.registrationDetails?.resourceId
      ) {
        let driveClient = new DriveClient(ctx.auth.token);
        await driveClient
          .stopChannel(
            ctx.input.registrationDetails.channelId,
            ctx.input.registrationDetails.resourceId
          )
          .catch(() => {});
      }
    },

    handleRequest: async ctx => {
      let headers = ctx.request.headers;

      let resourceState = headers.get('x-goog-resource-state') ?? 'unknown';
      let channelId = headers.get('x-goog-channel-id') ?? undefined;
      let resourceId = headers.get('x-goog-resource-id') ?? undefined;
      let resourceUri = headers.get('x-goog-resource-uri') ?? '';
      let changed = headers.get('x-goog-changed') ?? undefined;

      // For sync notifications (sent when channel is first created), return empty
      if (resourceState === 'sync') {
        return { inputs: [] };
      }

      // Extract file ID from resource URI
      // URI format: https://www.googleapis.com/drive/v3/files/{fileId}?...
      let fileIdMatch = resourceUri.match(/\/files\/([^?/]+)/);
      let spreadsheetId = fileIdMatch?.[1] ?? resourceId ?? '';

      if (!spreadsheetId) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            spreadsheetId,
            resourceState,
            changedFields: changed,
            channelId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { spreadsheetId, resourceState } = ctx.input;

      // Fetch current spreadsheet metadata
      let sheetsClient = new SheetsClient(ctx.auth.token);
      let driveClient = new DriveClient(ctx.auth.token);

      let [spreadsheet, fileInfo] = await Promise.all([
        sheetsClient.getSpreadsheet(spreadsheetId).catch(() => null),
        driveClient.getFile(spreadsheetId).catch(() => null)
      ]);

      let title = spreadsheet?.properties?.title ?? fileInfo?.name ?? 'Unknown';
      let spreadsheetUrl =
        spreadsheet?.spreadsheetUrl ??
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      let sheetTitles = (spreadsheet?.sheets ?? []).map(
        (s: any) => s.properties?.title ?? 'Untitled'
      );

      return {
        type: `spreadsheet.${resourceState}`,
        id: `${spreadsheetId}-${Date.now()}`,
        output: {
          spreadsheetId,
          spreadsheetUrl,
          title,
          modifiedTime: fileInfo?.modifiedTime,
          lastModifyingUserEmail: fileInfo?.lastModifyingUser?.emailAddress,
          lastModifyingUserName: fileInfo?.lastModifyingUser?.displayName,
          sheetTitles
        }
      };
    }
  })
  .build();
