import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment to a Notion page or reply to an existing discussion thread.
Comments can be placed at the top of a page or as a reply to an existing discussion.`,
  instructions: [
    'Provide either a pageId to comment on a page, or a discussionId to reply to an existing thread.',
    'The comment text is provided as plain text and will be converted to rich text automatically. For advanced formatting, use the richText parameter instead.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pageId: z
        .string()
        .optional()
        .describe('ID of the page to comment on (use this OR discussionId)'),
      discussionId: z
        .string()
        .optional()
        .describe('ID of the discussion thread to reply to (use this OR pageId)'),
      text: z
        .string()
        .optional()
        .describe('Plain text comment content (use this OR richText)'),
      richText: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Rich text array for advanced formatting (use this OR text)')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment'),
      discussionId: z.string().optional().describe('ID of the discussion thread'),
      createdTime: z.string().optional().describe('When the comment was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let targetCount = [ctx.input.pageId, ctx.input.discussionId].filter(
      value => value !== undefined
    ).length;
    if (targetCount !== 1) {
      throw createApiServiceError('Provide exactly one of pageId or discussionId');
    }

    let contentCount = [ctx.input.text, ctx.input.richText].filter(
      value => value !== undefined
    ).length;
    if (contentCount !== 1) {
      throw createApiServiceError('Provide exactly one of text or richText');
    }
    if (ctx.input.text !== undefined && ctx.input.text.length === 0) {
      throw createApiServiceError('text must not be empty');
    }
    if (ctx.input.richText !== undefined && ctx.input.richText.length === 0) {
      throw createApiServiceError('richText must contain at least one rich text object');
    }

    let richText = ctx.input.richText ?? [{ type: 'text', text: { content: ctx.input.text } }];

    let comment = await client.createComment({
      parentPageId: ctx.input.pageId,
      discussionId: ctx.input.discussionId,
      richText
    });

    return {
      output: {
        commentId: comment.id,
        discussionId: comment.discussion_id,
        createdTime: comment.created_time
      },
      message: `Added comment **${comment.id}**${ctx.input.pageId ? ` on page ${ctx.input.pageId}` : ''}${ctx.input.discussionId ? ` in discussion ${ctx.input.discussionId}` : ''}`
    };
  })
  .build();
