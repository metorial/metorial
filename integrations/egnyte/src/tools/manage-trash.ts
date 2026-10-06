import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let listTrashTool = SlateTool.create(spec, {
  name: 'List Trash',
  key: 'list_trash',
  description: `List one page of items in the Egnyte trash. Folder-path filtering is unsupported; use the returned exact item paths and IDs. Retention follows the domain's configured policy.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderPath: z
        .string()
        .optional()
        .describe('Legacy unsupported filter; omit to list the current trash page'),
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
            trashId: z.string().optional().describe('Exact trash item identifier'),
            itemType: z.string().optional(),
            isFolder: z.boolean().optional(),
            size: z.number().optional(),
            deletedBy: z.string().optional(),
            deletedTime: z.string().optional()
          })
        )
        .describe('Items in the trash'),
      totalCount: z.number().optional(),
      hasMore: z.boolean().optional(),
      offset: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient(ctx.auth);

    let result = (await client.listTrash(ctx.input.folderPath, {
      offset: ctx.input.offset,
      count: ctx.input.count
    })) as Record<string, unknown>;

    let rawItems = result.items as Record<string, unknown>[];

    let items = rawItems.map((item: Record<string, unknown>) => ({
      name: String(item.name),
      trashId: String(item.id),
      itemType: String(item.type),
      path: String(item.path || ''),
      isFolder: item.type === 'folder',
      size: typeof item.size === 'number' ? item.size : undefined,
      deletedBy: item.deleted_by ? String(item.deleted_by) : undefined,
      deletedTime: item.delete_date ? String(item.delete_date) : undefined
    }));

    return {
      output: {
        items,
        hasMore: typeof result.has_more === 'boolean' ? result.has_more : undefined,
        offset: typeof result.offset === 'number' ? result.offset : (ctx.input.offset ?? 0),
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
      trashItemPath: z.string().describe('Original absolute path of the item to restore'),
      trashId: z
        .string()
        .optional()
        .describe(
          'Exact trash ID, required when multiple deleted items share the original path'
        )
    })
  )
  .output(
    z.object({
      trashItemPath: z.string(),
      restored: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient(ctx.auth);

    await client.restoreFromTrash(ctx.input.trashItemPath, ctx.input.trashId);

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
  description: `Legacy whole-trash operation. The current Egnyte API only documents purging explicitly selected item IDs; this tool refuses the unsupported whole-trash request.`,
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
    let client = new EgnyteClient(ctx.auth);

    await client.emptyTrash();

    return {
      output: {
        emptied: true
      },
      message: 'Emptied the trash — all items permanently deleted'
    };
  })
  .build();
