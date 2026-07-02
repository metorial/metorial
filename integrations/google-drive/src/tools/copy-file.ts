import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

export let copyFileTool = SlateTool.create(spec, {
  name: 'Copy File',
  key: 'copy_file',
  description: `Create a copy of an existing file in Google Drive. Optionally provide a new name and destination folder for the copy.`
})
  .scopes(googleDriveActionScopes.copyFile)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to copy'),
      name: z
        .string()
        .optional()
        .describe('Name for the copy (defaults to "Copy of [original name]")'),
      parentFolderIds: z
        .array(z.string())
        .optional()
        .describe('Destination folder IDs for the copy'),
      description: z.string().optional().describe('Description for the copy')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the new copy'),
      name: z.string(),
      mimeType: z.string(),
      webViewLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let file = await client.copyFile(ctx.input.fileId, {
      name: ctx.input.name,
      parents: ctx.input.parentFolderIds,
      description: ctx.input.description
    });

    return {
      output: {
        fileId: file.fileId,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink
      },
      message: `Copied file to **${file.name}** with ID \`${file.fileId}\`.`
    };
  })
  .build();
