import { buildApiServiceError, createApiServiceError, triggerGroup } from 'slates';
import { GoogleDriveClient } from '../lib/client';
import { spec } from '../spec';
import { recentFileEventId, recentFileInputSchema } from './event-schemas';

const POLL_INTERVAL_SECONDS = 900;
const LOOKBACK_MINUTES = 30;

export let recentFileEvents = triggerGroup(spec, {
  key: 'recent_files',
  name: 'Recent Google Drive Files',
  description:
    'My Drive files and previously accessed shared-drive files modified in the last 30 minutes.',
  eventSchema: recentFileInputSchema
})
  .polling({
    intervalSeconds: POLL_INTERVAL_SECONDS,
    pollEvents: async ctx => {
      let client = new GoogleDriveClient(ctx.auth.token);
      let since = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000).toISOString();
      let query = `modifiedTime > '${since}'`;
      let pageToken: string | undefined;
      let events: { payload: unknown; idempotencyKey: string }[] = [];

      do {
        let result: Awaited<ReturnType<GoogleDriveClient['listFiles']>>;
        try {
          result = await client.listFiles({ query, pageSize: 1000, pageToken });
        } catch (error) {
          throw buildApiServiceError(error, {
            providerLabel: 'Google Drive',
            reason: 'google_drive_recent_file_search_failed',
            operation: 'search recent files'
          });
        }
        if (result.incompleteSearch) {
          ctx.warn({
            message: 'Google Drive reported an incomplete recent file search.',
            reason: 'google_drive_recent_file_search_incomplete'
          });
        }

        for (let file of result.files) {
          if (!file.modifiedTime) continue;
          events.push({
            payload: {
              fileId: file.fileId,
              fileName: file.name,
              mimeType: file.mimeType,
              trashed: file.trashed === true,
              parents: file.parents,
              webViewLink: file.webViewLink,
              modifiedTime: file.modifiedTime,
              lastModifyingUser: file.lastModifyingUser
            },
            idempotencyKey: recentFileEventId(
              file.fileId,
              file.modifiedTime,
              file.trashed === true
            )
          });
        }
        pageToken = result.nextPageToken;
      } while (pageToken);

      return { events };
    }
  })
  .routingMatchers(async ctx => {
    let about: Awaited<ReturnType<GoogleDriveClient['getAbout']>>;
    try {
      about = await new GoogleDriveClient(ctx.auth.token).getAbout();
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Drive',
        reason: 'google_drive_recent_file_identity_failed',
        operation: 'get current user identity'
      });
    }
    let userId = about.userId || about.emailAddress;
    if (!userId) {
      throw createApiServiceError('Google Drive did not return the current user identity.', {
        reason: 'google_drive_missing_user_identity'
      });
    }
    return [{ userId }];
  })
  .build();
