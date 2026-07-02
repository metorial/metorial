import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { paginationInputSchema, paginationOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Vimeo comment ID'),
  uri: z.string().describe('URI of the comment resource'),
  text: z.string().describe('Text content of the comment'),
  createdOn: z.string().describe('When the comment was posted'),
  authorName: z.string().describe('Name of the comment author'),
  authorUri: z.string().nullable().optional().describe('URI of the comment author')
});

let mapComment = (c: any) => ({
  commentId: c.uri?.replace(/.*\/comments\//, '') ?? '',
  uri: c.uri ?? '',
  text: c.text ?? '',
  createdOn: c.created_on ?? '',
  authorName: c.user?.name ?? 'Unknown',
  authorUri: c.user?.uri ?? null
});

export let listCommentsTool = SlateTool.create(spec, {
  name: 'List Video Comments',
  key: 'list_video_comments',
  description: `Retrieve comments on a specific video. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      videoId: z.string().describe('The ID of the video to get comments for')
    })
  )
  .output(
    paginationOutputSchema.extend({
      comments: z.array(commentSchema).describe('List of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.getVideoComments(ctx.input.videoId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let comments = (result.data ?? []).map(mapComment);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? comments.length,
        comments
      },
      message: `Found **${result.total ?? comments.length}** comments on video ${ctx.input.videoId}`
    };
  })
  .build();

export let addCommentTool = SlateTool.create(spec, {
  name: 'Add Video Comment',
  key: 'add_video_comment',
  description: `Post a new comment on a specific Vimeo video. Requires the **interact** scope.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The ID of the video to comment on'),
      text: z.string().describe('The comment text to post')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let comment = await client.addVideoComment(ctx.input.videoId, ctx.input.text);
    let mapped = mapComment(comment);

    return {
      output: mapped,
      message: `Posted comment on video ${ctx.input.videoId}`
    };
  })
  .build();
