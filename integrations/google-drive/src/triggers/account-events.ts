import { assertNewPageToken, createApiServiceError, getApiErrorStatus } from 'slates';
import type { GoogleDriveClient } from '../lib/client';
import type { DriveChange } from '../lib/types';
import {
  type DriveAccountState,
  type DriveAccountTarget,
  type DriveFileEvent,
  driveAccountStateSchema,
  driveEventId,
  driveFileEventSchema,
  driveFolderSelectionSchema,
  driveTargetId,
  parseDriveContract
} from './event-schemas';
import { driveAccountId, repeatedPageToken } from './sync';

// Every change in the account is an event, so a run reads fewer pages than a folder drain.
export const DRIVE_ALL_FILES_PAGES_PER_DRAIN = 5;

export async function resolveDriveAccountTarget(
  client: GoogleDriveClient
): Promise<DriveAccountTarget & { name: string }> {
  return { accountId: await driveAccountId(client), scope: 'account', name: 'All files' };
}

function assertAccountSelected(selection: unknown) {
  const { folderIds } = parseDriveContract(
    driveFolderSelectionSchema,
    selection,
    'folder selection'
  );
  if (folderIds?.length)
    throw createApiServiceError(
      'This trigger no longer watches the whole Google Drive account. Refresh the selection.',
      { reason: 'google_drive_account_not_selected' }
    );
}

export async function assertDriveAccountTarget(
  client: GoogleDriveClient,
  target: DriveAccountTarget,
  identifier: string,
  selection: unknown
) {
  assertAccountSelected(selection);
  if (
    driveTargetId(target) !== identifier ||
    driveTargetId(await resolveDriveAccountTarget(client)) !== identifier
  )
    throw createApiServiceError(
      'The connected Google account is not the one this trigger watches. Refresh the selection.',
      { reason: 'google_drive_target_mismatch' }
    );
}

// Only changes after activation are reported, so no file is listed.
export async function baselineDriveAccount(
  client: GoogleDriveClient,
  target: DriveAccountTarget
): Promise<DriveAccountState> {
  const cursor = await client.getStartPageToken();
  if (!cursor)
    throw createApiServiceError('Google Drive did not return a starting change cursor.', {
      reason: 'google_drive_cursor_missing'
    });
  return { targetId: driveTargetId(target), cursor };
}

function accountEvent(target: DriveAccountTarget, change: DriveChange) {
  const file = change.file;
  if (!file || file.fileId !== change.fileId || !file.version || !/^\d+$/.test(file.version))
    return null;
  const parsed = driveFileEventSchema.safeParse({
    type: 'file_updated',
    accountId: target.accountId,
    folderId: null,
    driveId: file.driveId ?? null,
    cursorDriveId: null,
    fileId: file.fileId,
    name: file.name,
    mimeType: file.mimeType,
    version: file.version,
    parents: file.parents ?? [],
    webViewLink: file.webViewLink,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    observedAt: new Date().toISOString(),
    trashed: file.trashed === true,
    removed: false
  });
  return parsed.success ? parsed.data : null;
}

async function drainDriveAccountChanges(
  client: GoogleDriveClient,
  target: DriveAccountTarget,
  previous: DriveAccountState
) {
  const events: { payload: DriveFileEvent; idempotencyKey: string }[] = [];
  let skipped = 0;
  const visited = new Set<string>([previous.cursor]);
  let cursor = previous.cursor;
  for (let pages = 1; ; pages++) {
    const page = await client.listChanges(cursor, {
      pageSize: 1000,
      includeRemoved: true,
      includeCorpusRemovals: true,
      spaces: 'drive'
    });
    for (const change of page.changes) {
      if ((change.changeType ?? change.type) !== 'file' || !change.fileId || change.removed)
        continue;
      // A malformed change is skipped so it cannot hold the cursor back for every later run.
      const payload = accountEvent(target, change);
      if (!payload) {
        skipped++;
        continue;
      }
      events.push({ payload, idempotencyKey: driveEventId(payload) });
    }
    if (page.nextPageToken) {
      assertNewPageToken(visited, page.nextPageToken, repeatedPageToken);
      cursor = page.nextPageToken;
      if (pages < DRIVE_ALL_FILES_PAGES_PER_DRAIN) continue;
    } else if (page.newStartPageToken) {
      cursor = page.newStartPageToken;
    } else {
      throw createApiServiceError('Google Drive did not return the next change cursor.', {
        reason: 'google_drive_cursor_missing'
      });
    }
    return { events, skipped, state: { targetId: previous.targetId, cursor } };
  }
}

export async function expandDriveAccount({
  client,
  target,
  notified,
  selection,
  state,
  initialState,
  warn
}: {
  client: GoogleDriveClient;
  target: DriveAccountTarget;
  notified: boolean;
  selection: unknown;
  state: { driveFolders?: unknown; driveAccount?: unknown };
  initialState: unknown;
  warn: (message: { message: string; reason: string; skipped?: number }) => void;
}) {
  const targetId = driveTargetId(target);
  // Notifications only read the change log; scheduled reconciliation rechecks the account.
  if (notified) assertAccountSelected(selection);
  else await assertDriveAccountTarget(client, target, targetId, selection);
  const saved =
    state.driveAccount === undefined
      ? undefined
      : parseDriveContract(driveAccountStateSchema, state.driveAccount, 'saved state');
  // The registration baseline only seeds the first expansion; saved state wins afterwards.
  const previous =
    saved?.targetId === targetId
      ? saved
      : parseDriveContract(driveAccountStateSchema, initialState, 'registration baseline');
  if (previous.targetId !== targetId)
    throw createApiServiceError('The saved Drive cursor belongs to another account.', {
      reason: 'google_drive_cursor_identity_mismatch'
    });
  let result: Awaited<ReturnType<typeof drainDriveAccountChanges>>;
  try {
    result = await drainDriveAccountChanges(client, target, previous);
  } catch (error) {
    if (Number(getApiErrorStatus(error)) !== 410) throw error;
    warn({
      message:
        'Google Drive invalidated the change cursor. The account is watched again from its current state; undelivered earlier changes are not replayed.',
      reason: 'google_drive_cursor_reset'
    });
    result = { events: [], skipped: 0, state: await baselineDriveAccount(client, target) };
  }
  if (result.skipped)
    warn({
      message: `Skipped ${result.skipped} Google Drive ${result.skipped === 1 ? 'change' : 'changes'} without a complete file description.`,
      reason: 'google_drive_change_skipped',
      skipped: result.skipped
    });
  // No folders are selected, so saved folder state is dropped.
  const { driveFolders: _, ...kept } = state;
  return { events: result.events, updatedState: { ...kept, driveAccount: result.state } };
}
