import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemOutputSchema, mapDriveItem } from '../lib/schemas';
import { spec } from '../spec';

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder in OneDrive or SharePoint. Useful for organizing presentations into directories before uploading.`
})
  .input(
    z.object({
      folderName: z.string().describe('Name of the new folder'),
      parentFolderId: z
        .string()
        .optional()
        .describe('ID of the parent folder. Omit to create in the drive root.'),
      parentFolderPath: z
        .string()
        .optional()
        .describe(
          'Path of the parent folder, e.g. "/Documents". Omit to create in the drive root.'
        ),
      driveId: z.string().optional().describe('ID of the target drive.'),
      siteId: z.string().optional().describe('SharePoint site ID.'),
      conflictBehavior: z
        .enum(['rename', 'replace', 'fail'])
        .optional()
        .describe('What to do if a folder with the same name exists. Default: "rename".')
    })
  )
  .output(driveItemOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    let item = await client.createFolder({
      folderName: ctx.input.folderName,
      parentId: ctx.input.parentFolderId,
      parentPath: ctx.input.parentFolderPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId,
      conflictBehavior: ctx.input.conflictBehavior
    });

    let output = mapDriveItem(item);

    return {
      output,
      message: `Created folder **${output.name}**`
    };
  })
  .build();
