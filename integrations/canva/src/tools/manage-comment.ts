import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentThreadSchema = z.object({
  threadId: z.string().describe('The comment thread ID'),
  designId: z.string().describe('The design ID'),
  authorUserId: z.string().optional().describe('Author user ID'),
  authorDisplayName: z.string().optional().describe('Author display name'),
  contentPlaintext: z.string().optional().describe('Comment content in plaintext'),
  contentMarkdown: z.string().optional().describe('Comment content in markdown'),
  assigneeUserId: z.string().optional().describe('Assigned user ID'),
  assigneeDisplayName: z.string().optional().describe('Assigned user display name'),
  resolverUserId: z.string().optional().describe('Resolver user ID'),
  resolverDisplayName: z.string().optional().describe('Resolver display name'),
  createdAt: z.number().describe('Unix timestamp of creation'),
  updatedAt: z.number().describe('Unix timestamp of last modification')
});

let replySchema = z.object({
  replyId: z.string().describe('The reply ID'),
  designId: z.string().optional().describe('The design ID'),
  threadId: z.string().optional().describe('The parent thread ID'),
  authorUserId: z.string().optional().describe('Author user ID'),
  authorDisplayName: z.string().optional().describe('Author display name'),
  contentPlaintext: z.string().optional().describe('Reply content in plaintext'),
  contentMarkdown: z.string().optional().describe('Reply content in markdown'),
  createdAt: z.number().describe('Unix timestamp of creation'),
  updatedAt: z.number().describe('Unix timestamp of last modification')
});

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Create a new comment thread on a design, or reply to an existing comment thread. To create a top-level comment, provide a designId and message. To reply, also provide a threadId.`,
  instructions: [
    'To mention a user in a comment, use the format [user_id:team_id].',
    'When assigning a comment to a user, the user must also be mentioned in the message.'
  ],
  constraints: ['Message must be 1-2048 characters.', 'Maximum 100 replies per thread.']
})
  .input(
    z.object({
      designId: z.string().describe('The design ID to comment on'),
      message: z
        .string()
        .min(1)
        .max(2048)
        .describe('Comment text (1-2048 chars). Mention users via [user_id:team_id].'),
      threadId: z
        .string()
        .optional()
        .describe('If provided, creates a reply to this thread instead of a new thread'),
      assigneeId: z
        .string()
        .optional()
        .describe(
          'User ID to assign the comment to (new threads only, user must be mentioned)'
        )
    })
  )
  .output(
    z.object({
      thread: commentThreadSchema
        .optional()
        .describe('Created comment thread (when creating a new thread)'),
      reply: replySchema.optional().describe('Created reply (when replying to a thread)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.threadId) {
      let reply = await client.createReply(ctx.input.designId, ctx.input.threadId, {
        messagePlaintext: ctx.input.message
      });
      return {
        output: { reply },
        message: `Created reply on thread ${ctx.input.threadId} in design ${ctx.input.designId}.`
      };
    } else {
      let thread = await client.createCommentThread(ctx.input.designId, {
        messagePlaintext: ctx.input.message,
        assigneeId: ctx.input.assigneeId
      });
      return {
        output: { thread },
        message: `Created new comment thread (ID: ${thread.threadId}) on design ${ctx.input.designId}.`
      };
    }
  })
  .build();

export let getCommentThread = SlateTool.create(spec, {
  name: 'Get Comment Thread',
  key: 'get_comment_thread',
  description: `Retrieve a comment thread and its replies on a design. Returns the thread details and optionally lists all replies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      designId: z.string().describe('The design ID'),
      threadId: z.string().describe('The comment thread ID'),
      includeReplies: z
        .boolean()
        .optional()
        .describe('Whether to also fetch replies for this thread'),
      repliesLimit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of replies to fetch (1-100, default 50)')
    })
  )
  .output(
    z.object({
      thread: commentThreadSchema.describe('The comment thread'),
      replies: z
        .array(replySchema)
        .optional()
        .describe('Replies in the thread (when includeReplies is true)'),
      repliesContinuation: z.string().optional().describe('Pagination token for more replies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let thread = await client.getCommentThread(ctx.input.designId, ctx.input.threadId);

    let replies: Awaited<ReturnType<typeof client.listReplies>> | undefined;
    if (ctx.input.includeReplies) {
      replies = await client.listReplies(ctx.input.designId, ctx.input.threadId, {
        limit: ctx.input.repliesLimit
      });
    }

    return {
      output: {
        thread,
        replies: replies?.replies,
        repliesContinuation: replies?.continuation
      },
      message: `Retrieved thread ${thread.threadId}${replies ? ` with ${replies.replies.length} replies` : ''}.`
    };
  })
  .build();
