import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let addImage = SlateTool.create(spec, {
  name: 'Add Image',
  key: 'add_image',
  description: `Inserts an image onto a slide from a public URL, or replaces all shapes matching a text pattern with an image across the presentation. The direct insert mode places an image at a specific position and size, while the replace mode is useful for template-driven image insertion.`,
  instructions: [
    'For direct insertion, provide a slideObjectId, imageUrl, and optionally size/position.',
    'For template-based replacement, provide a findText pattern and imageUrl to replace all matching shapes.',
    'Image URLs must be publicly accessible. Google fetches the image server-side.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.addImage)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      mode: z
        .enum(['insert', 'replace_shapes'])
        .describe('Insert an image directly or replace shapes matching text with an image'),

      imageUrl: z.string().describe('Publicly accessible URL of the image to insert'),

      slideObjectId: z
        .string()
        .optional()
        .describe('Object ID of the slide to insert the image onto (for insert mode)'),
      widthPt: z
        .number()
        .optional()
        .describe('Width of the image in points (for insert mode)'),
      heightPt: z
        .number()
        .optional()
        .describe('Height of the image in points (for insert mode)'),
      translateXPt: z
        .number()
        .optional()
        .describe('X position offset in points from the top-left (for insert mode)'),
      translateYPt: z
        .number()
        .optional()
        .describe('Y position offset in points from the top-left (for insert mode)'),

      findText: z
        .string()
        .optional()
        .describe('Text pattern to match shapes for replacement (for replace_shapes mode)'),
      replaceMethod: z
        .enum(['CENTER_INSIDE', 'CENTER_CROP'])
        .optional()
        .describe(
          'How to fit the image in the replaced shape (for replace_shapes mode, defaults to CENTER_INSIDE)'
        )
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      mode: z.string().describe('Mode used'),
      createdImageId: z
        .string()
        .optional()
        .describe('Object ID of the created image (for insert mode)'),
      shapesReplaced: z
        .number()
        .optional()
        .describe('Number of shapes replaced (for replace_shapes mode)'),
      replies: z.array(z.any()).optional().describe('Raw API replies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let { presentationId, mode, imageUrl } = ctx.input;
    let result: any;
    let createdImageId: string | undefined;
    let shapesReplaced: number | undefined;

    if (mode === 'insert') {
      if (!ctx.input.slideObjectId) {
        throw new Error('slideObjectId is required for insert mode');
      }

      let transform: any;
      if (ctx.input.translateXPt !== undefined || ctx.input.translateYPt !== undefined) {
        transform = {
          scaleX: 1,
          scaleY: 1,
          translateX: (ctx.input.translateXPt ?? 0) * 12700,
          translateY: (ctx.input.translateYPt ?? 0) * 12700,
          unit: 'EMU'
        };
      }

      result = await client.createImage(presentationId, {
        url: imageUrl,
        pageObjectId: ctx.input.slideObjectId,
        size:
          ctx.input.widthPt && ctx.input.heightPt
            ? { width: ctx.input.widthPt, height: ctx.input.heightPt }
            : undefined,
        transform
      });

      createdImageId = result.replies?.[0]?.createImage?.objectId;
    } else {
      if (!ctx.input.findText) {
        throw new Error('findText is required for replace_shapes mode');
      }

      result = await client.replaceAllShapesWithImage(
        presentationId,
        ctx.input.findText,
        imageUrl,
        ctx.input.replaceMethod
      );

      shapesReplaced = result.replies?.[0]?.replaceAllShapesWithImage?.occurrencesChanged ?? 0;
    }

    let message =
      mode === 'insert'
        ? `Inserted image onto slide \`${ctx.input.slideObjectId}\`${createdImageId ? ` as element \`${createdImageId}\`` : ''}.`
        : `Replaced **${shapesReplaced}** shape(s) matching "${ctx.input.findText}" with the image.`;

    return {
      output: {
        presentationId,
        mode,
        createdImageId,
        shapesReplaced,
        replies: result?.replies
      },
      message
    };
  })
  .build();
