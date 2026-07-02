import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { requireRedditInput } from '../lib/errors';
import { spec } from '../spec';

export let manageComment = SlateTool.create(spec, {
  name: 'Manage Comment',
  key: 'manage_comment',
  description: `Edit or delete your own comments on Reddit.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      commentId: z.string().describe('Fullname of the comment (e.g. t1_abc123)'),
      action: z.enum(['edit', 'delete']).describe('Action to perform'),
      text: z.string().optional().describe('New text content (required for edit action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      commentId: z.string().describe('Fullname of the affected comment'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);
    let { commentId, action, text } = ctx.input;

    let fullname = commentId.startsWith('t1_') ? commentId : `t1_${commentId}`;

    if (action === 'edit') {
      await client.editComment(
        fullname,
        requireRedditInput(text, 'text is required for edit action')
      );
    } else {
      await client.deleteComment(fullname);
    }

    return {
      output: {
        success: true,
        commentId: fullname,
        action
      },
      message: `Successfully ${action === 'edit' ? 'edited' : 'deleted'} comment \`${fullname}\`.`
    };
  })
  .build();
