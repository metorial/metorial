import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

export let createFileTool = SlateTool.create(spec, {
  name: 'Create File or Folder',
  key: 'create_file',
  description: `Create a new file or folder in Google Drive. To create a folder, set \`mimeType\` to \`application/vnd.google-apps.folder\`. To create a Google Doc, Sheet, or Slides, use the appropriate Google Workspace MIME type. Specify parent folder IDs to place the file in a specific location.`,
  instructions: [
    'Common Google Workspace MIME types: application/vnd.google-apps.document (Docs), application/vnd.google-apps.spreadsheet (Sheets), application/vnd.google-apps.presentation (Slides), application/vnd.google-apps.folder (Folder).',
    'If no parents are specified, the file is created in the root of My Drive.'
  ]
})
  .scopes(googleDriveActionScopes.createFile)
  .input(
    z.object({
      name: z.string().describe('Name of the file or folder'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type (e.g. "application/vnd.google-apps.folder" for folders)'),
      parentFolderIds: z
        .array(z.string())
        .optional()
        .describe('Parent folder IDs to place the file in'),
      description: z.string().optional().describe('Description for the file'),
      starred: z.boolean().optional().describe('Whether to star the file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the created file or folder'),
      name: z.string(),
      mimeType: z.string(),
      webViewLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let file = await client.createFile({
      name: ctx.input.name,
      mimeType: ctx.input.mimeType,
      parents: ctx.input.parentFolderIds,
      description: ctx.input.description,
      starred: ctx.input.starred
    });

    let isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    return {
      output: {
        fileId: file.fileId,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink
      },
      message: `Created ${isFolder ? 'folder' : 'file'} **${file.name}** with ID \`${file.fileId}\`.`
    };
  })
  .build();
