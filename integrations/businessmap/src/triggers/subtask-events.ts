import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventTypeMap: Record<string, string> = {
  'Subtask created': 'subtask.created',
  'Subtask updated': 'subtask.updated',
  'Subtask deleted': 'subtask.deleted'
};

export let subtaskEventsTrigger = SlateTrigger.create(spec, {
  name: 'Subtask Events',
  key: 'subtask_events',
  description:
    'Triggers when a subtask is created, updated, or deleted on a card. Configure a board webhook in Kanbanize to send events to the provided webhook URL.'
})
  .input(
    z.object({
      event: z.string().describe('Event type name from Kanbanize'),
      company: z.string().optional().describe('Company identifier'),
      boardId: z.number().describe('Board ID'),
      cardId: z.number().describe('Card ID'),
      subtaskId: z.number().describe('Subtask ID'),
      userId: z.number().optional().describe('User ID who triggered the event')
    })
  )
  .output(
    z.object({
      subtaskId: z.number().describe('Subtask ID'),
      cardId: z.number().describe('Parent card ID'),
      boardId: z.number().describe('Board ID'),
      userId: z.number().optional().describe('User ID who triggered the event'),
      eventName: z.string().describe('Original event name from Kanbanize'),
      description: z.string().optional().nullable().describe('Subtask description'),
      ownerUserId: z.number().optional().nullable().describe('Subtask assignee user ID'),
      isFinished: z
        .number()
        .optional()
        .nullable()
        .describe('Whether the subtask is finished (0 or 1)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event as string;
      let isSubtaskEvent = Object.keys(eventTypeMap).includes(event);
      if (!isSubtaskEvent) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            event: data.event,
            company: data.company,
            boardId: data.board_id,
            cardId: data.card_id,
            subtaskId: data.subtask_id,
            userId: data.user_id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let type = eventTypeMap[ctx.input.event] ?? 'subtask.unknown';

      let subtaskDetails: any = {};

      if (ctx.input.event !== 'Subtask deleted') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            subdomain: ctx.auth.subdomain
          });
          subtaskDetails =
            (await client.getSubtask(ctx.input.cardId, ctx.input.subtaskId)) ?? {};
        } catch {
          // Subtask may not be accessible
        }
      }

      return {
        type,
        id: `${ctx.input.boardId}-${ctx.input.cardId}-${ctx.input.subtaskId}-${ctx.input.event}-${Date.now()}`,
        output: {
          subtaskId: ctx.input.subtaskId,
          cardId: ctx.input.cardId,
          boardId: ctx.input.boardId,
          userId: ctx.input.userId,
          eventName: ctx.input.event,
          description: subtaskDetails.description,
          ownerUserId: subtaskDetails.owner_user_id,
          isFinished: subtaskDetails.is_finished
        }
      };
    }
  })
  .build();
