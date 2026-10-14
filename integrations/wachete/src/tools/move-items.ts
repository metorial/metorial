import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let moveItems = SlateTool.create(spec, {
  name: 'Move Monitors and Folders',
  key: 'move_items',
  description:
    'Move monitors, folders, or both into another folder. Call list_folders to find monitor and folder IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      wachetIds: z
        .array(z.string())
        .optional()
        .describe('Monitor IDs to move, from list_folders or search_monitors'),
      folderIds: z
        .array(z.string())
        .optional()
        .describe('Folder IDs to move, from list_folders'),
      folderId: z.string().describe('Destination folder ID from list_folders')
    })
  )
  .output(
    z.object({
      wachetIds: z.array(z.string()).describe('Monitor IDs moved'),
      folderIds: z.array(z.string()).describe('Folder IDs moved'),
      folderId: z.string().describe('Destination folder ID')
    })
  )
  .handleInvocation(async ctx => {
    let wachetIds = ctx.input.wachetIds ?? [];
    let folderIds = ctx.input.folderIds ?? [];
    if (!wachetIds.length && !folderIds.length) {
      throw createApiServiceError('Provide at least one monitor ID or folder ID to move.');
    }
    if (!ctx.input.folderId.trim() || [...wachetIds, ...folderIds].some(id => !id.trim())) {
      throw createApiServiceError('Monitor, folder, and destination IDs must not be empty.');
    }
    if (folderIds.includes(ctx.input.folderId)) {
      throw createApiServiceError(
        'A folder cannot be moved into itself. Choose a different destination.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    await client.moveItems({ taskIds: wachetIds, folderIds, folderId: ctx.input.folderId });
    return {
      output: { wachetIds, folderIds, folderId: ctx.input.folderId },
      message: `Moved ${wachetIds.length} monitor(s) and ${folderIds.length} folder(s) into \`${ctx.input.folderId}\`.`
    };
  })
  .build();
