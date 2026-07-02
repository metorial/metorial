import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let columnValueSchema = z.object({
  columnId: z.string().describe('Column ID'),
  type: z.string().describe('Column type'),
  text: z.string().nullable().describe('Human-readable text value'),
  value: z.string().nullable().describe('Raw JSON value')
});

let itemSchema = z.object({
  itemId: z.string().describe('Item ID'),
  name: z.string().describe('Item name'),
  state: z.string().describe('Item state (active, archived, deleted)'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp'),
  groupId: z.string().nullable().describe('Group ID the item belongs to'),
  groupTitle: z.string().nullable().describe('Group title'),
  columnValues: z.array(columnValueSchema).describe('Column values for the item'),
  subitemIds: z.array(z.string()).describe('IDs of sub-items')
});

export let listItemsTool = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `Retrieve items from a board or by item IDs. When fetching by board, supports pagination via cursor and filtering by group. Returns item data including column values and sub-item references.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().optional().describe('Board ID to list items from'),
      itemIds: z
        .array(z.string())
        .optional()
        .describe('Specific item IDs to retrieve (up to 100)'),
      groupId: z.string().optional().describe('Filter items by group ID (requires boardId)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of items to return (default: 500)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('List of items'),
      cursor: z.string().nullable().describe('Cursor for next page, null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let items: any[] = [];
    let cursor: string | null = null;

    if (ctx.input.itemIds?.length) {
      items = await client.getItems(ctx.input.itemIds);
    } else if (ctx.input.boardId) {
      let result = await client.getBoardItems(ctx.input.boardId, {
        limit: ctx.input.limit,
        cursor: ctx.input.cursor,
        groupId: ctx.input.groupId
      });
      items = result.items;
      cursor = result.cursor;
    } else {
      throw new Error('Either boardId or itemIds must be provided');
    }

    let mapped = items.map((item: any) => ({
      itemId: String(item.id),
      name: item.name,
      state: item.state || 'active',
      createdAt: item.created_at,
      updatedAt: item.updated_at || null,
      groupId: item.group?.id || null,
      groupTitle: item.group?.title || null,
      columnValues: (item.column_values || []).map((cv: any) => ({
        columnId: cv.id,
        type: cv.type,
        text: cv.text || null,
        value: cv.value || null
      })),
      subitemIds: (item.subitems || []).map((si: any) => String(si.id))
    }));

    return {
      output: { items: mapped, cursor },
      message: `Retrieved **${mapped.length}** item(s).${cursor ? ' More items available via cursor.' : ''}`
    };
  })
  .build();
