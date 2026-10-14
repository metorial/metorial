import { SlateTool } from 'slates';
import { z } from 'zod';
import { boardItemOutputSchema, mapBoardItem } from '../lib/board-items';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let getFrameItems = SlateTool.create(spec, {
  name: 'Get Frame Items',
  key: 'get_frame_items',
  description:
    'Retrieves a page of child items inside a Miro frame. Call get_board_items to discover frame IDs and pass the returned cursor to retrieve another page.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      boardId: z.string().min(1).describe('Board ID. Call list_boards to discover boards.'),
      frameId: z
        .string()
        .min(1)
        .describe('Frame ID. Call get_board_items with itemType frame to discover frames.'),
      limit: z
        .number()
        .int()
        .min(10)
        .max(50)
        .optional()
        .describe('Maximum items per page, from 10 to 50; defaults to 10'),
      cursor: z.string().optional().describe('Cursor returned by the previous page')
    })
  )
  .output(
    z.object({
      frameId: z.string().describe('Frame whose children were retrieved'),
      items: z.array(boardItemOutputSchema).describe('Child items in this page'),
      cursor: z.string().optional().describe('Cursor for the next page, if available'),
      total: z.number().optional().describe('Total child item count, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let result = await client.getFrameItems(ctx.input.boardId, ctx.input.frameId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });
    let items = (result.data ?? []).map(mapBoardItem);
    return {
      output: {
        frameId: ctx.input.frameId,
        items,
        cursor: result.cursor ?? undefined,
        total: result.total ?? undefined
      },
      message: `Retrieved ${items.length} item(s) inside frame ${ctx.input.frameId}.`
    };
  })
  .build();
