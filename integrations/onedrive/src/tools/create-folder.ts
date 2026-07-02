import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createFolderTool = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Creates a new folder in OneDrive or SharePoint. The parent location can be specified by folder ID or path.`,
  instructions: [
    'Provide either parentId or parentPath to specify where to create the folder. Omit both to create in the drive root.'
  ]
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Defaults to the user's personal OneDrive."),
      parentId: z.string().optional().describe('ID of the parent folder'),
      parentPath: z
        .string()
        .optional()
        .describe('Path to the parent folder (e.g. "/Documents")'),
      folderName: z.string().describe('Name for the new folder'),
      conflictBehavior: z
        .enum(['rename', 'replace', 'fail'])
        .optional()
        .describe('What to do if a folder with the same name exists. Defaults to "fail".')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique ID of the created folder'),
      name: z.string().describe('Name of the created folder'),
      webUrl: z.string().describe('URL to view the folder in a browser'),
      createdDateTime: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let folder = await client.createFolder({
      driveId: ctx.input.driveId,
      parentId: ctx.input.parentId,
      parentPath: ctx.input.parentPath,
      folderName: ctx.input.folderName,
      conflictBehavior: ctx.input.conflictBehavior
    });

    return {
      output: {
        itemId: folder.id,
        name: folder.name,
        webUrl: folder.webUrl,
        createdDateTime: folder.createdDateTime
      },
      message: `Created folder **${folder.name}**.`
    };
  })
  .build();
