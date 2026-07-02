import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder in OneDrive or SharePoint. Specify a parent folder ID to create a nested folder, or omit it to create at the drive root.
If a folder with the same name already exists, the new folder will be automatically renamed.`
})
  .input(
    z.object({
      folderName: z.string().describe('Name of the folder to create'),
      parentFolderId: z
        .string()
        .optional()
        .describe('ID of the parent folder. If omitted, creates at the drive root.')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('The unique ID of the created folder'),
      name: z.string().describe('Name of the created folder'),
      webUrl: z.string().optional().describe('URL to open the folder in browser')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let folder = await client.createFolder(
      ctx.input.parentFolderId || '',
      ctx.input.folderName
    );

    return {
      output: {
        itemId: folder.itemId,
        name: folder.name,
        webUrl: folder.webUrl
      },
      message: `Created folder **${folder.name}**${folder.webUrl ? ` — [Open in browser](${folder.webUrl})` : ''}`
    };
  })
  .build();
