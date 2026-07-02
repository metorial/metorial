import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description: 'Triggers when a comment is created, edited, or deleted on a post.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of comment event'),
      objectId: z.string().describe('Unique event/object identifier'),
      comment: z.any().describe('Comment object from the webhook payload')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Comment ID'),
      value: z.string().describe('Comment text content'),
      authorName: z.string().nullable().describe('Comment author name'),
      authorId: z.string().nullable().describe('Comment author ID'),
      postId: z.string().nullable().describe('Post ID the comment belongs to'),
      postTitle: z.string().nullable().describe('Post title'),
      boardName: z.string().nullable().describe('Board name'),
      boardId: z.string().nullable().describe('Board ID'),
      internal: z.boolean().describe('Whether the comment is internal-only'),
      parentId: z.string().nullable().describe('Parent comment ID for threaded replies'),
      created: z.string().describe('Comment creation timestamp'),
      imageURLs: z.array(z.string()).describe('Attached image URLs')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventType = data.type as string;

      if (!eventType?.startsWith('comment.')) {
        return { inputs: [] };
      }

      let comment = data.object || {};
      let objectId = data.objectID || comment.id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            objectId,
            comment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let comment = ctx.input.comment || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.objectId,
        output: {
          commentId: comment.id || '',
          value: comment.value || '',
          authorName: comment.author?.name || null,
          authorId: comment.author?.id || null,
          postId: comment.post?.id || null,
          postTitle: comment.post?.title || null,
          boardName: comment.board?.name || null,
          boardId: comment.board?.id || null,
          internal: comment.internal || false,
          parentId: comment.parentID || null,
          created: comment.created || '',
          imageURLs: comment.imageURLs || []
        }
      };
    }
  })
  .build();
