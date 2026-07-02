import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCommentsTool = SlateTool.create(spec, {
  name: 'Get Comments',
  key: 'get_comments',
  description: `Retrieve comments on a SmugMug album or image. Returns comment text, author, and timestamp for each comment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['album', 'image'])
        .describe('Type of resource to get comments for'),
      resourceKey: z.string().describe('Album key or image key'),
      start: z.number().optional().describe('Starting index (1-based) for pagination'),
      count: z.number().optional().describe('Number of comments to return')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.string().optional().describe('Comment ID'),
            text: z.string().describe('Comment text'),
            author: z.string().optional().describe('Comment author name'),
            dateCreated: z.string().optional().describe('Comment creation date'),
            uri: z.string().optional().describe('Comment API URI')
          })
        )
        .describe('List of comments'),
      totalComments: z.number().describe('Total number of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let result: any;
    if (ctx.input.resourceType === 'album') {
      result = await client.getAlbumComments(ctx.input.resourceKey, {
        start: ctx.input.start,
        count: ctx.input.count
      });
    } else {
      result = await client.getImageComments(ctx.input.resourceKey, {
        start: ctx.input.start,
        count: ctx.input.count
      });
    }

    let comments = result.items.map((comment: any) => ({
      commentId: comment.CommentID || comment.Uri || undefined,
      text: comment.Text || '',
      author: comment.User?.NickName || comment.Name || undefined,
      dateCreated: comment.DateCreated || undefined,
      uri: comment.Uri || undefined
    }));

    return {
      output: {
        comments,
        totalComments: result.pages.total
      },
      message: `Retrieved **${comments.length}** of ${result.pages.total} comments on ${ctx.input.resourceType} **${ctx.input.resourceKey}**`
    };
  })
  .build();
