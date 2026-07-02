import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCommentsTool = SlateTool.create(spec, {
  name: 'Manage Comments',
  key: 'manage_comments',
  description: `Create, list, update, resolve, and delete comments and comment threads on design files. Use **action** to specify the operation.`,
  instructions: [
    'To list comment threads on a file, use action "list_threads" with fileId.',
    'To list all comment threads in a team, use action "list_threads" with teamId.',
    'To get comments in a thread, use action "get_comments" with threadId.',
    'To create a new comment thread, use action "create_thread" with fileId, pageId, content, positionX, positionY, and frameId.',
    'To reply to a thread, use action "reply" with threadId and content.',
    'To resolve/unresolve a thread, use action "resolve" with threadId and isResolved.',
    'To delete a comment, use action "delete_comment" with commentId.',
    'To delete a thread, use action "delete_thread" with threadId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list_threads',
          'get_comments',
          'create_thread',
          'reply',
          'resolve',
          'delete_comment',
          'delete_thread'
        ])
        .describe('The operation to perform'),
      fileId: z
        .string()
        .optional()
        .describe('File ID (for "list_threads" and "create_thread")'),
      teamId: z
        .string()
        .optional()
        .describe('Team ID (alternative for "list_threads" to get all threads in a team)'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID (for "get_comments", "reply", "resolve", "delete_thread")'),
      commentId: z.string().optional().describe('Comment ID (for "delete_comment")'),
      content: z
        .string()
        .optional()
        .describe('Comment content (for "create_thread" and "reply")'),
      pageId: z.string().optional().describe('Page ID (for "create_thread")'),
      frameId: z
        .string()
        .optional()
        .describe('Frame ID where the comment is anchored (for "create_thread")'),
      positionX: z
        .number()
        .optional()
        .describe('X position of the comment pin (for "create_thread")'),
      positionY: z
        .number()
        .optional()
        .describe('Y position of the comment pin (for "create_thread")'),
      isResolved: z
        .boolean()
        .optional()
        .describe('Whether to resolve the thread (for "resolve")')
    })
  )
  .output(
    z.object({
      threads: z.array(z.any()).optional().describe('Comment threads'),
      comments: z.array(z.any()).optional().describe('Comments in a thread'),
      thread: z.any().optional().describe('Created or updated thread'),
      comment: z.any().optional().describe('Created comment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let {
      action,
      fileId,
      teamId,
      threadId,
      commentId,
      content,
      pageId,
      frameId,
      positionX,
      positionY,
      isResolved
    } = ctx.input;

    switch (action) {
      case 'list_threads': {
        let threads = await client.getCommentThreads({ fileId, teamId });
        return {
          output: { threads },
          message: `Found **${threads.length}** comment thread(s).`
        };
      }
      case 'get_comments': {
        if (!threadId) throw new Error('threadId is required for get_comments action');
        let comments = await client.getComments(threadId);
        return {
          output: { comments },
          message: `Found **${comments.length}** comment(s) in the thread.`
        };
      }
      case 'create_thread': {
        if (
          !fileId ||
          !pageId ||
          !content ||
          positionX === undefined ||
          positionY === undefined ||
          !frameId
        ) {
          throw new Error(
            'fileId, pageId, content, positionX, positionY, and frameId are required for create_thread action'
          );
        }
        let thread = await client.createCommentThread(
          fileId,
          pageId,
          content,
          { x: positionX, y: positionY },
          frameId
        );
        return {
          output: { thread },
          message: `Created comment thread.`
        };
      }
      case 'reply': {
        if (!threadId || !content)
          throw new Error('threadId and content are required for reply action');
        let comment = await client.createComment(threadId, content);
        return {
          output: { comment },
          message: `Replied to comment thread.`
        };
      }
      case 'resolve': {
        if (!threadId || isResolved === undefined)
          throw new Error('threadId and isResolved are required for resolve action');
        await client.updateCommentThread(threadId, isResolved);
        return {
          output: {},
          message: `${isResolved ? 'Resolved' : 'Unresolved'} comment thread.`
        };
      }
      case 'delete_comment': {
        if (!commentId) throw new Error('commentId is required for delete_comment action');
        await client.deleteComment(commentId);
        return {
          output: {},
          message: `Deleted comment.`
        };
      }
      case 'delete_thread': {
        if (!threadId) throw new Error('threadId is required for delete_thread action');
        await client.deleteCommentThread(threadId);
        return {
          output: {},
          message: `Deleted comment thread.`
        };
      }
    }
  })
  .build();
