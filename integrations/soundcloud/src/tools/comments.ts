import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Unique identifier (URN) of the comment'),
  body: z.string().describe('Comment text'),
  timestamp: z
    .number()
    .nullable()
    .describe('Position in the track in milliseconds (for timed comments)'),
  createdAt: z.string().describe('When the comment was posted'),
  username: z.string().describe('Username of the commenter'),
  userId: z.string().describe('User ID of the commenter')
});

export let getTrackComments = SlateTool.create(spec, {
  name: 'Get Track Comments',
  key: 'get_track_comments',
  description: `Retrieve comments on a SoundCloud track. Comments can be timed (tied to a specific point in the track) or general.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      trackId: z.string().describe('Track ID or URN'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of comments to return (default 50)')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('List of comments'),
      hasMore: z.boolean().describe('Whether more comments are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTrackComments(ctx.input.trackId, {
      limit: ctx.input.limit || 50
    });

    let comments = result.collection.map(c => ({
      commentId: c.urn || String(c.id),
      body: c.body,
      timestamp: c.timestamp,
      createdAt: c.created_at,
      username: c.user?.username || '',
      userId: c.user?.urn || String(c.user?.id)
    }));

    return {
      output: { comments, hasMore: !!result.next_href },
      message: `Retrieved **${comments.length}** comments on track ${ctx.input.trackId}.`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Post a comment on a SoundCloud track. Optionally provide a timestamp to create a timed comment at a specific point in the track. Requires user-level OAuth authentication.`,
  instructions: [
    'The timestamp is in milliseconds from the start of the track.',
    'Commenting may be disabled by the track creator.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      trackId: z.string().describe('Track ID or URN to comment on'),
      body: z.string().describe('Comment text'),
      timestamp: z
        .number()
        .optional()
        .describe('Position in the track in milliseconds (for timed comments)')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Unique identifier (URN) of the created comment'),
      body: z.string().describe('Comment text'),
      timestamp: z.number().nullable().describe('Position in the track in milliseconds'),
      createdAt: z.string().describe('When the comment was posted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let comment = await client.createComment(
      ctx.input.trackId,
      ctx.input.body,
      ctx.input.timestamp
    );

    return {
      output: {
        commentId: comment.urn || String(comment.id),
        body: comment.body,
        timestamp: comment.timestamp,
        createdAt: comment.created_at
      },
      message: `Posted comment on track ${ctx.input.trackId}${ctx.input.timestamp ? ` at ${Math.round(ctx.input.timestamp / 1000)}s` : ''}.`
    };
  })
  .build();
