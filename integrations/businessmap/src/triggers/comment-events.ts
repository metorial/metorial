import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventTypeMap: Record<string, string> = {
  'Comment created': 'comment.created',
  'Comment updated': 'comment.updated',
  'Comment deleted': 'comment.deleted'
};

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggers when a comment is created, updated, or deleted on a card. Configure a board webhook in Kanbanize to send events to the provided webhook URL.'
})
  .input(
    z.object({
      event: z.string().describe('Event type name from Kanbanize'),
      company: z.string().optional().describe('Company identifier'),
      boardId: z.number().describe('Board ID'),
      cardId: z.number().describe('Card ID'),
      commentId: z.number().describe('Comment ID'),
      userId: z.number().optional().describe('User ID who triggered the event')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Comment ID'),
      cardId: z.number().describe('Card ID'),
      boardId: z.number().describe('Board ID'),
      userId: z.number().optional().describe('User ID who triggered the event'),
      eventName: z.string().describe('Original event name from Kanbanize'),
      text: z.string().optional().nullable().describe('Comment text'),
      authorUserId: z.number().optional().nullable().describe('Comment author user ID'),
      createdAt: z.string().optional().nullable().describe('Comment creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event as string;
      let isCommentEvent = Object.keys(eventTypeMap).includes(event);
      if (!isCommentEvent) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            event: data.event,
            company: data.company,
            boardId: data.board_id,
            cardId: data.card_id,
            commentId: data.comment_id,
            userId: data.user_id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let type = eventTypeMap[ctx.input.event] ?? 'comment.unknown';

      let commentDetails: any = {};

      if (ctx.input.event !== 'Comment deleted') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            subdomain: ctx.auth.subdomain
          });
          commentDetails =
            (await client.getComment(ctx.input.cardId, ctx.input.commentId)) ?? {};
        } catch {
          // Comment may not be accessible
        }
      }

      return {
        type,
        id: `${ctx.input.boardId}-${ctx.input.cardId}-${ctx.input.commentId}-${ctx.input.event}-${Date.now()}`,
        output: {
          commentId: ctx.input.commentId,
          cardId: ctx.input.cardId,
          boardId: ctx.input.boardId,
          userId: ctx.input.userId,
          eventName: ctx.input.event,
          text: commentDetails.text,
          authorUserId: commentDetails.author_user_id ?? commentDetails.user_id,
          createdAt: commentDetails.created_at
        }
      };
    }
  })
  .build();
