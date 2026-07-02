import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let commentEvent = SlateTrigger.create(spec, {
  name: 'Comment Event',
  key: 'comment_event',
  description:
    'Triggers when a new comment (internal note) is added to a contact conversation.'
})
  .input(
    z.object({
      commentId: z.string().describe('Unique comment ID'),
      contactId: z.string().describe('ID of the contact'),
      commentText: z.string().optional().describe('Text content of the comment'),
      authorId: z.string().optional().describe('ID of the user who created the comment'),
      authorName: z.string().optional().describe('Name of the user who created the comment'),
      timestamp: z.string().optional().describe('Comment creation timestamp'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Unique comment ID'),
      contactId: z.string().describe('ID of the contact'),
      commentText: z.string().optional().describe('Text content of the comment'),
      authorId: z.string().optional().describe('ID of the user who created the comment'),
      authorName: z.string().optional().describe('Name of the user who created the comment'),
      timestamp: z.string().optional().describe('Comment creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let payload = data?.data || data;

      let comment = payload?.comment || payload;
      let contact = payload?.contact || {};
      let author = comment?.author || comment?.user || payload?.user || {};

      return {
        inputs: [
          {
            commentId: String(comment?.id || payload?.id || ''),
            contactId: String(contact?.id || payload?.contactId || ''),
            commentText: comment?.text || comment?.body,
            authorId: String(author?.id || ''),
            authorName:
              author?.name ||
              (author?.firstName
                ? `${author.firstName} ${author.lastName || ''}`.trim()
                : undefined),
            timestamp: comment?.createdAt || payload?.createdAt || payload?.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'comment.created',
        id: ctx.input.commentId,
        output: {
          commentId: ctx.input.commentId,
          contactId: ctx.input.contactId,
          commentText: ctx.input.commentText,
          authorId: ctx.input.authorId,
          authorName: ctx.input.authorName,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
