import { assertNewPageToken, createApiServiceError } from 'slates';
import type { GoogleDriveClient } from '../lib/client';
import type { DriveFile } from '../lib/types';
import {
  DRIVE_FOLDER_MAX_CHILDREN,
  type DriveFileEvent,
  type DriveFolderState,
  type DriveTarget,
  driveEventId,
  driveFileEventSchema,
  driveTargetId,
  parseDriveContract
} from './event-schemas';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
// Change page tokens do not expire, so a longer backlog resumes from the saved
// cursor on the next notification or scheduled reconciliation.
export const DRIVE_CHANGE_PAGES_PER_DRAIN = 20;
const escapeQuery = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export async function driveAccountId(client: GoogleDriveClient) {
  const account = await client.getAbout();
  if (!account.userId)
    throw createApiServiceError('Google Drive did not return an account identity.', {
      reason: 'google_drive_account_missing'
    });
  return account.userId;
}

export async function resolveDriveTarget(
  client: GoogleDriveClient,
  folderId: string
): Promise<DriveTarget & { name: string }> {
  const accountId = await driveAccountId(client);
  const folder = await client.getFile(folderId);
  if (folder.mimeType !== FOLDER_MIME_TYPE || folder.trashed) {
    throw createApiServiceError('Select an accessible, untrashed Google Drive folder.', {
      reason: 'google_drive_folder_required'
    });
  }
  let cursorDriveId: string | null = null;
  if (folder.driveId) {
    // A shared-drive member needs its drive log. An individually shared item for
    // a non-member belongs to the user's log instead (Drive about-changes guide).
    let pageToken: string | undefined;
    const visited = new Set<string>();
    do {
      const page = await client.listSharedDrives({ pageToken, pageSize: 100 });
      if (page.drives.some(drive => drive.driveId === folder.driveId)) {
        cursorDriveId = folder.driveId;
        break;
      }
      pageToken = page.nextPageToken;
      assertNewPageToken(visited, pageToken, repeatedPageToken);
    } while (pageToken);
  }
  return {
    accountId,
    folderId: folder.fileId,
    driveId: folder.driveId ?? null,
    cursorDriveId,
    name: folder.name
  };
}

const repeatedPageToken = () =>
  createApiServiceError('Google Drive repeated a pagination token.', {
    reason: 'google_drive_pagination_cycle'
  });

function inFolder(file: DriveFile, target: DriveTarget) {
  return (
    !file.trashed &&
    (file.driveId ?? null) === target.driveId &&
    file.parents?.includes(target.folderId)
  );
}

const overFolderLimit = (members: Record<string, string>) =>
  Object.keys(members).length > DRIVE_FOLDER_MAX_CHILDREN;

export function driveFolderTooLarge() {
  const limit = DRIVE_FOLDER_MAX_CHILDREN.toLocaleString('en-US');
  return createApiServiceError(
    `A watched Google Drive folder can have at most ${limit} immediate children, and this folder has more. Reduce it to ${limit} or fewer, or watch a smaller folder such as a subfolder. No events are delivered for this folder until then.`,
    { reason: 'google_drive_folder_too_large' }
  );
}

function fileVersion(file: DriveFile) {
  if (!file.version || !/^\d+$/.test(file.version)) {
    throw createApiServiceError(
      'Google Drive did not return a file version. The change cursor was not advanced.',
      {
        reason: 'google_drive_version_missing'
      }
    );
  }
  return file.version;
}

