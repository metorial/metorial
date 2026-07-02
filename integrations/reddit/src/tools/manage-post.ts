import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { requireRedditInput } from '../lib/errors';
import { spec } from '../spec';

export let managePost = SlateTool.create(spec, {
  name: 'Manage Post',
  key: 'manage_post',
  description: `Edit, delete, hide/unhide, or toggle NSFW/spoiler flags on your own posts.
Use this to modify existing posts after submission.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('Fullname of the post (e.g. t3_abc123)'),
      action: z
        .enum([
          'edit',
          'delete',
          'hide',
          'unhide',
          'mark_nsfw',
          'unmark_nsfw',
          'mark_spoiler',
          'unmark_spoiler'
        ])
        .describe('Action to perform on the post'),
      text: z
        .string()
        .optional()
        .describe('New text content for the post (required for edit action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      postId: z.string().describe('Fullname of the affected post'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);
    let { postId, action, text } = ctx.input;

    let fullname = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    switch (action) {
      case 'edit':
        await client.editPost(
          fullname,
          requireRedditInput(text, 'text is required for edit action')
        );
        break;
      case 'delete':
        await client.deletePost(fullname);
        break;
      case 'hide':
        await client.hidePost(fullname);
        break;
      case 'unhide':
        await client.unhidePost(fullname);
        break;
      case 'mark_nsfw':
        await client.markNsfw(fullname);
        break;
      case 'unmark_nsfw':
        await client.unmarkNsfw(fullname);
        break;
      case 'mark_spoiler':
        await client.markSpoiler(fullname);
        break;
      case 'unmark_spoiler':
        await client.unmarkSpoiler(fullname);
        break;
    }

    return {
      output: {
        success: true,
        postId: fullname,
        action
      },
      message: `Successfully performed **${action.replace('_', ' ')}** on post \`${fullname}\`.`
    };
  })
  .build();
