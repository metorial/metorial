import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let updateBoardItem = SlateTool.create(spec, {
  name: 'Update Board Item',
  key: 'update_board_item',
  description: `Updates an existing item on a Miro board. Supports updating sticky notes, cards, text, and shapes. Only provided fields will be modified.`,
  instructions: [
    'Specify the itemType to ensure the correct update endpoint is used.',
    'Use "generic" as itemType to update only position/parent without type-specific fields.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board containing the item'),
      itemId: z.string().describe('ID of the item to update'),
      itemType: z
        .enum(['sticky_note', 'card', 'text', 'shape', 'generic'])
        .describe('Type of the item to update'),
      content: z
        .string()
        .optional()
        .describe('Updated text content (sticky notes, text, shapes)'),
      title: z.string().optional().describe('Updated title (cards)'),
      description: z.string().optional().describe('Updated description (cards)'),
      dueDate: z.string().optional().describe('Updated due date (cards, ISO 8601)'),
      assigneeId: z.string().optional().describe('Updated assignee user ID (cards)'),
      shape: z.string().optional().describe('Updated shape type'),
      fillColor: z.string().optional().describe('Updated fill color'),
      textAlign: z.string().optional().describe('Updated horizontal text alignment'),
      textAlignVertical: z.string().optional().describe('Updated vertical text alignment'),
      fontSize: z.number().optional().describe('Updated font size (text items)'),
      borderColor: z.string().optional().describe('Updated border color (shapes)'),
      borderWidth: z.string().optional().describe('Updated border width (shapes)'),
      borderStyle: z.string().optional().describe('Updated border style (shapes)'),
      x: z.number().optional().describe('Updated X coordinate'),
      y: z.number().optional().describe('Updated Y coordinate'),
      width: z.number().optional().describe('Updated width'),
      height: z.number().optional().describe('Updated height'),
      rotation: z.number().optional().describe('Updated rotation in degrees'),
      parentId: z.string().optional().describe('New parent frame ID')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the updated item'),
      itemType: z.string().describe('Type of the updated item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let item: any;

    switch (ctx.input.itemType) {
      case 'sticky_note':
        item = await client.updateStickyNote(ctx.input.boardId, ctx.input.itemId, {
          content: ctx.input.content,
          shape: ctx.input.shape,
          fillColor: ctx.input.fillColor,
          textAlign: ctx.input.textAlign,
          textAlignVertical: ctx.input.textAlignVertical,
          x: ctx.input.x,
          y: ctx.input.y,
          parentId: ctx.input.parentId
        });
        break;

      case 'card':
        item = await client.updateCard(ctx.input.boardId, ctx.input.itemId, {
          title: ctx.input.title,
          description: ctx.input.description,
          dueDate: ctx.input.dueDate,
          assigneeId: ctx.input.assigneeId,
          x: ctx.input.x,
          y: ctx.input.y,
          width: ctx.input.width,
          height: ctx.input.height,
          parentId: ctx.input.parentId
        });
        break;

      case 'text':
        item = await client.updateText(ctx.input.boardId, ctx.input.itemId, {
          content: ctx.input.content,
          fontSize: ctx.input.fontSize,
          fillColor: ctx.input.fillColor,
          textAlign: ctx.input.textAlign,
          x: ctx.input.x,
          y: ctx.input.y,
          width: ctx.input.width,
          height: ctx.input.height,
          rotation: ctx.input.rotation,
          parentId: ctx.input.parentId
        });
        break;

      case 'shape':
        item = await client.updateShape(ctx.input.boardId, ctx.input.itemId, {
          content: ctx.input.content,
          shape: ctx.input.shape,
          fillColor: ctx.input.fillColor,
          borderColor: ctx.input.borderColor,
          borderWidth: ctx.input.borderWidth,
          borderStyle: ctx.input.borderStyle,
          textAlign: ctx.input.textAlign,
          textAlignVertical: ctx.input.textAlignVertical,
          x: ctx.input.x,
          y: ctx.input.y,
          width: ctx.input.width,
          height: ctx.input.height,
          rotation: ctx.input.rotation,
          parentId: ctx.input.parentId
        });
        break;

      case 'generic':
        item = await client.updateItemPosition(ctx.input.boardId, ctx.input.itemId, {
          position:
            ctx.input.x !== undefined || ctx.input.y !== undefined
              ? {
                  x: ctx.input.x,
                  y: ctx.input.y
                }
              : undefined,
          parent: ctx.input.parentId ? { id: ctx.input.parentId } : undefined
        });
        break;
    }

    return {
      output: {
        itemId: item.id,
        itemType: item.type || ctx.input.itemType
      },
      message: `Updated **${ctx.input.itemType}** item ${ctx.input.itemId} on board ${ctx.input.boardId}.`
    };
  })
  .build();
