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

export let getFileTool = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve detailed metadata for a specific file or folder by its ID. Returns comprehensive information including name, MIME type, size, ownership, timestamps, sharing status, and links.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.getFile)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file or folder to retrieve')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique file identifier'),
      name: z.string().describe('File name'),
      mimeType: z.string().describe('MIME type'),
      description: z.string().optional(),
      starred: z.boolean().optional(),
      trashed: z.boolean().optional(),
      parents: z.array(z.string()).optional(),
      webViewLink: z.string().optional(),
      webContentLink: z.string().optional(),
      iconLink: z.string().optional(),
      thumbnailLink: z.string().optional(),
      size: z.string().optional().describe('File size in bytes'),
      createdTime: z.string().optional(),
      modifiedTime: z.string().optional(),
      sharedWithMeTime: z.string().optional(),
      owners: z.array(driveUserSchema).optional(),
      lastModifyingUser: driveUserSchema,
      shared: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let file = await client.getFile(ctx.input.fileId);

    return {
      output: file,
      message: `Retrieved file **${file.name}** (${file.mimeType}).`
    };
  })
  .build();
