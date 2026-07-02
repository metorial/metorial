import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { mondayServiceError } from '../lib/errors';
import { spec } from '../spec';

let columnMappingSchema = z.object({
  source: z.string().describe('Source column ID'),
  target: z.string().nullable().optional().describe('Target column ID, or null to drop data')
});

export let moveItemTool = SlateTool.create(spec, {
  name: 'Move Item',
  key: 'move_item',
  description: `Move an item within its board, to a group, or to another board.`
})
  .input(
    z.object({
      itemId: z.string().describe('Item ID to move'),
      target: z
        .enum(['group', 'position', 'board'])
        .describe('Move target: group, position on the same board, or another board'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID for target=group, target=board, or group-top positioning'),
      boardId: z.string().optional().describe('Target board ID for target=board'),
      relativeTo: z
        .string()
        .optional()
        .describe('Item ID to position relative to for target=position'),
      positionRelativeMethod: z
        .enum(['before_at', 'after_at'])
        .optional()
        .describe('Whether to place before or after relativeTo for target=position'),
      groupTop: z
        .boolean()
        .optional()
        .describe('When target=position with groupId, true places at top, false at bottom'),
      columnsMapping: z
        .array(columnMappingSchema)
        .optional()
        .describe('Column mappings when moving to another board'),
      subitemsColumnsMapping: z
        .array(columnMappingSchema)
        .optional()
        .describe('Subitem column mappings when moving to another board')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Moved item ID'),
      name: z.string().nullable().describe('Moved item name'),
      groupId: z.string().nullable().describe('Resulting group ID'),
      boardId: z.string().nullable().describe('Resulting board ID'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let item: any;

    if (ctx.input.target === 'group') {
      if (!ctx.input.groupId) {
        throw mondayServiceError('groupId is required when target is group.');
      }
      item = await client.moveItemToGroup(ctx.input.itemId, ctx.input.groupId);
    } else if (ctx.input.target === 'position') {
      if (ctx.input.relativeTo || ctx.input.positionRelativeMethod) {
        if (!ctx.input.relativeTo || !ctx.input.positionRelativeMethod) {
          throw mondayServiceError(
            'relativeTo and positionRelativeMethod must be provided together.'
          );
        }
        item = await client.changeItemPosition(ctx.input.itemId, {
          relativeTo: ctx.input.relativeTo,
          positionRelativeMethod: ctx.input.positionRelativeMethod
        });
      } else {
        if (!ctx.input.groupId || ctx.input.groupTop === undefined) {
          throw mondayServiceError(
            'For group-top positioning, groupId and groupTop must be provided together.'
          );
        }
        item = await client.changeItemPosition(ctx.input.itemId, {
          groupId: ctx.input.groupId,
          groupTop: ctx.input.groupTop
        });
      }
    } else {
      if (!ctx.input.boardId || !ctx.input.groupId) {
        throw mondayServiceError('boardId and groupId are required when target is board.');
      }
      item = await client.moveItemToBoard({
        itemId: ctx.input.itemId,
        boardId: ctx.input.boardId,
        groupId: ctx.input.groupId,
        columnsMapping: ctx.input.columnsMapping,
        subitemsColumnsMapping: ctx.input.subitemsColumnsMapping
      });
    }

    return {
      output: {
        itemId: String(item.id ?? ctx.input.itemId),
        name: item.name || null,
        groupId: item.group?.id || ctx.input.groupId || null,
        boardId: item.board?.id ? String(item.board.id) : ctx.input.boardId || null,
        success: true
      },
      message: `Moved item ${ctx.input.itemId}.`
    };
  })
  .build();
