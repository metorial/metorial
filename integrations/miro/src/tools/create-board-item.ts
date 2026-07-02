import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let createBoardItem = SlateTool.create(spec, {
  name: 'Create Board Item',
  key: 'create_board_item',
  description: `Creates a new item on a Miro board. Supports sticky notes, cards, text, shapes, images (from URL), embeds, and frames. Choose the item type and provide the relevant fields.`,
  instructions: [
    'Set "itemType" to the desired type, then fill in the corresponding fields.',
    'Sticky note colors: light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black, gray.',
    'Shape types include: rectangle, circle, triangle, wedge_round_rectangle_callout, round_rectangle, rhombus, parallelogram, trapezoid, pentagon, hexagon, octagon, star, flow_chart_*, cloud, cross, can, right_arrow, left_arrow, left_right_arrow, left_brace, right_brace, and more.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to add the item to'),
      itemType: z
        .enum(['sticky_note', 'card', 'text', 'shape', 'image', 'embed', 'frame'])
        .describe('Type of item to create'),
      content: z.string().optional().describe('Text content (for sticky notes, text, shapes)'),
      title: z.string().optional().describe('Title (for cards, images, frames)'),
      description: z.string().optional().describe('Description (for cards)'),
      dueDate: z.string().optional().describe('Due date for cards (ISO 8601)'),
      assigneeId: z.string().optional().describe('Assignee user ID (for cards)'),
      url: z.string().optional().describe('URL (for images from URL, embeds)'),
      shape: z
        .string()
        .optional()
        .describe(
          'Shape type (for shapes: rectangle, circle, etc.) or sticky note shape (square, rectangle)'
        ),
      fillColor: z.string().optional().describe('Fill/background color'),
      textAlign: z
        .string()
        .optional()
        .describe('Horizontal text alignment (left, center, right)'),
      textAlignVertical: z
        .string()
        .optional()
        .describe('Vertical text alignment (top, middle, bottom)'),
      fontSize: z.number().optional().describe('Font size (for text items)'),
      borderColor: z.string().optional().describe('Border color (for shapes)'),
      borderWidth: z.string().optional().describe('Border width (for shapes)'),
      borderStyle: z
        .string()
        .optional()
        .describe('Border style: normal, dotted, dashed (for shapes)'),
      x: z.number().optional().describe('X coordinate position'),
      y: z.number().optional().describe('Y coordinate position'),
      width: z.number().optional().describe('Width of the item'),
      height: z.number().optional().describe('Height of the item'),
      rotation: z.number().optional().describe('Rotation angle in degrees'),
      parentId: z.string().optional().describe('Parent frame ID to place the item inside')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the created item'),
      itemType: z.string().describe('Type of the created item'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let item: any;

    switch (ctx.input.itemType) {
      case 'sticky_note':
        item = await client.createStickyNote(ctx.input.boardId, {
          content: ctx.input.content || '',
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
        item = await client.createCard(ctx.input.boardId, {
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
        item = await client.createText(ctx.input.boardId, {
          content: ctx.input.content || '',
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
        item = await client.createShape(ctx.input.boardId, {
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

      case 'image':
        item = await client.createImageFromUrl(ctx.input.boardId, {
          url: ctx.input.url || '',
          title: ctx.input.title,
          x: ctx.input.x,
          y: ctx.input.y,
          width: ctx.input.width,
          height: ctx.input.height,
          rotation: ctx.input.rotation,
          parentId: ctx.input.parentId
        });
        break;

      case 'embed':
        item = await client.createEmbed(ctx.input.boardId, {
          url: ctx.input.url || '',
          x: ctx.input.x,
          y: ctx.input.y,
          width: ctx.input.width,
          height: ctx.input.height,
          parentId: ctx.input.parentId
        });
        break;

      case 'frame':
        item = await client.createFrame(ctx.input.boardId, {
          title: ctx.input.title,
          x: ctx.input.x,
          y: ctx.input.y,
          width: ctx.input.width,
          height: ctx.input.height,
          parentId: ctx.input.parentId
        });
        break;
    }

    return {
      output: {
        itemId: item.id,
        itemType: item.type || ctx.input.itemType,
        createdAt: item.createdAt
      },
      message: `Created **${ctx.input.itemType}** item (ID: ${item.id}) on board ${ctx.input.boardId}.`
    };
  })
  .build();
