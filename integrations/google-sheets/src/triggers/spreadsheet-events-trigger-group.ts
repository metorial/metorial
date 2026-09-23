import { buildApiServiceError, createApiServiceError, triggerGroup } from 'slates';
import { DriveClient } from '../lib/drive-client';
import { spec } from '../spec';
import { spreadsheetChangeEventSchema } from './event-schemas';

const POLL_INTERVAL_SECONDS = 15 * 60;
const LOOKBACK_SECONDS = 20 * 60;

export const spreadsheetEvents = triggerGroup(spec, {
  key: 'spreadsheet_events',
  name: 'Spreadsheet Changes',
  description: 'Changes to Google Sheets files accessible through this connection.',
  eventSchema: spreadsheetChangeEventSchema
})
  .polling({
    intervalSeconds: POLL_INTERVAL_SECONDS,
    pollEvents: async ctx => {
      // Production sends state: null on every poll. Overlap absorbs schedule jitter;
      // stable file/time keys let the runtime deduplicate the repeated results.
      const since = new Date(Date.now() - LOOKBACK_SECONDS * 1000).toISOString();
      const drive = new DriveClient(ctx.auth.token);
      const events: {
        payload: (typeof spreadsheetChangeEventSchema)['_output'];
        idempotencyKey: string;
      }[] = [];
      const seenFiles = new Set<string>();
      let pageToken: string | undefined;

      do {
        let page: Awaited<ReturnType<DriveClient['listModifiedSpreadsheets']>>;
        try {
          page = await drive.listModifiedSpreadsheets(since, pageToken);
        } catch (error) {
          throw buildApiServiceError(error, {
            providerLabel: 'Google Drive',
            reason: 'google_sheets_spreadsheet_list_failed',
            operation: 'list modified spreadsheets'
          });
        }
        if (page.files != null && !Array.isArray(page.files)) {
          throw createApiServiceError('Google Drive returned an invalid spreadsheet list.');
        }
        for (const candidate of page.files ?? []) {
          const file = spreadsheetChangeEventSchema.safeParse({
            source: 'drive_file_modified',
            spreadsheetId: candidate?.id,
            modifiedTime: candidate?.modifiedTime,
            lastModifyingUserEmail: candidate?.lastModifyingUser?.emailAddress,
            lastModifyingUserName: candidate?.lastModifyingUser?.displayName
          });
          if (!file.success) {
            throw createApiServiceError('Google Drive returned invalid spreadsheet metadata.');
          }
          if (seenFiles.has(file.data.spreadsheetId)) continue;
          seenFiles.add(file.data.spreadsheetId);
          events.push({
            payload: file.data,
            idempotencyKey: `${file.data.spreadsheetId}:${file.data.modifiedTime}`
          });
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      return { events };
    }
  })
  // Polling runs for a connection directly; matchers are only used by webhook routing.
  .routingMatchers(async () => [])
  .build();
