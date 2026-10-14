import { SlateTool } from 'slates';
import { z } from 'zod';
import { boardItemOutputSchema, mapBoardItem } from '../lib/board-items';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let getBoardItems = SlateTool.create(spec, {
  name: 'Get Board Items',
  key: 'get_board_items',
  description: `Retrieves items from a Miro board. Can fetch all items, a single item by ID, or filter by item type. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      itemId: z.string().optional().describe('If provided, retrieves a single item by ID'),
      itemType: z
        .string()
        .optional()
        .describe(
          'Filter items by type (sticky_note, card, text, shape, image, document, embed, frame, app_card)'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of items to return (default 10, max 50)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      items: z.array(boardItemOutputSchema).describe('List of items'),
      cursor: z.string().optional().describe('Cursor for the next page'),
      total: z.number().optional().describe('Total item count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });

    if (ctx.input.itemId) {
      let item = await client.getItem(ctx.input.boardId, ctx.input.itemId);
      let mapped = mapBoardItem(item);
      return {
        output: {
          items: [mapped],
          cursor: undefined,
          total: 1
        },
        message: `Retrieved **${mapped.itemType}** item ${mapped.itemId}.`
      };
    }

    let result = await client.getItems(ctx.input.boardId, {
      type: ctx.input.itemType,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let items = (result.data || []).map(mapBoardItem);

    return {
      output: {
        items,
        cursor: result.cursor ?? undefined,
        total: result.total ?? undefined
      },
      message: `Found **${items.length}** item(s) on board ${ctx.input.boardId}.`
    };
  })
  .build();
