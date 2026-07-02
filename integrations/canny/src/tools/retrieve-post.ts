import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let retrievePostTool = SlateTool.create(spec, {
  name: 'Retrieve Post',
  key: 'retrieve_post',
  description: `Retrieve details of a specific feedback post. Lookup by post ID, or by board ID + URL name. Returns the full post including author, board, category, votes, status, tags, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().optional().describe('The Canny post ID'),
      boardId: z.string().optional().describe('Board ID (required when using urlName)'),
      urlName: z
        .string()
        .optional()
        .describe('URL-friendly name of the post (used with boardId)')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Unique identifier of the post'),
      title: z.string().describe('Title of the post'),
      details: z.string().nullable().describe('Body/description of the post'),
      status: z.string().describe('Current status of the post'),
      score: z.number().describe('Vote score/count'),
      commentCount: z.number().describe('Number of comments'),
      boardId: z.string().describe('Board ID the post belongs to'),
      boardName: z.string().describe('Name of the board'),
      authorName: z.string().describe('Name of the post author'),
      authorId: z.string().describe('ID of the post author'),
      categoryName: z.string().nullable().describe('Category name if assigned'),
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            name: z.string()
          })
        )
        .describe('Tags attached to the post'),
      eta: z.string().nullable().describe('Estimated completion date'),
      url: z.string().describe('URL of the post'),
      created: z.string().describe('ISO 8601 creation timestamp'),
      statusChangedAt: z.string().nullable().describe('When the status was last changed'),
      imageURLs: z.array(z.string()).describe('Attached image URLs'),
      customFields: z.array(z.any()).optional().describe('Custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let p = await client.retrievePost({
      id: ctx.input.postId,
      boardID: ctx.input.boardId,
      urlName: ctx.input.urlName
    });

    return {
      output: {
        postId: p.id,
        title: p.title,
        details: p.details,
        status: p.status,
        score: p.score,
        commentCount: p.commentCount,
        boardId: p.board?.id,
        boardName: p.board?.name,
        authorName: p.author?.name,
        authorId: p.author?.id,
        categoryName: p.category?.name || null,
        tags: (p.tags || []).map((t: any) => ({ tagId: t.id, name: t.name })),
        eta: p.eta || null,
        url: p.url,
        created: p.created,
        statusChangedAt: p.statusChangedAt || null,
        imageURLs: p.imageURLs || [],
        customFields: p.customFields
      },
      message: `Retrieved post **"${p.title}"** — status: ${p.status}, score: ${p.score}, ${p.commentCount} comment(s).`
    };
  })
  .build();
