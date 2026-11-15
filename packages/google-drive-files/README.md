# Google Drive files

Lists Google Drive files as picker options for option lists and trigger
selection fields: Google Drive's own lists, and the fallback lists of Google
integrations whose resources are Drive files (spreadsheets, forms). Each
integration keeps its own error messages, scopes and page handling.

```ts
import {
  DRIVE_FOLDER_MIME_TYPE,
  escapeDriveQueryValue,
  isDriveScopeMissing,
  listDriveFileOptions
} from '@slates/google-drive-files';

// In an option handler: one page of spreadsheets, searched by name.
try {
  return await listDriveFileOptions(ctx, {
    mimeType: 'application/vnd.google-apps.spreadsheet',
    search: ctx.input.query,
    pageToken: ctx.input.pageToken
  });
} catch (error) {
  if (isDriveScopeMissing(error)) throw scopeMissingError(error);
  throw error;
}

// Every file except folders, the top of My Drive, a shared drive folder, or what is shared.
await listDriveFileOptions(ctx, { mimeType: { not: DRIVE_FOLDER_MIME_TYPE } });
await listDriveFileOptions(ctx, {
  mimeType: DRIVE_FOLDER_MIME_TYPE,
  within: { folderId: 'root' },
  orderBy: 'name'
});
await listDriveFileOptions(ctx, {
  mimeType: DRIVE_FOLDER_MIME_TYPE,
  within: { folderId: driveId, sharedDriveId: driveId }
});
await listDriveFileOptions(ctx, { mimeType: DRIVE_FOLDER_MIME_TYPE, within: 'sharedWithMe' });

// A value inside a Drive query string literal.
const q = `'${escapeDriveQueryValue(folderId)}' in parents`;
```

`listDriveFileOptions` reads one page of
[`files.list`](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list)
with the connection's token. Trashed files are left out. Each option is the file
ID, labelled with the file name and described by its first owner and last edit
date ("Bob Stone · Edited 2026-11-03"). Results are ordered `modifiedTime desc`
unless `orderBy: 'name'` is given. Pages hold 50 options by default and at most
100; a string `pageToken` from the previous page is passed back to Google and
any other value starts from the first page.

Without `within`, the listing uses `corpora=allDrives` with
`includeItemsFromAllDrives` and `supportsAllDrives`: My Drive, files shared with
the account, and every shared drive the account is a member of, as described in
[Search for shared drives](https://developers.google.com/workspace/drive/api/guides/search-shareddrives).
Google may then answer `incompleteSearch` when it could not search every shared
drive; the files it found are returned and a warning is logged through
`ctx.warn`. A folder (`within: { folderId }`) and `within: 'sharedWithMe'` use
`corpora=user`; a folder with `sharedDriveId` uses `corpora=drive` on that drive.

What is listed depends on the connection's scope: `drive`, `drive.readonly`,
`drive.metadata` and `drive.metadata.readonly` see every file the account can
open, while `drive.file` sees only the files created or opened with the app.
`isDriveScopeMissing` recognises Google's 403 for a connection whose scopes do
not allow listing at all, so the caller can ask for an ID instead.

This package is private: integrations declare it as an optional peer dependency
and the build bundles it.
