import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let requestImageDeletion = SlateTool.create(spec, {
  name: 'Request Image Deletion',
  key: 'request_image_deletion',
  description:
    'Request permanent deletion of one or more generated images. Reports that the provider accepted the request, together with the requested IDs. Acceptance does not confirm how many images were deleted.',
  instructions: [
    'Use image IDs from generate_image, generate_image_from_template, or list_images.',
    'The documented provider response confirms request acceptance without a completed-deletion count or completion confirmation.'
  ],
  constraints: ['Deletion is permanent and cannot be undone.'],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      imageIds: z
        .array(z.string())
        .min(1)
        .describe('One or more image IDs to request deletion for')
    })
  )
  .output(
    z.object({
      requestedImageIds: z
        .array(z.string())
        .describe('Image IDs submitted to the provider, including any repeated IDs'),
      status: z
        .literal('accepted')
        .describe('The provider accepted the deletion request; completion is not confirmed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ userId: ctx.auth.userId, token: ctx.auth.token });
    if (ctx.input.imageIds.length === 1) {
      await client.deleteImage(ctx.input.imageIds[0]!);
    } else {
      await client.deleteImagesBatch(ctx.input.imageIds);
    }
    return {
      output: { requestedImageIds: ctx.input.imageIds, status: 'accepted' as const },
      message:
        'The provider accepted the image deletion request. Completed deletion is not confirmed.'
    };
  })
  .build();
