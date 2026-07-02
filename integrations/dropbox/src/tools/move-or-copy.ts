import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let moveOrCopy = SlateTool.create(spec, {
  name: 'Move or Copy File/Folder',
  key: 'move_or_copy',
  description: `Move or copy a file or folder from one path to another. Choose "move" to relocate or "copy" to duplicate. Supports autorename to avoid conflicts.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      operation: z.enum(['move', 'copy']).describe('Whether to move or copy the entry'),
      fromPath: z.string().describe('Source path of the file or folder'),
      toPath: z.string().describe('Destination path for the file or folder'),
      autorename: z.boolean().optional().describe('If true, automatically rename on conflict'),
      allowOwnershipTransfer: z
        .boolean()
        .optional()
        .describe('Allow transfer of ownership when moving between users')
    })
  )
  .output(
    z.object({
      tag: z.string().describe('Entry type: file or folder'),
      name: z.string().describe('Name of the moved/copied entry'),
      pathDisplay: z.string().optional().describe('New display path'),
      entryId: z.string().optional().describe('Unique ID of the entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);
    let result: any;

    if (ctx.input.operation === 'move') {
      result = await client.moveFile(
        ctx.input.fromPath,
        ctx.input.toPath,
        ctx.input.autorename ?? false,
        ctx.input.allowOwnershipTransfer ?? false
      );
    } else {
      result = await client.copyFile(
        ctx.input.fromPath,
        ctx.input.toPath,
        ctx.input.autorename ?? false,
        ctx.input.allowOwnershipTransfer ?? false
      );
    }

    let metadata = result.metadata;

    return {
      output: {
        tag: metadata['.tag'],
        name: metadata.name,
        pathDisplay: metadata.path_display,
        entryId: metadata.id
      },
      message: `${ctx.input.operation === 'move' ? 'Moved' : 'Copied'} **${metadata.name}** from **${ctx.input.fromPath}** to **${metadata.path_display}**.`
    };
  })
  .build();
