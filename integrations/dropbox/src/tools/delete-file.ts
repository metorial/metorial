import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File or Folder',
  key: 'delete_file',
  description: `Permanently delete a file or folder at the specified path. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      path: z.string().describe('Path of the file or folder to delete')
    })
  )
  .output(
    z.object({
      tag: z.string().describe('Type of the deleted entry'),
      name: z.string().describe('Name of the deleted entry'),
      pathDisplay: z.string().optional().describe('Display path of the deleted entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);
    let result = await client.deleteFile(ctx.input.path);
    let metadata = result.metadata;

    return {
      output: {
        tag: metadata['.tag'],
        name: metadata.name,
        pathDisplay: metadata.path_display
      },
      message: `Deleted **${metadata.name}** at **${metadata.path_display || ctx.input.path}**.`
    };
  })
  .build();
