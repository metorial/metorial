import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { commentSchema } from '../lib/types';
import { spec } from '../spec';

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add an internal comment to a ticket. Comments are only visible to agents, not customers. Useful for internal collaboration and notes on tickets.`,
  instructions: [
    'Provide either contentText or contentHtml (or both). At least one is required.'
  ]
})
  .input(
    z.object({
      ticketId: z.number().describe('The ID of the ticket to comment on'),
      contentText: z.string().optional().describe('Plain text comment content'),
      contentHtml: z.string().optional().describe('HTML comment content'),
      attachmentIds: z
        .array(z.number())
        .optional()
        .describe('IDs of previously uploaded attachments')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let comment = await client.createComment(ctx.input.ticketId, {
      contentText: ctx.input.contentText,
      contentHtml: ctx.input.contentHtml,
      attachmentIds: ctx.input.attachmentIds
    });

    return {
      output: comment,
      message: `Comment **#${comment.commentId}** added to ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
