import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let updatePostTool = SlateTool.create(spec, {
  name: 'Update Post',
  key: 'update_post',
  description: `Update a feedback post's content fields. Can modify the title, details, ETA, custom fields, and images. For status changes, board moves, or category changes, use the dedicated tools.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('The ID of the post to update'),
      title: z.string().optional().describe('New title for the post'),
      details: z.string().optional().describe('New body/description for the post'),
      eta: z.string().optional().describe('New estimated completion date (ISO 8601)'),
      etaPublic: z.boolean().optional().describe('Whether to show ETA publicly'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs to update'),
      imageURLs: z
        .array(z.string())
        .optional()
        .describe('New set of image URLs (replaces existing)')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the updated post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.updatePost({
      postID: ctx.input.postId,
      title: ctx.input.title,
      details: ctx.input.details,
      eta: ctx.input.eta,
      etaPublic: ctx.input.etaPublic,
      customFields: ctx.input.customFields,
      imageURLs: ctx.input.imageURLs
    });

    return {
      output: { postId: result.id },
      message: `Updated post **${result.id}**.`
    };
  })
  .build();
