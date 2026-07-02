import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let driveUserSchema = z
  .object({
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    photoLink: z.string().optional(),
    permissionId: z.string().optional()
  })
  .optional();

let driveFileSchema = z.object({
  fileId: z.string().describe('Unique file identifier'),
  name: z.string().describe('File name'),
  mimeType: z.string().describe('MIME type of the file'),
  description: z.string().optional().describe('File description'),
  starred: z.boolean().optional(),
  trashed: z.boolean().optional(),
  parents: z.array(z.string()).optional().describe('Parent folder IDs'),
  webViewLink: z.string().optional().describe('Link to view in browser'),
  webContentLink: z.string().optional().describe('Direct download link'),
  size: z.string().optional().describe('File size in bytes'),
  createdTime: z.string().optional(),
  modifiedTime: z.string().optional(),
  owners: z.array(driveUserSchema).optional(),
  lastModifyingUser: driveUserSchema,
  shared: z.boolean().optional()
});

export let searchFilesTool = SlateTool.create(spec, {
  name: 'Search Files',
  key: 'search_files',
  description: `Search for files and folders in Google Drive using queries. Supports filtering by name, MIME type, parent folder, ownership, modification date, shared status, and trashed state. Use the \`query\` field with Google Drive query syntax (e.g. \`name contains 'report'\`, \`mimeType = 'application/pdf'\`, \`'folderId' in parents\`). Results can be ordered and paginated.`,
  instructions: [
    "Use Google Drive query syntax in the query field. Examples: name contains 'report', mimeType = 'application/pdf', modifiedTime > '2024-01-01T00:00:00', trashed = false.",
    'Combine conditions with "and"/"or": name contains \'budget\' and mimeType = \'application/vnd.google-apps.spreadsheet\'.',
    "To find folders, use: mimeType = 'application/vnd.google-apps.folder'.",
    "To list files in a specific folder, use: 'FOLDER_ID' in parents.",
    'Pagination: when using `pageToken`, keep the same `query`, `orderBy`, and `driveId` as the request that returned that token. Changing filters while reusing a token returns HTTP 400.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.searchFiles)
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          "Google Drive search query (e.g. \"name contains 'report' and mimeType = 'application/pdf'\")"
        ),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of files to return (1-1000, default 100)'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order, e.g. "modifiedTime desc", "name", "folder,modifiedTime desc"'),
      driveId: z.string().optional().describe('ID of a shared drive to search within')
    })
  )
  .output(
    z.object({
      files: z.array(driveFileSchema).describe('List of matching files'),
      nextPageToken: z.string().optional().describe('Token for the next page of results'),
      totalReturned: z.number().describe('Number of files returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);

    let result = await client.listFiles({
      query: ctx.input.query,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken,
      orderBy: ctx.input.orderBy,
      driveId: ctx.input.driveId
    });

    return {
      output: {
        files: result.files,
        nextPageToken: result.nextPageToken,
        totalReturned: result.files.length
      },
      message: `Found **${result.files.length}** file(s)${ctx.input.query ? ` matching query: \`${ctx.input.query}\`` : ''}.${result.nextPageToken ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
