import {
  DRIVE_FOLDER_MIME_TYPE,
  type DriveFileOption,
  type DriveFileOptionsParams,
  isDriveScopeMissing,
  listDriveFileOptions
} from '@slates/google-drive-files';
import {
  buildApiServiceError,
  createApiServiceError,
  getUpstreamErrorStatus,
  type SlateTriggerGroupSelectionOptionsHandler
} from 'slates';
import { GoogleDriveClient } from '../lib/client';

type FolderOptionsHandler = SlateTriggerGroupSelectionOptionsHandler<{}, { token: string }>;
type FolderOptionsContext = Parameters<FolderOptionsHandler>[0];

const SHARED_FOLDER_OPTIONS = 25;
const SHARED_DRIVES_LISTED = 5;
const SHARED_DRIVE_FOLDER_OPTIONS = 20;

const placed = (place: string, options: DriveFileOption[]) =>
  options.map(option => ({
    ...option,
    description: [place, option.description].filter(Boolean).join(' · ')
  }));

// A shared list the account cannot read (no shared drive scope, a drive it has left) is skipped.
// Rate limits, which Drive also answers with 403, and server errors fail the call.
const unlessNoAccess = async <T>(request: Promise<T>) => {
  try {
    return await request;
  } catch (error) {
    const status = getUpstreamErrorStatus(error);
    const rateLimited = error instanceof Error && /rate limit|quota/i.test(error.message);
    if (status === 404 || (status === 403 && !rateLimited)) return null;
    throw error;
  }
};

// What a person sees on opening Drive: the top of My Drive, folders shared with them, and the top of
// their first shared drives. Deeper folders are found by search.
const listStartingFolders = async (ctx: FolderOptionsContext) => {
  const folders = (within: DriveFileOptionsParams['within'], pageSize?: number) =>
    listDriveFileOptions(ctx, {
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      within,
      orderBy: 'name',
      pageSize
    });

  const [mine, shared, sharedDrives] = await Promise.all([
    folders({ folderId: 'root' }),
    unlessNoAccess(folders('sharedWithMe', SHARED_FOLDER_OPTIONS)),
    unlessNoAccess(
      new GoogleDriveClient(ctx.auth.token).listSharedDrives({
        pageSize: SHARED_DRIVES_LISTED
      })
    )
  ]);
  const inSharedDrives = await Promise.all(
    (sharedDrives?.drives ?? []).map(async drive => {
      const page = await unlessNoAccess(
        folders(
          { folderId: drive.driveId, sharedDriveId: drive.driveId },
          SHARED_DRIVE_FOLDER_OPTIONS
        )
      );
      return placed(`Shared drive ${drive.name}`, page?.options ?? []);
    })
  );

  const options = [
    ...placed('My Drive', mine.options),
    ...placed('Shared with me', shared?.options ?? []),
    ...inSharedDrives.flat()
  ];
  const seen = new Set<string>();
  return options.filter(option => !seen.has(option.value) && seen.add(option.value));
};

export const folderOptions: FolderOptionsHandler = async ctx => {
  const { query, pageToken } = ctx.input;
  try {
    if (!query) return { options: await listStartingFolders(ctx), nextPageToken: null };
    return await listDriveFileOptions(ctx, {
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      search: query,
      pageToken
    });
  } catch (error) {
    if (isDriveScopeMissing(error))
      throw createApiServiceError(
        "This Google connection is not allowed to list your folders. Paste the folder ID instead: the last part of the folder's link.",
        {
          reason: 'google_drive_folder_list_scope_missing',
          upstreamStatus: 403,
          parent: error
        }
      );
    throw buildApiServiceError(error, {
      providerLabel: 'Google Drive',
      operation: 'list folders',
      reason: 'google_drive_selection_options_failed'
    });
  }
};
