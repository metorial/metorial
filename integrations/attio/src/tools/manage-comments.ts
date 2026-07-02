import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let createCommentTool = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Create a new comment on a record, list entry, or within an existing thread. Specify either a **threadId** to reply to an existing thread, a **record** to start a new thread on a record, or an **entry** to comment on a list entry.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Comment text'),
      format: z
        .enum(['plaintext', 'markdown'])
        .optional()
        .default('plaintext')
        .describe('Content format'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID to reply to (mutually exclusive with record/entry)'),
      recordObject: z.string().optional().describe('Object slug of the record to comment on'),
      recordId: z.string().optional().describe('Record ID to comment on'),
      listSlug: z.string().optional().describe('List slug for entry-level comment'),
      entryId: z.string().optional().describe('Entry ID to comment on'),
      authorType: z
        .string()
        .optional()
        .default('workspace-member')
        .describe('Author type, typically "workspace-member"'),
      authorId: z.string().describe('Workspace member ID for the comment author')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('The comment ID'),
      threadId: z.string().describe('The thread ID'),
      contentPlaintext: z.string().describe('Comment content'),
      createdAt: z.string().describe('When the comment was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let params: Parameters<typeof client.createComment>[0] = {
      content: ctx.input.content,
      format: ctx.input.format
    };

    if (ctx.input.threadId) {
      params.threadId = ctx.input.threadId;
    } else if (ctx.input.recordObject && ctx.input.recordId) {
      params.record = {
        object: ctx.input.recordObject,
        recordId: ctx.input.recordId
      };
    } else if (ctx.input.listSlug && ctx.input.entryId) {
      params.entry = {
        list: ctx.input.listSlug,
        entryId: ctx.input.entryId
      };
    }

    params.author = {
      type: ctx.input.authorType,
      id: ctx.input.authorId
    };

    let comment = await client.createComment(params);

    let output = {
      commentId: comment.id?.comment_id ?? '',
      threadId: comment.thread_id ?? '',
      contentPlaintext: comment.content_plaintext ?? '',
      createdAt: comment.created_at ?? ''
    };

    return {
      output,
      message: `Created comment **${output.commentId}** in thread **${output.threadId}**.`
    };
  })
  .build();

export let getThreadTool = SlateTool.create(spec, {
  name: 'Get Thread',
  key: 'get_thread',
  description: `Retrieve a comment thread by its ID, including all comments in the thread.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      threadId: z.string().describe('The thread ID to retrieve')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('The thread ID'),
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('The comment ID'),
            contentPlaintext: z.string().describe('Comment content'),
            authorType: z.string().optional().describe('Author type'),
            authorId: z.string().optional().describe('Author ID'),
            createdAt: z.string().describe('When the comment was created')
          })
        )
        .describe('Comments in the thread')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    let thread = await client.getThread(ctx.input.threadId);

    let comments = (thread.comments ?? []).map((c: any) => ({
      commentId: c.id?.comment_id ?? '',
      contentPlaintext: c.content_plaintext ?? '',
      authorType: c.author?.type,
      authorId: c.author?.id,
      createdAt: c.created_at ?? ''
    }));

    return {
      output: {
        threadId: ctx.input.threadId,
        comments
      },
      message: `Retrieved thread **${ctx.input.threadId}** with **${comments.length}** comment(s).`
    };
  })
  .build();

export let deleteCommentTool = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment. If the comment is the head of a thread, the entire thread is deleted. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      commentId: z.string().describe('The comment ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    await client.deleteComment(ctx.input.commentId);

    return {
      output: { deleted: true },
      message: `Deleted comment **${ctx.input.commentId}**.`
    };
  })
  .build();