export async function drainDriveChanges(
  client: GoogleDriveClient,
  target: DriveTarget,
  previous: DriveFolderState,
  emit: boolean
) {
  if (previous.targetId !== driveTargetId(target))
    throw createApiServiceError(
      'The saved Drive cursor belongs to another folder or account.',
      {
        reason: 'google_drive_cursor_identity_mismatch'
      }
    );
  const members = { ...previous.members };
  const events: { payload: DriveFileEvent; idempotencyKey: string }[] = [];
  const visited = new Set<string>([previous.cursor]);
  let cursor = previous.cursor;
  for (let pages = 1; ; pages++) {
    const page = await client.listChanges(cursor, {
      pageSize: 1000,
      driveId: target.cursorDriveId ?? undefined,
      includeRemoved: true,
      includeCorpusRemovals: true,
      spaces: 'drive'
    });
    for (const change of page.changes) {
      if ((change.changeType ?? change.type) !== 'file' || !change.fileId) continue;
      const file = change.file;
      if (change.removed || (file && !inFolder(file, target))) {
        delete members[change.fileId];
        continue;
      }
      if (!file)
        throw createApiServiceError(
          'Google Drive omitted a changed file. The change cursor was not advanced.',
          {
            reason: 'google_drive_change_file_missing'
          }
        );
      if (file.fileId !== change.fileId)
        throw createApiServiceError(
          'Google Drive returned inconsistent changed-file identities.',
          {
            reason: 'google_drive_change_identity_mismatch'
          }
        );
      const version = fileVersion(file);
      const prior = members[file.fileId];
      // Listing a baseline and draining its earlier cursor can observe the same
      // current revision twice, or return an older revision already superseded.
      if (prior && BigInt(version) <= BigInt(prior)) continue;
      members[file.fileId] = version;
      if (!emit) continue;
      const payload = parseDriveContract(
        driveFileEventSchema,
        {
          type: prior ? 'file_updated' : 'file_added_to_folder',
          ...target,
          fileId: file.fileId,
          name: file.name,
          mimeType: file.mimeType,
          version,
          parents: file.parents ?? [],
          webViewLink: file.webViewLink,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          observedAt: new Date().toISOString(),
          trashed: false,
          removed: false
        },
        'file event'
      );
      events.push({ payload, idempotencyKey: driveEventId(payload) });
    }
    if (page.nextPageToken) {
      assertNewPageToken(visited, page.nextPageToken, repeatedPageToken);
      cursor = page.nextPageToken;
      if (pages < DRIVE_CHANGE_PAGES_PER_DRAIN) continue;
    } else if (page.newStartPageToken) {
      cursor = page.newStartPageToken;
    } else {
      throw createApiServiceError('Google Drive did not return the next change cursor.', {
        reason: 'google_drive_cursor_missing'
      });
    }
    // Checked once per bounded read rather than per page, so a removal later
    // in the same read can offset an addition.
    if (overFolderLimit(members)) return { overLimit: true as const };
    return {
      overLimit: false as const,
      events,
      state: { targetId: previous.targetId, cursor, members }
    };
  }
}

// Resolves to null, as soon as the listing shows it, when the folder has more
// children than the limit.
export async function baselineDriveFolder(
  client: GoogleDriveClient,
  target: DriveTarget
): Promise<DriveFolderState | null> {
  // Start before the listing, then reconcile everything that changed while it
  // was paginated. Activation is complete only after the silent drain succeeds.
  const cursor = await client.getStartPageToken(target.cursorDriveId ?? undefined);
  if (!cursor)
    throw createApiServiceError('Google Drive did not return a starting change cursor.', {
      reason: 'google_drive_cursor_missing'
    });
  const members: Record<string, string> = {};
  let pageToken: string | undefined;
  const visited = new Set<string>();
  do {
    const page = await client.listFiles({
      query: `'${escapeQuery(target.folderId)}' in parents and trashed = false`,
      pageSize: 1000,
      pageToken,
      spaces: 'drive',
      driveId: target.cursorDriveId ?? undefined
    });
    if (page.incompleteSearch)
      throw createApiServiceError(
        'Google Drive returned an incomplete folder baseline. Try again before enabling this trigger.',
        {
          reason: 'google_drive_incomplete_baseline'
        }
      );
    for (const file of page.files)
      if (inFolder(file, target)) members[file.fileId] = fileVersion(file);
    if (overFolderLimit(members)) return null;
    pageToken = page.nextPageToken;
    assertNewPageToken(visited, pageToken, repeatedPageToken);
  } while (pageToken);
  const caughtUp = await drainDriveChanges(
    client,
    target,
    { targetId: driveTargetId(target), cursor, members },
    false
  );
  return caughtUp.overLimit ? null : caughtUp.state;
}
