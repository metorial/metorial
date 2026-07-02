import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder at the specified path. Supports autorename to avoid conflicts if a folder with the same name already exists.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      path: z.string().describe('Full path of the new folder (e.g., "/Documents/New Folder")'),
      autorename: z
        .boolean()
        .optional()
        .describe('If true, automatically rename the folder if a conflict exists')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Name of the created folder'),
      pathDisplay: z.string().optional().describe('Display path of the created folder'),
      folderId: z.string().optional().describe('Unique ID of the created folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);
    let result = await client.createFolder(ctx.input.path, ctx.input.autorename ?? false);
    let metadata = result.metadata;

    return {
      output: {
        name: metadata.name,
        pathDisplay: metadata.path_display,
        folderId: metadata.id
      },
      message: `Created folder **${metadata.name}** at **${metadata.path_display}**.`
    };
  })
  .build();
