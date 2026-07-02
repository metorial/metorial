import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Retrieve unresolved comments on a Notion page or block.
Returns comment text, author, timestamps, and discussion thread IDs. Only unresolved comments are returned.`,
  constraints: [
    'Only unresolved comments are returned. Resolved comments cannot be retrieved via the API.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      blockId: z.string().describe('ID of the page or block to list comments for'),
      startCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of comments to return (max 100)')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('ID of the comment'),
            discussionId: z.string().optional().describe('ID of the discussion thread'),
            richText: z.array(z.any()).optional().describe('Rich text content of the comment'),
            plainText: z.string().optional().describe('Plain text content of the comment'),
            createdTime: z.string().optional().describe('When the comment was created'),
            lastEditedTime: z.string().optional().describe('When the comment was last edited'),
            createdBy: z.any().optional().describe('User who created the comment')
          })
        )
        .describe('Array of comments'),
      hasMore: z.boolean().describe('Whether more comments are available'),
      nextCursor: z.string().nullable().describe('Cursor for the next page of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let result = await client.listComments(
      ctx.input.blockId,
      ctx.input.startCursor,
      ctx.input.pageSize
    );

    let comments = result.results.map((comment: any) => {
      let plainText = Array.isArray(comment.rich_text)
        ? comment.rich_text.map((t: any) => t.plain_text ?? '').join('')
        : undefined;

      return {
        commentId: comment.id,
        discussionId: comment.discussion_id,
        richText: comment.rich_text,
        plainText,
        createdTime: comment.created_time,
        lastEditedTime: comment.last_edited_time,
        createdBy: comment.created_by
      };
    });

    return {
      output: {
        comments,
        hasMore: result.has_more,
        nextCursor: result.next_cursor
      },
      message: `Retrieved **${comments.length}** comments${result.has_more ? ' — more available' : ''}`
    };
  })
  .build();
