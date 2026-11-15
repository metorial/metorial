// files.list: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
// Shared drive search: https://developers.google.com/workspace/drive/api/guides/search-shareddrives
import { beforeEach, describe, expect, it, vi } from 'vitest';

let axios = vi.hoisted(() => ({ create: vi.fn(), get: vi.fn() }));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAxios: axios.create.mockImplementation(() => ({ get: axios.get }))
  };
});

import { createSlateError } from 'slates';
import {
  DRIVE_FILE_OPTIONS_MAX_PAGE_SIZE,
  DRIVE_FILE_OPTIONS_PAGE_SIZE,
  DRIVE_FOLDER_MIME_TYPE,
  escapeDriveQueryValue,
  isDriveScopeMissing,
  listDriveFileOptions
} from './index';

let SPREADSHEET = 'application/vnd.google-apps.spreadsheet';
let ctx = { auth: { token: 'token-1' }, warn: vi.fn() };
let lastParams = () => axios.get.mock.calls.at(-1)![1].params;

beforeEach(() => {
  vi.clearAllMocks();
  axios.get.mockResolvedValue({ data: {} });
});

describe('escapeDriveQueryValue', () => {
  it('escapes backslashes before apostrophes', () => {
    expect(escapeDriveQueryValue("Bob's \\ files")).toBe("Bob\\'s \\\\ files");
  });
});

describe('isDriveScopeMissing', () => {
  let error = (status: number, message: string) =>
    createSlateError({ code: 'permission.denied', message, upstream: { status } });

  it('recognises the 403 Google returns for missing scopes', () => {
    expect(
      isDriveScopeMissing(error(403, 'Request had insufficient authentication scopes.'))
    ).toBe(true);
    expect(isDriveScopeMissing(error(403, 'Insufficient Permission'))).toBe(true);
  });

  it('ignores rate limits, other statuses and non-errors', () => {
    expect(isDriveScopeMissing(error(403, 'User Rate Limit Exceeded'))).toBe(false);
    expect(isDriveScopeMissing(error(401, 'Insufficient Permission'))).toBe(false);
    expect(isDriveScopeMissing({ message: 'Insufficient Permission' })).toBe(false);
  });
});

describe('listDriveFileOptions', () => {
  it('lists files of one type everywhere the account can reach as options', async () => {
    axios.get.mockResolvedValue({
      data: {
        files: [
          {
            id: 'sheet-1',
            name: 'Budget',
            mimeType: SPREADSHEET,
            modifiedTime: '2026-11-03T10:00:00.000Z',
            owners: [{ displayName: 'Bob Stone', emailAddress: 'bob@example.com' }]
          },
          { id: 'sheet-2', name: 'Team plan', owners: [{ emailAddress: 'team@example.com' }] },
          { id: 'sheet-3', name: 'Untitled' }
        ],
        nextPageToken: 'page-2'
      }
    });

    let page = await listDriveFileOptions(ctx, { mimeType: SPREADSHEET });

    expect(page).toEqual({
      options: [
        { value: 'sheet-1', label: 'Budget', description: 'Bob Stone · Edited 2026-11-03' },
        { value: 'sheet-2', label: 'Team plan', description: 'team@example.com' },
        { value: 'sheet-3', label: 'Untitled' }
      ],
      nextPageToken: 'page-2'
    });
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://www.googleapis.com/drive/v3',
      headers: { Authorization: 'Bearer token-1' }
    });
    expect(axios.get).toHaveBeenCalledWith('/files', {
      params: {
        q: `mimeType='${SPREADSHEET}' and trashed=false`,
        orderBy: 'modifiedTime desc',
        pageSize: DRIVE_FILE_OPTIONS_PAGE_SIZE,
        fields:
          'nextPageToken,incompleteSearch,files(id,name,modifiedTime,owners(displayName,emailAddress))',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives'
      }
    });
    expect(ctx.warn).not.toHaveBeenCalled();
  });

  it('excludes one type, searches by escaped name and passes string page tokens on', async () => {
    await listDriveFileOptions(ctx, {
      mimeType: { not: DRIVE_FOLDER_MIME_TYPE },
      search: "Bob's",
      pageToken: 'page-2'
    });

    expect(lastParams()).toMatchObject({
      q: `mimeType!='${DRIVE_FOLDER_MIME_TYPE}' and trashed=false and name contains 'Bob\\'s'`,
      pageToken: 'page-2'
    });

    for (let pageToken of [3, '', null, { token: 'x' }]) {
      await listDriveFileOptions(ctx, { mimeType: SPREADSHEET, pageToken });
      expect(lastParams()).not.toHaveProperty('pageToken');
    }
  });

  it('lists a folder, a shared drive folder or the files shared with the account', async () => {
    await listDriveFileOptions(ctx, {
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      within: { folderId: 'root' },
      orderBy: 'name'
    });
    expect(lastParams()).toMatchObject({
      q: `mimeType='${DRIVE_FOLDER_MIME_TYPE}' and trashed=false and 'root' in parents`,
      orderBy: 'name',
      corpora: 'user'
    });
    expect(lastParams()).not.toHaveProperty('driveId');

    await listDriveFileOptions(ctx, {
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      within: { folderId: "team's", sharedDriveId: 'drive-1' }
    });
    expect(lastParams()).toMatchObject({
      q: `mimeType='${DRIVE_FOLDER_MIME_TYPE}' and trashed=false and 'team\\'s' in parents`,
      corpora: 'drive',
      driveId: 'drive-1'
    });

    await listDriveFileOptions(ctx, {
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      within: 'sharedWithMe'
    });
    expect(lastParams()).toMatchObject({
      q: `mimeType='${DRIVE_FOLDER_MIME_TYPE}' and trashed=false and sharedWithMe=true`,
      corpora: 'user'
    });
  });

  it('caps the page size', async () => {
    await listDriveFileOptions(ctx, { mimeType: SPREADSHEET, pageSize: 5000 });
    expect(lastParams().pageSize).toBe(DRIVE_FILE_OPTIONS_MAX_PAGE_SIZE);

    await listDriveFileOptions(ctx, { mimeType: SPREADSHEET, pageSize: 20 });
    expect(lastParams().pageSize).toBe(20);
  });

  it('returns what an incomplete search found and warns that files may be missing', async () => {
    axios.get.mockResolvedValue({
      data: { files: [{ id: 'sheet-1', name: 'Budget' }], incompleteSearch: true }
    });

    let page = await listDriveFileOptions(ctx, { mimeType: SPREADSHEET });

    expect(page).toEqual({
      options: [{ value: 'sheet-1', label: 'Budget' }],
      nextPageToken: null
    });
    expect(ctx.warn).toHaveBeenCalledWith(
      expect.stringContaining('did not search every shared drive')
    );
  });

  it('rejects a malformed file list', async () => {
    axios.get.mockResolvedValue({ data: { files: [{ name: 'No ID' }] } });

    await expect(listDriveFileOptions(ctx, { mimeType: SPREADSHEET })).rejects.toThrow(
      'Google Drive returned an invalid list of files.'
    );
  });

  it('passes Google errors through unchanged', async () => {
    let error = createSlateError({
      code: 'upstream.unavailable',
      message: 'Backend Error',
      upstream: { status: 503 }
    });
    axios.get.mockRejectedValue(error);

    await expect(listDriveFileOptions(ctx, { mimeType: SPREADSHEET })).rejects.toBe(error);
  });
});
