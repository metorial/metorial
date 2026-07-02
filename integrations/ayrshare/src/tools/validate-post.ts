import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let platformEnum = z.enum([
  'bluesky',
  'facebook',
  'gmb',
  'instagram',
  'linkedin',
  'pinterest',
  'reddit',
  'snapchat',
  'telegram',
  'threads',
  'tiktok',
  'twitter',
  'youtube'
]);

export let validatePost = SlateTool.create(spec, {
  name: 'Validate Post',
  key: 'validate_post',
  description: `Validate post content before publishing. Runs technical and content checks and returns detailed error messages on how to correct any issues. Use this to verify content, character limits, and media compatibility before creating a post.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      post: z.string().describe('Post text to validate'),
      platforms: z.array(platformEnum).min(1).describe('Target platforms to validate against'),
      mediaUrls: z.array(z.string()).optional().describe('Media URLs to validate')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Validation status (success or error)'),
      errors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Validation errors with details on how to fix them')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.validatePost({
      post: ctx.input.post,
      platforms: ctx.input.platforms,
      mediaUrls: ctx.input.mediaUrls
    });

    let errors = result.errors || [];

    return {
      output: {
        status: result.status || (errors.length > 0 ? 'error' : 'success'),
        errors
      },
      message:
        errors.length > 0
          ? `Validation found **${errors.length}** issue(s) that need to be addressed.`
          : 'Post content validated successfully — no issues found.'
    };
  })
  .build();
