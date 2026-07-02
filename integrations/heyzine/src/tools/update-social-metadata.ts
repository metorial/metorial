import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let updateSocialMetadata = SlateTool.create(spec, {
  name: 'Update Social Metadata',
  key: 'update_social_metadata',
  description: `Updates the social sharing metadata (title, description, thumbnail) for a flipbook or bookshelf.
This controls how the resource appears when shared on social media platforms via Open Graph tags.`
})
  .input(
    z.object({
      resourceType: z
        .enum(['flipbook', 'bookshelf'])
        .describe('Whether to update social metadata for a flipbook or bookshelf.'),
      resourceId: z.string().describe('Unique identifier of the flipbook or bookshelf.'),
      title: z.string().optional().describe('Title for social sharing.'),
      description: z.string().optional().describe('Description for social sharing.'),
      thumbnailUrl: z
        .string()
        .optional()
        .describe('URL of the thumbnail image for social sharing.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    let metadata = {
      title: ctx.input.title,
      description: ctx.input.description,
      thumbnail: ctx.input.thumbnailUrl
    };

    if (ctx.input.resourceType === 'flipbook') {
      await client.updateFlipbookSocial(ctx.input.resourceId, metadata);
    } else {
      await client.updateBookshelfSocial(ctx.input.resourceId, metadata);
    }

    return {
      output: {
        success: true
      },
      message: `Updated social metadata for ${ctx.input.resourceType} **${ctx.input.resourceId}**.`
    };
  })
  .build();
