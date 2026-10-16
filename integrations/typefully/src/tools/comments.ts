import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

let socialSetId = z.string().describe('Social set ID from list_social_sets.');
let draftId = z.string().describe('Draft ID from list_drafts or create_draft.');
let platform = z.enum([
  'x',
  'linkedin',
  'mastodon',
  'threads',
  'bluesky',
  'substack',
  'x_article'
]);
let commentThreadId = z
  .string()
  .describe('Comment thread ID from list_comment_threads or create_comment_thread.');
let threadOutput = z.object({
  thread: z
    .record(z.string(), z.unknown())
    .describe('Actual thread ID, anchor, status, and ordered comments returned by Typefully')
});

export let listCommentThreads = SlateTool.create(spec, {
  key: 'list_comment_threads',
  name: 'List Comment Threads',
  description:
    'Read draft review discussions, including anchor snapshots and comments. Use list_social_sets and list_drafts to discover resource IDs.',
  instructions: [
    'Typefully returns unresolved threads by default. Set status to all to include resolved discussions.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      socialSetId,
      draftId,
      status: z.enum(['unresolved', 'resolved', 'all']).optional(),
      platform: platform.optional(),
      limit: z.number().min(1).max(50).optional(),
      offset: z.number().min(0).optional()
    })
  )
  .output(
    z.object({
      threads: z
        .record(z.string(), z.unknown())
        .describe('Actual paginated results, count, limit, offset, and page links')
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      threads: await new TypefullyClient(ctx.auth.token).listCommentThreads(
        ctx.input.socialSetId,
        ctx.input.draftId,
        {
          status: ctx.input.status,
          platform: ctx.input.platform,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        }
      )
    },
    message: 'Retrieved draft comment threads.'
  }))
  .build();

export let createCommentThread = SlateTool.create(spec, {
  key: 'create_comment_thread',
  name: 'Create Comment Thread',
  description:
    'Start a review discussion anchored to an exact substring of draft text. Use get_draft to inspect content first and list_social_sets to discover its social set.',
  instructions: [
    'Copy selectedText exactly from visible draft text. LinkedIn mentions must be selected in full or excluded.',
    'For X Articles use postIndex 0; the anchor targets commentable article text, excluding Markdown syntax and fenced code.',
    'Threads cannot be created on auto-synced platforms.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      socialSetId,
      draftId,
      platform,
      postIndex: z.number().min(0).describe('Zero-based post index; use 0 for X Articles'),
      selectedText: z
        .string()
        .min(1)
        .max(50000)
        .describe('Exact substring to anchor, with complete LinkedIn mentions'),
      occurrence: z
        .number()
        .min(0)
        .optional()
        .describe('Zero-based match occurrence; omit for the first match'),
      text: z.string().min(1).max(10000).describe('Plain-text comment body')
    })
  )
  .output(threadOutput)
  .handleInvocation(async ctx => {
    if (
      !Number.isInteger(ctx.input.postIndex) ||
      (ctx.input.occurrence !== undefined && !Number.isInteger(ctx.input.occurrence))
    ) {
      throw createApiServiceError('postIndex and occurrence must be whole numbers.');
    }
    return {
      output: {
        thread: await new TypefullyClient(ctx.auth.token).createCommentThread(
          ctx.input.socialSetId,
          ctx.input.draftId,
          {
            platform: ctx.input.platform,
            post_index: ctx.input.postIndex,
            selected_text: ctx.input.selectedText,
            ...(ctx.input.occurrence !== undefined
              ? { occurrence: ctx.input.occurrence }
              : {}),
            text: ctx.input.text
          }
        )
      },
      message: 'Created an anchored comment thread.'
    };
  })
  .build();

export let replyToCommentThread = SlateTool.create(spec, {
  key: 'reply_to_comment_thread',
  name: 'Reply to Comment Thread',
  description:
    'Add a plain-text reply to an unresolved draft discussion. Use list_comment_threads to discover its ID. Resolved and auto-synced platform threads reject replies.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({ socialSetId, draftId, commentThreadId, text: z.string().min(1).max(10000) })
  )
  .output(threadOutput)
  .handleInvocation(async ctx => ({
    output: {
      thread: await new TypefullyClient(ctx.auth.token).replyToCommentThread(
        ctx.input.socialSetId,
        ctx.input.draftId,
        ctx.input.commentThreadId,
        ctx.input.text
      )
    },
    message: 'Added a reply to the comment thread.'
  }))
  .build();

export let resolveCommentThread = SlateTool.create(spec, {
  key: 'resolve_comment_thread',
  name: 'Resolve Comment Thread',
  description:
    'Resolve a draft discussion. This is one-way: Typefully has no unresolve endpoint. Use list_comment_threads to discover its ID.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ socialSetId, draftId, commentThreadId }))
  .output(threadOutput)
  .handleInvocation(async ctx => ({
    output: {
      thread: await new TypefullyClient(ctx.auth.token).resolveCommentThread(
        ctx.input.socialSetId,
        ctx.input.draftId,
        ctx.input.commentThreadId
      )
    },
    message: 'Resolved the comment thread.'
  }))
  .build();
