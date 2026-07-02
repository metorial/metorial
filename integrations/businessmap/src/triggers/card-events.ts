import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _cardEventTypes = [
  'Card created',
  'Card details changed',
  'Card moved',
  'Card deleted',
  'Card archived',
  'Card is unarchived',
  'Card is discarded',
  'Card is restored',
  'Card blocked'
] as const;

let eventTypeMap: Record<string, string> = {
  'Card created': 'card.created',
  'Card details changed': 'card.updated',
  'Card moved': 'card.moved',
  'Card deleted': 'card.deleted',
  'Card archived': 'card.archived',
  'Card is unarchived': 'card.unarchived',
  'Card is discarded': 'card.discarded',
  'Card is restored': 'card.restored',
  'Card blocked': 'card.blocked'
};

export let cardEventsTrigger = SlateTrigger.create(spec, {
  name: 'Card Events',
  key: 'card_events',
  description:
    'Triggers when a card is created, updated, moved, deleted, archived, unarchived, discarded, restored, or blocked. Configure a board webhook in Kanbanize to send events to the provided webhook URL.'
})
  .input(
    z.object({
      event: z.string().describe('Event type name from Kanbanize'),
      company: z.string().optional().describe('Company identifier'),
      boardId: z.number().describe('Board ID'),
      cardId: z.number().describe('Card ID'),
      userId: z.number().optional().describe('User ID who triggered the event')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Card ID'),
      boardId: z.number().describe('Board ID'),
      userId: z.number().optional().describe('User ID who triggered the event'),
      eventName: z.string().describe('Original event name from Kanbanize'),
      title: z
        .string()
        .optional()
        .nullable()
        .describe('Card title (fetched for non-delete events)'),
      description: z.string().optional().nullable().describe('Card description'),
      ownerUserId: z.number().optional().nullable().describe('Card owner user ID'),
      columnId: z.number().optional().nullable().describe('Column ID'),
      laneId: z.number().optional().nullable().describe('Lane ID'),
      workflowId: z.number().optional().nullable().describe('Workflow ID'),
      priority: z.number().optional().nullable().describe('Card priority'),
      color: z.string().optional().nullable().describe('Card color'),
      deadline: z.string().optional().nullable().describe('Card deadline'),
      section: z
        .number()
        .optional()
        .nullable()
        .describe('Section (1=Backlog, 2=In Progress, 3=Done)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event as string;
      let isCardEvent = Object.keys(eventTypeMap).includes(event);
      if (!isCardEvent) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            event: data.event,
            company: data.company,
            boardId: data.board_id,
            cardId: data.card_id,
            userId: data.user_id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let type = eventTypeMap[ctx.input.event] ?? 'card.unknown';

      let cardDetails: any = {};

      // Only fetch card details for non-delete events
      if (ctx.input.event !== 'Card deleted') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            subdomain: ctx.auth.subdomain
          });
          cardDetails = (await client.getCard(ctx.input.cardId)) ?? {};
        } catch {
          // Card may not be accessible (deleted or permissions)
        }
      }

      return {
        type,
        id: `${ctx.input.boardId}-${ctx.input.cardId}-${ctx.input.event}-${Date.now()}`,
        output: {
          cardId: ctx.input.cardId,
          boardId: ctx.input.boardId,
          userId: ctx.input.userId,
          eventName: ctx.input.event,
          title: cardDetails.title,
          description: cardDetails.description,
          ownerUserId: cardDetails.owner_user_id,
          columnId: cardDetails.column_id,
          laneId: cardDetails.lane_id,
          workflowId: cardDetails.workflow_id,
          priority: cardDetails.priority,
          color: cardDetails.color,
          deadline: cardDetails.deadline,
          section: cardDetails.section
        }
      };
    }
  })
  .build();
