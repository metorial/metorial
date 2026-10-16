import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

export let updateMedia = SlateTool.create(spec, {
  key: 'update_media',
  name: 'Update Media Alt Text',
  description:
    'Set or clear an uploaded media file accessibility description before publishing. Use list_social_sets to discover the social set ID and upload_media for media IDs.',
  instructions: [
    'Alt text is copied when media is attached. For existing draft media, update the description and then resend the draft content with update_draft to update every platform.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      socialSetId: z.string().describe('Social set ID from list_social_sets.'),
      mediaId: z.string().describe('Media ID from upload_media.'),
      altText: z
        .string()
        .max(1000)
        .nullable()
        .describe('Accessibility description, or null to clear existing alt text')
    })
  )
  .output(
    z.object({
      media: z
        .record(z.string(), z.unknown())
        .describe(
          'Actual media processing status, alt text, metadata, and URLs returned by Typefully'
        )
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      media: await new TypefullyClient(ctx.auth.token).updateMedia(
        ctx.input.socialSetId,
        ctx.input.mediaId,
        ctx.input.altText
      )
    },
    message: 'Updated media accessibility description.'
  }))
  .build();
