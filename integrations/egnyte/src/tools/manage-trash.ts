import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let listTrashTool = SlateTool.create(spec, {
  name: 'List Trash',
  key: 'list_trash',
  description: `List items in the Egnyte trash. Optionally scope to a specific folder path within the trash. Items in trash are retained according to the domain's retention policy (default 30 days, max 180 days).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderPath: z
        .string()
        .optional()
        .describe('Path within the trash to list (omit for root trash listing)'),
      offset: z.number().optional().describe('Pagination offset'),
      count: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            name: z.string(),
            path: z.string(),
            isFolder: z.boolean().optional(),
            size: z.number().optional(),
            deletedBy: z.string().optional(),
            deletedTime: z.string().optional()
          })
        )
        .describe('Items in the trash'),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.listTrash(ctx.input.folderPath, {
      offset: ctx.input.offset,
      count: ctx.input.count
    })) as Record<string, unknown>;

    let rawItems = Array.isArray(result.files)
      ? result.files
      : Array.isArray(result.folders)
        ? [
            ...(result.folders as unknown[]),
            ...(Array.isArray(result.files) ? result.files : [])
          ]
        : Array.isArray(result.items)
          ? result.items
          : [];

    let items = rawItems.map((item: Record<string, unknown>) => ({
      name: String(item.name || ''),
      path: String(item.path || ''),
      isFolder: typeof item.is_folder === 'boolean' ? item.is_folder : undefined,
      size: typeof item.size === 'number' ? item.size : undefined,
      deletedBy: item.deleted_by ? String(item.deleted_by) : undefined,
      deletedTime: item.deleted_time ? String(item.deleted_time) : undefined
    }));

    return {
      output: {
        items,
        totalCount: typeof result.total_count === 'number' ? result.total_count : undefined
      },
      message: `Found **${items.length}** item(s) in trash${ctx.input.folderPath ? ` under ${ctx.input.folderPath}` : ''}`
    };
  })
  .build();

export let restoreFromTrashTool = SlateTool.create(spec, {
  name: 'Restore from Trash',
  key: 'restore_from_trash',
  description: `Restore a file or folder from the Egnyte trash back to its original location.`
})
  .input(
    z.object({
      trashItemPath: z.string().describe('Path of the item in the trash to restore')
    })
  )
  .output(
    z.object({
      trashItemPath: z.string(),
      restored: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.restoreFromTrash(ctx.input.trashItemPath);

    return {
      output: {
        trashItemPath: ctx.input.trashItemPath,
        restored: true
      },
      message: `Restored **${ctx.input.trashItemPath}** from trash`
    };
  })
  .build();

export let emptyTrashTool = SlateTool.create(spec, {
  name: 'Empty Trash',
  key: 'empty_trash',
  description: `Permanently delete all items in the Egnyte trash. This action cannot be undone. Only domain admins can perform this operation.`,
  tags: {
    destructive: true
  },
  constraints: [
    'Only domain administrators can empty the trash',
    'This action is irreversible — all trashed items are permanently deleted'
  ]
})
  .input(z.object({}))
  .output(
    z.object({
      emptied: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.emptyTrash();

    return {
      output: {
        emptied: true
      },
      message: 'Emptied the trash — all items permanently deleted'
    };
  })
  .build();
