import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFolder = SlateTool.create(spec, {
  name: 'Delete Folder or Project',
  key: 'delete_folder',
  description:
    'Move a folder or project and its descendant folders and tasks to the recycle bin. Descendants with parents outside the deletion scope remain accessible there.',
  tags: { destructive: true }
})
  .input(
    z.object({
      folderId: z
        .string()
        .min(1)
        .describe('Folder or project ID. Call list_folders to discover folders and projects.')
    })
  )
  .output(z.object({ folderId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new WrikeClient(ctx.auth);
    await client.deleteFolder(ctx.input.folderId);
    return {
      output: { folderId: ctx.input.folderId, deleted: true },
      message: `Moved folder or project ${ctx.input.folderId} to the recycle bin.`
    };
  })
  .build();
