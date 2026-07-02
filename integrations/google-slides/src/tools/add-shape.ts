import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let addShape = SlateTool.create(spec, {
  name: 'Add Shape',
  key: 'add_shape',
  description: `Adds a shape or text box to a slide. Position and size are specified in points. Common shape types include TEXT_BOX, RECTANGLE, ELLIPSE, and many others. After adding a shape, use the **Edit Text** tool to insert text into it.`,
  instructions: [
    'Common shape types: TEXT_BOX, RECTANGLE, ROUND_RECTANGLE, ELLIPSE, TRIANGLE, DIAMOND, PENTAGON, HEXAGON, STAR, ARROW_LEFT, ARROW_RIGHT, ARROW_UP, ARROW_DOWN, HEART, CLOUD.',
    'Coordinates are in points from the top-left corner of the slide. Standard slide size is 720x405 points.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.addShape)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      slideObjectId: z.string().describe('Object ID of the slide to add the shape to'),
      shapeType: z
        .string()
        .describe('Type of shape to create (e.g. TEXT_BOX, RECTANGLE, ELLIPSE)'),
      widthPt: z.number().describe('Width of the shape in points'),
      heightPt: z.number().describe('Height of the shape in points'),
      translateXPt: z
        .number()
        .optional()
        .describe('X position in points from the top-left of the slide (defaults to 0)'),
      translateYPt: z
        .number()
        .optional()
        .describe('Y position in points from the top-left of the slide (defaults to 0)')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      createdShapeId: z.string().optional().describe('Object ID of the created shape'),
      replies: z.array(z.any()).optional().describe('Raw API replies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let { presentationId, slideObjectId, shapeType, widthPt, heightPt } = ctx.input;

    let result = await client.createShape(presentationId, {
      shapeType,
      pageObjectId: slideObjectId,
      elementProperties: {
        size: {
          width: { magnitude: widthPt, unit: 'PT' },
          height: { magnitude: heightPt, unit: 'PT' }
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: (ctx.input.translateXPt ?? 0) * 12700,
          translateY: (ctx.input.translateYPt ?? 0) * 12700,
          unit: 'EMU'
        }
      }
    });

    let createdShapeId = result.replies?.[0]?.createShape?.objectId;

    return {
      output: {
        presentationId,
        createdShapeId,
        replies: result?.replies
      },
      message: `Added **${shapeType}** shape to slide \`${slideObjectId}\`${createdShapeId ? ` with ID \`${createdShapeId}\`` : ''}.`
    };
  })
  .build();
