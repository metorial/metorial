import { createApiServiceError, createAxios, getUpstreamErrorStatus } from 'slates';
import { z } from 'zod';

export let DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
export let DRIVE_FILE_OPTIONS_PAGE_SIZE = 50;
export let DRIVE_FILE_OPTIONS_MAX_PAGE_SIZE = 100;

let fileListSchema = z.object({
  files: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        modifiedTime: z.string().optional(),
        owners: z
          .array(
            z.object({
              displayName: z.string().optional(),
              emailAddress: z.string().optional()
            })
          )
          .optional()
      })
    )
    .default([]),
  nextPageToken: z.string().optional(),
  incompleteSearch: z.boolean().optional()
});
type DriveFileSummary = z.infer<typeof fileListSchema>['files'][number];

export interface DriveFileOption {
  value: string;
  label: string;
  description?: string;
}

export interface DriveFileOptionsPage {
  options: DriveFileOption[];
  nextPageToken: string | null;
}

/** The parts of an option handler's context the listing uses. */
export interface DriveFileOptionsContext {
  auth: { token: string };
  warn(message: string): void;
}

export interface DriveFileOptionsParams {
  /** One MIME type, or `{ not }` for every type except one. Trashed files are always left out. */
  mimeType: string | { not: string };
  search?: string | null;
  /**
   * Without it: My Drive, files shared with the account and every shared drive it is a
   * member of. A folder in a shared drive needs its `sharedDriveId`.
   */
  within?: 'sharedWithMe' | { folderId: string; sharedDriveId?: string };
  orderBy?: 'modifiedTime desc' | 'name';
  /** Defaults to DRIVE_FILE_OPTIONS_PAGE_SIZE and is capped at DRIVE_FILE_OPTIONS_MAX_PAGE_SIZE. */
  pageSize?: number;
  pageToken?: unknown;
}

/** Quotes a value for a string literal in a Drive `q` query. */
export let escapeDriveQueryValue = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** Google's answer when the granted scopes do not allow the request. */
export let isDriveScopeMissing = (error: unknown) =>
  getUpstreamErrorStatus(error) === 403 &&
  error instanceof Error &&
  /insufficient (authentication scopes|permission)/i.test(error.message);

let describeFile = (file: DriveFileSummary) => {
  let owner = file.owners?.[0]?.displayName || file.owners?.[0]?.emailAddress;
  let edited = file.modifiedTime && `Edited ${file.modifiedTime.slice(0, 10)}`;
  return [owner, edited].filter(Boolean).join(' · ') || undefined;
};

let corpusOf = (within: DriveFileOptionsParams['within']) => {
  if (within === undefined) return { corpora: 'allDrives' };
  if (typeof within === 'object' && within.sharedDriveId)
    return { corpora: 'drive', driveId: within.sharedDriveId };
  return { corpora: 'user' };
};

/** One page of Drive `files.list` as picker options: file ID, name, owner and last edit date. */
export let listDriveFileOptions = async (
  ctx: DriveFileOptionsContext,
  params: DriveFileOptionsParams
): Promise<DriveFileOptionsPage> => {
  let terms = [
    typeof params.mimeType === 'string'
      ? `mimeType='${escapeDriveQueryValue(params.mimeType)}'`
      : `mimeType!='${escapeDriveQueryValue(params.mimeType.not)}'`,
    'trashed=false'
  ];
  if (params.within === 'sharedWithMe') terms.push('sharedWithMe=true');
  else if (params.within)
    terms.push(`'${escapeDriveQueryValue(params.within.folderId)}' in parents`);
  if (params.search) terms.push(`name contains '${escapeDriveQueryValue(params.search)}'`);

  let response = await createAxios({
    baseURL: 'https://www.googleapis.com/drive/v3',
    headers: { Authorization: `Bearer ${ctx.auth.token}` }
  }).get('/files', {
    params: {
      q: terms.join(' and '),
      orderBy: params.orderBy ?? 'modifiedTime desc',
      pageSize: Math.min(
        params.pageSize ?? DRIVE_FILE_OPTIONS_PAGE_SIZE,
        DRIVE_FILE_OPTIONS_MAX_PAGE_SIZE
      ),
      ...(typeof params.pageToken === 'string' && params.pageToken
        ? { pageToken: params.pageToken }
        : {}),
      fields:
        'nextPageToken,incompleteSearch,files(id,name,modifiedTime,owners(displayName,emailAddress))',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...corpusOf(params.within)
    }
  });
  let page = fileListSchema.safeParse(response.data ?? {});
  if (!page.success)
    throw createApiServiceError('Google Drive returned an invalid list of files.', {
      reason: 'google_drive_file_list_invalid'
    });

  // Google stops searching some shared drives when there are many; the files it found are valid.
  if (page.data.incompleteSearch)
    ctx.warn(
      'Google Drive did not search every shared drive, so files may be missing from this list. Search by name to narrow it.'
    );
  return {
    options: page.data.files.map(file => ({
      value: file.id,
      label: file.name,
      description: describeFile(file)
    })),
    nextPageToken: page.data.nextPageToken ?? null
  };
};
