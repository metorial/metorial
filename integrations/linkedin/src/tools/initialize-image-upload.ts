import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let initializeImageUpload = SlateTool.create(spec, {
  name: 'Initialize Image Upload',
  key: 'initialize_image_upload',
  description: `Initialize an image upload for a member share on LinkedIn. Returns an upload URL and image URN that can be used with the self-serve Share on LinkedIn APIs.`,
  instructions: [
    'The ownerUrn must be the authenticated member URN who will own the image, e.g. "urn:li:person:abc123".',
    'After calling this tool, upload the image binary to the returned uploadUrl, then use the imageUrn when creating a post.',
    'Organization/page media uploads should move to a separate Community Management slate because LinkedIn restricts those product combinations.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ownerUrn: z
        .string()
        .describe(
          'URN of the authenticated member who will own the image, e.g. "urn:li:person:abc123"'
        )
    })
  )
  .output(
    z.object({
      uploadUrl: z.string().describe('Pre-signed URL to upload the image binary via PUT'),
      imageUrn: z.string().describe('URN of the image to reference when creating a post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });
    let result = await client.initializeImageUpload(ctx.input.ownerUrn);

    return {
      output: {
        uploadUrl: result.uploadUrl,
        imageUrn: result.imageUrn
      },
      message: `Image upload initialized. Upload image to the returned URL, then use image URN \`${result.imageUrn}\` when creating a post.`
    };
  })
  .build();
