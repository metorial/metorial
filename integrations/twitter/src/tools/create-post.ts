import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { mapPost, postSchema } from '../lib/helpers';
import { spec } from '../spec';

export let createPost = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Create a new post (tweet) on Twitter/X. Supports plain text posts, replies to existing posts, quote posts, posts with media attachments, and polls.`,
  instructions: [
    'Text is limited to 280 characters.',
    'To reply to a post, provide the replyToPostId.',
    'To quote a post, provide the quotePostId.',
    'Media must be uploaded separately first—provide media IDs from a prior upload.',
    'You may tag users in attached media by providing mediaTaggedUserIds.',
    'Use replySettings to limit who can reply to the post.',
    'Polls require 2-4 options and a duration in minutes (default 1440 = 24 hours).'
  ],
  constraints: [
    'Maximum 280 characters per post.',
    'Polls and media cannot be combined in the same post.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Text content of the post (max 280 characters)'),
      replyToPostId: z.string().optional().describe('Post ID to reply to, creating a thread'),
      quotePostId: z.string().optional().describe('Post ID to quote'),
      mediaIds: z
        .array(z.string())
        .max(4)
        .optional()
        .describe('Array of media IDs to attach (uploaded separately)'),
      mediaTaggedUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to tag in attached media'),
      pollOptions: z.array(z.string()).optional().describe('Poll options (2-4 choices)'),
      pollDurationMinutes: z
        .number()
        .min(5)
        .max(10080)
        .optional()
        .describe('Poll duration in minutes (default 1440)'),
      replySettings: z
        .enum(['following', 'mentionedUsers', 'subscribers', 'verified'])
        .optional()
        .describe('Who can reply to the post')
    })
  )
  .output(
    z.object({
      post: postSchema.describe('The created post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let { text, mediaIds, mediaTaggedUserIds, pollOptions } = ctx.input;

    if (text.length > 280) {
      throw twitterServiceError('Text is limited to 280 characters.');
    }

    if (pollOptions && (pollOptions.length < 2 || pollOptions.length > 4)) {
      throw twitterServiceError('Polls require between 2 and 4 options.');
    }

    if (pollOptions && mediaIds && mediaIds.length > 0) {
      throw twitterServiceError('Polls and media cannot be combined in the same post.');
    }

    if (mediaTaggedUserIds && (!mediaIds || mediaIds.length === 0)) {
      throw twitterServiceError('mediaTaggedUserIds requires at least one media ID.');
    }

    let result = await client.createPost({
      text,
      replyToPostId: ctx.input.replyToPostId,
      quotePostId: ctx.input.quotePostId,
      mediaIds,
      mediaTaggedUserIds,
      pollOptions,
      pollDurationMinutes: ctx.input.pollDurationMinutes,
      replySettings: ctx.input.replySettings
    });

    let post = mapPost(result.data);

    return {
      output: { post },
      message: `Created post: "${ctx.input.text.substring(0, 50)}${ctx.input.text.length > 50 ? '...' : ''}"`
    };
  })
  .build();
