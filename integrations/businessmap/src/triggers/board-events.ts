import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventTypeMap: Record<string, string> = {
  'Board renamed': 'board.renamed',
  'Board archived': 'board.archived',
  'Board unarchived': 'board.unarchived',
  'Board deleted': 'board.deleted',
  'Board structure changed': 'board.structure_changed'
};

export let boardEventsTrigger = SlateTrigger.create(spec, {
  name: 'Board Events',
  key: 'board_events',
  description:
    'Triggers when a board is renamed, archived, unarchived, deleted, or its structure changes. Configure a board webhook in Kanbanize to send events to the provided webhook URL.'
})
  .input(
    z.object({
      event: z.string().describe('Event type name from Kanbanize'),
      company: z.string().optional().describe('Company identifier'),
      boardId: z.number().describe('Board ID'),
      userId: z.number().optional().describe('User ID who triggered the event')
    })
  )
  .output(
    z.object({
      boardId: z.number().describe('Board ID'),
      userId: z.number().optional().describe('User ID who triggered the event'),
      eventName: z.string().describe('Original event name from Kanbanize'),
      name: z
        .string()
        .optional()
        .nullable()
        .describe('Board name (fetched for non-delete events)'),
      description: z.string().optional().nullable().describe('Board description'),
      workspaceId: z.number().optional().nullable().describe('Workspace ID'),
      isArchived: z.number().optional().nullable().describe('Whether the board is archived')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event as string;
      let isBoardEvent = Object.keys(eventTypeMap).includes(event);
      if (!isBoardEvent) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            event: data.event,
            company: data.company,
            boardId: data.board_id,
            userId: data.user_id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let type = eventTypeMap[ctx.input.event] ?? 'board.unknown';

      let boardDetails: any = {};

      if (ctx.input.event !== 'Board deleted') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            subdomain: ctx.auth.subdomain
          });
          boardDetails = (await client.getBoard(ctx.input.boardId)) ?? {};
        } catch {
          // Board may not be accessible
        }
      }

      return {
        type,
        id: `${ctx.input.boardId}-${ctx.input.event}-${Date.now()}`,
        output: {
          boardId: ctx.input.boardId,
          userId: ctx.input.userId,
          eventName: ctx.input.event,
          name: boardDetails.name,
          description: boardDetails.description,
          workspaceId: boardDetails.workspace_id,
          isArchived: boardDetails.is_archived
        }
      };
    }
  })
  .build();
