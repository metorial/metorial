import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { mondayServiceError } from '../lib/errors';
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
        .max(100)
        .optional()
        .describe('Specific item IDs to retrieve (up to 100)'),
      groupId: z.string().optional().describe('Filter items by group ID (requires boardId)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum number of items to return (default: 25, max: 500)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      filters: z
        .array(
          z.object({
            columnId: z
              .string()
              .describe('Column ID to filter, such as name, group, status, people, or date'),
            compareValue: z
              .any()
              .optional()
              .describe('Value or values to compare against for this filter rule'),
            operator: z
              .string()
              .optional()
              .describe('monday.com filter operator, such as any_of or contains_text')
          })
        )
        .optional()
        .describe('items_page filter rules. Cannot be used together with cursor.'),
      filterOperator: z
        .enum(['and', 'or'])
        .optional()
        .describe('How to combine filter rules when filters are provided'),
      orderBy: z
        .array(
          z.object({
            columnId: z.string().describe('Column ID to sort by'),
            direction: z.enum(['asc', 'desc']).optional().describe('Sort direction')
          })
        )
        .optional()
        .describe('items_page order_by rules. Cannot be used together with cursor.'),
      hierarchyScopeConfig: z
        .enum(['allItems', 'parentItems'])
        .optional()
        .describe('How multi-level board hierarchy is handled while filtering')
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
      if (ctx.input.boardId || ctx.input.groupId || ctx.input.filters || ctx.input.orderBy) {
        throw mondayServiceError(
          'itemIds cannot be combined with boardId, groupId, filters, or orderBy.'
        );
      }
      items = await client.getItems(ctx.input.itemIds);
    } else if (ctx.input.boardId) {
      if (ctx.input.cursor && (ctx.input.filters?.length || ctx.input.orderBy?.length)) {
        throw mondayServiceError(
          'monday.com items_page does not allow cursor together with filters or orderBy.'
        );
      }
      let result = await client.getBoardItems(ctx.input.boardId, {
        limit: ctx.input.limit,
        cursor: ctx.input.cursor,
        groupId: ctx.input.groupId,
        hierarchyScopeConfig: ctx.input.hierarchyScopeConfig,
        queryParams:
          ctx.input.filters?.length || ctx.input.orderBy?.length
            ? {
                rules: ctx.input.filters?.map(filter => ({
                  column_id: filter.columnId,
                  compare_value: filter.compareValue ?? null,
                  ...(filter.operator ? { operator: filter.operator } : {})
                })),
                operator: ctx.input.filterOperator,
                order_by: ctx.input.orderBy?.map(order => ({
                  column_id: order.columnId,
                  ...(order.direction ? { direction: order.direction } : {})
                }))
              }
            : undefined
      });
      items = result.items;
      cursor = result.cursor;
    } else {
      throw mondayServiceError('Either boardId or itemIds must be provided.');
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
