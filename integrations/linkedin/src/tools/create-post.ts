import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let createPost = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Create a new member share on LinkedIn. Supports text posts, article shares (with a link), and image posts through the self-serve Share on LinkedIn product.`,
  instructions: [
    'Provide the member URN of the authenticated profile, e.g. "urn:li:person:abc123", as authorUrn.',
    'To share an article/link, provide the articleUrl field. To attach an image, first use the Initialize Image Upload tool, then provide the returned image URN in imageUrn.',
    'Organization/page posting is intentionally excluded from this slate. Move that workflow to a separate Community Management slate because LinkedIn does not allow the required products to be combined in one app.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      authorUrn: z
        .string()
        .describe('URN of the authenticated member author, e.g. "urn:li:person:abc123"'),
      text: z.string().describe('Post text/commentary content'),
      visibility: z
        .enum(['PUBLIC', 'CONNECTIONS'])
        .default('PUBLIC')
        .describe('Post visibility setting'),
      articleUrl: z.string().optional().describe('URL of an article to share as a link post'),
      articleTitle: z.string().optional().describe('Title for the shared article'),
      articleDescription: z.string().optional().describe('Description for the shared article'),
      imageUrn: z
        .string()
        .optional()
        .describe('URN of an uploaded image (from Initialize Image Upload) to attach'),
      imageAltText: z
        .string()
        .optional()
        .describe('Short text to include as the image description in the share payload')
    })
  )
  .output(
    z.object({
      postUrn: z.string().describe('URN of the created post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });
    let postUrn = await client.createPost({
      authorUrn: ctx.input.authorUrn,
      text: ctx.input.text,
      visibility: ctx.input.visibility,
      articleUrl: ctx.input.articleUrl,
      articleTitle: ctx.input.articleTitle,
      articleDescription: ctx.input.articleDescription,
      imageUrn: ctx.input.imageUrn,
      imageDescription: ctx.input.imageAltText
    });

    return {
      output: { postUrn },
      message: `Created post on LinkedIn. Post URN: \`${postUrn}\``
    };
  })
  .build();
